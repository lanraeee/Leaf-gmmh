/**
 * Seed script — run once against a fresh database.
 * Creates a default ward, admin user, and a sample patient.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const ward = await db.ward.upsert({
    where: { code: 'WARD-3' },
    update: {},
    create: { name: 'Ward 3 — Acute Mental Health', code: 'WARD-3', location: 'Block A, 2nd Floor', phone: '01-234-5678' },
  })
  console.log('Ward created:', ward.name)

  const adminPin = await bcrypt.hash('123456', 12)
  const admin = await db.staff.upsert({
    where: { email: 'admin@hse.ie' },
    update: {},
    create: { name: 'Admin User', email: 'admin@hse.ie', role: 'CHARGE_NURSE', pinHash: adminPin, wardId: ward.id },
  })
  console.log('Admin created:', admin.email, '(PIN: 123456)')

  const senior = await db.staff.upsert({
    where: { email: 'senior@hse.ie' },
    update: {},
    create: { name: 'Sr. Walsh', email: 'senior@hse.ie', role: 'SENIOR_NURSE', pinHash: await bcrypt.hash('654321', 12), wardId: ward.id },
  })
  console.log('Senior nurse created:', senior.email, '(PIN: 654321)')

  const nurse = await db.staff.upsert({
    where: { email: 'nurse@hse.ie' },
    update: {},
    create: { name: 'Staff Nurse Murphy', email: 'nurse@hse.ie', pinHash: await bcrypt.hash('password', 12), role: 'NURSE', wardId: ward.id },
  })
  console.log('Nurse created:', nurse.email, '(password: password)')

  await db.patient.upsert({
    where: { mrn: 'MRN-TEST-001' },
    update: {},
    create: { mrn: 'MRN-TEST-001', firstName: 'Test', lastName: 'Patient', dateOfBirth: new Date('1985-06-15'), gender: 'Male', legalStatus: 'VOLUNTARY', wardId: ward.id, consultantName: 'Dr. Smith', riskLevel: 'LOW' },
  })
  console.log('Sample patient created: MRN-TEST-001')

  console.log('\nSeed complete.')
  console.log('Login: nurse@hse.ie / password')
  console.log('Approve PIN: 654321 (Sr. Walsh) or 123456 (Admin)')
}

main().catch(console.error)
