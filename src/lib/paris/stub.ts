/**
 * Stub PARIS adapter — used until the real PARIS REST API is available.
 * Reads from the local patient directory in the PLDS database.
 * Swap to live.ts when HSE IT provisions API access.
 */
import type { ParisAdapter, ParisPatient, ParisLeaveStatus } from './types'
import { db } from '@/lib/db'

export const parisStub: ParisAdapter = {
  async isAvailable() {
    return false
  },

  async findPatient(mrn: string): Promise<ParisPatient | null> {
    const patient = await db.patient.findUnique({
      where: { mrn },
      include: { ward: true },
    })
    if (!patient) return null
    return {
      id: patient.id,
      parisId: patient.parisId ?? patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth.toISOString(),
      gender: patient.gender ?? undefined,
      legalStatus: patient.legalStatus,
      wardCode: patient.ward.code,
      ward: { id: patient.ward.id, name: patient.ward.name, code: patient.ward.code },
      consultantName: patient.consultantName ?? undefined,
      riskLevel: patient.riskLevel ?? undefined,
    }
  },

  async searchPatients(query: string, wardCode?: string): Promise<ParisPatient[]> {
    const patients = await db.patient.findMany({
      where: {
        isActive: true,
        ...(wardCode ? { ward: { code: wardCode } } : {}),
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { mrn: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { ward: true },
      take: 20,
    })
    return patients.map((p) => ({
      id: p.id,
      parisId: p.parisId ?? p.id,
      mrn: p.mrn,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth.toISOString(),
      gender: p.gender ?? undefined,
      legalStatus: p.legalStatus,
      wardCode: p.ward.code,
      ward: { id: p.ward.id, name: p.ward.name, code: p.ward.code },
      consultantName: p.consultantName ?? undefined,
      riskLevel: p.riskLevel ?? undefined,
    }))
  },

  async getLeaveStatus(parisId: string): Promise<ParisLeaveStatus | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const patient = await db.patient.findFirst({
      where: { OR: [{ parisId }, { id: parisId }] },
      include: {
        leaveRecords: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!patient) return null
    const activeLeave = patient.leaveRecords.find((r) =>
      ['APPROVED', 'ON_LEAVE'].includes(r.status)
    )
    return {
      parisId,
      hasActiveLeave: !!activeLeave,
      lastLeaveDate: patient.leaveRecords[0]?.createdAt.toISOString(),
      leaveCount30Days: patient.leaveRecords.length,
    }
  },
}
