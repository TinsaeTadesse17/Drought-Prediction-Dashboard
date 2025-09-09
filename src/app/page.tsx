"use client"

export const dynamic = "force-dynamic"

import { DroughtDashboard } from "@/components/drought-dashboard"
import { getCurrentUser } from "@/lib/auth"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const redirectingRef = useRef(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.replace("/auth/login")
      }
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null
  return <DroughtDashboard />
}
