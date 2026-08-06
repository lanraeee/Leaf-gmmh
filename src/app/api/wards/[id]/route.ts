import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateWardSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).toUpperCase().optional(),
  location: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ward = await db.ward.findUnique({
    where: { id },
    include: {
      units: { orderBy: { name: 'asc' } },
      _count: { select: { staff: true, patients: true, leaveRecords: true } },
    },
  })

  if (!ward) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ward)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = UpdateWardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { email, ...rest } = parsed.data
  const data = { ...rest, ...(email !== undefined ? { email: email || null } : {}) }

  const ward = await db.ward.update({ where: { id }, data })
  return NextResponse.json(ward)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can delete wards' }, { status: 403 })
  }

  const { id } = await params
  // Soft-delete — preserve history
  const ward = await db.ward.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true, id: ward.id })
}
