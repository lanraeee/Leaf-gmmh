'use client'

import { useRef, useState } from 'react'
import { Pen, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  onSign: (dataUrl: string) => void
  onClear?: () => void
}

export function SignaturePad({ onSign, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [signed, setSigned] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    setDrawing(true)
    lastPos.current = getPos(e)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  function onPointerUp() {
    setDrawing(false)
    lastPos.current = null
    setSigned(true)
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
    onClear?.()
  }

  function confirm() {
    if (!signed || !canvasRef.current) return
    onSign(canvasRef.current.toDataURL('image/png'))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Pen className="w-4 h-4" />
        Senior nurse — sign below to approve
      </div>
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          className="w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={clear} className="flex-1">
          <Trash2 className="w-4 h-4 mr-1.5" /> Clear
        </Button>
        <Button size="sm" onClick={confirm} disabled={!signed} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-1.5" /> Confirm Signature
        </Button>
      </div>
    </div>
  )
}
