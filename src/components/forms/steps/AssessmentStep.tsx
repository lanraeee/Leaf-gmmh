'use client'

import { useState } from 'react'
import { VoiceRecorder } from '@/components/media/VoiceRecorder'
import { Textarea } from '@/components/ui/textarea'
import { MicOff, ChevronDown } from 'lucide-react'

interface AssessmentStepProps {
  consentGiven: boolean
  onRecordingComplete: (blob: Blob, duration: number) => void
  onRecordingClear: () => void
  hasRecording: boolean
  declineNote: string
  onDeclineNoteChange: (v: string) => void
}

export function AssessmentStep({
  consentGiven,
  onRecordingComplete,
  onRecordingClear,
  hasRecording,
  declineNote,
  onDeclineNoteChange,
}: AssessmentStepProps) {
  const [showNoteOverride, setShowNoteOverride] = useState(false)

  if (!consentGiven) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
          <MicOff className="w-5 h-5" />
          <p className="text-sm">Patient declined voice recording — please add a written clinical note.</p>
        </div>
        <Textarea
          label="How is the patient feeling? (clinical observation)"
          placeholder="Describe the patient's mood, presentation, and response when asked how they are feeling..."
          value={declineNote}
          onChange={(e) => onDeclineNoteChange(e.target.value)}
          rows={6}
          required
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
        <p className="font-medium mb-1">Ask the patient:</p>
        <p className="text-lg font-semibold text-gray-900 italic">
          &quot;How are you feeling today?&quot;
        </p>
        <p className="text-xs text-gray-500 mt-2">Then press Start Recording and let the patient respond naturally.</p>
      </div>
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onClear={onRecordingClear}
        label={hasRecording ? 'Recording saved' : 'Tap to record patient response'}
      />
      {!hasRecording && (
        <div>
          <button
            type="button"
            onClick={() => setShowNoteOverride((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNoteOverride ? 'rotate-180' : ''}`} />
            Can&apos;t record? Add a written note instead
          </button>
          {showNoteOverride && (
            <div className="mt-3">
              <Textarea
                label="Clinical observation (if recording unavailable)"
                placeholder="Describe the patient's mood, presentation, and how they are feeling..."
                value={declineNote}
                onChange={(e) => onDeclineNoteChange(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
