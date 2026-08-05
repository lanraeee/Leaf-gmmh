import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const record = await db.leaveRecord.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['ON_LEAVE', 'OVERDUE'].includes(record.status)) {
    return NextResponse.json({ error: 'Only ON_LEAVE or OVERDUE records can be escalated to AWOL' }, { status: 400 })
  }

  await db.leaveRecord.update({
    where: { id },
    data: { status: 'AWOL' },
  })

  await db.awolEscalation.create({
    data: {
      leaveRecordId: id,
      escalatedById: session.user.id,
      notifiedStaff: body.notifiedStaff ?? null,
      policeContacted: body.policeContacted ?? false,
      policeIncidentNo: body.policeIncidentNo ?? null,
      notes: body.notes ?? null,
    },
  })

  await db.alert.create({
    data: {
      leaveRecordId: id,
      type: 'INCIDENT',
      severity: 'CRITICAL',
      message: `Patient declared AWOL. ${body.policeContacted ? `Police contacted — incident no. ${body.policeIncidentNo ?? 'pending'}.` : 'Police not yet contacted.'}`,
    },
  })

  await auditLog(
    session.user.id,
    'PATIENT_AWOL',
    `Patient declared AWOL. Notified: ${body.notifiedStaff ?? 'none'}. Police: ${body.policeContacted ? body.policeIncidentNo ?? 'yes' : 'no'}`,
    id
  )

  return NextResponse.json({ ok: true })
}
