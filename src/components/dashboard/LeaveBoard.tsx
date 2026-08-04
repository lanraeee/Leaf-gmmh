'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin, User, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatTime, minutesOverdue, isOverdue, statusColor } from '@/lib/utils'
import type { LeaveRecord } from '@/types'

interface LeaveBoardProps {
  wardId: string
  initialRecords: LeaveRecord[]
}

export function LeaveBoard({ wardId, initialRecords }: LeaveBoardProps) {
  const [records, setRecords] = useState<LeaveRecord[]>(initialRecords)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/leave?wardId=${wardId}&status=ON_LEAVE,OVERDUE,APPROVED`)
    const data = await res.json()
    setRecords(data.records ?? [])
    setLastRefresh(new Date())
    setLoading(false)
  }, [wardId])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  const activeRecords = records.filter((r) => ['ON_LEAVE', 'OVERDUE', 'APPROVED'].includes(r.status))
  const overdueRecords = activeRecords.filter((r) => r.status === 'OVERDUE' || isOverdue(r.agreedReturnTime ?? r.proposedReturnTime))

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Patients on Leave</h2>
          <Badge className="bg-blue-100 text-blue-800">{activeRecords.length} active</Badge>
          {overdueRecords.length > 0 && (
            <Badge className="bg-red-100 text-red-700 animate-pulse">
              {overdueRecords.length} overdue
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {activeRecords.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No patients currently on leave</p>
        </div>
      )}

      <div className="space-y-3">
        {activeRecords.map((record) => (
          <LeaveCard key={record.id} record={record} onReturn={refresh} />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-right">
        Last updated {formatTime(lastRefresh)} · auto-refreshes every 60s
      </p>
    </div>
  )
}

function LeaveCard({ record, onReturn }: { record: LeaveRecord; onReturn: () => void }) {
  const [returning, setReturning] = useState(false)
  const dueTime = record.agreedReturnTime ?? record.proposedReturnTime
  const overdue = isOverdue(dueTime)
  const overdueMins = dueTime ? minutesOverdue(dueTime) : 0

  async function markReturned() {
    setReturning(true)
    await fetch(`/api/leave/${record.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualReturnTime: new Date().toISOString() }),
    })
    onReturn()
    setReturning(false)
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border-2 p-5 transition-all',
      overdue ? 'border-red-300 shadow-red-100 shadow-md' : 'border-gray-200'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            overdue ? 'bg-red-100' : 'bg-blue-100')}>
            {overdue
              ? <AlertTriangle className="w-5 h-5 text-red-600" />
              : <User className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {record.patient?.firstName} {record.patient?.lastName}
            </p>
            <p className="text-xs text-gray-500">MRN: {record.patient?.mrn}</p>
          </div>
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusColor(record.status))}>
          {record.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          Departed {formatTime(record.departureTime)}
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate">{record.destination}</span>
        </div>
        <div className={cn('flex items-center gap-1.5 font-medium', overdue ? 'text-red-600' : 'text-gray-600')}>
          <Clock className="w-3.5 h-3.5" />
          {overdue
            ? `Overdue ${overdueMins}m`
            : `Due ${formatTime(dueTime)} ${record.isTimeAgreed ? '(agreed)' : '(proposed)'}`}
        </div>
      </div>

      {overdue && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-3 py-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Patient is {overdueMins} minute{overdueMins !== 1 ? 's' : ''} overdue — follow escalation protocol
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={markReturned} loading={returning}>
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Returned
        </Button>
      </div>
    </div>
  )
}
