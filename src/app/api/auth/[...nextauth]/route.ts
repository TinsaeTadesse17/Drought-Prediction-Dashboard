import NextAuth, { NextAuthOptions, User as NextAuthUser, Session, JWT } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { REGION_WOREDAS, Region } from "@/lib/regions"

// Simple in-memory user store (replace with DB)
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
      async authorize(credentials: Record<string,string> | undefined) {
        const user = users.find(u => u.email === credentials?.email)
        if (!user) return null
        return user as any
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | any }) {
      if (user) {
        token.role = (user as any).role
        token.region = (user as any).region
        token.woreda = (user as any).woreda
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT & any }) {
      (session as any).role = (token as any).role
      ;(session as any).region = (token as any).region
      ;(session as any).woreda = (token as any).woreda
      return session
    }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
