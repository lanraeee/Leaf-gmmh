'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { LeaveType } from '@/types'

interface LeaveDetailsData {
  leaveType: LeaveType | ''
  destination: string
  destinationDetail: string
  escortName: string
  escortPhone: string
  isTimeAgreed: boolean
  returnDate: string
  returnTime: string
  notes: string
}

interface LeaveDetailsStepProps {
  data: LeaveDetailsData
  onChange: (field: keyof LeaveDetailsData, value: string | boolean) => void
}

const LEAVE_TYPES = [
  { value: 'UNESCORTED', label: 'Unescorted leave' },
  { value: 'ESCORTED', label: 'Escorted leave' },
  { value: 'THERAPEUTIC_LEAVE', label: 'Therapeutic leave' },
  { value: 'OVERNIGHT', label: 'Overnight leave' },
  { value: 'EXTENDED', label: 'Extended leave' },
]

const DESTINATIONS = [
  { value: 'Home', label: 'Home' },
  { value: 'Family/Friend', label: "Family / Friend's home" },
  { value: 'Community', label: 'Community (shops, town)' },
  { value: 'Hospital grounds', label: 'Hospital grounds' },
  { value: 'Medical appointment', label: 'Medical appointment' },
  { value: 'Other', label: 'Other (specify below)' },
]

export function LeaveDetailsStep({ data, onChange }: LeaveDetailsStepProps) {
  const isEscorted = data.leaveType === 'ESCORTED'

  return (
    <div className="space-y-5">
      <Select
        label="Leave type"
        options={LEAVE_TYPES}
        placeholder="Select leave type..."
        value={data.leaveType}
        onChange={(e) => onChange('leaveType', e.target.value)}
        required
      />

      <Select
        label="Destination"
        options={DESTINATIONS}
        placeholder="Select destination..."
        value={data.destination}
        onChange={(e) => onChange('destination', e.target.value)}
        required
      />

      {(data.destination === 'Other' || data.destination === 'Medical appointment') && (
        <Input
          label="Destination detail"
          placeholder="Specify destination..."
          value={data.destinationDetail}
          onChange={(e) => onChange('destinationDetail', e.target.value)}
        />
      )}

      {isEscorted && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <p className="col-span-2 text-sm font-medium text-gray-700">Escort details</p>
          <Input
            label="Escort name"
            placeholder="Full name..."
            value={data.escortName}
            onChange={(e) => onChange('escortName', e.target.value)}
            required
          />
          <Input
            label="Escort phone"
            type="tel"
            placeholder="Mobile number..."
            value={data.escortPhone}
            onChange={(e) => onChange('escortPhone', e.target.value)}
          />
        </div>
      )}

      {/* Return time */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Expected return</p>
        <div className="flex rounded-xl overflow-hidden border border-gray-300">
          <button
            type="button"
            onClick={() => onChange('isTimeAgreed', true)}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-all',
              data.isTimeAgreed ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
          >
            Agreed time
          </button>
          <button
            type="button"
            onClick={() => onChange('isTimeAgreed', false)}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-all',
              !data.isTimeAgreed ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}
          >
            Proposed time
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Return date"
            type="date"
            value={data.returnDate}
            onChange={(e) => onChange('returnDate', e.target.value)}
            required
          />
          <Input
            label="Return time"
            type="time"
            value={data.returnTime}
            onChange={(e) => onChange('returnTime', e.target.value)}
            required
          />
        </div>
      </div>

      <Textarea
        label="Additional notes"
        placeholder="Any other relevant information for this leave..."
        value={data.notes}
        onChange={(e) => onChange('notes', e.target.value)}
        rows={3}
      />
    </div>
  )
}
