/**
 * PARIS integration entry point.
 * Uses live adapter when PARIS_API_URL is configured, stub otherwise.
 * No code changes needed when cutting over — just set the env var.
 */
import { parisStub } from './stub'
import { parisLive } from './live'
import type { ParisAdapter } from './types'

export const paris: ParisAdapter = process.env.PARIS_API_URL ? parisLive : parisStub

export type { ParisPatient, ParisLeaveStatus } from './types'
