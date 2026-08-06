import { inphaseStub } from './stub'
import { inphaseLive } from './live'
import type { InPhaseAdapter } from './types'

export const inphase: InPhaseAdapter = process.env.INPHASE_API_URL
  ? inphaseLive
  : inphaseStub

export type { InPhaseAdapter, InPhaseIncidentInput, InPhaseIncidentResult, InPhaseIncident } from './types'
