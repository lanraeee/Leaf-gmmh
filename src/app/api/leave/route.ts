import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const wardId = searchParams.get('wardId')
  const statuses = (searchParams.get('status') ?? '').split(',').filter(Boolean)

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

  const patient = await db.patient.findUnique({ where: { id: patientId }, include: { ward: true } })
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  await mkdir(UPLOADS_DIR, { recursive: true })

  // Save files to disk (encrypted at rest handled by OS/storage layer)
  let audioPath: string | null = null
  let photoPath: string | null = null

  if (audioFile && audioFile.size > 0) {
    const buf = Buffer.from(await audioFile.arrayBuffer())
    audioPath = `audio/${randomUUID()}.webm`
    await mkdir(join(UPLOADS_DIR, 'audio'), { recursive: true })
    await writeFile(join(UPLOADS_DIR, audioPath), buf)
  }

  if (photoFile && photoFile.size > 0) {
    const buf = Buffer.from(await photoFile.arrayBuffer())
    photoPath = `photos/${randomUUID()}.jpg`
    await mkdir(join(UPLOADS_DIR, 'photos'), { recursive: true })
    await writeFile(join(UPLOADS_DIR, photoPath), buf)
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
