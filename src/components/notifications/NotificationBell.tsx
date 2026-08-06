'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function NotificationBell() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PermissionState)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function subscribe() {
    setLoading(true)
    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm as PermissionState)
      if (perm !== 'granted') return

      // Register service worker
      let reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await navigator.serviceWorker.ready
      }

      // Get VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key')
      if (!keyRes.ok) {
        alert('Push notifications are not configured on this server.')
        return
      }
      const { publicKey } = await keyRes.json()

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Save subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      setSubscribed(true)
    } catch (err) {
      console.error('[Push] Subscription failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'unsupported') return null

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading || permission === 'denied'}
      title={
        permission === 'denied'
          ? 'Notifications blocked — enable in browser settings'
          : subscribed
          ? 'Notifications on — tap to disable'
          : 'Enable push notifications for alerts'
      }
      className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all disabled:opacity-40"
    >
      {loading ? (
        <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
      ) : permission === 'denied' ? (
        <BellOff className="w-4 h-4" />
      ) : subscribed ? (
        <BellRing className="w-4 h-4 text-blue-400" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}
