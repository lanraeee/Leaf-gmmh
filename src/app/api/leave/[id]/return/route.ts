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

  const updated = await db.leaveRecord.update({
    where: { id },
    data: {
      status: 'RETURNED',
      actualReturnTime: body.actualReturnTime ? new Date(body.actualReturnTime) : new Date(),
      returnedById: session.user.id,
      returnConditionNotes: body.conditionNotes ?? null,
      incidentOnReturn: body.incidentOnReturn ?? false,
      incidentDetail: body.incidentDetail ?? null,
    },
  })

  // Acknowledge all alerts for this record on return
  await db.alert.updateMany({
    where: { leaveRecordId: id, isAcknowledged: false },
    data: { isAcknowledged: true, acknowledgedBy: session.user.id, acknowledgedAt: new Date() },
  })

  await auditLog(session.user.id, 'PATIENT_RETURNED', `Patient marked as returned`, id)

  return NextResponse.json({ id: updated.id, status: updated.status })
}
