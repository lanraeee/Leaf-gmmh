'use client'

import { useState } from 'react'
import { ShieldCheck, FileSignature, CheckCircle, User, Clock, MapPin } from 'lucide-react'
import { PINPad } from './PINPad'
import { SignaturePad } from './SignaturePad'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { LeaveRecord } from '@/types'

interface ApprovalScreenProps {
  leaveRecord: LeaveRecord
  wardId: string
  onApproved: () => void
}

type Method = 'choose' | 'pin' | 'signature'

export function ApprovalScreen({ leaveRecord, wardId, onApproved }: ApprovalScreenProps) {
  const [method, setMethod] = useState<Method>('choose')
  const [approving, setApproving] = useState(false)

  const patient = leaveRecord.patient!

  async function verifyPin(pin: string) {
    const res = await fetch('/api/leave/' + leaveRecord.id + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'PIN', pin, wardId }),
    })
    const data = await res.json()
    return { valid: data.approved, name: data.approverName }
  }

  async function submitSignature(dataUrl: string) {
    setApproving(true)
    await fetch('/api/leave/' + leaveRecord.id + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'SIGNATURE', signatureData: dataUrl, wardId }),
    })
    setApproving(false)
    onApproved()
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Leave Summary for Review */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Review Before Approval
          </h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">{patient.firstName} {patient.lastName}</span>
            <span className="text-gray-400">· MRN {patient.mrn}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{leaveRecord.destination}</span>
            {leaveRecord.destinationDetail && <span className="text-gray-400">— {leaveRecord.destinationDetail}</span>}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              Return: {formatDateTime(leaveRecord.agreedReturnTime ?? leaveRecord.proposedReturnTime)}
              {leaveRecord.isTimeAgreed ? ' (agreed)' : ' (proposed)'}
            </span>
          </div>
          {leaveRecord.escortName && (
            <div className="text-gray-700">
              Escort: <span className="font-medium">{leaveRecord.escortName}</span>
            </div>
          )}
          {leaveRecord.consent && (
            <div className={`text-xs rounded-lg px-3 py-1.5 ${leaveRecord.consent.status === 'CONSENTED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              Voice recording consent: {leaveRecord.consent.status}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Method */}
      {method === 'choose' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center font-medium">Select approval method:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('pin')}
              className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm md:text-base">PIN Code</p>
                <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Enter your 6-digit manager PIN</p>
              </div>
            </button>
            <button
              onClick={() => setMethod('signature')}
              className="flex flex-col items-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <FileSignature className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900 text-sm md:text-base">Signature</p>
                <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Sign on the tablet screen</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {method === 'pin' && (
        <Card>
          <CardContent className="pt-6">
            <PINPad
              onVerify={verifyPin}
              onSuccess={() => onApproved()}
            />
            <Button variant="ghost" size="sm" onClick={() => setMethod('choose')} className="mt-4 w-full">
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {method === 'signature' && (
        <Card>
          <CardContent className="pt-6">
            <SignaturePad
              onSign={submitSignature}
              onClear={() => {}}
            />
            {approving && (
              <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm">Saving approval...</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setMethod('choose')} className="mt-4 w-full">
              Back
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
