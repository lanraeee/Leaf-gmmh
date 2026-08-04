import { db } from './db'
import { headers } from 'next/headers'

export async function auditLog(
  staffId: string,
  action: string,
  detail?: string,
  leaveRecordId?: string
) {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? 'unknown'
  const ua = hdrs.get('user-agent') ?? 'unknown'

  await db.auditLog.create({
    data: { staffId, action, detail, leaveRecordId, ipAddress: ip, userAgent: ua },
  })
}
