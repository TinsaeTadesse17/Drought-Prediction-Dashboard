"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Menu } from "lucide-react"
import { DroughtMap } from "@/components/drought-map"
import { AggregateLineChart } from "@/components/aggregate-line-chart"
import type { Region } from "@/lib/regions"
import { REGION_WOREDAS } from "@/lib/regions"
import { getCurrentUser, loginByEmail, logout as authLogout } from "@/lib/auth"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useSession, signIn, signOut } from 'next-auth/react'
import { ThemeToggle } from "@/components/theme-toggle"
import Image from 'next/image'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import ReportsPanel from '@/components/reports-panel'

function classifySPEI(spei: number) {
  if (spei <= -1.5) return 'Extreme Drought'
  if (spei <= -1) return 'Severe Drought'
  if (spei <= -0.5) return 'Moderate Drought'
  if (spei <= 0.5) return 'Normal'
  return 'No Drought'
}

function phaseFromClass(c: string) {
  if (c === 'Extreme Drought') return 'Alert'
  if (c === 'Severe Drought' || c === 'Moderate Drought') return 'Warn'
  return 'Watch'
}

type GridPoint = { lat: number; lon: number; prediction: number[]; shap_values?: any }
type PredictionResponse = { aggregated_prediction: number[]; points?: GridPoint[]; woreda_name?: string; region?: string }

