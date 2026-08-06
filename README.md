# PLDS — Patient Leave & Documentation System

A clinical web application for Irish psychiatric wards to manage, approve, and monitor patient leave. Built for HSE-funded services using Next.js 15, Prisma 7, Neon PostgreSQL, and deployed on Vercel.

---

## Features

- **Leave workflow** — Initiate, approve (PIN or signature), monitor, and document return
- **Real-time dashboard** — Active leave, overdue, AWOL, and history tabs with auto-refresh
- **Multi-role access** — Nurse, Senior Nurse, Charge Nurse, Admin — each with scoped permissions
- **PARIS integration** — Patient data synced from the HSE Patient Administration system (adapter pattern: stub locally, live in production)
- **InPhase integration** — AWOL events automatically file an incident report with the HSE clinical risk system
- **Push notifications** — Browser/mobile push alerts for approaching due, overdue, and AWOL events
- **Email notifications** — Resend-powered email to Charge Nurses and Senior Nurses on AWOL and 60+ min overdue
- **Ward & unit management** — Register wards, sub-units (HDU, Acute Unit, etc.), view staff and patient counts
- **Audit trail** — Full action log with timestamp, IP, and user for compliance
- **PWA** — Installable on iPad and Android tablets, works offline (cached dashboard)
- **Secure file storage** — Patient photos and voice recordings stored in Vercel Blob (private, authenticated access only)
- **AWOL escalation** — Record notified staff, police contact, and InPhase reference in one flow

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 7 + `@prisma/adapter-neon` |
| Auth | NextAuth.js v5 — Credentials + Azure AD (HSE SSO) |
| Styling | Tailwind CSS v4 |
| Storage | Vercel Blob (audio + photos) |
| Email | Resend |
| Push | Web Push API (VAPID) |
| Deployment | Vercel |

