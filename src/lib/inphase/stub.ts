import { db } from '@/lib/db'
import type { InPhaseAdapter, InPhaseIncidentInput, InPhaseIncidentResult, InPhaseIncidentUpdate, InPhaseIncident } from './types'

// Stub adapter — active when INPHASE_API_URL is not set.
// Logs incidents to the audit trail instead of filing with InPhase.
export const inphaseStub: InPhaseAdapter = {
  async isAvailable() {
    return false
  },

  async reportIncident(incident: InPhaseIncidentInput): Promise<InPhaseIncidentResult> {
    const ref = `LOCAL-${Date.now()}`
    // Find any staff member to associate the audit log with (use system/first admin)
    const staff = await db.staff.findFirst({
      where: { isActive: true, role: { in: ['ADMIN', 'CHARGE_NURSE'] } },
      orderBy: { createdAt: 'asc' },
    })

    if (staff) {
      await db.auditLog.create({
        data: {
          staffId: staff.id,
          action: 'INPHASE_STUB_REPORT',
          detail: `[InPhase STUB] Incident ${ref} — ${incident.incidentType} — ${incident.patientName} (${incident.patientMrn}) — ${incident.description}`,
        },
      })
    }

    console.log(`[InPhase Stub] Incident report logged locally: ${ref}`, incident)
    return { success: true, ref, url: undefined }
  },

  async updateIncident(_ref: string, _update: InPhaseIncidentUpdate): Promise<void> {
    console.log(`[InPhase Stub] Update for ${_ref}:`, _update)
  },

  async getIncident(ref: string): Promise<InPhaseIncident | null> {
    return {
      ref,
      status: 'OPEN',
      incidentType: 'PATIENT_AWOL',
      severity: 'CRITICAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
}
