import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ApprovalPageClient } from './client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ApprovePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const record = await db.leaveRecord.findUnique({
    where: { id },
    include: {
      patient: { include: { ward: true } },
      consent: true,
      voiceRecording: true,
      appearance: true,
    },
  })

  if (!record) notFound()
  if (record.status !== 'PENDING_APPROVAL') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Senior Nurse Approval</h1>
        <p className="text-sm text-gray-500">
          Review the leave record below, then enter your PIN or sign to approve
        </p>
      </div>
      <ApprovalPageClient record={JSON.parse(JSON.stringify(record))} wardId={record.wardId} />
    </div>
  )
}
