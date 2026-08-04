'use client'

import { useState } from 'react'
import { Delete, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PINPadProps {
  onVerify: (pin: string) => Promise<{ valid: boolean; name?: string }>
  onSuccess: (approverName: string) => void
  className?: string
}

const PIN_LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PINPad({ onVerify, onSuccess, className }: PINPadProps) {
  const [digits, setDigits] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'checking' | 'error' | 'locked'>('idle')
  const [attempts, setAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState<Date | null>(null)

  const isLocked = lockUntil && new Date() < lockUntil

  function handleKey(key: string) {
    if (isLocked || state === 'checking') return

    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      if (state === 'error') setState('idle')
      return
    }

    if (digits.length >= PIN_LENGTH) return

    const next = [...digits, key]
    setDigits(next)

    if (next.length === PIN_LENGTH) {
      submitPin(next.join(''))
    }
  }

  async function submitPin(pin: string) {
    setState('checking')
    const result = await onVerify(pin)

    if (result.valid && result.name) {
      onSuccess(result.name)
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setDigits([])

    if (nextAttempts >= 3) {
      const lockTime = new Date(Date.now() + 10 * 60 * 1000)
      setLockUntil(lockTime)
      setState('locked')
    } else {
      setState('error')
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <p className="text-sm font-medium text-gray-700">Enter Senior Nurse PIN</p>
      </div>

      {/* Dot display */}
      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all',
              i < digits.length
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300',
              state === 'error' && i < digits.length && 'bg-red-500 border-red-500'
            )}
          />
        ))}
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600 font-medium">
          Incorrect PIN — {3 - attempts} attempt{3 - attempts !== 1 ? 's' : ''} remaining
        </p>
      )}

      {isLocked && (
        <p className="text-sm text-red-600 font-medium text-center">
          PIN locked for 10 minutes after 3 failed attempts.<br />
          Contact your charge nurse to unlock.
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {KEYS.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={!!isLocked || state === 'checking'}
              className={cn(
                'h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95',
                'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-40',
                key === '⌫' && 'text-gray-500'
              )}
            >
              {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          )
        })}
      </div>

      {state === 'checking' && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm">Verifying...</span>
        </div>
      )}
    </div>
  )
}
