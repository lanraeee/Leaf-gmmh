'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VoiceRecorder } from '@/components/media/VoiceRecorder'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default function ReturnPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [conditionNotes, setConditionNotes] = useState('')
  const [incident, setIncident] = useState(false)
  const [incidentDetail, setIncidentDetail] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    await fetch(`/api/leave/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualReturnTime: new Date().toISOString(),
        conditionNotes,
        incidentOnReturn: incident,
        incidentDetail: incident ? incidentDetail : null,
      }),
    })
    router.push('/dashboard')
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Patient Return</h1>
        <p className="text-sm text-gray-500">Document the patient's return condition</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Return Assessment
          </h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <VoiceRecorder
            onRecordingComplete={(blob) => setAudioBlob(blob)}
            onClear={() => setAudioBlob(null)}
            label="Record patient's return condition (optional)"
          />
          <Textarea
            label="Written notes"
            placeholder="How did the patient return? Any concerns?"
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            rows={3}
          />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Incident on return?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIncident(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${!incident ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
              >
                No incident
              </button>
              <button
                onClick={() => setIncident(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${incident ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
              >
                <AlertTriangle className="w-4 h-4 inline mr-1" /> Incident
              </button>
            </div>
          </div>

          {incident && (
            <Textarea
              label="Incident details"
              placeholder="Describe what happened..."
              value={incidentDetail}
              onChange={(e) => setIncidentDetail(e.target.value)}
              rows={4}
              required
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={submit}
            loading={submitting}
            size="lg"
            disabled={incident && !incidentDetail}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Return
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
