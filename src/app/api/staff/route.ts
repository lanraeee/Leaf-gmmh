import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['NURSE', 'SENIOR_NURSE', 'CHARGE_NURSE', 'ADMIN']),
  wardId: z.string().optional(),
  pin: z.string().length(6).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wardId = req.nextUrl.searchParams.get('wardId')

  const staff = await db.staff.findMany({
    where: { isActive: true, ...(wardId ? { wardId } : {}) },
    select: { id: true, name: true, email: true, role: true, wardId: true, ward: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateStaffSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { pin, ...data } = parsed.data
  const pinHash = pin ? await bcrypt.hash(pin, 12) : null

  const staff = await db.staff.create({ data: { ...data, pinHash } })
  return NextResponse.json({ id: staff.id, name: staff.name, email: staff.email, role: staff.role }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, pin, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const data: Record<string, unknown> = { ...updates }
  if (pin) data.pinHash = await bcrypt.hash(pin, 12)

  const staff = await db.staff.update({ where: { id }, data })
  return NextResponse.json({ id: staff.id })
}
