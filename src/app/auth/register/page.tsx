"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Role } from "@/lib/auth"
import { REGION_WOREDAS, Region } from "@/lib/regions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { signIn, useSession } from 'next-auth/react'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("regional_officer")
  const [region, setRegion] = useState<Region>("afar")
  const [woreda, setWoreda] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const redirectedRef = useRef(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (session && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace("/")
    }
  }, [router, session, status])

  useEffect(() => {
    if (role !== "woreda_officer") setWoreda(undefined)
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const body = { name, email: email.trim(), role, region, woreda }
    try {
      const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || (res.status === 503 ? 'Service unavailable: Database not configured' : 'Registration failed'))
        const loginFallback = await signIn('credentials', { email: email.trim(), redirect: false, callbackUrl: '/' })
        if (!loginFallback?.error) { router.replace('/'); return }
        return
      }
      const login = await signIn('credentials', { email: email.trim(), redirect: false, callbackUrl: '/' })
      if (login?.error) {
        setError('Auto login failed')
        return
      }
      router.replace('/')
    } catch (_e) {
      setError('Registration failed')
    }
  }

  const woredaOptions = REGION_WOREDAS[region]

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="regional_officer">Regional Officer</SelectItem>
                  <SelectItem value="woreda_officer">Woreda Officer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Region</label>
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="afar">Afar</SelectItem>
                  <SelectItem value="somali">Somali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === "woreda_officer" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Woreda</label>
                <Select value={woreda} onValueChange={setWoreda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {woredaOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" className="w-full">Register</Button>
            <div className="text-xs text-center text-muted-foreground">Already have an account? <Link className="underline" href="/auth/login">Login</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
