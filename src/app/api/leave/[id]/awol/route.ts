import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { inphase } from '@/lib/inphase'
import { sendPushToWard } from '@/lib/push'
import { sendWardAlertEmail, awolEmailHtml } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const record = await db.leaveRecord.findUnique({
    where: { id },
    include: {
      patient: { include: { ward: true } },
      initiatedBy: true,
    },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['ON_LEAVE', 'OVERDUE', 'APPROVED'].includes(record.status)) {
    return NextResponse.json({ error: 'Only active leave records can be escalated to AWOL' }, { status: 400 })
  }

  const escalatedByStaff = await db.staff.findUnique({ where: { id: session.user.id } })

  // ─── File InPhase incident ─────────────────────────────────────────────────
  let inphaseRef: string | undefined
  let inphaseStatus: string | undefined

  try {
    const inphaseResult = await inphase.reportIncident({
      incidentType: 'PATIENT_AWOL',
      severity: 'CRITICAL',
      patientMrn: record.patient.mrn,
      patientName: `${record.patient.firstName} ${record.patient.lastName}`,
      wardCode: record.patient.ward.code,
      wardName: record.patient.ward.name,
      reportedByName: escalatedByStaff?.name ?? session.user.name ?? 'Unknown',
      reportedByEmail: escalatedByStaff?.email ?? session.user.email ?? '',
      incidentDatetime: new Date().toISOString(),
      description: `Patient ${record.patient.firstName} ${record.patient.lastName} (MRN: ${record.patient.mrn}) has been declared AWOL from ${record.patient.ward.name}.`,
      policeContacted: body.policeContacted ?? false,
      policeIncidentNo: body.policeIncidentNo,
      notifiedStaff: body.notifiedStaff,
      notes: body.notes,
    })
    if (inphaseResult.success) {
      inphaseRef = inphaseResult.ref
      inphaseStatus = 'OPEN'
    }
  } catch (err) {
    console.error('[AWOL] InPhase reporting failed:', err)
  }

  // ─── Update DB ─────────────────────────────────────────────────────────────
  await db.leaveRecord.update({ where: { id }, data: { status: 'AWOL' } })

  await db.awolEscalation.create({
    data: {
      leaveRecordId: id,
      escalatedById: session.user.id,
      notifiedStaff: body.notifiedStaff ?? null,
      policeContacted: body.policeContacted ?? false,
      policeIncidentNo: body.policeIncidentNo ?? null,
      notes: body.notes ?? null,
      inphaseRef: inphaseRef ?? null,
      inphaseStatus: inphaseStatus ?? null,
    },
  })

  await db.alert.create({
    data: {
      leaveRecordId: id,
      type: 'INCIDENT',
      severity: 'CRITICAL',
      message: `Patient declared AWOL. ${body.policeContacted ? `Police contacted — incident no. ${body.policeIncidentNo ?? 'pending'}.` : 'Police not yet contacted.'}${inphaseRef ? ` InPhase ref: ${inphaseRef}` : ''}`,
    },
  })

  await auditLog(
    session.user.id,
    'PATIENT_AWOL',
    `Patient declared AWOL. Notified: ${body.notifiedStaff ?? 'none'}. Police: ${body.policeContacted ? body.policeIncidentNo ?? 'yes' : 'no'}. InPhase: ${inphaseRef ?? 'stub'}`,
    id
  )

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ?? 'https://nhsleave.vercel.app'

  // ─── Push notification ─────────────────────────────────────────────────────
  sendPushToWard(record.wardId, {
    title: '🚨 Patient AWOL',
    body: `${record.patient.firstName} ${record.patient.lastName} (MRN ${record.patient.mrn}) has been declared AWOL`,
    tag: 'AWOL',
    url: '/dashboard',
    urgency: 'high',
  }).catch((err) => console.error('[AWOL] Push failed:', err))

  // ─── Email notification ────────────────────────────────────────────────────
  sendWardAlertEmail({
    wardId: record.wardId,
    subject: `🚨 AWOL Alert — ${record.patient.firstName} ${record.patient.lastName}`,
    html: awolEmailHtml({
      patientName: `${record.patient.firstName} ${record.patient.lastName}`,
      patientMrn: record.patient.mrn,
      wardName: record.patient.ward.name,
      escalatedBy: escalatedByStaff?.name ?? session.user.name ?? 'Staff',
      policeContacted: body.policeContacted ?? false,
      policeIncidentNo: body.policeIncidentNo,
      notifiedStaff: body.notifiedStaff,
      notes: body.notes,
      inphaseRef,
      appUrl,
    }),
    type: 'AWOL',
  }).catch((err) => console.error('[AWOL] Email failed:', err))

  return NextResponse.json({ ok: true, inphaseRef: inphaseRef ?? null })
}
