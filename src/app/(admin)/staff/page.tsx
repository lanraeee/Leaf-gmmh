import { db } from '@/lib/db'
import { ShieldCheck, Plus, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  NURSE: 'Nurse',
  SENIOR_NURSE: 'Senior Nurse',
  CHARGE_NURSE: 'Charge Nurse',
  ADMIN: 'Admin',
}

const ROLE_COLORS: Record<string, string> = {
  NURSE: 'bg-gray-100 text-gray-700',
  SENIOR_NURSE: 'bg-blue-100 text-blue-700',
  CHARGE_NURSE: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}

export default async function StaffPage() {
  const staff = await db.staff.findMany({
    where: { isActive: true },
    include: { ward: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  const canApprove = staff.filter((s) => ['SENIOR_NURSE', 'CHARGE_NURSE', 'ADMIN'].includes(s.role))

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Staff & PINs</h1>
          <p className="text-sm text-gray-500">{staff.length} active staff members</p>
        </div>
        <Button size="md" className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      {/* Approval PIN info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Approval PINs</p>
          <p className="mt-0.5">Senior Nurses, Charge Nurses, and Admins can have a 6-digit approval PIN set. Only they can use it to approve leave records. PINs are hashed and never stored in plain text.</p>
          <p className="mt-1 font-medium">{canApprove.filter((s) => s.pinHash).length} of {canApprove.length} approval-eligible staff have PINs set.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {staff.map((member, i) => {
          const canApproveLeave = ['SENIOR_NURSE', 'CHARGE_NURSE', 'ADMIN'].includes(member.role)
          return (
            <div key={member.id} className={`flex items-center px-4 md:px-6 py-4 gap-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  <span className="hidden sm:inline">{member.email} · </span>
                  {member.ward?.name ?? 'No ward'}
                </p>
              </div>

              {/* Role badge */}
              <Badge className={`text-xs shrink-0 ${ROLE_COLORS[member.role]}`}>
                {ROLE_LABELS[member.role]}
              </Badge>

              {/* PIN status — hidden on small phones */}
              {canApproveLeave && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs shrink-0">
                  <Key className="w-3.5 h-3.5 text-gray-400" />
                  {member.pinHash
                    ? <span className="text-green-600 font-medium">PIN set</span>
                    : <span className="text-amber-600 font-medium">No PIN</span>}
                </div>
              )}

              <Button size="sm" variant="outline" className="shrink-0">
                {canApproveLeave ? 'Set PIN' : 'Edit'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
