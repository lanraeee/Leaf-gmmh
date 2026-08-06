export interface InPhaseAdapter {
  isAvailable(): Promise<boolean>
  reportIncident(incident: InPhaseIncidentInput): Promise<InPhaseIncidentResult>
  updateIncident(ref: string, update: InPhaseIncidentUpdate): Promise<void>
  getIncident(ref: string): Promise<InPhaseIncident | null>
}

export interface InPhaseIncidentInput {
  incidentType: 'PATIENT_AWOL' | 'NEAR_MISS' | 'ADVERSE_EVENT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  patientMrn: string
  patientName: string
  wardCode: string
  wardName: string
  reportedByName: string
  reportedByEmail: string
  incidentDatetime: string  // ISO 8601
  description: string
  policeContacted?: boolean
  policeIncidentNo?: string
  notifiedStaff?: string
  notes?: string
}

export interface InPhaseIncidentUpdate {
  status?: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED'
  additionalNotes?: string
  resolvedAt?: string
}

export interface InPhaseIncident {
  ref: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED'
  incidentType: string
  severity: string
  createdAt: string
  updatedAt: string
  url?: string
}

export interface InPhaseIncidentResult {
  success: boolean
  ref?: string
  url?: string
  error?: string
}
