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

  const wardFilter = wardId ? { wardId } : {}

  const [activeRecords, historyRecords, awolRecords, alerts] = await Promise.all([
    db.leaveRecord.findMany({
      where: { status: { in: ['ON_LEAVE', 'OVERDUE', 'APPROVED'] }, ...wardFilter },
      include: {
        patient: { include: { ward: true } },
        approval: { include: { approvedBy: true } },
        consent: true,
        voiceRecording: true,
        appearance: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.leaveRecord.findMany({
      where: { status: { in: ['RETURNED', 'CANCELLED'] }, ...wardFilter },
      include: {
        patient: { include: { ward: true } },
        approval: { include: { approvedBy: true } },
        returnedBy: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.leaveRecord.findMany({
      where: { status: 'AWOL', ...wardFilter },
      include: {
        patient: { include: { ward: true } },
        approval: { include: { approvedBy: true } },
        awolEscalation: { include: { escalatedBy: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.alert.findMany({
      where: {
        isAcknowledged: false,
        leaveRecord: { ...wardFilter, status: { in: ['ON_LEAVE', 'OVERDUE', 'AWOL'] } },
      },
      include: { leaveRecord: { include: { patient: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ward Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500">{formatDateTime(new Date())}</p>
        </div>
        {/* Hidden on mobile — bottom nav provides New Leave shortcut */}
        <Link href="/leave/new" className="hidden sm:block shrink-0">
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" /> New Leave Record
          </Button>
        </Link>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="flex-1 min-w-0">{alert.message}</span>
              <span className="text-red-400 shrink-0 text-xs">
                {alert.leaveRecord.patient?.firstName} {alert.leaveRecord.patient?.lastName}
              </span>
            </div>
          ))}
        </div>
      )}

      <LeaveBoard
        wardId={wardId ?? ''}
        initialRecords={activeRecords as never[]}
        initialHistory={historyRecords as never[]}
        initialAwol={awolRecords as never[]}
      />
    </div>
  )
}
