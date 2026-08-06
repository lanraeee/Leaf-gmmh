import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const requestedWardId = searchParams.get('wardId')
  const statuses = (searchParams.get('status') ?? '').split(',').filter(Boolean)

  const isCrossWardRole = ['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)
  // Non-admin users are always scoped to their own ward
  const wardId = isCrossWardRole ? requestedWardId : (session.user.wardId ?? requestedWardId)

  const records = await db.leaveRecord.findMany({
    where: {
      ...(wardId ? { wardId } : {}),
      ...(statuses.length ? { status: { in: statuses as never[] } } : {}),
    },
    include: {
      patient: { include: { ward: true } },
      approval: { include: { approvedBy: true } },
      consent: true,
      voiceRecording: true,
      appearance: true,
      awolEscalation: { include: { escalatedBy: true } },
      returnedBy: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ records })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()

  const patientId = formData.get('patientId') as string
  const leaveType = formData.get('leaveType') as string
  const destination = formData.get('destination') as string
  const destinationDetail = formData.get('destinationDetail') as string
  const escortName = formData.get('escortName') as string
  const escortPhone = formData.get('escortPhone') as string
  const isTimeAgreed = formData.get('isTimeAgreed') === 'true'
  const returnDateTime = formData.get('returnDateTime') as string
  const consentStatus = formData.get('consentStatus') as string
  const declineReason = formData.get('declineReason') as string
  const assessmentNote = formData.get('assessmentNote') as string
  const clothingRaw = formData.get('clothing') as string
  const audioFile = formData.get('audio') as File | null
  const photoFile = formData.get('photo') as File | null

  const patientMrn = formData.get('patientMrn') as string | null
  const patient = await db.patient.findFirst({
    where: patientId && patientId !== 'undefined'
      ? { id: patientId }
      : { mrn: patientMrn ?? '' },
    include: { ward: true },
  })
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  // Upload files to Vercel Blob (replaces disk storage — works on serverless Vercel)
  let audioPath: string | null = null
  let photoPath: string | null = null

  if (audioFile && audioFile.size > 0) {
    const { url } = await put(
      `plds/audio/${randomUUID()}.webm`,
      audioFile,
      { access: 'private', addRandomSuffix: false }
    )
    audioPath = url
  }

  if (photoFile && photoFile.size > 0) {
    const { url } = await put(
      `plds/photos/${randomUUID()}.jpg`,
      photoFile,
      { access: 'private', addRandomSuffix: false }
    )
    photoPath = url
  }

  const clothing = clothingRaw ? JSON.parse(clothingRaw) : {}
  const returnTime = returnDateTime ? new Date(returnDateTime) : null

  const record = await db.leaveRecord.create({
    data: {
      patientId,
      wardId: patient.wardId,
      initiatedById: session.user.id,
      leaveType: leaveType as never,
      status: 'PENDING_APPROVAL',
      destination,
      destinationDetail: destinationDetail || null,
      escortName: escortName || null,
      escortPhone: escortPhone || null,
      isTimeAgreed,
      ...(isTimeAgreed ? { agreedReturnTime: returnTime } : { proposedReturnTime: returnTime }),
      consent: {
        create: {
          status: consentStatus as never,
          consentedAt: consentStatus === 'CONSENTED' ? new Date() : null,
          declineReason: declineReason || null,
        },
      },
      ...(audioPath ? {
        voiceRecording: {
          create: {
            filePath: audioPath,
            mimeType: 'audio/webm',
          },
        },
      } : {}),
      ...(photoPath || Object.values(clothing).some(Boolean) ? {
        appearance: {
          create: {
            photoPath,
            faceBlurred: !!photoPath,
            head: clothing.head || null,
            upperBody: clothing.upper || null,
            lowerBody: clothing.lower || null,
            footwear: clothing.footwear || null,
            accessories: clothing.accessories || null,
            additionalNotes: clothing.notes || assessmentNote || null,
          },
        },
      } : {}),
    },
  })

  await auditLog(session.user.id, 'LEAVE_INITIATED', `Leave record created for patient ${patientId}`, record.id)

  return NextResponse.json({ id: record.id }, { status: 201 })
}
