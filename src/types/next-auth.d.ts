import type { DefaultSession } from 'next-auth'
import type { Role } from './index'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: Role
      wardId?: string
      wardName?: string
    }
  }

  interface User {
    id: string
    role?: Role
    wardId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role
    wardId?: string
  }
}
