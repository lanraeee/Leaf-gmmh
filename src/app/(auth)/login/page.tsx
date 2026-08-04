'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Activity, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) setError('Invalid email or password')
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  async function handleAzureSSO() {
    setLoading(true)
    await signIn('microsoft-entra-id', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">PLDS</h1>
            <p className="text-gray-400 text-sm">Patient Leave Documentation System</p>
          </div>
        </div>

        {/* SSO Button */}
        <button
          onClick={handleAzureSSO}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 rounded-2xl hover:bg-gray-100 transition-all disabled:opacity-50"
        >
          <Building2 className="w-5 h-5 text-blue-600" />
          Sign in with HSE Account
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-500">or staff login</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Credentials form */}
        <form onSubmit={handleCredentials} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@hse.ie"
            required
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Secure access — HSE clinical staff only
        </p>
      </div>
    </div>
  )
}
