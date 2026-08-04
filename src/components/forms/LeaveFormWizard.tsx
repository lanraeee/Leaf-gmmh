'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { toast } from 'sonner'
import { PatientStep } from './steps/PatientStep'
import { ConsentStep } from './steps/ConsentStep'
import { AssessmentStep } from './steps/AssessmentStep'
import { AppearanceStep } from './steps/AppearanceStep'
import { LeaveDetailsStep } from './steps/LeaveDetailsStep'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Patient, ConsentStatus, LeaveType } from '@/types'

const STEPS = [
  { id: 'patient', title: 'Patient', description: 'Find & verify patient' },
  { id: 'consent', title: 'Consent', description: 'Voice recording consent' },
  { id: 'assessment', title: 'Assessment', description: "How are they feeling?" },
  { id: 'appearance', title: 'Appearance', description: 'Photo & clothing' },
  { id: 'details', title: 'Leave Details', description: 'Destination & return time' },
]

interface ClothingData {
  head: string; upper: string; lower: string; footwear: string; accessories: string; notes: string
}

const EMPTY_CLOTHING: ClothingData = { head: '', upper: '', lower: '', footwear: '', accessories: '', notes: '' }

export function LeaveFormWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — Patient
  const [patient, setPatient] = useState<Patient | null>(null)

  // Step 2 — Consent
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  // Step 3 — Assessment
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [assessmentNote, setAssessmentNote] = useState('')

  // Step 4 — Appearance
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [clothing, setClothing] = useState<ClothingData>(EMPTY_CLOTHING)

  // Step 5 — Leave Details
  const [leaveDetails, setLeaveDetails] = useState({
    leaveType: '' as LeaveType | '',
    destination: '',
    destinationDetail: '',
    escortName: '',
    escortPhone: '',
    isTimeAgreed: true,
    returnDate: '',
    returnTime: '',
    notes: '',
  })

  function canAdvance() {
    switch (step) {
      case 0: return !!patient
      case 1: return !!consentStatus
      case 2: return consentStatus === 'CONSENTED' ? !!audioBlob : !!assessmentNote
      case 3: return true
      case 4: return !!leaveDetails.leaveType && !!leaveDetails.destination && !!leaveDetails.returnDate && !!leaveDetails.returnTime
      default: return false
    }
  }

  async function submit() {
    if (!patient) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('patientId', (patient as any).id ?? '')
      formData.append('patientMrn', patient.mrn)
      formData.append('leaveType', leaveDetails.leaveType)
      formData.append('destination', leaveDetails.destination)
      formData.append('destinationDetail', leaveDetails.destinationDetail)
      formData.append('escortName', leaveDetails.escortName)
      formData.append('escortPhone', leaveDetails.escortPhone)
      formData.append('isTimeAgreed', String(leaveDetails.isTimeAgreed))
      formData.append('returnDateTime', `${leaveDetails.returnDate}T${leaveDetails.returnTime}`)
      formData.append('notes', leaveDetails.notes)
      formData.append('consentStatus', consentStatus ?? 'NOT_APPLICABLE')
      formData.append('declineReason', declineReason)
      formData.append('assessmentNote', assessmentNote)
      formData.append('clothing', JSON.stringify(clothing))

      if (audioBlob) formData.append('audio', audioBlob, 'recording.webm')
      if (photoBlob) formData.append('photo', photoBlob, 'appearance.jpg')

      const res = await fetch('/api/leave', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok && data.id) {
        router.push(`/leave/${data.id}/approve`)
      } else {
        toast.error(data.error ?? 'Failed to submit leave record. Please try again.')
      }
    } catch (err) {
      toast.error('Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                i === step && 'bg-blue-600 text-white shadow-sm',
                i < step && 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200',
                i > step && 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                i === step && 'bg-white text-blue-600',
                i < step && 'bg-green-500 text-white',
                i > step && 'bg-gray-300 text-gray-500'
              )}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:block">{s.title}</span>
            </button>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-300 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{STEPS[step].title}</h2>
          <p className="text-sm text-gray-500">{STEPS[step].description}</p>
        </div>
        <div className="px-6 py-6">
          {step === 0 && <PatientStep selectedPatient={patient} onSelect={setPatient} />}
          {step === 1 && (
            <ConsentStep
              status={consentStatus}
              declineReason={declineReason}
              onConsent={setConsentStatus}
              onDeclineReasonChange={setDeclineReason}
            />
          )}
          {step === 2 && (
            <AssessmentStep
              consentGiven={consentStatus === 'CONSENTED'}
              onRecordingComplete={(blob, dur) => { setAudioBlob(blob); setAudioDuration(dur) }}
              onRecordingClear={() => { setAudioBlob(null); setAudioDuration(0) }}
              hasRecording={!!audioBlob}
              declineNote={assessmentNote}
              onDeclineNoteChange={setAssessmentNote}
            />
          )}
          {step === 3 && (
            <AppearanceStep
              clothing={clothing}
              onClothingChange={(field, value) => setClothing((c) => ({ ...c, [field]: value }))}
              onPhotoCapture={(_, blob) => setPhotoBlob(blob)}
              onPhotoClear={() => setPhotoBlob(null)}
              hasPhoto={!!photoBlob}
            />
          )}
          {step === 4 && (
            <LeaveDetailsStep
              data={leaveDetails}
              onChange={(field, value) => setLeaveDetails((d) => ({ ...d, [field]: value }))}
            />
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canAdvance()} loading={submitting}>
              <Send className="w-4 h-4 mr-2" /> Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
