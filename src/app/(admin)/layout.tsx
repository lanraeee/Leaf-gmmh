import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const adminRoles = ['CHARGE_NURSE', 'ADMIN']
  if (!adminRoles.includes(session.user.role ?? '')) redirect('/dashboard')

  return (
    <div className="flex h-full">
      <Sidebar
        userName={session.user.name ?? 'Staff'}
        wardName={session.user.wardName}
        role={session.user.role ?? 'CHARGE_NURSE'}
      />
      <main className="flex-1 ml-64 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
