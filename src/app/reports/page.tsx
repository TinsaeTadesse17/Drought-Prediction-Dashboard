"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCaption } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

interface Report {
  id: string
  title: string
  region: string
  period: string
  type: string
  created: string
  status: 'ready' | 'generating' | 'failed'
  sizeKB: number
}

const SAMPLE_REPORTS: Report[] = [
  { id: 'r-101', title: 'Afar Monthly Situation - Jul 2025', region: 'afar', period: 'Jul 2025', type: 'Situation', created: '2025-08-01', status: 'ready', sizeKB: 412 },
  { id: 'r-102', title: 'Somali Forecast Outlook (Q4 2025)', region: 'somali', period: 'Q4 2025', type: 'Forecast', created: '2025-08-12', status: 'ready', sizeKB: 655 },
  { id: 'r-103', title: 'Afar Rainfall Anomaly Snapshot', region: 'afar', period: 'Aug 2025', type: 'Rainfall', created: '2025-08-16', status: 'generating', sizeKB: 0 },
]

export default function ReportsPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const redirectingRef = useRef(false)
  const [user, setUser] = useState<any>(null)

  // Generation form state (mock)
  const [genRegion, setGenRegion] = useState('afar')
  const [genType, setGenType] = useState('Situation')
  const [genMonths, setGenMonths] = useState([3]) // months span
  const [title, setTitle] = useState('')

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.replace('/auth/login')
      }
    } else {
      setUser(u)
      if (u.role !== 'admin') setGenRegion(u.placeOfInterest.region)
      setChecked(true)
    }
  }, [router])

  const reports = useMemo(() => {
    return SAMPLE_REPORTS.filter(r => {
      if (user && user.role !== 'admin' && r.region !== user.placeOfInterest.region) return false
      return true
    })
  }, [user])

  const summary = useMemo(() => {
    const total = reports.length
    const generating = reports.filter(r=>r.status==='generating').length
    const ready = reports.filter(r=>r.status==='ready').length
    return { total, generating, ready }
  }, [reports])

  function handleGenerate() {
    // mock handler (would POST to /api/reports)
    console.log('[MOCK] Generate report', { genRegion, genType, genMonths: genMonths[0], title })
    setTitle('')
  }

  if (!checked) return null
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate analytical & situation reports for decision support. Mock functionality until API integration.</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Reports</CardTitle><CardDescription>Total available</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ready</CardTitle><CardDescription>Downloadable</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.ready}</CardContent>
          </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Generating</CardTitle><CardDescription>In progress</CardDescription></CardHeader>
              <CardContent className="text-3xl font-semibold">{summary.generating}</CardContent>
            </Card>
        </div>

        {/* Generation Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">New Report</CardTitle>
            <CardDescription>Configure and generate a report (mock)</CardDescription>
          </CardHeader>
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
                <Slider value={genMonths} max={12} min={1} step={1} onValueChange={setGenMonths} />
                <div className="text-[10px] text-muted-foreground mt-1">{genMonths[0]} month(s)</div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Custom Title (optional)</label>
                <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Afar Early Warning Aug 2025" />
              </div>
            </div>
            <div>
              <Button size="sm" onClick={handleGenerate}>Generate</Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <CardDescription>Latest generated artefacts (mock)</CardDescription>
          </CardHeader>
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
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="capitalize">{r.region}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>
                      <Badge variant={r.status==='ready'?'default':r.status==='generating'?'secondary':'outline'} className={r.status==='failed'?'bg-red-600 text-white':''}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.sizeKB? r.sizeKB.toLocaleString(): '--'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.created}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Mock list. API integration will enable download and regeneration.</TableCaption>
            </Table>
          </CardContent>
        </Card>
      </main>  
    </div>
  )
}
