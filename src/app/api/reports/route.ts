import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const wardId = searchParams.get('wardId')
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

  const where = {
    createdAt: { gte: from, lte: to },
    ...(wardId ? { wardId } : {}),
  }

  const [
    totalLeaves,
    byStatus,
    byType,
    overdueCount,
    avgReturnMinutes,
    recentLeaves,
  ] = await Promise.all([
    db.leaveRecord.count({ where }),
    db.leaveRecord.groupBy({ by: ['status'], _count: true, where }),
    db.leaveRecord.groupBy({ by: ['leaveType'], _count: true, where }),
    db.leaveRecord.count({ where: { ...where, status: 'OVERDUE' } }),
    db.leaveRecord.findMany({
      where: { ...where, status: 'RETURNED', actualReturnTime: { not: null } },
      select: { departureTime: true, actualReturnTime: true },
    }).then((records) => {
      if (records.length === 0) return 0
      const diffs = records
        .filter((r) => r.departureTime && r.actualReturnTime)
        .map((r) => (r.actualReturnTime!.getTime() - r.departureTime!.getTime()) / 60000)
      return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    }),
    db.leaveRecord.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    }),
  ])

  return NextResponse.json({
    totalLeaves,
    byStatus,
    byType,
    overdueCount,
    overdueRate: totalLeaves > 0 ? Math.round((overdueCount / totalLeaves) * 100) : 0,
    avgLeaveDurationMinutes: avgReturnMinutes,
    recentLeaves,
    period: { from: from.toISOString(), to: to.toISOString() },
  })
}
