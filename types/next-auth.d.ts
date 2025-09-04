import NextAuth from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    role?: string
    region?: string
    woreda?: string
  }
  interface User {
    role?: string
    region?: string
    woreda?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    region?: string
    woreda?: string
  }
}
