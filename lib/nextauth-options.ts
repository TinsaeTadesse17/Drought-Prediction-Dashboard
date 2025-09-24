import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import type { Region } from '@/lib/regions'

const seedUsers = [
  { name: 'Admin', email: 'admin@example.com', role: 'admin', region: 'afar' as Region },
  { name: 'Afar Officer', email: 'afar.officer@example.com', role: 'regional_officer', region: 'afar' as Region },
  { name: 'Somali Officer', email: 'somali.officer@example.com', role: 'woreda_officer', region: 'somali' as Region, woreda: 'Godey' },
]

const hasDb = !!process.env.DATABASE_URL

export const authOptions: NextAuthOptions = {
  adapter: hasDb ? PrismaAdapter(prisma) : undefined,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: { email: { label: 'Email', type: 'text' } },
      async authorize(credentials: Record<string, string> | undefined) {
        const email = credentials?.email?.trim().toLowerCase()
        if (!email) throw new Error('INVALID_EMAIL')
        const preset = seedUsers.find((u) => u.email.toLowerCase() === email)
        const data: any = preset ?? {
          name: email.split('@')[0],
          email,
          role: 'regional_officer',
          region: 'afar' as Region,
        }
        if (hasDb) {
          try {
            const existing = await prisma.user.findUnique({ where: { email } })
            if (existing) return existing as any
            const created = await prisma.user.create({ data })
            return created as any
          } catch (e) {
            return { id: 'local-' + Math.random().toString(36).slice(2), ...data } as any
          }
        }
        return { id: 'local-' + Math.random().toString(36).slice(2), ...data } as any
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).role = (user as any).role
        ;(token as any).region = (user as any).region
        ;(token as any).woreda = (user as any).woreda
      } else if (token?.email && hasDb) {
        try {
          const u = await prisma.user.findUnique({ where: { email: token.email as string } })
          if (u) {
            ;(token as any).role = (u as any).role
            ;(token as any).region = (u as any).region
            ;(token as any).woreda = (u as any).woreda
          }
        } catch {}
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
