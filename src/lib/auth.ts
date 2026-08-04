import NextAuth from 'next-auth'
import AzureAD from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID!}/v2.0`,
    }),
    // Fallback credentials login for sites not yet on Azure AD SSO
    Credentials({
      name: 'Staff Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const staff = await db.staff.findUnique({
          where: { email: credentials.email as string },
          include: { ward: true },
        })
        if (!staff || !staff.pinHash) return null
        const valid = await bcrypt.compare(credentials.password as string, staff.pinHash)
        if (!valid) return null
        return { id: staff.id, name: staff.name, email: staff.email, role: staff.role }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        const staff = await db.staff.findUnique({
          where: { id: token.sub },
          include: { ward: true },
        })
        if (staff) {
          session.user.id = staff.id
          session.user.role = staff.role
          session.user.wardId = staff.wardId ?? undefined
          session.user.wardName = staff.ward?.name ?? undefined
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
})

// Verify a senior nurse PIN — used in the approval workflow
export async function verifySeniorPin(
  pin: string,
  wardId: string
): Promise<{ valid: boolean; staffId?: string; name?: string }> {
  const seniors = await db.staff.findMany({
    where: {
      wardId,
      role: { in: ['SENIOR_NURSE', 'CHARGE_NURSE', 'ADMIN'] },
      isActive: true,
      pinHash: { not: null },
    },
  })

  for (const staff of seniors) {
    if (!staff.pinHash) continue
    const match = await bcrypt.compare(pin, staff.pinHash)
    if (match) return { valid: true, staffId: staff.id, name: staff.name }
  }

  return { valid: false }
}