// Always call the API without 'only=aggregate' to keep behavior consistent and avoid shape/prediction mismatches
async function fetchPredictions(region: Region, woreda?: string, _opts?: { aggregateOnly?: boolean }): Promise<PredictionResponse> {
  try {
    const qs = new URLSearchParams()
    if (region) qs.set('region', region)
    if (woreda) qs.set('woreda', woreda)
    const res = await fetch(`/api/predictions?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('predictions api failed')
    const data: PredictionResponse = await res.json()
    return data
  } catch (e) {
    return { aggregated_prediction: [] }
  }
  return { aggregated_prediction: Array(12).fill(0) }
}

// Data sources are pulled from GEE; we do not host datasets here.

export function DroughtDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard")
  const [selectedRegion, setSelectedRegion] = useState<Region | undefined>("afar")
  const [selectedWoreda, setSelectedWoreda] = useState<string | undefined>(undefined)
  const [yearMonth, setYearMonth] = useState([0])
  const [lang, setLang] = useState("en")
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const { data: session } = useSession()
  const [user, setUser] = useState<any>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const [predictions, setPredictions] = useState<number[]>(Array(12).fill(0))
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([])
  const [mapLoading, setMapLoading] = useState<boolean>(false)
  // Data page shows sources only; no dataset listing or filters
  // Track latest fetch to prevent stale responses from overriding current selection
  const requestIdRef = useRef(0)

  const [compareMode, setCompareMode] = useState<'regions'|'woredas'>('regions')
  const [compareRegion, setCompareRegion] = useState<Region>('afar')
  const [woredaPredictions, setWoredaPredictions] = useState<Record<string, number[]>>({})
  const regionPredictions = useMemo<Record<Region, number[]>>(() => {
    const makeAvg = (reg: Region): number[] => {
      const ws = REGION_WOREDAS[reg]
      const arrays = ws.map(w => woredaPredictions[w]).filter(a => Array.isArray(a) && a.length > 0) as number[][]
      if (arrays.length === 0) return []
      const len = 12
      const out: number[] = []
      for (let i=0;i<len;i++) {
        const vals = arrays.map(a => a[i]).filter(v => typeof v === 'number' && Number.isFinite(v)) as number[]
        if (vals.length === 0) { out.push(NaN); continue }
        const avg = vals.reduce((a,b)=>a+b,0) / vals.length
        out.push(avg)
      }
      return out
    }
    return { afar: makeAvg('afar'), somali: makeAvg('somali') }
  }, [woredaPredictions])
  const [comparisonLoading, setComparisonLoading] = useState(false)

  useEffect(() => {
    const u = getCurrentUser()
    if (u) {
      setUser(u)
      // Do not auto-select a region for admin users; let them pick
  if (u.role === 'admin') setSelectedRegion(undefined as any)
  else setSelectedRegion(u.placeOfInterest.region)
      // Only pre-select a woreda for users that are woreda officers.
      if (u.role === 'woreda_officer') {
        setSelectedWoreda(u.placeOfInterest.woreda)
      } else {
        setSelectedWoreda(undefined)
      }
    }
  }, [])

  useEffect(() => {
    // Only fetch predictions and show spinner when a woreda is selected
    requestIdRef.current += 1
    const currentId = requestIdRef.current
    setGridPoints([])
    setPredictions([])

    if (!selectedWoreda) {
      // No woreda chosen: do not show spinner (regional/admin overview)
      setMapLoading(false)
      return
    }

    setMapLoading(true)
    if (!selectedRegion) {
      setMapLoading(false)
      return
    }
    fetchPredictions(selectedRegion, selectedWoreda)
      .then((resp) => {
        if (requestIdRef.current !== currentId) return // stale
        setPredictions(resp.aggregated_prediction || [])
        setGridPoints(resp.points || [])
      })
      .finally(() => {
        if (requestIdRef.current !== currentId) return // stale
        setMapLoading(false)
      })
  }, [selectedRegion, selectedWoreda])

  // No dataset fetching; sources are static (CHIRPS, TerraClimate via GEE)

  const MIN_DATE_LABEL = "Aug 2025"
  const END_DATE_LABEL = useMemo(() => {
    const start = new Date("2025-08-01T00:00:00Z")
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + 11)
    return d.toLocaleString("en-US", { month: "short", year: "numeric" })
  }, [])
  const currentLabel = useMemo(() => {
    const start = new Date("2025-08-01T00:00:00Z")
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + yearMonth[0])
    return d.toLocaleString("en-US", { month: "short", year: "numeric" })
  }, [yearMonth])

  const ACCURACY_DECAY_PER_MONTH = 5
  const accuracy = Math.max(0, Math.min(100, 100 - yearMonth[0] * ACCURACY_DECAY_PER_MONTH))

  const allowedRegions: Region[] = user?.allowedRegions ?? ["afar", "somali"]

  const allowedWoredasForRegion = useMemo(() => {
    if (!selectedRegion) return []
    if (!user) return REGION_WOREDAS[selectedRegion]
    if (user.role === "woreda_officer") {
      const w = user.placeOfInterest.woreda
      return w && REGION_WOREDAS[selectedRegion].includes(w) ? [w] : []
    }
    return REGION_WOREDAS[selectedRegion]
  }, [user, selectedRegion])

  const ensureWoreda = (reg?: Region, w?: string) => {
    if (!reg) return undefined
    if (!w) {
      if (user?.role === "woreda_officer") {
        const uw = user.placeOfInterest.woreda
        return uw && REGION_WOREDAS[reg].includes(uw) ? uw : undefined
      }
      return undefined
    }
    if (user?.role === "woreda_officer") {
      const uw = user.placeOfInterest.woreda
      return uw && REGION_WOREDAS[reg].includes(uw) ? uw : undefined
    }
    return REGION_WOREDAS[reg].includes(w) ? w : undefined
  }

  useEffect(() => {
    const run = async () => {
      try {
        if (lang === "en") { setTranslatedTitle(null); return }
        const res = await fetch("/api/translate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ q: "Drought Early Warning System", target: lang }) })
        const data = await res.json()
        if (Array.isArray(data.translations) && data.translations[0]) setTranslatedTitle(data.translations[0])
      } catch {}
    }
    run()
  }, [lang])

  const monthIndex = yearMonth[0]
  const currentSPEI = predictions[monthIndex]
  const hasCurrent = typeof currentSPEI === 'number' && Number.isFinite(currentSPEI)
  const currentClass = hasCurrent ? classifySPEI(currentSPEI as number) : 'No Data'
  const currentPhase = hasCurrent ? phaseFromClass(currentClass) : '—'
  // Notifications are not implemented; removed mock email alert side-effect

  useEffect(()=>{
    if (!session) return
    const sessRegion = (session as any).region || 'afar'
    const sessWoreda = (session as any).woreda
    const role = (session as any).role || 'admin'
    setUser({ role, allowedRegions: role === 'admin' ? ['afar','somali'] : [sessRegion], placeOfInterest: { region: sessRegion, woreda: sessWoreda } })
    // For admin don't auto-select a region on login; let them pick
  if (role === 'admin') setSelectedRegion(undefined as any)
  else setSelectedRegion(sessRegion)
    // Only auto-select a woreda for users whose role is 'woreda_officer'
    if (role === 'woreda_officer') setSelectedWoreda(sessWoreda)
    else setSelectedWoreda(undefined)
  }, [session])

  const handleLogout = async () => {
    try { authLogout() } catch {}
    setUser(null)
    try { await signOut({ redirect: false }) } catch {}
    setAccountOpen(false)
    router.replace('/auth/login')
  }

  const NAV_ITEMS = ["Dashboard", "Data", "Reports", "Help"] as const

  const regionInitRef = (typeof window !== 'undefined') ? (window as any)._regionInitRef ?? { current: false } : { current: false }
  useEffect(()=>{ if (!(regionInitRef as any).current && selectedRegion) { (regionInitRef as any).current = true } }, [selectedRegion])

  // No data filters; nothing to set based on role

  // No dataset summary computations

  // Reports feature removed

  useEffect(() => {
    const loadAll = async () => {
      if (!user || user.role !== 'admin' || compareMode !== 'regions') return
      setComparisonLoading(true)
      try {
        const regions: Region[] = ['afar', 'somali']
        for (const reg of regions) {
          const woredas = REGION_WOREDAS[reg]
          const entries: [string, number[]][] = []
          for (const w of woredas) {
            if (woredaPredictions[w]) continue
            const resp = await fetchPredictions(reg, w)
            entries.push([w, resp.aggregated_prediction || []])
          }
          if (entries.length) setWoredaPredictions(prev => ({ ...prev, ...Object.fromEntries(entries) }))
        }
      } finally { setComparisonLoading(false) }
    }
    loadAll()
  }, [user, compareMode])

  useEffect(() => {
    const loadWoredas = async () => {
      if (!user) return
      const needWoredaComparison = (user.role === 'regional_officer') || (user.role === 'admin' && compareMode === 'woredas')
      if (!needWoredaComparison) return
      setComparisonLoading(true)
      try {
        const woredas = REGION_WOREDAS[compareRegion]
        const entries: [string, number[]][] = []
        for (const w of woredas) {
            if (woredaPredictions[w]) { continue }
            const resp = await fetchPredictions(compareRegion, w)
            entries.push([w, resp.aggregated_prediction || []])
        }
        if (entries.length) {
          setWoredaPredictions(prev => ({ ...prev, ...Object.fromEntries(entries) }))
        }
      } finally { setComparisonLoading(false) }
    }
    loadWoredas()
  }, [user, compareMode, compareRegion, woredaPredictions])

  useEffect(() => {
      // Robust auto-selection for woreda restrictions
      // Also trigger a clear/loading state when the region changes and before a woreda is resolved
      setGridPoints([])
      setPredictions([])
    // Do not show the spinner at region-level; spinner appears only when fetching predictions for a selected woreda
      // Only auto-select a woreda for 'woreda_officer' users. Admins and regional officers start with no woreda selected.
      if (user?.role === 'woreda_officer') {
        if (allowedWoredasForRegion.length === 1) {
          const only = allowedWoredasForRegion[0]
          if (selectedWoreda !== only) {
            setSelectedWoreda(ensureWoreda(selectedRegion, only))
            return
          }
        }
        if (!selectedWoreda && allowedWoredasForRegion.length > 0) {
          setSelectedWoreda(ensureWoreda(selectedRegion, allowedWoredasForRegion[0]))
          return
        }
      }
      if (selectedWoreda && !allowedWoredasForRegion.includes(selectedWoreda)) {
        if (allowedWoredasForRegion.length > 0) setSelectedWoreda(ensureWoreda(selectedRegion, allowedWoredasForRegion[0]))
        else setSelectedWoreda(undefined)
      }
    }, [selectedRegion, allowedWoredasForRegion, selectedWoreda])

  useEffect(() => {
    const loadRegionWoredas = async () => {
      if (!selectedRegion) return
      const woredas = REGION_WOREDAS[selectedRegion]
      const entries: [string, number[]][] = []
      for (const w of woredas) {
        if (woredaPredictions[w]) continue
  const resp = await fetchPredictions(selectedRegion, w)
  entries.push([w, resp.aggregated_prediction || []])
      }
      if (entries.length) setWoredaPredictions(prev => ({ ...prev, ...Object.fromEntries(entries) }))
    }
    loadRegionWoredas()
  }, [selectedRegion])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Elevated z-index so the navbar stays above Leaflet panes (tile=200..control=800) */}
      <header className="border-b bg-card sticky top-0 z-[1000] shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-accent" onClick={()=>setMobileNavOpen(o=>!o)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
            <div className="flex items-center gap-2">
              <Image src="/ethiopian-disaster-risk-management-commission-logo.jpg" alt="Ethiopian DRM Commission" width={40} height={40} className="h-9 w-auto rounded-sm object-contain bg-white p-1" />
              <h1 className="text-base md:text-lg font-semibold">Disaster Risk Management</h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            {NAV_ITEMS.map(tab => (
              <button
                key={tab}
                onClick={() => {
                  // Keep navbar and show Reports as an in-dashboard tab for consistent shell
                  setActiveTab(tab)
                  setMobileNavOpen(false)
                }}
                className={`px-2 py-2 text-sm font-medium transition-colors ${activeTab===tab?"text-primary border-b-2 border-primary":"text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Lang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="so">Somali</SelectItem>
                <SelectItem value="aa">Afar</SelectItem>
              </SelectContent>
            </Select>
            {/* Removed Bell (notifications) and Settings icons for cleaner navbar */}
            <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account"><UserIcon className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                {user ? (<>
                  <DropdownMenuLabel className="space-y-1">
                    <div className="font-medium text-sm">{user.role}</div>
                    <div className="text-xs text-muted-foreground">Region: {selectedRegion}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">Logout</DropdownMenuItem>
                </>) : (<>
                  <DropdownMenuLabel className="text-sm font-medium">Login</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={()=>signIn()}>Sign In</DropdownMenuItem>
                </>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {mobileNavOpen && <div className="md:hidden border-t px-4 pb-3 flex flex-col gap-1 bg-card">
          {NAV_ITEMS.map(tab => (
            <button
              key={tab}
              onClick={()=>{ setActiveTab(tab); setMobileNavOpen(false) }}
              className={`text-left px-2 py-2 rounded text-sm ${activeTab===tab?"bg-accent text-primary":"hover:bg-accent"}`}
            >
              {tab}
            </button>
          ))}
        </div>}
      </header>

      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {activeTab === "Dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">{translatedTitle ?? "Drought Early Warning System"}</h1>
                <p className="text-muted-foreground text-sm md:text-base">Interactive drought monitoring with role-based geographic visibility and SPEI predictions.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  {
                    (() => {
                      const predsByW: Record<string, number[]> = {}
                      if (selectedRegion) {
                        for (const w of REGION_WOREDAS[selectedRegion] || []) predsByW[w] = woredaPredictions[w] || []
                      }
                      return (
                        <DroughtMap
                          key={`${selectedRegion || 'none'}:${selectedWoreda || 'none'}`}
                          region={selectedRegion as Region}
                          woreda={selectedWoreda}
                          monthIndex={yearMonth[0]}
                          predictions={predictions}
                          loading={mapLoading}
                          disableInteraction={accountOpen}
                          predictionsByWoreda={predsByW}
                          allowedWoredas={allowedWoredasForRegion}
                          points={gridPoints}
                          onSelectWoreda={setSelectedWoreda}
                          // When admin is viewing and no woreda selected, allow showing both regions outlines
                          showRegions={(user && user.role === 'admin' && !selectedWoreda && !selectedRegion) ? ['afar','somali'] : undefined}
                        />
                      )
                    })()
                  }
                  <div className="mt-4 bg-card border rounded p-4">
                    <div className="flex justify-between items-center mb-2 text-sm"><span>Forecast Month</span><Badge variant="secondary">{currentLabel}</Badge></div>
                    <Slider value={yearMonth} onValueChange={setYearMonth} max={11} min={0} step={1} className="w-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>{MIN_DATE_LABEL}</span><span>{END_DATE_LABEL}</span></div>
                  </div>
                  <div className="mt-4">
                    <AggregateLineChart values={predictions} />
                  </div>
                </div>
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="bg-card/50 rounded border p-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Region</label>
                      <Select value={selectedRegion} onValueChange={(v)=>{const reg=v as Region; setSelectedRegion(reg); setSelectedWoreda(prev=>ensureWoreda(reg, prev))}}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allowedRegions.map(r => <SelectItem key={r} value={r}>{r === 'afar' ? 'Afar' : 'Somali'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Woreda</label>
                      <Select value={selectedWoreda} onValueChange={setSelectedWoreda}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {allowedWoredasForRegion.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 rounded border bg-background text-xs space-y-1">
                      <div className="flex justify-between"><span>Month</span><span>{currentLabel}</span></div>
                      <div className="flex justify-between"><span>SPEI</span><span>{hasCurrent ? (currentSPEI as number).toFixed(2) : '—'}</span></div>
                      <div className="flex justify-between"><span>Class</span><span>{currentClass}</span></div>
                      <div className={`flex justify-between ${currentPhase==='Alert'?'text-red-600':currentPhase==='Warn'?'text-orange-600':'text-green-600'}`}><span>Phase</span><span>{currentPhase}</span></div>
                    </div>
                    {!hasCurrent && <div className="text-[11px] text-muted-foreground">No data yet. Select a woreda or try another month.</div>}
                    
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Current SPEI</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{hasCurrent ? (currentSPEI as number).toFixed(2) : '—'}</div></CardContent></Card>
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Classification</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currentClass}</div></CardContent></Card>
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Phase</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${currentPhase==='Alert'?'text-red-600':currentPhase==='Warn'?'text-orange-600':'text-green-600'}`}>{currentPhase}</div></CardContent></Card>
                </div>
              </div>

              {user && user.role !== 'woreda_officer' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span>{user.role === 'admin' ? 'Regional & Woreda Comparison' : 'Woreda Comparison'}</span>
                      <div className="flex gap-2 items-center">
                        {user.role === 'admin' && (
                          <Select value={compareMode} onValueChange={(v)=>setCompareMode(v as 'regions'|'woredas')}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regions">Regions</SelectItem>
                              <SelectItem value="woredas">Woredas</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {(user.role === 'regional_officer' || (user.role==='admin' && compareMode==='woredas')) && (
                          <Select value={compareRegion} onValueChange={(v)=>{ setCompareRegion(v as Region) }} disabled={user.role==='regional_officer'}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="afar">Afar</SelectItem>
                              <SelectItem value="somali">Somali</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {comparisonLoading ? 'Loading comparison...' : user.role === 'admin' && compareMode==='regions' ? 'Region-level current month SPEI & phase.' : 'Woreda-level current month SPEI & phase.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {compareMode === 'regions' && user.role === 'admin' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground uppercase">
                            <tr>
                              <th className="text-left font-medium py-1">Region</th>
                              <th className="text-left font-medium py-1">SPEI</th>
                              <th className="text-left font-medium py-1">Class</th>
                              <th className="text-left font-medium py-1">Phase</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(['afar','somali'] as Region[]).map(r => {
                              const preds = regionPredictions[r] || []
                              const val = preds[monthIndex]
                              const hasVal = typeof val === 'number' && Number.isFinite(val)
                              const cls = hasVal ? classifySPEI(val as number) : 'No Data'
                              const ph = phaseFromClass(cls)
                              return (
                                <tr key={r} className="border-t">
                                  <td className="py-1 capitalize font-medium">{r}</td>
                                  <td className="py-1 tabular-nums">{hasVal ? (val as number).toFixed(2) : '—'}</td>
                                  <td className="py-1">{cls}</td>
                                  <td className={`py-1 ${ph==='Alert'?'text-red-600':ph==='Warn'?'text-orange-600':'text-green-600'}`}>{ph}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {((user.role === 'regional_officer') || (user.role==='admin' && compareMode==='woredas')) && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground uppercase">
                            <tr>
                              <th className="text-left font-medium py-1">Woreda</th>
                              <th className="text-left font-medium py-1">SPEI</th>
                              <th className="text-left font-medium py-1">Class</th>
                              <th className="text-left font-medium py-1">Phase</th>
                            </tr>
                          </thead>
                          <tbody>
                            {REGION_WOREDAS[(user.role==='regional_officer'? user.placeOfInterest.region : compareRegion) as Region].map(w => {
                              const preds = woredaPredictions[w] || []
                              const val = preds[monthIndex]
                              const hasVal = typeof val === 'number' && Number.isFinite(val)
                              const cls = hasVal ? classifySPEI(val as number) : 'No Data'
                              const ph = phaseFromClass(cls)
                              return (
                                <tr key={w} className="border-t">
                                  <td className="py-1 font-medium">{w}</td>
                                  <td className="py-1 tabular-nums">{hasVal ? (val as number).toFixed(2) : '—'}</td>
                                  <td className="py-1">{cls}</td>
                                  <td className={`py-1 ${ph==='Alert'?'text-red-600':ph==='Warn'?'text-orange-600':'text-green-600'}`}>{ph}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <p className="mt-2 text-[10px] text-muted-foreground">Values are fetched from the external model API.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              <footer className="text-center text-xs text-muted-foreground mt-4">
                <p><a className="underline" href="https://t.me/" target="_blank" rel="noopener noreferrer">Telegram Bot</a></p>
                <p>© 2025 Drought Early Warning System</p>
              </footer>
            </div>
          )}

          {activeTab === "Data" && (
            <div className="space-y-8">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
                <p className="text-sm text-muted-foreground">Data are accessed from Google Earth Engine; we do not host or expose raw data here. The model uses CHIRPS precipitation and TerraClimate PET as inputs for monthly water balance and SPEI‑12.</p>
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
                    <p>• Region sampling: 5 km grid over the selected region</p>
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
                    <p>• Region sampling: 5 km grid over the selected region</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Derived products</CardTitle>
                  <CardDescription>From sources to indices</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>• Monthly CWB: P (monthly) − PET (monthly)</p>
                  <p>• 12‑month rolling sum of CWB</p>
                  <p>• Standardized to Z‑scores (SPEI‑12)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "Reports" && (
            <div className="space-y-8">
              <ReportsPanel />
            </div>
          )}

          {activeTab === "Help" && (
            <div className="space-y-6 w-full">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Help & Usage</h1>
                <p className="text-sm text-muted-foreground">How the dashboard works today: live forecasts per woreda, satellite-backed inputs, and role-based access.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div><span className="font-semibold">1.</span> Pick Region / Woreda (as allowed by your role).</div>
                    <div><span className="font-semibold">2.</span> Use the month slider to explore the 12‑month forecast.</div>
                    <div><span className="font-semibold">3.</span> Review the current SPEI, classification, and phase for the selected month.</div>
                    <div><span className="font-semibold">4.</span> Optional: change theme or language.</div>
                  </CardContent>
                </Card>
                <Card className="col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Phases</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <div><span className="font-semibold text-green-600">Watch:</span> Normal / No drought baseline.</div>
                    <div><span className="font-semibold text-orange-600">Warn:</span> Moderate or Severe drought emerging.</div>
                    <div><span className="font-semibold text-red-600">Alert:</span> Extreme drought conditions.</div>
                  </CardContent>
                </Card>
                <Card className="col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Roles</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <div><span className="font-semibold">Admin:</span> All regions & woredas.</div>
                    <div><span className="font-semibold">Regional:</span> All woredas in assigned region.</div>
                    <div><span className="font-semibold">Woreda:</span> Only their woreda.</div>
                  </CardContent>
                </Card>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="map">
                  <AccordionTrigger className="text-sm">Interaction</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>Select a woreda to fetch live predictions from the external API. Use the month slider to examine changes across the 12‑month horizon.</p>
                    <p>If no values appear, ensure a woreda is selected or try another month.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="spei">
                  <AccordionTrigger className="text-sm">SPEI & Forecast Slider</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>The slider spans a 12‑month horizon. SPEI (Standardized Precipitation–Evapotranspiration Index) updates with the selected month. Accuracy is shown conceptually decaying over lead time.</p>
                  </AccordionContent>
                </AccordionItem>
                {/* Notifications are not implemented; alerts section removed */}
                <AccordionItem value="localization">
                  <AccordionTrigger className="text-sm">Language & Theme</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>Language selector currently translates the headline only (prototype). Theme toggle switches light/dark for better visibility.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq">
                  <AccordionTrigger className="text-sm">FAQ</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-3">
                    <div>
                      <p className="font-semibold">Why no data for my woreda?</p>
                      <p className="text-muted-foreground">Predictions load from an external API on selection. If none appear, ensure a woreda is selected and try another month.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Why do I need to reselect sometimes?</p>
                      <p className="text-muted-foreground">The view refreshes when region or woreda changes to prevent stale data and ensure fresh API results.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Can I export data?</p>
                      <p className="text-muted-foreground">A CSV export is planned from the Data section.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Further Support</CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>For feature requests or access changes, contact the system administrator.</p>
                </CardContent>
              </Card>
            </div>
            
          )}
        </main>
      </div>
    </div>
  )
}
