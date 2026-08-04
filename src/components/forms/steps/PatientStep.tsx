'use client'

import { useState } from 'react'
import { Search, QrCode, User, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, riskColor, formatDate } from '@/lib/utils'
import type { Patient } from '@/types'

interface PatientStepProps {
  selectedPatient: Patient | null
  onSelect: (patient: Patient) => void
}

export function PatientStep({ selectedPatient, onSelect }: PatientStepProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.patients ?? [])
    setLoading(false)
  }

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-sm text-gray-500">MRN: {selectedPatient.mrn}</p>
              </div>
            </div>
            <Badge className={riskColor(selectedPatient.riskLevel)}>
              {selectedPatient.riskLevel ?? 'LOW'} risk
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">DOB</span>
              <p className="font-medium">{formatDate(selectedPatient.dateOfBirth)}</p>
            </div>
            <div>
              <span className="text-gray-500">Legal Status</span>
              <p className="font-medium">{selectedPatient.legalStatus.replace(/_/g, ' ')}</p>
            </div>
            {selectedPatient.consultantName && (
              <div>
                <span className="text-gray-500">Consultant</span>
                <p className="font-medium">{selectedPatient.consultantName}</p>
              </div>
            )}
            {selectedPatient.ward && (
              <div>
                <span className="text-gray-500">Ward</span>
                <p className="font-medium">{selectedPatient.ward.name}</p>
              </div>
            )}
          </div>
          {selectedPatient.legalStatus !== 'VOLUNTARY' && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Patient is on a legal order — confirm leave is clinically approved.
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setResults([]); setSearched(false) }}>
          Change Patient
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Name or MRN number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="flex-1"
        />
        <Button onClick={search} loading={loading} size="md">
          <Search className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="md" title="Scan wristband">
          <QrCode className="w-4 h-4" />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent" />
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-center text-gray-500 py-8 text-sm">No patients found. Try a different name or MRN.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((patient) => (
            <button
              key={patient.id}
              onClick={() => onSelect(patient)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</p>
                  <p className="text-sm text-gray-500">MRN: {patient.mrn} · {patient.ward?.name}</p>
                </div>
                <Badge className={cn('text-xs', riskColor(patient.riskLevel))}>
                  {patient.riskLevel ?? 'LOW'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
