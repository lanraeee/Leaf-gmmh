import { Resend } from 'resend'
import { db } from './db'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'PLDS Alerts <alerts@nhsleave.vercel.app>'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  type: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured — skipping email notification')
    return { success: false, error: 'Email not configured' }
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
  })

  const success = !error
  await db.notificationLog.create({
    data: {
      channel: 'email',
      type: payload.type,
      subject: payload.subject,
      recipientRef: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
      success,
      error: error?.message,
    },
  }).catch(() => {})

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

export async function sendWardAlertEmail(opts: {
  wardId: string
  subject: string
  html: string
  type: string
}) {
  // Notify all charge nurses and senior nurses in the ward
  const staff = await db.staff.findMany({
    where: {
      wardId: opts.wardId,
      isActive: true,
      role: { in: ['CHARGE_NURSE', 'SENIOR_NURSE'] },
    },
    select: { email: true },
  })

  const emails = staff.map((s) => s.email)
  if (emails.length === 0) return { success: false, error: 'No eligible staff found' }

  return sendEmail({ to: emails, subject: opts.subject, html: opts.html, type: opts.type })
}

// ─── Email templates ───────────────────────────────────────────────────────────

export function awolEmailHtml(opts: {
  patientName: string
  patientMrn: string
  wardName: string
  escalatedBy: string
  policeContacted: boolean
  policeIncidentNo?: string
  notifiedStaff?: string
  notes?: string
  inphaseRef?: string
  appUrl: string
}): string {
  const severity = '#dc2626'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:${severity};padding:20px 24px">
      <p style="margin:0;color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">🚨 CRITICAL — Patient AWOL</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.patientName}</h1>
      <p style="margin:4px 0 0;color:#fca5a5;font-size:14px">MRN: ${opts.patientMrn} · ${opts.wardName}</p>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:160px">Escalated by</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:13px">${opts.escalatedBy}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">Police contacted</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:13px">${opts.policeContacted ? '✓ Yes' + (opts.policeIncidentNo ? ` — Incident No. ${opts.policeIncidentNo}` : '') : 'No'}</td></tr>
        ${opts.notifiedStaff ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">Notified staff</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px">${opts.notifiedStaff}</td></tr>` : ''}
        ${opts.inphaseRef ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">InPhase Ref</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-family:monospace">${opts.inphaseRef}</td></tr>` : ''}
        ${opts.notes ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top">Notes</td><td style="padding:8px 0;font-size:13px">${opts.notes}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;text-align:center">
        <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Open Dashboard →</a>
      </div>
      <p style="margin-top:20px;font-size:11px;color:#9ca3af;text-align:center">Patient Leave &amp; Documentation System — ${opts.wardName}</p>
    </div>
  </div>
</body>
</html>`
}

export function overdueEmailHtml(opts: {
  patientName: string
  patientMrn: string
  wardName: string
  minutesOverdue: number
  dueTime: string
  appUrl: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#d97706;padding:20px 24px">
      <p style="margin:0;color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">⚠️ Patient Overdue — Action Required</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.patientName}</h1>
      <p style="margin:4px 0 0;color:#fde68a;font-size:14px">MRN: ${opts.patientMrn} · ${opts.wardName}</p>
    </div>
    <div style="padding:24px">
      <p style="font-size:15px;color:#374151">This patient has not returned from leave. They were due back at <strong>${opts.dueTime}</strong> and are now <strong>${opts.minutesOverdue} minute${opts.minutesOverdue !== 1 ? 's' : ''} overdue</strong>.</p>
      <div style="margin-top:20px;text-align:center">
        <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">View Dashboard →</a>
      </div>
      <p style="margin-top:20px;font-size:11px;color:#9ca3af;text-align:center">If you cannot reach the patient, consider escalating to AWOL via the dashboard.</p>
    </div>
  </div>
</body>
</html>`
}
