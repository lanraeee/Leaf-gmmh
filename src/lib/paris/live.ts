/**
 * Live PARIS adapter — activated when PARIS_API_URL is set in env.
 * Drop-in replacement for stub.ts. No UI changes required.
 */
import type { ParisAdapter, ParisPatient, ParisLeaveStatus } from './types'

const BASE_URL = process.env.PARIS_API_URL ?? ''
const API_KEY = process.env.PARIS_API_KEY ?? ''

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
}

export const parisLive: ParisAdapter = {
  async isAvailable() {
    try {
      const res = await fetch(`${BASE_URL}/health`, { headers, signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  },

  async findPatient(mrn: string): Promise<ParisPatient | null> {
    const res = await fetch(`${BASE_URL}/patients/${mrn}`, { headers })
    if (!res.ok) return null
    return res.json()
  },

  async searchPatients(query: string, wardCode?: string): Promise<ParisPatient[]> {
    const params = new URLSearchParams({ q: query, ...(wardCode ? { ward: wardCode } : {}) })
    const res = await fetch(`${BASE_URL}/patients/search?${params}`, { headers })
    if (!res.ok) return []
    return res.json()
  },

  async getLeaveStatus(parisId: string): Promise<ParisLeaveStatus | null> {
    const res = await fetch(`${BASE_URL}/patients/${parisId}/leave-status`, { headers })
    if (!res.ok) return null
    return res.json()
  },
}
