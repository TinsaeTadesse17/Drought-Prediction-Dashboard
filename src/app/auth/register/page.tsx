"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser, getCurrentUser, Role } from "@/lib/auth"
import { REGION_WOREDAS, Region } from "@/lib/regions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("regional_officer")
  const [region, setRegion] = useState<Region>("afar")
  const [woreda, setWoreda] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const redirectedRef = useRef(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (u && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    if (role !== "woreda_officer" && role !== "civilian") setWoreda(undefined)
  }, [role])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { user, error } = registerUser({ name, email: email.trim(), role, region, woreda })
    if (error) {
      setError(error)
      return
    }
    if (user && !redirectedRef.current) {
      redirectedRef.current = true
      router.push("/")
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
                  <SelectItem value="civilian">Civilian</SelectItem>
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
            {(role === "woreda_officer" || role === "civilian") && (
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
