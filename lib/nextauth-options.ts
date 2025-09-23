import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Region } from '@/lib/regions'

const users = [
  { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin', region: 'afar' as Region },
  { id: '2', name: 'Afar Officer', email: 'afar.officer@example.com', role: 'regional_officer', region: 'afar' as Region },
  { id: '3', name: 'Somali Officer', email: 'somali.officer@example.com', role: 'woreda_officer', region: 'somali' as Region, woreda: 'Gode' },
]

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        const email = credentials?.email?.trim().toLowerCase()
        const found = users.find((u) => u.email.toLowerCase() === email)
        if (found) return found as any
        if (email) {
          return {
            id: 'u-' + Math.random().toString(36).slice(2),
            name: email.split('@')[0],
            email,
            role: 'regional_officer',
            region: 'afar' as Region,
          } as any
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).role = (user as any).role
        ;(token as any).region = (user as any).region
        ;(token as any).woreda = (user as any).woreda
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).role = (token as any).role
      ;(session as any).region = (token as any).region
      ;(session as any).woreda = (token as any).woreda
      return session
    },
  },
}
