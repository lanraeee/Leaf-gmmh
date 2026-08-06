'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, ChevronRight, RefreshCw, Users, UserCheck, Layers, Wifi, WifiOff, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface WardUnit {
  id: string
  name: string
  code: string
  description?: string
  bedCount?: number
  isActive: boolean
  _count?: { patients: number }
}

interface Ward {
  id: string
  name: string
  code: string
  location: string
  phone?: string
  email?: string
  description?: string
  isActive: boolean
  createdAt: string
  units: WardUnit[]
  _count: { staff: number; patients: number }
}

interface ParisStatus {
  available: boolean
  mode: 'live' | 'stub'
  lastSync: string | null
  totalSynced: number
}

export default function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([])
  const [parisStatus, setParisStatus] = useState<ParisStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedWard, setExpandedWard] = useState<string | null>(null)
  const [showNewWard, setShowNewWard] = useState(false)
  const [showNewUnit, setShowNewUnit] = useState<string | null>(null)
  const [editingWard, setEditingWard] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [wardsRes, parisRes] = await Promise.all([
      fetch('/api/wards'),
      fetch('/api/paris/sync'),
    ])
    const wardsData = await wardsRes.json()
    const parisData = await parisRes.json()
    setWards(wardsData.wards ?? [])
    setParisStatus(parisData)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function triggerParisSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/paris/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.ok) {
        alert(`PARIS sync complete: ${data.synced} patients synced.`)
        loadData()
      } else {
        alert(data.message ?? 'Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Wards & Units</h1>
          <p className="text-sm text-gray-500">{wards.length} ward{wards.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button size="md" onClick={() => setShowNewWard(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add Ward
        </Button>
      </div>

      {/* PARIS Status Card */}
      {parisStatus && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            {parisStatus.available ? (
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-amber-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                PARIS — {parisStatus.available ? 'Connected' : 'Stub mode'}
              </p>
              <p className="text-xs text-gray-500">
                {parisStatus.totalSynced} patients synced
                {parisStatus.lastSync ? ` · Last sync: ${new Date(parisStatus.lastSync).toLocaleDateString('en-IE')}` : ' · Never synced'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={triggerParisSync}
              disabled={syncing}
              className="shrink-0"
            >
              {syncing ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Ward Form */}
      {showNewWard && (
        <NewWardForm
          onCreated={() => { setShowNewWard(false); loadData() }}
          onCancel={() => setShowNewWard(false)}
        />
      )}

      {/* Ward List */}
      <div className="space-y-3">
        {wards.map((ward) => (
          <Card key={ward.id} className={cn(!ward.isActive && 'opacity-60')}>
            <CardHeader className="p-0">
              <button
                className="w-full flex items-center gap-3 px-4 md:px-5 py-4 text-left"
                onClick={() => setExpandedWard(expandedWard === ward.id ? null : ward.id)}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{ward.name}</p>
                    <Badge className="text-xs bg-gray-100 text-gray-600 font-mono">{ward.code}</Badge>
                    {!ward.isActive && <Badge className="text-xs bg-red-100 text-red-600">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{ward.location}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{ward._count.staff} staff</span>
                    <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" />{ward._count.patients} patients</span>
                    <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{ward.units.length} units</span>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expandedWard === ward.id && 'rotate-90')} />
                </div>
              </button>
            </CardHeader>

            {expandedWard === ward.id && (
              <CardContent className="px-4 md:px-5 pb-4 border-t border-gray-100">
                {editingWard === ward.id ? (
                  <EditWardForm
                    ward={ward}
                    onSaved={() => { setEditingWard(null); loadData() }}
                    onCancel={() => setEditingWard(null)}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 text-sm">
                      {ward.location && <InfoItem label="Location" value={ward.location} />}
                      {ward.phone && <InfoItem label="Phone" value={ward.phone} />}
                      {ward.email && <InfoItem label="Email" value={ward.email} />}
                      {ward.description && <InfoItem label="Description" value={ward.description} className="col-span-2 sm:col-span-3" />}
                    </div>

                    <div className="flex items-center justify-between mt-2 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</p>
                      <button
                        onClick={() => setEditingWard(ward.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Edit ward
                      </button>
                    </div>

                    {ward.units.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No units registered</p>
                    ) : (
                      <div className="space-y-2">
                        {ward.units.map((unit) => (
                          <div key={unit.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{unit.name}</p>
                              <p className="text-xs text-gray-500">
                                Code: <span className="font-mono">{unit.code}</span>
                                {unit.bedCount ? ` · ${unit.bedCount} beds` : ''}
                                {unit._count ? ` · ${unit._count.patients} patients` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {showNewUnit === ward.id ? (
                      <NewUnitForm
                        wardId={ward.id}
                        onCreated={() => { setShowNewUnit(null); loadData() }}
                        onCancel={() => setShowNewUnit(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setShowNewUnit(ward.id)}
                        className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-3.5 h-3.5" /> Register unit
                      </button>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {wards.length === 0 && !showNewWard && (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No wards registered yet.</p>
          <button onClick={() => setShowNewWard(true)} className="mt-2 text-sm text-blue-600 hover:underline">
            Add the first ward
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  )
}

function NewWardForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', location: '', phone: '', email: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/wards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : 'Failed to create ward'); return }
    onCreated()
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">New Ward</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Ward name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <FormField label="Ward code *" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="e.g. W1A" required />
            <FormField label="Location *" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required className="sm:col-span-2" />
            <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
            <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="sm:col-span-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Create Ward'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EditWardForm({ ward, onSaved, onCancel }: { ward: Ward; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: ward.name,
    location: ward.location,
    phone: ward.phone ?? '',
    email: ward.email ?? '',
    description: ward.description ?? '',
    isActive: ward.isActive,
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/wards/${ward.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="space-y-3 pt-3">
      <p className="text-sm font-semibold text-gray-900">Edit Ward</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Ward name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Location *" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required />
        <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
        <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
        <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="sm:col-span-2" />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded"
          />
          Ward is active
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : <><Check className="w-3.5 h-3.5 mr-1" /> Save</>}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
      </div>
    </form>
  )
}

function NewUnitForm({ wardId, onCreated, onCancel }: { wardId: string; onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', description: '', bedCount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/wards/${wardId}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, code: form.code.toUpperCase(), bedCount: form.bedCount ? parseInt(form.bedCount) : undefined }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    onCreated()
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 bg-purple-50/40 border border-purple-200 rounded-xl p-3">
      <p className="text-sm font-semibold text-gray-900">Register Unit</p>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Unit name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Unit code *" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="e.g. HDU" required />
        <FormField label="Bed count" value={form.bedCount} onChange={(v) => setForm({ ...form, bedCount: v })} type="number" />
        <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Register'}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

function FormField({
  label, value, onChange, required, type = 'text', placeholder, className,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; type?: string; placeholder?: string; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
