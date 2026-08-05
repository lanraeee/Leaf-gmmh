import { NextRequest, NextResponse } from 'next/server'
import { auth, verifySeniorPin } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { method, pin, signatureData, wardId } = body

  const record = await db.leaveRecord.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: 'Record is not pending approval' }, { status: 400 })
  }

  if (method === 'PIN') {
    const verification = await verifySeniorPin(pin, wardId ?? record.wardId)
    if (!verification.valid || !verification.staffId) {
      return NextResponse.json({ approved: false }, { status: 200 })
    }

    await db.$transaction([
      db.leaveApproval.create({
        data: {
          leaveRecordId: id,
          approvedById: verification.staffId,
          method: 'PIN',
          approvedAt: new Date(),
        },
      }),
      db.leaveRecord.update({
        where: { id },
        data: { status: 'ON_LEAVE', departureTime: new Date() },
      }),
    ])

    await auditLog(verification.staffId, 'LEAVE_APPROVED_PIN', `Approved via PIN`, id)
    return NextResponse.json({ approved: true, approverName: verification.name })
  }

  if (method === 'SIGNATURE') {
    if (!signatureData) return NextResponse.json({ error: 'No signature data' }, { status: 400 })

    await db.$transaction([
      db.leaveApproval.create({
        data: {
          leaveRecordId: id,
          approvedById: session.user.id,
          method: 'SIGNATURE',
          signatureData,
          approvedAt: new Date(),
        },
      }),
      db.leaveRecord.update({
        where: { id },
        data: { status: 'ON_LEAVE', departureTime: new Date() },
      }),
    ])

    await auditLog(session.user.id, 'LEAVE_APPROVED_SIGNATURE', `Approved via signature`, id)
    return NextResponse.json({ approved: true, approverName: session.user.name })
  }

  return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
}
