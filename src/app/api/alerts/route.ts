import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkOverdueLeaves, getActiveAlerts } from '@/lib/alerts'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wardId = req.nextUrl.searchParams.get('wardId') ?? ''
  await checkOverdueLeaves()
  const alerts = await getActiveAlerts(wardId)
  return NextResponse.json({ alerts })
}
