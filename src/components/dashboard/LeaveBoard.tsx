'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, MapPin, User, AlertTriangle, CheckCircle2, RefreshCw,
  History, ShieldAlert, PhoneCall, FileWarning, ChevronDown, ChevronUp,
  X, ClipboardList
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatTime, formatDateTime, minutesOverdue, isOverdue, statusColor } from '@/lib/utils'
import type { LeaveRecord } from '@/types'
import { toast } from 'sonner'

type Tab = 'active' | 'awol' | 'history'

interface LeaveBoardProps {
  wardId: string
  initialRecords: LeaveRecord[]
  initialHistory: LeaveRecord[]
  initialAwol: LeaveRecord[]
}

export function LeaveBoard({ wardId, initialRecords, initialHistory, initialAwol }: LeaveBoardProps) {
  const [tab, setTab] = useState<Tab>('active')
  const [records, setRecords] = useState<LeaveRecord[]>(initialRecords)
  const [history, setHistory] = useState<LeaveRecord[]>(initialHistory)
  const [awol, setAwol] = useState<LeaveRecord[]>(initialAwol)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    const [active, hist, aw] = await Promise.all([
      fetch(`/api/leave?wardId=${wardId}&status=ON_LEAVE,OVERDUE,APPROVED`).then((r) => r.json()),
      fetch(`/api/leave?wardId=${wardId}&status=RETURNED,CANCELLED`).then((r) => r.json()),
      fetch(`/api/leave?wardId=${wardId}&status=AWOL`).then((r) => r.json()),
    ])
    setRecords(active.records ?? [])
    setHistory(hist.records ?? [])
    setAwol(aw.records ?? [])
    setLastRefresh(new Date())
    setLoading(false)
  }, [wardId])

  useEffect(() => {
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  const overdueCount = records.filter(
    (r) => r.status === 'OVERDUE' || (r.status === 'ON_LEAVE' && isOverdue(r.agreedReturnTime ?? r.proposedReturnTime))
  ).length

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Active</span>
            <Badge className={cn('text-xs shrink-0', overdueCount > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700')}>
              {records.length}
            </Badge>
          </TabBtn>
          <TabBtn active={tab === 'awol'} onClick={() => setTab('awol')}>
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">AWOL</span>
            {awol.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs shrink-0">{awol.length}</Badge>
            )}
          </TabBtn>
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
            <History className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">History</span>
            <Badge className="bg-gray-200 text-gray-600 text-xs shrink-0">{history.length}</Badge>
          </TabBtn>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} loading={loading} className="shrink-0">
          <RefreshCw className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Active tab */}
      {tab === 'active' && (
        <div className="space-y-3">
          {records.length === 0 && (
            <EmptyState icon={<CheckCircle2 className="w-12 h-12 opacity-30" />} message="No patients currently on leave" />
          )}
          {records.map((record) => (
            <LeaveCard key={record.id} record={record} onAction={refresh} />
          ))}
        </div>
      )}

      {/* AWOL tab */}
      {tab === 'awol' && (
        <div className="space-y-3">
          {awol.length === 0 && (
            <EmptyState icon={<ShieldAlert className="w-12 h-12 opacity-30" />} message="No patients currently reported AWOL" />
          )}
          {awol.map((record) => (
            <AwolCard key={record.id} record={record} onReturn={refresh} />
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && (
            <EmptyState icon={<History className="w-12 h-12 opacity-30" />} message="No historical leave records yet" />
          )}
          {history.map((record) => (
            <HistoryCard key={record.id} record={record} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">
        Last updated {formatTime(lastRefresh)} · auto-refreshes every 60s
      </p>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Active leave card ────────────────────────────────────────────────────────

function LeaveCard({ record, onAction }: { record: LeaveRecord; onAction: () => void }) {
  const router = useRouter()
  const [showEscalate, setShowEscalate] = useState(false)
  const dueTime = record.agreedReturnTime ?? record.proposedReturnTime
  const overdue = (record.status === 'ON_LEAVE' && isOverdue(dueTime)) || record.status === 'OVERDUE'
  const overdueMins = dueTime ? minutesOverdue(dueTime) : 0

  return (
    <>
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

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">Dep. {formatTime(record.departureTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{record.destination}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 font-medium col-span-2 sm:col-span-1', overdue ? 'text-red-600' : 'text-gray-600')}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {overdue
                ? `Overdue ${overdueMins}m`
                : `Due ${formatTime(dueTime)} ${record.isTimeAgreed ? '(agreed)' : '(proposed)'}`}
            </span>
          </div>
        </div>

        {overdue && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Patient is {overdueMins} minute{overdueMins !== 1 ? 's' : ''} overdue — follow escalation protocol
          </div>
        )}

        <div className={cn('mt-4 flex gap-2', overdue ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'justify-end')}>
          {overdue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEscalate(true)}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 w-full sm:w-auto"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Declare AWOL
            </Button>
          )}
          <Button size="sm" onClick={() => router.push(`/leave/${record.id}/return`)} className={cn(overdue ? 'w-full sm:w-auto' : '')}>
            <ClipboardList className="w-4 h-4 mr-1.5" /> Document Return
          </Button>
        </div>
      </div>

      {showEscalate && (
        <AwolEscalationModal
          record={record}
          onClose={() => setShowEscalate(false)}
          onDone={() => { setShowEscalate(false); onAction() }}
        />
      )}
    </>
  )
}

// ─── AWOL escalation modal ────────────────────────────────────────────────────

function AwolEscalationModal({ record, onClose, onDone }: {
  record: LeaveRecord
  onClose: () => void
  onDone: () => void
}) {
  const [notifiedStaff, setNotifiedStaff] = useState('')
  const [policeContacted, setPoliceContacted] = useState(false)
  const [policeIncidentNo, setPoliceIncidentNo] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!notifiedStaff.trim()) {
      toast.error('Please enter who was notified before declaring AWOL')
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/leave/${record.id}/awol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifiedStaff, policeContacted, policeIncidentNo: policeIncidentNo || null, notes }),
    })
    if (res.ok) {
      toast.success('Patient declared AWOL — escalation logged')
      onDone()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to escalate')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-orange-700">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-semibold">Declare Patient AWOL</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
            <p className="font-semibold">{record.patient?.firstName} {record.patient?.lastName}</p>
            <p className="text-xs text-orange-600 mt-0.5">MRN: {record.patient?.mrn} · Destination: {record.destination}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Who was notified? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={notifiedStaff}
              onChange={(e) => setNotifiedStaff(e.target.value)}
              placeholder="e.g. Sr. Walsh (Charge Nurse), Dr. Byrne (Consultant)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={policeContacted}
                onChange={(e) => setPoliceContacted(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-gray-500" /> Police contacted
              </span>
            </label>
            {policeContacted && (
              <input
                type="text"
                value={policeIncidentNo}
                onChange={(e) => setPoliceIncidentNo(e.target.value)}
                placeholder="Police incident / CAD number (if available)"
                className="mt-2 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other relevant information about the escalation..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            loading={submitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <FileWarning className="w-4 h-4 mr-1.5" /> Confirm AWOL
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── AWOL patient card ────────────────────────────────────────────────────────

function AwolCard({ record, onReturn }: { record: LeaveRecord; onReturn: () => void }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const esc = record.awolEscalation
  const dueTime = record.agreedReturnTime ?? record.proposedReturnTime
  const overdueMins = dueTime ? minutesOverdue(dueTime) : 0

  return (
    <div className="bg-white rounded-2xl border-2 border-orange-300 shadow-orange-100 shadow-md p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {record.patient?.firstName} {record.patient?.lastName}
            </p>
            <p className="text-xs text-gray-500">MRN: {record.patient?.mrn}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 shrink-0">
          AWOL
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{record.destination}</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-700 font-medium">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Overdue {overdueMins}m
        </div>
      </div>

      {esc && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Escalation details
          </button>
          {expanded && (
            <div className="mt-2 bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
              <p><span className="font-medium text-gray-700">Notified:</span> {esc.notifiedStaff ?? '—'}</p>
              <p>
                <span className="font-medium text-gray-700">Police:</span>{' '}
                {esc.policeContacted
                  ? `Yes — incident no. ${esc.policeIncidentNo ?? 'pending'}`
                  : 'Not contacted'}
              </p>
              {esc.notes && <p><span className="font-medium text-gray-700">Notes:</span> {esc.notes}</p>}
              <p className="text-xs text-gray-400">
                Escalated {formatDateTime(esc.escalatedAt)} by {esc.escalatedBy?.name ?? 'staff'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={() => router.push(`/leave/${record.id}/return`)}>
          <ClipboardList className="w-4 h-4 mr-1.5" /> Document Return
        </Button>
      </div>
    </div>
  )
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ record }: { record: LeaveRecord }) {
  const returned = record.status === 'RETURNED'
  const dueTime = record.agreedReturnTime ?? record.proposedReturnTime
  const wasLate = returned && record.actualReturnTime && dueTime
    ? new Date(record.actualReturnTime) > new Date(dueTime)
    : false

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 opacity-90">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
            returned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}>
            {returned ? '✓' : '✕'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {record.patient?.firstName} {record.patient?.lastName}
            </p>
            <p className="text-xs text-gray-500">MRN: {record.patient?.mrn} · {record.leaveType.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {wasLate && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              Returned late
            </span>
          )}
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor(record.status))}>
            {record.status}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1 shrink-0">
          <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate max-w-[120px]">{record.destination}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3 shrink-0" /> Left {formatTime(record.departureTime)}
        </div>
        {returned && record.actualReturnTime && (
          <div className="flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
            Returned {formatTime(record.actualReturnTime)}
            {record.returnedBy && <span className="text-gray-400 hidden sm:inline"> · {record.returnedBy.name}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
