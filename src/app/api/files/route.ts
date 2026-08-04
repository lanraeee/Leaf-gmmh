import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Serves private Vercel Blob files to authenticated users only.
// Client passes ?url=<blobUrl> — we fetch it server-side with the R/W token.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blobUrl = req.nextUrl.searchParams.get('url')
  if (!blobUrl) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  // Only allow fetching our own blob store
  if (!blobUrl.startsWith('https://') || !blobUrl.includes('vercel-storage.com')) {
    return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'Blob not configured' }, { status: 500 })

  const response = await fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Blob fetch failed' }, { status: response.status })
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const body = await response.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
