import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { paris } from '@/lib/paris'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const CreatePatientSchema = z.object({
  mrn: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.string().optional(),
  legalStatus: z.enum(['VOLUNTARY', 'INVOLUNTARY_SECTION', 'COMMUNITY_ORDER']),
  wardId: z.string(),
  consultantName: z.string().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const wardCode = searchParams.get('ward') ?? undefined

  const patients = await paris.searchPatients(q, wardCode)
  return NextResponse.json({ patients, source: process.env.PARIS_API_URL ? 'paris' : 'local' })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await db.patient.create({
    data: {
      ...parsed.data,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
    },
  })

  return NextResponse.json(patient, { status: 201 })
}
