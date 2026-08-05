export type Role = 'NURSE' | 'SENIOR_NURSE' | 'CHARGE_NURSE' | 'ADMIN'
export type LegalStatus = 'VOLUNTARY' | 'INVOLUNTARY_SECTION' | 'COMMUNITY_ORDER'
export type LeaveType = 'UNESCORTED' | 'ESCORTED' | 'THERAPEUTIC_LEAVE' | 'OVERNIGHT' | 'EXTENDED'
export type LeaveStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'ON_LEAVE' | 'RETURNED' | 'OVERDUE' | 'AWOL' | 'CANCELLED'
export type ConsentStatus = 'CONSENTED' | 'DECLINED' | 'NOT_APPLICABLE'
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Ward {
  id: string
  name: string
  code: string
  location: string
  phone?: string | null
}

export interface Staff {
  id: string
  name: string
  email: string
  role: Role
  wardId?: string | null
  ward?: Ward | null
}

export interface Patient {
  id: string
  parisId?: string | null
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender?: string | null
  legalStatus: LegalStatus
  wardId: string
  ward?: Ward
  consultantName?: string | null
  riskLevel?: string | null
  parisSource: boolean
}

export interface AwolEscalation {
  id: string
  leaveRecordId: string
  escalatedById: string
  escalatedBy?: Staff
  notifiedStaff?: string | null
  policeContacted: boolean
  policeIncidentNo?: string | null
  notes?: string | null
  escalatedAt: Date
}

export interface LeaveRecord {
  id: string
  patientId: string
  patient?: Patient
  wardId: string
  ward?: Ward
  initiatedById: string
  initiatedBy?: Staff
  returnedById?: string | null
  returnedBy?: Staff | null
  leaveType: LeaveType
  status: LeaveStatus
  destination: string
  destinationDetail?: string | null
  escortName?: string | null
  escortPhone?: string | null
  departureTime?: Date | null
  agreedReturnTime?: Date | null
  proposedReturnTime?: Date | null
  isTimeAgreed: boolean
  actualReturnTime?: Date | null
  returnConditionNotes?: string | null
  incidentOnReturn: boolean
  approval?: LeaveApproval | null
  consent?: PatientConsent | null
  voiceRecording?: VoiceRecording | null
  appearance?: PatientAppearance | null
  awolEscalation?: AwolEscalation | null
  createdAt: Date
  updatedAt: Date
}

export interface LeaveApproval {
  id: string
  approvedById: string
  approvedBy?: Staff
  method: 'PIN' | 'SIGNATURE'
  signatureData?: string | null
  approvedAt: Date
}

export interface PatientConsent {
  id: string
  status: ConsentStatus
  consentedAt?: Date | null
  declineReason?: string | null
}

export interface VoiceRecording {
  id: string
  filePath: string
  durationSeconds?: number | null
  transcript?: string | null
  mimeType: string
}

export interface PatientAppearance {
  id: string
  photoPath?: string | null
  faceBlurred: boolean
  head?: string | null
  upperBody?: string | null
  lowerBody?: string | null
  footwear?: string | null
  accessories?: string | null
  additionalNotes?: string | null
}

export interface Alert {
  id: string
  leaveRecordId: string
  type: 'OVERDUE' | 'APPROACHING_DUE' | 'NOT_RETURNED' | 'INCIDENT'
  severity: AlertSeverity
  message: string
  isAcknowledged: boolean
}

// Form step types
export interface LeaveFormData {
  patientId: string
  leaveType: LeaveType
  destination: string
  destinationDetail?: string
  escortName?: string
  escortPhone?: string
  isTimeAgreed: boolean
  agreedReturnTime?: string
  proposedReturnTime?: string
  consentStatus: ConsentStatus
  consentDeclineReason?: string
  clothingHead?: string
  clothingUpper?: string
  clothingLower?: string
  clothingFootwear?: string
  clothingAccessories?: string
  clothingNotes?: string
}

// PARIS integration types — used by both stub and live implementation
export interface ParisPatient {
  id?: string        // DB primary key — present in stub mode, absent when using live PARIS API
  parisId: string
  mrn: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender?: string
  legalStatus: LegalStatus
  wardCode: string
  ward?: { id: string; name: string; code: string }
  consultantName?: string
  riskLevel?: string
  admissionDate?: string
}

export interface ParisLeaveStatus {
  parisId: string
  hasActiveLeave: boolean
  lastLeaveDate?: string
  leaveCount30Days: number
}
