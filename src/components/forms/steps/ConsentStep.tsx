'use client'

import { Mic, MicOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ConsentStatus } from '@/types'

interface ConsentStepProps {
  status: ConsentStatus | null
  declineReason: string
  onConsent: (status: ConsentStatus) => void
  onDeclineReasonChange: (reason: string) => void
}

export function ConsentStep({ status, declineReason, onConsent, onDeclineReasonChange }: ConsentStepProps) {
  return (
    <div className="space-y-6">
      {/* Script for staff */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
        <p className="text-sm font-semibold text-blue-800 mb-2">Read aloud to patient:</p>
        <p className="text-sm text-blue-700 leading-relaxed italic">
          &quot;We would like to record your voice as part of your leave documentation today.
          This recording is stored securely and can only be accessed by your clinical team.
          Do you consent to being recorded?&quot;
        </p>
      </div>

      {/* Consent buttons */}
      {!status && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onConsent('CONSENTED')}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <Mic className="w-8 h-8 text-green-600" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Patient Consents</p>
              <p className="text-xs text-gray-500 mt-1">Voice recording will proceed</p>
            </div>
          </button>
          <button
            onClick={() => onConsent('DECLINED')}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
          >
            <MicOff className="w-8 h-8 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Patient Declines</p>
              <p className="text-xs text-gray-500 mt-1">Written note instead</p>
            </div>
          </button>
        </div>
      )}

      {status === 'CONSENTED' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Consent recorded</p>
            <p className="text-xs">Voice recording will be available in the next step.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onConsent(null as unknown as ConsentStatus)} className="ml-auto text-xs">
            Change
          </Button>
        </div>
      )}

      {status === 'DECLINED' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
            <MicOff className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Patient declined recording</p>
              <p className="text-xs">You can add a written note below.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onConsent(null as unknown as ConsentStatus)} className="ml-auto text-xs">
              Change
            </Button>
          </div>
          <Textarea
            label="Clinical note (optional)"
            placeholder="Note how the patient appeared, mood, any relevant observations..."
            value={declineReason}
            onChange={(e) => onDeclineReasonChange(e.target.value)}
            rows={4}
          />
        </div>
      )}
    </div>
  )
}
