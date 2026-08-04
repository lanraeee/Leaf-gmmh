import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { riskColor } from '@/lib/utils'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function PatientsPage() {
  const patients = await db.patient.findMany({
    where: { isActive: true },
    include: { ward: true },
    orderBy: { lastName: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Directory</h1>
          <p className="text-sm text-gray-500">{patients.length} active patients</p>
        </div>
        <Button size="md">
          <Plus className="w-4 h-4 mr-2" /> Add Patient
        </Button>
      </div>

      {patients.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No patients registered yet</p>
          <p className="text-xs mt-1">Add patients manually or connect PARIS for automatic sync</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {patients.map((patient, i) => (
          <div key={patient.id} className={`flex items-center px-6 py-4 gap-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</p>
              <p className="text-xs text-gray-500">MRN: {patient.mrn} · DOB: {formatDate(patient.dateOfBirth)}</p>
            </div>
            <div className="text-sm text-gray-500 hidden sm:block">{patient.ward?.name}</div>
            <Badge className={`text-xs ${riskColor(patient.riskLevel)}`}>{patient.riskLevel ?? 'LOW'}</Badge>
            <Badge className="text-xs bg-gray-100 text-gray-600">
              {patient.legalStatus.replace(/_/g, ' ')}
            </Badge>
            {patient.parisSource && (
              <Badge className="text-xs bg-purple-100 text-purple-700">PARIS</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
