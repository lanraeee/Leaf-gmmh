import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'HH:mm')
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(returnTime: Date | string | null | undefined) {
  if (!returnTime) return false
  return isAfter(new Date(), new Date(returnTime))
}

export function minutesOverdue(returnTime: Date | string) {
  const diff = Date.now() - new Date(returnTime).getTime()
  return Math.max(0, Math.round(diff / 60000))
}

export function riskColor(level: string | null | undefined) {
  switch (level?.toUpperCase()) {
    case 'HIGH': return 'text-red-600 bg-red-50'
    case 'MEDIUM': return 'text-amber-600 bg-amber-50'
    default: return 'text-green-600 bg-green-50'
  }
}

export function statusColor(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED': return 'bg-blue-100 text-blue-800'
    case 'ON_LEAVE': return 'bg-green-100 text-green-800'
    case 'OVERDUE': return 'bg-red-100 text-red-800'
    case 'RETURNED': return 'bg-gray-100 text-gray-700'
    case 'CANCELLED': return 'bg-gray-100 text-gray-400'
    default: return 'bg-gray-100 text-gray-700'
  }
}
