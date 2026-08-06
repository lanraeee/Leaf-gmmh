import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { paris } from '@/lib/paris'

// POST /api/paris/sync — pull latest patient data from PARIS for a ward
// Only CHARGE_NURSE and ADMIN can trigger a manual sync
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['CHARGE_NURSE', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const available = await paris.isAvailable()
  if (!available) {
    return NextResponse.json({
      ok: false,
      message: 'PARIS is not available (running in stub mode). Set PARIS_API_URL to enable live sync.',
    })
  }

  const { wardCode } = await req.json().catch(() => ({}))

  const patients = await paris.searchPatients('', wardCode)
  let synced = 0
  let errors = 0

  for (const p of patients) {
    try {
      await db.patient.upsert({
        where: { mrn: p.mrn },
        create: {
          parisId: p.parisId,
          mrn: p.mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(p.dateOfBirth),
          gender: p.gender,
          legalStatus: p.legalStatus,
          wardId: (await db.ward.findFirst({ where: { code: p.wardCode } }))?.id ?? '',
          consultantName: p.consultantName,
          riskLevel: p.riskLevel ?? 'LOW',
          parisLastSync: new Date(),
          parisSource: true,
        },
        update: {
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(p.dateOfBirth),
          gender: p.gender,
          legalStatus: p.legalStatus,
          consultantName: p.consultantName,
          riskLevel: p.riskLevel ?? 'LOW',
          parisLastSync: new Date(),
          parisSource: true,
        },
      })
      synced++
    } catch {
      errors++
    }
  }

  await db.auditLog.create({
    data: {
      staffId: session.user.id,
      action: 'PARIS_SYNC',
      detail: `PARIS sync: ${synced} patients synced, ${errors} errors. Ward filter: ${wardCode ?? 'all'}`,
    },
  })

  return NextResponse.json({ ok: true, synced, errors, total: patients.length })
}

// GET /api/paris/sync — check PARIS availability and last sync times
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const available = await paris.isAvailable()
  const lastSync = await db.patient.findFirst({
    where: { parisSource: true, parisLastSync: { not: null } },
    orderBy: { parisLastSync: 'desc' },
    select: { parisLastSync: true },
  })

  const total = await db.patient.count({ where: { parisSource: true } })

  return NextResponse.json({
    available,
    mode: available ? 'live' : 'stub',
    lastSync: lastSync?.parisLastSync ?? null,
    totalSynced: total,
  })
}
