"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function DataPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const redirectingRef = useRef(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.replace('/auth/login')
      }
    } else {
      setUser(u)
      // No role-based filtering needed on this page
      setChecked(true)
    }
  }, [router])

  if (!checked) return null
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-sm text-muted-foreground">We pull inputs directly from Google Earth Engine (GEE). We do not host or expose downloads here. Below are the sources and how they are used to derive monthly water balance and SPEI‑12.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CHIRPS Precipitation</CardTitle>
              <CardDescription>UCSB-CHG/CHIRPS/DAILY</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>• Variable: Precipitation (P)</p>
              <p>• Temporal resolution: Daily (aggregated to monthly totals)</p>
              <p>• Period used: 2000-01 to 2024-12</p>
              <p>• Region sampling: 5 km grid over AOI (coveringGrid)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">TerraClimate PET</CardTitle>
              <CardDescription>IDAHO_EPSCOR/TERRACLIMATE</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>• Variable: Potential Evapotranspiration (PET)</p>
              <p>• Temporal resolution: Monthly</p>
              <p>• Period used: 2000-01 to 2024-12</p>
              <p>• Region sampling: 5 km grid over AOI</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Derived products</CardTitle>
            <CardDescription>From sources to indices</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Monthly CWB: P (monthly) − PET (monthly). Month‑matching with safe checks.</p>
            <p>• 12‑month rolling sum of CWB.</p>
            <p>• Standardization to Z‑scores → SPEI‑12 (using mean/std over the period).</p>
          </CardContent>
        </Card>

        {/** Methodology overview card removed as requested **/}
      </main>
      
    </div>
  )
}
