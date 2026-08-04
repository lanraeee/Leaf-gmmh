'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Users, BarChart3, Settings, ShieldCheck, LogOut, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface SidebarProps {
  userName: string
  wardName?: string
  role: Role
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['NURSE', 'SENIOR_NURSE', 'CHARGE_NURSE', 'ADMIN'] },
  { href: '/leave/new', label: 'New Leave', icon: ClipboardList, roles: ['NURSE', 'SENIOR_NURSE', 'CHARGE_NURSE'] },
  { href: '/patients', label: 'Patients', icon: Users, roles: ['CHARGE_NURSE', 'ADMIN'] },
  { href: '/staff', label: 'Staff & PINs', icon: ShieldCheck, roles: ['CHARGE_NURSE', 'ADMIN'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['CHARGE_NURSE', 'ADMIN'] },
]

export function Sidebar({ userName, wardName, role }: SidebarProps) {
  const pathname = usePathname()

  const navItems = NAV.filter((n) => n.roles.includes(role))

  return (
    <aside className="w-64 bg-gray-950 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">PLDS</p>
            <p className="text-xs text-gray-400">Patient Leave System</p>
          </div>
        </div>
      </div>

      {/* Ward badge */}
      {wardName && (
        <div className="mx-4 mt-4 bg-gray-800 rounded-xl px-3 py-2">
          <p className="text-xs text-gray-400">Current ward</p>
          <p className="text-sm font-semibold text-white">{wardName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-200">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{role.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
        </div>
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </Link>
      </div>
    </aside>
  )
}
