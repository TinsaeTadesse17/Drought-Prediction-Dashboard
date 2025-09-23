"use client"

import { DroughtDashboard } from "@/components/drought-dashboard"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from 'next-auth/react'

export default function Home() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const redirectingRef = useRef(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.replace("/auth/login")
      }
    } else {
      setChecked(true)
    }
  }, [router, session, status])

  if (!checked) return null
  return <DroughtDashboard />
}
