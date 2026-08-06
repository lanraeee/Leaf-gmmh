/**
 * Live InPhase adapter — activated when INPHASE_API_URL is set.
 * InPhase is the HSE's clinical risk management and incident reporting system.
 * API authentication uses an API key (X-API-Key header) or Bearer token.
 */
import type { InPhaseAdapter, InPhaseIncidentInput, InPhaseIncidentResult, InPhaseIncidentUpdate, InPhaseIncident } from './types'

const BASE_URL = process.env.INPHASE_API_URL ?? ''
const API_KEY = process.env.INPHASE_API_KEY ?? ''
const ORG_CODE = process.env.INPHASE_ORG_CODE ?? ''

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
  ...(ORG_CODE ? { 'X-Organisation': ORG_CODE } : {}),
}

export const inphaseLive: InPhaseAdapter = {
  async isAvailable() {
    try {
      const res = await fetch(`${BASE_URL}/health`, { headers, signal: AbortSignal.timeout(5000) })
      return res.ok
    } catch {
      return false
    }
  },

  async reportIncident(incident: InPhaseIncidentInput): Promise<InPhaseIncidentResult> {
    const payload = {
      type: incident.incidentType,
      severity: incident.severity,
      patientIdentifier: incident.patientMrn,
      patientName: incident.patientName,
      locationCode: incident.wardCode,
      locationName: incident.wardName,
      reportedBy: {
        name: incident.reportedByName,
        email: incident.reportedByEmail,
      },
      incidentDateTime: incident.incidentDatetime,
      description: incident.description,
      additionalDetails: {
        policeContacted: incident.policeContacted ?? false,
        policeIncidentNo: incident.policeIncidentNo ?? null,
        notifiedStaff: incident.notifiedStaff ?? null,
        notes: incident.notes ?? null,
      },
    }

    const res = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error')
      return { success: false, error: `InPhase API error ${res.status}: ${text}` }
    }

    const data = await res.json()
    return {
      success: true,
      ref: data.ref ?? data.id ?? data.incidentRef,
      url: data.url ?? data.viewUrl,
    }
  },

  async updateIncident(ref: string, update: InPhaseIncidentUpdate): Promise<void> {
    await fetch(`${BASE_URL}/incidents/${ref}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(update),
      signal: AbortSignal.timeout(10000),
    })
  },

  async getIncident(ref: string): Promise<InPhaseIncident | null> {
    const res = await fetch(`${BASE_URL}/incidents/${ref}`, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      ref: data.ref ?? ref,
      status: data.status ?? 'OPEN',
      incidentType: data.type ?? '',
      severity: data.severity ?? '',
      createdAt: data.createdAt ?? '',
      updatedAt: data.updatedAt ?? '',
      url: data.url ?? data.viewUrl,
    }
  },
}