---

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Vercel](https://vercel.com) account (for deployment)
- A [Resend](https://resend.com) account (for email alerts)

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd plds
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Minimum required for local development:

```env
DATABASE_URL="postgresql://..."      # from Neon dashboard
DATABASE_URL_UNPOOLED="postgresql://..." # direct (non-pooled) connection
NEXTAUTH_SECRET="..."                # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

See [Environment Variables](#environment-variables) for the full list.

### 3. Set up the database

Push the schema to your Neon database:

```bash
npm run db:push
```

Seed test data (creates a demo ward, patients, and staff):

```bash
npm run db:seed
```

**Seed credentials:**
- Email: `nurse@hse.ie` / Password: `password`
- Senior Nurse approval PIN: `654321`
- Admin PIN: `123456`

### 4. Generate VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

Copy the output into `.env.local`:

```env
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_CONTACT_EMAIL="admin@your-domain.ie"
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | ✓ | Neon direct connection (used by Prisma CLI) |
| `NEXTAUTH_SECRET` | ✓ | Random secret for JWT signing |
| `NEXTAUTH_URL` | ✓ | Full URL of the app (e.g. `https://nhsleave.vercel.app`) |
| `AZURE_AD_CLIENT_ID` | — | Azure AD app client ID (HSE SSO) |
| `AZURE_AD_CLIENT_SECRET` | — | Azure AD client secret |
| `AZURE_AD_TENANT_ID` | — | Azure AD tenant ID |
| `PARIS_API_URL` | — | PARIS REST API base URL — leave blank for stub mode |
| `PARIS_API_KEY` | — | PARIS API key (X-API-Key header) |
| `INPHASE_API_URL` | — | InPhase REST API base URL — leave blank for stub mode |
| `INPHASE_API_KEY` | — | InPhase API key |
| `INPHASE_ORG_CODE` | — | InPhase organisation code (X-Organisation header) |
| `VAPID_PUBLIC_KEY` | — | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | — | VAPID private key for Web Push |
| `VAPID_CONTACT_EMAIL` | — | Contact email for VAPID (e.g. `admin@your-domain.ie`) |
| `RESEND_API_KEY` | — | Resend API key for email notifications |
| `EMAIL_FROM` | — | Sender address (e.g. `PLDS Alerts <alerts@your-domain.ie>`) |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob token (auto-provisioned by Vercel) |

Optional integrations degrade gracefully — PARIS falls back to the local patient database, InPhase logs incidents locally, push/email are silently skipped if unconfigured.

---

## User Roles

| Role | Capabilities |
|---|---|
| `NURSE` | Initiate leave, view own ward dashboard |
| `SENIOR_NURSE` | All Nurse capabilities + approve leave via PIN, document return, escalate AWOL |
| `CHARGE_NURSE` | All Senior Nurse capabilities + manage patients, staff, wards, view reports |
| `ADMIN` | Full access including ward deletion |

---

## Integrations

### PARIS (Patient Administration & Registration Information System)

PARIS is the HSE patient administration system. PLDS uses an adapter pattern:

- **Stub mode** (default): patient data is read from the local PLDS database
- **Live mode**: set `PARIS_API_URL` and `PARIS_API_KEY` — no code changes needed

A manual sync can be triggered from the **Wards** admin page (`/wards`). This pulls all patients from PARIS and upserts them into the local database.

Expected PARIS API endpoints:
```
GET  /health
GET  /patients/{mrn}
GET  /patients/search?q={query}&ward={wardCode}
GET  /patients/{parisId}/leave-status
```

### InPhase (Clinical Risk & Incident Management)

InPhase is the HSE incident management system. When a patient is declared AWOL:

1. An incident is automatically filed via `POST /incidents`
2. The InPhase reference number is stored on the escalation record
3. The reference appears in the AWOL alert and email notifications

- **Stub mode** (default): incident is logged to the local audit trail
- **Live mode**: set `INPHASE_API_URL`, `INPHASE_API_KEY`, `INPHASE_ORG_CODE`

Expected InPhase API endpoints:
```
GET    /health
POST   /incidents
PATCH  /incidents/{ref}
GET    /incidents/{ref}
```

### Push Notifications

Staff receive browser/PWA push notifications for:

| Event | Urgency |
|---|---|
| Patient due back in 30 minutes | Normal |
| Patient overdue 60+ minutes | High |
| Patient declared AWOL | High (requires interaction) |

Setup:
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add both keys to environment variables
3. Staff subscribe by clicking the bell icon in the sidebar

The service worker (`/public/sw.js`) handles push events, displays the notification, and navigates to the dashboard on tap.

### Email Notifications

Email notifications are sent to all **Charge Nurses** and **Senior Nurses** in the affected ward via Resend:

| Event | Recipients | Template |
|---|---|---|
| Patient AWOL | Ward charge/senior nurses | Critical red — full escalation details + InPhase ref |
| Patient 60+ min overdue | Ward charge/senior nurses | Amber — overdue prompt with time and escalation guidance |

Requires a verified sender domain in Resend and `RESEND_API_KEY` set.

---

## Database

### Schema overview

```
Ward ──< WardUnit
Ward ──< Staff
Ward ──< Patient ──< LeaveRecord ──< LeaveApproval
                                 ──< PatientConsent
                                 ──< VoiceRecording
                                 ──< PatientAppearance
                                 ──< AwolEscalation
                                 ──< Alert
Staff ──< PushSubscription
```

### npm scripts

```bash
npm run db:push        # Push schema changes to the database
npm run db:seed        # Seed with demo data
npm run db:studio      # Open Prisma Studio (browser DB browser)
```

---

## API Reference

All routes require authentication. Role requirements are enforced server-side.

### Leave

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/leave` | Any | List leave records (scoped to ward for NURSE/SENIOR_NURSE) |
| `POST` | `/api/leave` | Any | Initiate a new leave record |
| `POST` | `/api/leave/[id]/approve` | SENIOR_NURSE+ | Approve via PIN or signature |
| `POST` | `/api/leave/[id]/return` | SENIOR_NURSE+ | Document patient return |
| `POST` | `/api/leave/[id]/awol` | SENIOR_NURSE+ | Escalate to AWOL (fires InPhase + push + email) |

### Patients

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/patients` | Any | Search patients (via PARIS or local DB) |
| `POST` | `/api/patients` | CHARGE_NURSE+ | Create patient record |

### Wards

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/wards` | Any | List all wards with units and counts |
| `POST` | `/api/wards` | CHARGE_NURSE+ | Create a ward |
| `GET` | `/api/wards/[id]` | Any | Get ward details |
| `PATCH` | `/api/wards/[id]` | CHARGE_NURSE+ | Update ward name/details |
| `DELETE` | `/api/wards/[id]` | ADMIN | Soft-delete ward |
| `GET` | `/api/wards/[id]/units` | Any | List units in a ward |
| `POST` | `/api/wards/[id]/units` | CHARGE_NURSE+ | Register a new unit |

### Staff

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/staff` | Any | List staff (no PINs returned) |
| `POST` | `/api/staff` | CHARGE_NURSE+ | Create staff member |
| `PATCH` | `/api/staff` | CHARGE_NURSE+ | Update staff record or set PIN |

### Alerts & Reports

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/alerts` | Any | Check overdue leaves + list active alerts |
| `GET` | `/api/reports` | CHARGE_NURSE+ | 30-day leave statistics |
| `GET` | `/api/paris/sync` | Any | PARIS availability + last sync status |
| `POST` | `/api/paris/sync` | CHARGE_NURSE+ | Trigger PARIS patient sync |

### Push Notifications

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/push/vapid-public-key` | Any | Get VAPID public key |
| `POST` | `/api/push/subscribe` | Any | Save push subscription |
| `DELETE` | `/api/push/subscribe` | Any | Remove push subscription |

---

## Deployment

### Vercel (recommended)

1. Connect the repository to Vercel
2. Add all environment variables in the Vercel dashboard (Settings → Environment Variables)
3. Add a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store — `BLOB_READ_WRITE_TOKEN` is auto-set
4. Deploy — the Neon database is updated automatically via `prisma db push` on build if configured

### Post-deploy checklist

- [ ] `DATABASE_URL` and `DATABASE_URL_UNPOOLED` set in Vercel env vars
- [ ] `NEXTAUTH_SECRET` and `NEXTAUTH_URL` set (URL must be the production domain)
- [ ] VAPID keys generated and added (`npx web-push generate-vapid-keys`)
- [ ] Resend API key and verified sender domain configured
- [ ] Azure AD app registered in HSE tenant (for SSO) — optional
- [ ] PARIS and InPhase API credentials provided by HSE IT — optional

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/           # Charge Nurse / Admin pages
│   │   ├── patients/      # Patient directory
│   │   ├── staff/         # Staff & PIN management
│   │   ├── wards/         # Ward & unit management
│   │   └── reports/       # Leave statistics
│   ├── (ward)/            # Nurse / Senior Nurse pages
│   │   ├── dashboard/     # Live leave board
│   │   └── leave/         # Leave initiation & approval
│   └── api/               # REST API routes
│       ├── alerts/
│       ├── files/
│       ├── leave/
│       ├── paris/
│       ├── patients/
│       ├── push/
│       ├── reports/
│       ├── staff/
│       └── wards/
├── components/
│   ├── approval/          # PIN pad, signature pad, approval screen
│   ├── dashboard/         # Leave board, leave cards, AWOL card
│   ├── forms/             # Leave form wizard steps
│   ├── layout/            # Sidebar (desktop + mobile)
│   ├── notifications/     # Push notification bell
│   └── ui/                # Shared UI primitives
├── lib/
│   ├── alerts.ts          # Overdue check + push/email triggers
│   ├── audit.ts           # Audit log helper
│   ├── auth.ts            # NextAuth config + PIN verification
│   ├── db.ts              # Prisma client (Neon adapter)
│   ├── email.ts           # Resend email + templates
│   ├── inphase/           # InPhase adapter (stub + live)
│   ├── paris/             # PARIS adapter (stub + live)
│   ├── push.ts            # Web Push sender
│   └── utils.ts           # Shared utilities
└── types/                 # TypeScript types + NextAuth extensions
prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Demo data seed
public/
└── sw.js                  # Service worker (push notifications + offline cache)
```

---

## Security

- All API routes require authentication via NextAuth JWT
- Role enforcement is applied server-side on every request (not just middleware)
- PATCH/POST on staff and patients requires CHARGE_NURSE or ADMIN
- Signature approval requires SENIOR_NURSE or above (verified against DB, not just session)
- Leave records are automatically scoped to the staff member's ward for NURSE and SENIOR_NURSE roles
- Blob file URLs are validated by hostname (must end in `.vercel-storage.com`) before proxy-fetching
- PINs are bcrypt-hashed (cost 12), never stored or returned in plain text
- Push subscriptions are per-staff and cleaned up on 410 Gone responses

---

## License

Internal HSE use. Not for public distribution.
