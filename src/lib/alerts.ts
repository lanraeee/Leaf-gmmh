import { db } from './db'

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

    if (minutesOverdue >= 30 && minutesOverdue < 60) {
      await upsertAlert(record.id, 'OVERDUE', 'MEDIUM',
        `Patient overdue by ${Math.round(minutesOverdue)} minutes`)
      await db.leaveRecord.update({ where: { id: record.id }, data: { status: 'OVERDUE' } })
    } else if (minutesOverdue >= 60) {
      await upsertAlert(record.id, 'NOT_RETURNED', 'HIGH',
        `Patient has not returned — ${Math.round(minutesOverdue / 60)} hour(s) overdue`)
    } else if (minutesOverdue > -30 && minutesOverdue < 0) {
      await upsertAlert(record.id, 'APPROACHING_DUE', 'LOW',
        `Patient due to return in ${Math.round(-minutesOverdue)} minutes`)
    }
  }
}

async function upsertAlert(
  leaveRecordId: string,
  type: 'OVERDUE' | 'APPROACHING_DUE' | 'NOT_RETURNED' | 'INCIDENT',
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  message: string
) {
  const existing = await db.alert.findFirst({
    where: { leaveRecordId, type, isAcknowledged: false },
  })
  if (existing) return
  await db.alert.create({ data: { leaveRecordId, type, severity, message } })
}

export async function getActiveAlerts(wardId: string) {
  return db.alert.findMany({
    where: {
      isAcknowledged: false,
      leaveRecord: { wardId, status: { in: ['ON_LEAVE', 'OVERDUE'] } },
    },
    include: {
      leaveRecord: { include: { patient: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
