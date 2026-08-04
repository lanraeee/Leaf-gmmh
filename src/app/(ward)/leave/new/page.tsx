import { LeaveFormWizard } from '@/components/forms/LeaveFormWizard'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewLeavePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Leave Record</h1>
          <p className="text-sm text-gray-500">Complete all steps, then hand tablet to senior nurse for approval</p>
        </div>
      </div>
      <LeaveFormWizard />
    </div>
  )
}
