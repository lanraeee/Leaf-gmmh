import { db } from './db'
import { sendPushToWard } from './push'
import { sendWardAlertEmail, overdueEmailHtml } from './email'

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ?? 'https://nhsleave.vercel.app'

export async function checkOverdueLeaves() {
  const now = new Date()

  const onLeave = await db.leaveRecord.findMany({
    where: { status: 'ON_LEAVE' },
    include: { patient: true, ward: true },
  })

  for (const record of onLeave) {
    const dueTime = record.agreedReturnTime ?? record.proposedReturnTime
    if (!dueTime) continue

    const minutesOverdue = (now.getTime() - dueTime.getTime()) / 60000

    if (minutesOverdue >= 60) {
      const created = await upsertAlert(record.id, 'NOT_RETURNED', 'HIGH',
        `Patient has not returned — ${Math.round(minutesOverdue / 60)} hour(s) overdue`)

      if (created) {
        // Only fire notifications when the alert is newly created (not on repeated checks)
        const dueStr = dueTime.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })

        sendPushToWard(record.wardId, {
          title: '⚠️ Patient Not Returned',
          body: `${record.patient.firstName} ${record.patient.lastName} is ${Math.round(minutesOverdue)} min overdue`,
          tag: 'OVERDUE',
          url: '/dashboard',
          urgency: 'high',
        }).catch(() => {})

        sendWardAlertEmail({
          wardId: record.wardId,
          subject: `⚠️ Patient Overdue — ${record.patient.firstName} ${record.patient.lastName}`,
          html: overdueEmailHtml({
            patientName: `${record.patient.firstName} ${record.patient.lastName}`,
            patientMrn: record.patient.mrn,
            wardName: record.ward.name,
            minutesOverdue: Math.round(minutesOverdue),
            dueTime: dueStr,
            appUrl: APP_URL,
          }),
          type: 'OVERDUE',
        }).catch(() => {})
      }
    } else if (minutesOverdue >= 30 && minutesOverdue < 60) {
      await upsertAlert(record.id, 'OVERDUE', 'MEDIUM',
        `Patient overdue by ${Math.round(minutesOverdue)} minutes`)
      await db.leaveRecord.update({ where: { id: record.id }, data: { status: 'OVERDUE' } })
    } else if (minutesOverdue > -30 && minutesOverdue < 0) {
      const created = await upsertAlert(record.id, 'APPROACHING_DUE', 'LOW',
        `Patient due to return in ${Math.round(-minutesOverdue)} minutes`)

      if (created) {
        sendPushToWard(record.wardId, {
          title: '🕐 Patient Due Soon',
          body: `${record.patient.firstName} ${record.patient.lastName} is due back in ${Math.round(-minutesOverdue)} min`,
          tag: 'APPROACHING_DUE',
          url: '/dashboard',
          urgency: 'normal',
        }).catch(() => {})
      }
    }
  }
}

// Returns true if a new alert was created (vs. already existed)
async function upsertAlert(
  leaveRecordId: string,
  type: 'OVERDUE' | 'APPROACHING_DUE' | 'NOT_RETURNED' | 'INCIDENT',
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  message: string
): Promise<boolean> {
  const existing = await db.alert.findFirst({
    where: { leaveRecordId, type, isAcknowledged: false },
  })
  if (existing) return false
  await db.alert.create({ data: { leaveRecordId, type, severity, message } })
  return true
}

export async function getActiveAlerts(wardId: string) {
  return db.alert.findMany({
    where: {
      isAcknowledged: false,
      leaveRecord: { wardId, status: { in: ['ON_LEAVE', 'OVERDUE', 'AWOL'] } },
    },
    include: {
      leaveRecord: { include: { patient: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
