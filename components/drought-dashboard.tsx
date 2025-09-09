"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Bell, Settings, Menu } from "lucide-react"
import { DroughtMap } from "@/components/drought-map"
import type { Region } from "@/lib/regions"
import { REGION_WOREDAS } from "@/lib/regions"
import { getCurrentUser, loginByEmail, logout as authLogout } from "@/lib/auth"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from 'next/image'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCaption } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

// CDI classification function
function classifyCDI(cdi: number) {
  if (cdi <= -1.5) return 'Extreme Drought'
  if (cdi <= -1) return 'Severe Drought'
  if (cdi <= -0.5) return 'Moderate Drought'
  if (cdi <= 0.5) return 'Normal'
  return 'No Drought'
}

function phaseFromClass(c: string) {
  if (c === 'Extreme Drought') return 'Alert'
  if (c === 'Severe Drought' || c === 'Moderate Drought') return 'Warn'
  return 'Watch'
}

async function fetchPredictions(region: Region, woreda?: string): Promise<number[]> {
  // Placeholder for real API call to baseurl/predictions?region=...&woreda=...
  // Return deterministic mock for stability
  const seed = (region + (woreda||''))
  const arr: number[] = []
  for (let i=0;i<12;i++) {
    // simple pseudo-random but stable per seed
    const h = seed.split('').reduce((a,c)=>a+c.charCodeAt(0),0) + i*31
    const v = ((Math.sin(h)+1)/2)*3 - 1.8 // range approx -1.8 .. +1.2
    arr.push(Number(v.toFixed(2)))
  }
  return arr
}

// Dataset & Report sample (mock) data
interface DatasetRow { id: string; name: string; region: string; variable: string; type: string; lastUpdated: string; records: number; status: 'active' | 'processing' | 'archived' }
const SAMPLE_DATASETS: DatasetRow[] = [
  { id: 'ds-001', name: 'Historical CDI 2015-2024', region: 'afar', variable: 'CDI', type: 'Historical', lastUpdated: '2025-08-01', records: 1080, status: 'active' },
  { id: 'ds-002', name: 'Forecast CDI Aug25-Aug26', region: 'somali', variable: 'CDI', type: 'Forecast', lastUpdated: '2025-08-15', records: 360, status: 'active' },
  { id: 'ds-003', name: 'Rainfall Observations 2025', region: 'afar', variable: 'Rainfall', type: 'Ingest', lastUpdated: '2025-08-18', records: 240, status: 'processing' },
  { id: 'ds-004', name: 'Vegetation Index (NDVI)', region: 'somali', variable: 'NDVI', type: 'Remote Sensing', lastUpdated: '2025-08-10', records: 520, status: 'active' },
  { id: 'ds-005', name: 'Soil Moisture (Surface)', region: 'afar', variable: 'Soil Moisture', type: 'Remote Sensing', lastUpdated: '2025-08-12', records: 520, status: 'archived' },
]
interface ReportRow { id: string; title: string; region: string; period: string; type: string; created: string; status: 'ready' | 'generating' | 'failed'; sizeKB: number }
const SAMPLE_REPORTS: ReportRow[] = [
  { id: 'r-101', title: 'Afar Monthly Situation - Jul 2025', region: 'afar', period: 'Jul 2025', type: 'Situation', created: '2025-08-01', status: 'ready', sizeKB: 412 },
  { id: 'r-102', title: 'Somali Forecast Outlook (Q4 2025)', region: 'somali', period: 'Q4 2025', type: 'Forecast', created: '2025-08-12', status: 'ready', sizeKB: 655 },
  { id: 'r-103', title: 'Afar Rainfall Anomaly Snapshot', region: 'afar', period: 'Aug 2025', type: 'Rainfall', created: '2025-08-16', status: 'generating', sizeKB: 0 },
]

