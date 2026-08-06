import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const WardSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20).toUpperCase(),
  location: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  const wards = await db.ward.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: {
      units: { where: { isActive: true }, orderBy: { name: 'asc' } },
      _count: { select: { staff: true, patients: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ wards })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = WardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { email, ...data } = parsed.data

  try {
    const ward = await db.ward.create({
      data: { ...data, email: email || null },
    })
    return NextResponse.json(ward, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'Ward code already exists' }, { status: 409 })
    }
    throw err
  }
}
