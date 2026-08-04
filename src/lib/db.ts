import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

// Required for Neon WebSocket connections in non-browser environments
if (typeof WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws')
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
