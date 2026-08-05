'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void
  onClear?: () => void
  label?: string
  className?: string
}

type RecorderState = 'idle' | 'recording' | 'recorded' | 'playing'

const BAR_COUNT = 40

export function VoiceRecorder({
  onRecordingComplete,
  onClear,
  label = 'Record patient response',
  className,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  // Direct DOM refs for waveform bars — avoids 60fps React re-renders during recording
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    source.connect(analyser)
    analyserRef.current = analyser

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setDuration(elapsed)
      onRecordingComplete(blob, elapsed)
      setState('recorded')
      stream.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(animFrameRef.current)
      // Reset bars to flat
      barRefs.current.forEach((b) => { if (b) b.style.height = '4px' })
    }

    recorder.start(100)
    setState('recording')
    setElapsed(0)

    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

    // Animate waveform via direct DOM manipulation — no React state updates at 60fps
    function drawWave() {
      if (!analyserRef.current) return
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(data)
      barRefs.current.forEach((bar, i) => {
        if (bar) bar.style.height = `${Math.max(4, (data[i] / 255) * 48)}px`
      })
      animFrameRef.current = requestAnimationFrame(drawWave)
    }
    drawWave()
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function togglePlayback() {
    if (!audioRef.current || !audioUrl) return
    if (state === 'playing') {
      audioRef.current.pause()
      setState('recorded')
    } else {
      audioRef.current.play()
      setState('playing')
    }
  }

  function clearRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setElapsed(0)
    setDuration(0)
    barRefs.current.forEach((b) => { if (b) b.style.height = '4px' })
    setState('idle')
    onClear?.()
  }

  function formatTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const barColor = state === 'recording' ? 'bg-red-400' : state === 'recorded' || state === 'playing' ? 'bg-blue-400' : 'bg-gray-300'

  return (
    <div className={cn('rounded-2xl border-2 border-dashed border-gray-200 p-6 bg-gray-50', className)}>
      <p className="text-sm font-medium text-gray-700 mb-4">{label}</p>

      {/* Waveform — bars animated via direct DOM, not React state */}
      <div className="flex items-center gap-0.5 h-14 mb-4 justify-center">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { barRefs.current[i] = el }}
            className={cn('w-1.5 rounded-full', barColor)}
            style={{ height: '4px', transition: state === 'recording' ? 'none' : 'height 75ms' }}
          />
        ))}
      </div>

      {/* Timer */}
      <p className="text-center text-2xl font-mono font-bold text-gray-800 mb-5">
        {formatTime(state === 'recording' ? elapsed : duration)}
      </p>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {state === 'idle' && (
          <Button onClick={startRecording} size="lg" className="rounded-full px-8 bg-red-500 hover:bg-red-600">
            <Mic className="w-5 h-5 mr-2" /> Start Recording
          </Button>
        )}
        {state === 'recording' && (
          <Button onClick={stopRecording} size="lg" variant="danger" className="rounded-full px-8">
            <Square className="w-5 h-5 mr-2" /> Stop
          </Button>
        )}
        {(state === 'recorded' || state === 'playing') && (
          <>
            <Button onClick={togglePlayback} size="lg" variant="secondary" className="rounded-full">
              {state === 'playing' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Recording saved</span>
            </div>
            <Button onClick={clearRecording} size="lg" variant="ghost" className="rounded-full text-red-500">
              <Trash2 className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setState('recorded')}
          className="hidden"
        />
      )}
    </div>
  )
}
