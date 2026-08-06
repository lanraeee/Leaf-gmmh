import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const UnitSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20).toUpperCase(),
  description: z.string().optional(),
  bedCount: z.number().int().positive().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const units = await db.wardUnit.findMany({
    where: { wardId: id, isActive: true },
    include: { _count: { select: { patients: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ units })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: wardId } = await params
  const body = await req.json()
  const parsed = UnitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const ward = await db.ward.findUnique({ where: { id: wardId } })
  if (!ward) return NextResponse.json({ error: 'Ward not found' }, { status: 404 })

  try {
    const unit = await db.wardUnit.create({ data: { ...parsed.data, wardId } })
    return NextResponse.json(unit, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'Unit code already exists in this ward' }, { status: 409 })
    }
    throw err
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: wardId } = await params
  const body = await req.json()
  const { unitId, ...updates } = body

  if (!unitId) return NextResponse.json({ error: 'unitId required' }, { status: 400 })

  const unit = await db.wardUnit.update({
    where: { id: unitId, wardId },
    data: updates,
  })

  return NextResponse.json(unit)
}
