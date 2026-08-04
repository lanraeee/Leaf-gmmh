import type { ParisPatient, ParisLeaveStatus } from '@/types'

export interface ParisAdapter {
  findPatient(mrn: string): Promise<ParisPatient | null>
  searchPatients(query: string, wardCode?: string): Promise<ParisPatient[]>
  getLeaveStatus(parisId: string): Promise<ParisLeaveStatus | null>
  isAvailable(): Promise<boolean>
}

export type { ParisPatient, ParisLeaveStatus }
