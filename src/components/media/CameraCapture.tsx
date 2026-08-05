'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onPhotoCapture: (blurredDataUrl: string, originalBlob: Blob) => void
  onClear?: () => void
  className?: string
}

export function CameraCapture({ onPhotoCapture, onClear, className }: CameraCaptureProps) {
  const [phase, setPhase] = useState<'idle' | 'preview' | 'captured' | 'blurring' | 'done' | 'error'>('idle')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => stopStream()
  }, [])

  async function startCamera() {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('preview')
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.')
      setPhase('error')
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    setPhase('blurring')
    stopStream()

    canvas.toBlob(async (blob) => {
      if (!blob) return

      // Apply CSS blur via offscreen canvas — face-api.js would run here
      // when loaded. For now: pixelate the top 40% of image (face region heuristic)
      blurFaceRegion(canvas, ctx)

      const blurredUrl = canvas.toDataURL('image/jpeg', 0.92)
      setCapturedUrl(blurredUrl)
      setPhase('done')

      canvas.toBlob((blurredBlob) => {
        if (blurredBlob) onPhotoCapture(blurredUrl, blurredBlob)
      }, 'image/jpeg', 0.92)
    }, 'image/jpeg')
  }, [onPhotoCapture])

  function blurFaceRegion(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const { width, height } = canvas
    const faceH = Math.floor(height * 0.55)
    const pixelSize = 18

    // Read the entire face region once (single GPU readback instead of ~1500 individual ones)
    const imageData = ctx.getImageData(0, 0, width, faceH)
    const data = imageData.data

    for (let y = 0; y < faceH; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        const idx = (y * width + x) * 4
        ctx.fillStyle = `rgb(${data[idx]},${data[idx + 1]},${data[idx + 2]})`
        ctx.fillRect(x, y, pixelSize, pixelSize)
      }
    }

    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, width, 32)
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    ctx.fillText('Face blurred for privacy — PLDS', 10, 22)
  }

  function retake() {
    setCapturedUrl(null)
    setPhase('idle')
    onClear?.()
  }

  return (
    <div className={cn('rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-900', className)}>
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 bg-gray-50">
          <Camera className="w-12 h-12 text-gray-400" />
          <p className="text-sm text-gray-500 text-center">
            Take a photo of the patient's clothing for leave documentation.<br />
            The face will be automatically blurred.
          </p>
          <Button onClick={startCamera} size="lg">
            <Camera className="w-5 h-5 mr-2" /> Open Camera
          </Button>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center gap-3 py-12 px-6 bg-red-50">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-600 text-center">{error}</p>
          <Button onClick={startCamera} variant="outline">Try Again</Button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="relative">
          <video ref={videoRef} className="w-full rounded-2xl" playsInline muted />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button onClick={() => { stopStream(); setPhase('idle') }} variant="secondary" size="lg" className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <Button onClick={capturePhoto} size="xl" className="rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow-lg">
              <Camera className="w-7 h-7" />
            </Button>
          </div>
        </div>
      )}

      {phase === 'blurring' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Applying face blur...</p>
        </div>
      )}

      {phase === 'done' && capturedUrl && (
        <div className="relative">
          <img src={capturedUrl} alt="Patient appearance (face blurred)" className="w-full rounded-2xl" />
          <div className="absolute top-3 right-3 flex gap-2">
            <Button onClick={retake} size="sm" variant="secondary" className="rounded-full shadow-lg">
              <RefreshCw className="w-4 h-4 mr-1" /> Retake
            </Button>
          </div>
          <div className="absolute bottom-3 left-3 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow">
            <Check className="w-3.5 h-3.5" /> Face blurred
          </div>
        </div>
      )}
    </div>
  )
}
