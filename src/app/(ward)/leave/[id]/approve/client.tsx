'use client'

import { useRouter } from 'next/navigation'
import { ApprovalScreen } from '@/components/approval/ApprovalScreen'
import type { LeaveRecord } from '@/types'

export function ApprovalPageClient({ record, wardId }: { record: LeaveRecord; wardId: string }) {
  const router = useRouter()
  return (
    <ApprovalScreen
      leaveRecord={record}
      wardId={wardId}
      onApproved={() => router.push('/dashboard')}
    />
  )
}
