import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { LeaveBoard } from '@/components/dashboard/LeaveBoard'
import { Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  const wardId = session?.user?.wardId

  const [activeRecords, alerts] = await Promise.all([
    db.leaveRecord.findMany({
      where: {
        status: { in: ['ON_LEAVE', 'OVERDUE', 'APPROVED'] },
        ...(wardId ? { wardId } : {}),
      },
      include: {
        patient: { include: { ward: true } },
        approval: { include: { approvedBy: true } },
        consent: true,
        voiceRecording: true,
        appearance: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.alert.findMany({
      where: {
        isAcknowledged: false,
        leaveRecord: {
          ...(wardId ? { wardId } : {}),
          status: { in: ['ON_LEAVE', 'OVERDUE'] },
        },
      },
      include: { leaveRecord: { include: { patient: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Dashboard</h1>
          <p className="text-sm text-gray-500">{formatDateTime(new Date())}</p>
        </div>
        <Link href="/leave/new">
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" /> New Leave Record
          </Button>
        </Link>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{alert.message}</span>
              <span className="text-red-400 ml-auto">
                {alert.leaveRecord.patient?.firstName} {alert.leaveRecord.patient?.lastName}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Live leave board */}
      <LeaveBoard wardId={wardId ?? ''} initialRecords={activeRecords as never[]} />
    </div>
  )
}
