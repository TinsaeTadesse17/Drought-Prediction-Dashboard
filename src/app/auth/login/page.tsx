"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { listUsers } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { signIn, useSession } from 'next-auth/react'

export const dynamic = 'force-dynamic'

function LoginFormInner() {
  const router = useRouter()
  const [typedEmail, setTypedEmail] = useState("")
  const [demoEmail, setDemoEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [users] = useState(() => listUsers())
  const redirectedRef = useRef(false)
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status === 'loading') return
    if (session && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace("/")
    }
  }, [router, session, status])

  useEffect(() => {
    const err = searchParams?.get('error')
    if (!err) return
    if (err === 'CredentialsSignin') setError('We could not sign you in with that email. If you just registered, try again in a few seconds.')
    else if (err === 'INVALID_EMAIL') setError('Please enter a valid email address.')
    else if (err === 'USER_NOT_FOUND') setError('This email is not registered. Please register first.')
    else setError('Login failed. Please try again.')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
  const chosen = typedEmail.trim() || demoEmail.trim()
  if (!chosen) { setError('Please enter or select an email.'); setSubmitting(false); return }
  const res = await signIn('credentials', { email: chosen, redirect: false, callbackUrl: '/' })
    if (res?.error) { setError('Login failed'); setSubmitting(false); return }
    router.replace('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Choose Demo User (optional)</label>
              <Select value={demoEmail} onValueChange={(v) => { setDemoEmail(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.name} ({u.role.replace('_',' ')})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Or enter email</label>
              <Input type="email" value={typedEmail} onChange={e => setTypedEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting || !(typedEmail.trim() || demoEmail.trim())}>{submitting ? 'Signing in...' : 'Login'}</Button>
            <div className="text-xs text-center text-muted-foreground">Need an account? <Link className="underline" href="/auth/register">Register</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  // Wrap the inner component that calls useSearchParams in Suspense to satisfy Next.js requirements.
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginFormInner />
    </Suspense>
  )
}
