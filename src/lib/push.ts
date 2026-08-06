import webpush from 'web-push'
import { db } from './db'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@nhsleave.vercel.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export interface PushPayload {
  title: string
  body: string
  tag?: string
  icon?: string
  badge?: string
  url?: string
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
}

export async function sendPushToWard(wardId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured — skipping push notifications')
    return { sent: 0, failed: 0 }
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { staff: { wardId, isActive: true } },
  })

  let sent = 0
  let failed = 0

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { urgency: payload.urgency ?? 'normal' },
      )
      sent++
    } catch (err: unknown) {
      failed++
      // Remove stale subscriptions (410 Gone = user unsubscribed)
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }))

  await logNotification({ wardId, channel: 'push', type: payload.tag ?? 'ALERT', subject: payload.title, success: sent > 0 })
  return { sent, failed }
}

export async function sendPushToStaff(staffId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { sent: 0, failed: 0 }

  const subscriptions = await db.pushSubscription.findMany({ where: { staffId } })
  let sent = 0
  let failed = 0

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { urgency: payload.urgency ?? 'normal' },
      )
      sent++
    } catch (err: unknown) {
      failed++
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }))

  await logNotification({ staffId, channel: 'push', type: payload.tag ?? 'ALERT', subject: payload.title, success: sent > 0 })
  return { sent, failed }
}

async function logNotification(data: {
  staffId?: string
  wardId?: string
  channel: string
  type: string
  subject: string
  success: boolean
  error?: string
}) {
  await db.notificationLog.create({ data }).catch(() => {})
}
