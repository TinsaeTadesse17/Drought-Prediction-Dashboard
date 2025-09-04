"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loginByEmail, getCurrentUser, listUsers } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState(() => listUsers())
  const redirectedRef = useRef(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (u && !redirectedRef.current) {
      redirectedRef.current = true
      router.replace("/")
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const u = loginByEmail(email.trim())
    if (!u) {
      setError("User not found")
      return
    }
    if (!redirectedRef.current) {
      redirectedRef.current = true
      router.replace("/")
    }
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
              <label className="text-sm font-medium mb-1 block">Choose Demo User</label>
              <Select value={email} onValueChange={setEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.name} ({u.role.replace("_"," ")})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Or enter email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" className="w-full">Login</Button>
            <div className="text-xs text-center text-muted-foreground">Need an account? <Link className="underline" href="/auth/register">Register</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