export function DroughtDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard")
  // Region & woreda default; will sync with logged-in user when available
  const [selectedRegion, setSelectedRegion] = useState<Region>("afar")
  const [selectedWoreda, setSelectedWoreda] = useState<string | undefined>(undefined)
  const [yearMonth, setYearMonth] = useState([0])
  const [lang, setLang] = useState("en")
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const [predictions, setPredictions] = useState<number[]>(Array(12).fill(0))
  // Data tab filters/state
  const [dataRegion, setDataRegion] = useState('all')
  const [dataVariable, setDataVariable] = useState('all')
  const [dataStatus, setDataStatus] = useState('all')
  const [dataSearch, setDataSearch] = useState('')
  // Reports tab state
  const [genRegion, setGenRegion] = useState('afar')
  const [genType, setGenType] = useState('Situation')
  const [genMonths, setGenMonths] = useState([3])
  const [reportTitle, setReportTitle] = useState('')
  
  // Comparison state (new)
  const [compareMode, setCompareMode] = useState<'regions'|'woredas'>('regions') // admin only toggle
  const [compareRegion, setCompareRegion] = useState<Region>('afar') // region for woreda comparison
  const [regionPredictions, setRegionPredictions] = useState<Record<Region, number[]>>({ afar: Array(12).fill(0), somali: Array(12).fill(0) })
  const [woredaPredictions, setWoredaPredictions] = useState<Record<string, number[]>>({})
  const [comparisonLoading, setComparisonLoading] = useState(false)

  // Load current user on mount (ensures sync with storage changes)
  useEffect(() => {
    const u = getCurrentUser()
    if (u) {
      setUser(u)
      setSelectedRegion(u.placeOfInterest.region)
      setSelectedWoreda(u.placeOfInterest.woreda)
    }
  }, [])

  useEffect(() => {
    fetchPredictions(selectedRegion, selectedWoreda).then(setPredictions)
  }, [selectedRegion, selectedWoreda])

  // Year slider: Aug 2025 (0) -> Aug 2026 (12)
  const MIN_DATE_LABEL = "Aug 2025"
  const MAX_DATE_LABEL = "Aug 2026"
  const currentLabel = useMemo(() => {
    const start = new Date("2025-08-01T00:00:00Z")
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + yearMonth[0])
    return d.toLocaleString("en-US", { month: "short", year: "numeric" })
  }, [yearMonth])

  // Accuracy decays per month from start
  const ACCURACY_DECAY_PER_MONTH = 5
  const accuracy = Math.max(0, Math.min(100, 100 - yearMonth[0] * ACCURACY_DECAY_PER_MONTH))

  // Role-based: limit region options to user's allowed regions (Afar/Somali only)
  const allowedRegions: Region[] = user?.allowedRegions ?? ["afar", "somali"]

  // Allowed woredas depend on role
  const allowedWoredasForRegion = useMemo(() => {
    if (!user) return REGION_WOREDAS[selectedRegion]
    if (user.role === "woreda_officer") {
      const w = user.placeOfInterest.woreda
      return w && REGION_WOREDAS[selectedRegion].includes(w) ? [w] : []
    }
    // admin and regional_officer can view all woredas in the selected region
    return REGION_WOREDAS[selectedRegion]
  }, [user, selectedRegion])

  // Ensure woreda validity on region change based on role
  const ensureWoreda = (reg: Region, w?: string) => {
    if (!w) {
      if (user?.role === "woreda_officer") {
        const uw = user.placeOfInterest.woreda
        return uw && REGION_WOREDAS[reg].includes(uw) ? uw : undefined
      }
      return undefined
    }
    // If user is woreda_officer, force their woreda
    if (user?.role === "woreda_officer") {
      const uw = user.placeOfInterest.woreda
      return uw && REGION_WOREDAS[reg].includes(uw) ? uw : undefined
    }
    return REGION_WOREDAS[reg].includes(w) ? w : undefined
  }

  // Translation fetch (title only currently)
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

  // Email alert mock when classification escalates
  const monthIndex = yearMonth[0]
  const currentCDI = predictions[monthIndex] ?? 0
  const currentClass = classifyCDI(currentCDI)
  const currentPhase = phaseFromClass(currentClass)
  useEffect(() => {
    if (currentPhase === 'Warn' || currentPhase === 'Alert') {
      // mock email send
      console.log("[MOCK] Sending email alert:", { user: user?.email, region: selectedRegion, woreda: selectedWoreda, phase: currentPhase, cdi: currentCDI })
    }
  }, [currentPhase, currentCDI, selectedRegion, selectedWoreda, user])

  // If integrating NextAuth later, map session -> user here.

  const handleLogout = async () => {
    try { authLogout() } catch {}
    setUser(null)
  // NextAuth signOut not used in this demo build.
    setAccountOpen(false)
    router.replace('/auth/login')
  }

  // Responsive nav items
  const NAV_ITEMS = ["Dashboard", "Data", "Reports", "Help"] as const

  const regionInitRef = (typeof window !== 'undefined') ? (window as any)._regionInitRef ?? { current: false } : { current: false }
  useEffect(()=>{ if (!(regionInitRef as any).current && selectedRegion) { (regionInitRef as any).current = true } }, [selectedRegion])

  // Adjust default dataRegion when user loads
  useEffect(()=>{ if(user && user.role !== 'admin') { setDataRegion(user.placeOfInterest.region) ; setGenRegion(user.placeOfInterest.region) } },[user])

  // Derived Data tab values
  const filteredDatasets = useMemo(()=>{
    return SAMPLE_DATASETS.filter(d=>{
      if (user && user.role !== 'admin' && d.region !== user.placeOfInterest.region) return false
      if (dataRegion !== 'all' && d.region !== dataRegion) return false
      if (dataVariable !== 'all' && d.variable !== dataVariable) return false
      if (dataStatus !== 'all' && d.status !== dataStatus) return false
      if (dataSearch && !d.name.toLowerCase().includes(dataSearch.toLowerCase())) return false
      return true
    })
  }, [user, dataRegion, dataVariable, dataStatus, dataSearch])

  const dataSummary = useMemo(()=>{
    const total = filteredDatasets.length
    const recs = filteredDatasets.reduce((a,d)=>a+d.records,0)
    const processing = filteredDatasets.filter(d=>d.status==='processing').length
    return { total, recs, processing }
  }, [filteredDatasets])

  // Reports derived
  const visibleReports = useMemo(()=>{
    return SAMPLE_REPORTS.filter(r=>{ if(user && user.role!=='admin' && r.region!==user.placeOfInterest.region) return false; return true })
  },[user])
  const reportSummary = useMemo(()=>{
    const total = visibleReports.length
    const generating = visibleReports.filter(r=>r.status==='generating').length
    const ready = visibleReports.filter(r=>r.status==='ready').length
    return { total, generating, ready }
  },[visibleReports])

  const handleGenerateReport = () => {
    console.log('[MOCK] Generate report', { genRegion, genType, months: genMonths[0], title: reportTitle })
    setReportTitle('')
  }

  useEffect(() => {
    // Preload region-level predictions for admin comparison (and for regional to show baseline if desired)
    const load = async () => {
      if (!user) return
      if (user.role === 'woreda_officer') return
      setComparisonLoading(true)
      try {
        const afarP = await fetchPredictions('afar')
        const somaliP = await fetchPredictions('somali')
        setRegionPredictions({ afar: afarP, somali: somaliP })
      } finally { setComparisonLoading(false) }
    }
    load()
  }, [user])

  useEffect(() => {
    // Load woreda predictions for selected compareRegion when needed
    const loadWoredas = async () => {
      if (!user) return
      const needWoredaComparison = (user.role === 'regional_officer') || (user.role === 'admin' && compareMode === 'woredas')
      if (!needWoredaComparison) return
      setComparisonLoading(true)
      try {
        const woredas = REGION_WOREDAS[compareRegion]
        const entries: [string, number[]][] = []
        for (const w of woredas) {
          // Avoid refetch if already present
            if (woredaPredictions[w]) { continue }
            const preds = await fetchPredictions(compareRegion, w)
            entries.push([w, preds])
        }
        if (entries.length) {
          setWoredaPredictions(prev => ({ ...prev, ...Object.fromEntries(entries) }))
        }
      } finally { setComparisonLoading(false) }
    }
    loadWoredas()
  }, [user, compareMode, compareRegion, woredaPredictions])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-30">
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
              <button key={tab} onClick={()=>{setActiveTab(tab); setMobileNavOpen(false)}} className={`px-2 py-2 text-sm font-medium transition-colors ${activeTab===tab?"text-primary border-b-2 border-primary":"text-muted-foreground hover:text-foreground"}`}>{tab}</button>
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
            <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
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
                  <DropdownMenuItem onClick={()=>router.push('/auth/login')}>Sign In</DropdownMenuItem>
                </>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {mobileNavOpen && <div className="md:hidden border-t px-4 pb-3 flex flex-col gap-1 bg-card">
          {NAV_ITEMS.map(tab => (
            <button key={tab} onClick={()=>{setActiveTab(tab); setMobileNavOpen(false)}} className={`text-left px-2 py-2 rounded text-sm ${activeTab===tab?"bg-accent text-primary":"hover:bg-accent"}`}>{tab}</button>
          ))}
        </div>}
      </header>

      <div className="flex flex-1 flex-col">
        {/* Removed separate sticky aside; integrate sidebar content next to map */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {activeTab === "Dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">{translatedTitle ?? "Drought Early Warning System"}</h1>
                <p className="text-muted-foreground text-sm md:text-base">Interactive drought monitoring with role-based geographic visibility and CDI predictions.</p>
              </div>

              {/* Map + Sidebar side-by-side on desktop */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <DroughtMap region={selectedRegion} woreda={selectedWoreda} monthIndex={monthIndex} predictions={predictions} disableInteraction={accountOpen} />
                  <div className="mt-4 bg-card border rounded p-4">
                    <div className="flex justify-between items-center mb-2 text-sm"><span>Forecast Month</span><Badge variant="secondary">{currentLabel}</Badge></div>
                    <Slider value={yearMonth} onValueChange={setYearMonth} max={12} min={0} step={1} className="w-full" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>{MIN_DATE_LABEL}</span><span>{MAX_DATE_LABEL}</span></div>
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
                      <div className="flex justify-between"><span>CDI</span><span>{currentCDI?.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Class</span><span>{currentClass}</span></div>
                      <div className={`flex justify-between ${currentPhase==='Alert'?'text-red-600':currentPhase==='Warn'?'text-orange-600':'text-green-600'}`}><span>Phase</span><span>{currentPhase}</span></div>
                    </div>
                    <div className="text-xs text-muted-foreground">Email alerts auto-send (mock) when phase is Warn or Alert.</div>
                  </div>
                </div>
              </div>

              {/* Key Metrics (responsive stacking) */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Current CDI</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currentCDI.toFixed(2)}</div></CardContent></Card>
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Classification</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currentClass}</div></CardContent></Card>
                  <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Phase</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${currentPhase==='Alert'?'text-red-600':currentPhase==='Warn'?'text-orange-600':'text-green-600'}`}>{currentPhase}</div></CardContent></Card>
                </div>
              </div>

              {/* Role-based Comparison Section */}
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
                      {comparisonLoading ? 'Loading comparison...' : user.role === 'admin' && compareMode==='regions' ? 'Region-level current month CDI & phase.' : 'Woreda-level current month CDI & phase.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {compareMode === 'regions' && user.role === 'admin' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground uppercase">
                            <tr>
                              <th className="text-left font-medium py-1">Region</th>
                              <th className="text-left font-medium py-1">CDI</th>
                              <th className="text-left font-medium py-1">Class</th>
                              <th className="text-left font-medium py-1">Phase</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(['afar','somali'] as Region[]).map(r => {
                              const preds = regionPredictions[r] || []
                              const val = preds[monthIndex] ?? 0
                              const cls = classifyCDI(val)
                              const ph = phaseFromClass(cls)
                              return (
                                <tr key={r} className="border-t">
                                  <td className="py-1 capitalize font-medium">{r}</td>
                                  <td className="py-1 tabular-nums">{val.toFixed(2)}</td>
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
                              <th className="text-left font-medium py-1">CDI</th>
                              <th className="text-left font-medium py-1">Class</th>
                              <th className="text-left font-medium py-1">Phase</th>
                            </tr>
                          </thead>
                          <tbody>
                            {REGION_WOREDAS[(user.role==='regional_officer'? user.placeOfInterest.region : compareRegion) as Region].map(w => {
                              const preds = woredaPredictions[w] || []
                              const val = preds[monthIndex] ?? 0
                              const cls = classifyCDI(val)
                              const ph = phaseFromClass(cls)
                              return (
                                <tr key={w} className="border-t">
                                  <td className="py-1 font-medium">{w}</td>
                                  <td className="py-1 tabular-nums">{val.toFixed(2)}</td>
                                  <td className="py-1">{cls}</td>
                                  <td className={`py-1 ${ph==='Alert'?'text-red-600':ph==='Warn'?'text-orange-600':'text-green-600'}`}>{ph}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <p className="mt-2 text-[10px] text-muted-foreground">Values are mock predictions; real API will replace.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Regional Comparison placeholder kept (can be role-dynamic later) */}
              {/* <Card>
                <CardHeader><CardTitle>Regional Comparison (Placeholder)</CardTitle></CardHeader>
                <CardContent><div className="text-sm text-muted-foreground mb-2">Future role-based comparative analytics.</div><Progress value={60} /></CardContent>
              </Card> */}
              <footer className="text-center text-xs text-muted-foreground mt-4">
                <p><a className="underline" href="https://t.me/" target="_blank" rel="noopener noreferrer">Telegram Bot</a></p>
                <p>© 2025 Drought Early Warning System</p>
              </footer>
            </div>
          )}

          {activeTab === "Data" && (
            <div className="space-y-10">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Data</h1>
                <p className="text-sm text-muted-foreground">Curated drought-related datasets supporting CDI computation & forecasting.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Datasets</CardTitle><CardDescription>Filtered count</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{dataSummary.total}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Records</CardTitle><CardDescription>Aggregate rows</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{dataSummary.recs}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Processing</CardTitle><CardDescription>Active ingests</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{dataSummary.processing}</CardContent></Card>
              </div>
              <Card>
                <CardHeader className="pb-4"><CardTitle className="text-base">Filters</CardTitle><CardDescription>Refine dataset list</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium mb-1 block">Region</label>
                      <Select value={dataRegion} onValueChange={setDataRegion} disabled={user?.role!== 'admin'}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="afar">Afar</SelectItem>
                          <SelectItem value="somali">Somali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium mb-1 block">Variable</label>
                      <Select value={dataVariable} onValueChange={setDataVariable}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="CDI">CDI</SelectItem>
                          <SelectItem value="Rainfall">Rainfall</SelectItem>
                          <SelectItem value="NDVI">NDVI</SelectItem>
                          <SelectItem value="Soil Moisture">Soil Moisture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium mb-1 block">Status</label>
                      <Select value={dataStatus} onValueChange={setDataStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium mb-1 block">Search</label>
                      <Input value={dataSearch} onChange={e=>setDataSearch(e.target.value)} placeholder="Dataset name" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {user?.role==='admin' && <Button size="sm">Upload Dataset</Button>}
                    <Button size="sm" variant="secondary">Export CSV</Button>
                    <Button size="sm" variant="outline" onClick={()=>{ setDataVariable('all'); setDataStatus('all'); setDataSearch(''); if(user?.role==='admin') setDataRegion('all') }}>Reset</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4"><CardTitle className="text-base">Datasets</CardTitle><CardDescription>Available datasets (mock)</CardDescription></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Variable</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Records</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDatasets.map(d=> (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="capitalize">{d.region}</TableCell>
                          <TableCell>{d.variable}</TableCell>
                          <TableCell>{d.type}</TableCell>
                          <TableCell><Badge variant={d.status==='active'?'default': d.status==='processing'?'secondary':'outline'} className={d.status==='archived'?'opacity-70':''}>{d.status}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{d.records.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.lastUpdated}</TableCell>
                        </TableRow>
                      ))}
                      {filteredDatasets.length===0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No datasets match the filters.</TableCell></TableRow>}
                    </TableBody>
                    <TableCaption>Mock data – real ingestion & API wiring pending.</TableCaption>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "Reports" && (
            <div className="space-y-10">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-sm text-muted-foreground">Generate analytical & situation reports (mock UI until API integration).</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reports</CardTitle><CardDescription>Total</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{reportSummary.total}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ready</CardTitle><CardDescription>Downloadable</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{reportSummary.ready}</CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Generating</CardTitle><CardDescription>In progress</CardDescription></CardHeader><CardContent className="text-3xl font-semibold">{reportSummary.generating}</CardContent></Card>
              </div>
              <Card>
                <CardHeader className="pb-4"><CardTitle className="text-base">New Report</CardTitle><CardDescription>Configure & generate (mock)</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Region</label>
                      <Select value={genRegion} onValueChange={setGenRegion} disabled={user?.role!=='admin'}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="afar">Afar</SelectItem>
                          <SelectItem value="somali">Somali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Type</label>
                      <Select value={genType} onValueChange={setGenType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Situation">Situation</SelectItem>
                          <SelectItem value="Forecast">Forecast</SelectItem>
                          <SelectItem value="Rainfall">Rainfall</SelectItem>
                          <SelectItem value="Vegetation">Vegetation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Months Span</label>
                      <Slider value={genMonths} onValueChange={setGenMonths} min={1} max={12} step={1} />
                      <div className="text-[10px] text-muted-foreground mt-1">{genMonths[0]} month(s)</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Custom Title</label>
                      <Input value={reportTitle} onChange={e=>setReportTitle(e.target.value)} placeholder="e.g. Afar Early Warning Aug 2025" />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleGenerateReport}>Generate</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4"><CardTitle className="text-base">Recent Reports</CardTitle><CardDescription>Latest generated artefacts (mock)</CardDescription></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size (KB)</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleReports.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell className="capitalize">{r.region}</TableCell>
                          <TableCell>{r.period}</TableCell>
                          <TableCell>{r.type}</TableCell>
                          <TableCell><Badge variant={r.status==='ready'?'default':r.status==='generating'?'secondary':'outline'} className={r.status==='failed'?'bg-red-600 text-white':''}>{r.status}</Badge></TableCell>
                          <TableCell className="tabular-nums">{r.sizeKB? r.sizeKB.toLocaleString(): '--'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.created}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>Mock list – API integration will enable downloads.</TableCaption>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "Help" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Help & Usage</h1>
                <p className="text-sm text-muted-foreground">Guidance for using the Drought Early Warning Dashboard effectively.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div><span className="font-semibold">1.</span> Pick Region / Woreda (if permitted)</div>
                    <div><span className="font-semibold">2.</span> Move the month slider</div>
                    <div><span className="font-semibold">3.</span> Click a woreda polygon on the map</div>
                    <div><span className="font-semibold">4.</span> Review CDI & phase</div>
                    <div><span className="font-semibold">5.</span> Change theme / language if needed</div>
                  </CardContent>
                </Card>
                <Card className="col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Phases</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <div><span className="font-semibold text-green-600">Watch:</span> Normal / No drought baseline.</div>
                    <div><span className="font-semibold text-orange-600">Warn:</span> Moderate or Severe drought emerging.</div>
                    <div><span className="font-semibold text-red-600">Alert:</span> Extreme drought conditions.</div>
                    <div className="text-muted-foreground pt-1">Email alerts (mock) for Warn & Alert.</div>
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
                  <AccordionTrigger className="text-sm">Map & Interaction</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>The map is constrained to Afar and Somali regions. Selecting a woreda highlights it and dims the rest. The legend (left on map) lists woredas and severity colors. Click entries to focus.</p>
                    <p>If the map appears blank, ensure your role has a region assigned. The system defaults to Afar; selecting a region re-fetches the GeoJSON.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cdi">
                  <AccordionTrigger className="text-sm">CDI & Forecast Slider</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>The slider spans 12 forecast months (Aug 2025 – Aug 2026). CDI (Composite Drought Index) values update for the selected month. Accuracy conceptually decays over time (placeholder logic now).</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="alerts">
                  <AccordionTrigger className="text-sm">Alerts & Email Logic</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>Warn or Alert phases automatically trigger a mock email dispatch (visible in console). Real integrations would send notifications to configured recipients.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="localization">
                  <AccordionTrigger className="text-sm">Language & Theme</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-2">
                    <p>Use the language selector for translation (currently headline only prototype). Theme toggle switches light / dark for better situational visibility.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq">
                  <AccordionTrigger className="text-sm">FAQ</AccordionTrigger>
                  <AccordionContent className="text-sm space-y-3">
                    <div>
                      <p className="font-semibold">Why no data for my woreda?</p>
                      <p className="text-muted-foreground">Mock predictions are deterministic placeholders until real API integration.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Why does the map need reselection?</p>
                      <p className="text-muted-foreground">We force a refresh keyed by region & woreda so it should auto-load now. If not, verify the GeoJSON files exist under /public/geo.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Can I export data?</p>
                      <p className="text-muted-foreground">Planned in the future Data section.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Further Support</CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>For feature requests or access changes, contact the system administrator.</p>
                  <p>Real API & localization expansion are upcoming milestones.</p>
                </CardContent>
              </Card>
            </div>
            
          )}
        </main>
      </div>
    </div>
  )
}
