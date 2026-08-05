import { db } from '@/lib/db'
import { BarChart3, TrendingUp, Clock, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function ReportsPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [totalLeaves, byStatus, byType, overdueCount, returnedRecords, totalPatients] = await Promise.all([
    db.leaveRecord.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.leaveRecord.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.leaveRecord.groupBy({ by: ['leaveType'], _count: true, where: { createdAt: { gte: thirtyDaysAgo } } }),
    db.leaveRecord.count({ where: { status: 'OVERDUE', createdAt: { gte: thirtyDaysAgo } } }),
    db.leaveRecord.findMany({
      where: { status: 'RETURNED', actualReturnTime: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      select: { departureTime: true, actualReturnTime: true },
    }),
    db.patient.count({ where: { isActive: true } }),
  ])

  const avgDuration = returnedRecords.length > 0
    ? Math.round(
        returnedRecords
          .filter((r) => r.departureTime && r.actualReturnTime)
          .reduce((a, r) => a + (r.actualReturnTime!.getTime() - r.departureTime!.getTime()) / 60000, 0)
        / returnedRecords.length
      )
    : 0

  const overdueRate = totalLeaves > 0 ? Math.round((overdueCount / totalLeaves) * 100) : 0

  const STATUS_LABELS: Record<string, string> = {
    PENDING_APPROVAL: 'Pending',
    APPROVED: 'Approved',
    ON_LEAVE: 'On Leave',
    RETURNED: 'Returned',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  }

  const TYPE_LABELS: Record<string, string> = {
    UNESCORTED: 'Unescorted',
    ESCORTED: 'Escorted',
    THERAPEUTIC_LEAVE: 'Therapeutic',
    OVERNIGHT: 'Overnight',
    EXTENDED: 'Extended',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Last 30 days</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={<BarChart3 className="w-5 h-5 text-blue-600" />} label="Total Leaves" value={totalLeaves} color="bg-blue-50" />
        <KPICard icon={<Users className="w-5 h-5 text-purple-600" />} label="Active Patients" value={totalPatients} color="bg-purple-50" />
        <KPICard icon={<Clock className="w-5 h-5 text-green-600" />} label="Avg Duration" value={`${avgDuration}m`} color="bg-green-50" />
        <KPICard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} label="Overdue Rate" value={`${overdueRate}%`} color="bg-red-50" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* By Status */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Leave by Status</h2></CardHeader>
          <CardContent className="space-y-3">
            {byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${totalLeaves > 0 ? (s._count / totalLeaves) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{s._count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Leave by Type</h2></CardHeader>
          <CardContent className="space-y-3">
            {byType.map((t) => (
              <div key={t.leaveType} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{TYPE_LABELS[t.leaveType] ?? t.leaveType}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${totalLeaves > 0 ? (t._count / totalLeaves) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{t._count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-xl p-3">
        <TrendingUp className="w-4 h-4" />
        Full analytics with trend charts and ward comparisons available in a future sprint.
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={`${color} rounded-2xl p-4 border border-white/60`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
