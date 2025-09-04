"use client"

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCaption } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface DatasetRow {
  id: string
  name: string
  region: string
  woreda?: string
  variable: string
  type: string
  lastUpdated: string
  records: number
  status: 'active' | 'processing' | 'archived'
}

const SAMPLE_DATASETS: DatasetRow[] = [
  { id: 'ds-001', name: 'Historical CDI 2015-2024', region: 'afar', variable: 'CDI', type: 'Historical', lastUpdated: '2025-08-01', records: 1080, status: 'active' },
  { id: 'ds-002', name: 'Forecast CDI Aug25-Aug26', region: 'somali', variable: 'CDI', type: 'Forecast', lastUpdated: '2025-08-15', records: 360, status: 'active' },
  { id: 'ds-003', name: 'Rainfall Observations 2025', region: 'afar', variable: 'Rainfall', type: 'Ingest', lastUpdated: '2025-08-18', records: 240, status: 'processing' },
  { id: 'ds-004', name: 'Vegetation Index (NDVI)', region: 'somali', variable: 'NDVI', type: 'Remote Sensing', lastUpdated: '2025-08-10', records: 520, status: 'active' },
  { id: 'ds-005', name: 'Soil Moisture (Surface)', region: 'afar', variable: 'Soil Moisture', type: 'Remote Sensing', lastUpdated: '2025-08-12', records: 520, status: 'archived' },
]

export default function DataPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const redirectingRef = useRef(false)
  const [user, setUser] = useState<any>(null)

  // Filters
  const [region, setRegion] = useState<string>('all')
  const [variable, setVariable] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      if (!redirectingRef.current) {
        redirectingRef.current = true
        router.replace('/auth/login')
      }
    } else {
      setUser(u)
      // Restrict default region if user not admin
      if (u.role !== 'admin') setRegion(u.placeOfInterest.region)
      setChecked(true)
    }
  }, [router])

  const filtered = useMemo(() => {
    return SAMPLE_DATASETS.filter(d => {
      if (user && user.role !== 'admin' && d.region !== user.placeOfInterest.region) return false
      if (region !== 'all' && d.region !== region) return false
      if (variable !== 'all' && d.variable !== variable) return false
      if (status !== 'all' && d.status !== status) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [region, variable, status, search, user])

  const summary = useMemo(() => {
    const total = filtered.length
    const recs = filtered.reduce((a, d) => a + d.records, 0)
    const processing = filtered.filter(d => d.status === 'processing').length
    return { total, recs, processing }
  }, [filtered])

  if (!checked) return null
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Data</h1>
          <p className="text-sm text-muted-foreground">Curated drought-related datasets supporting CDI computation, forecasting & situational analysis.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Datasets</CardTitle><CardDescription>Total loaded (filtered)</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Records</CardTitle><CardDescription>Aggregate rows</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.recs}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Processing</CardTitle><CardDescription>Active ingests</CardDescription></CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.processing}</CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Refine dataset list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">Region</label>
                <Select value={region} onValueChange={setRegion} disabled={user?.role !== 'admin'}>
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
                <Select value={variable} onValueChange={setVariable}>
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
                <Select value={status} onValueChange={setStatus}>
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
                <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Dataset name" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {user?.role === 'admin' && <Button size="sm" variant="default">Upload Dataset</Button>}
              <Button size="sm" variant="secondary">Export CSV</Button>
              <Button size="sm" variant="outline" onClick={()=>{setVariable('all'); setStatus('all'); setSearch(''); if(user?.role==='admin') setRegion('all')}}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Datasets</CardTitle>
            <CardDescription>Listing of available datasets (mock)</CardDescription>
          </CardHeader>
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
                {filtered.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="capitalize">{d.region}</TableCell>
                    <TableCell>{d.variable}</TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>
                      <Badge variant={d.status==='active'?'default':d.status==='processing'?'secondary':'outline'} className={d.status==='archived'?'opacity-70':''}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.records.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.lastUpdated}</TableCell>
                  </TableRow>
                ))}
                {filtered.length===0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No datasets match the filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableCaption>Mock data for UI demonstration. Real ingestion & API wiring pending.</TableCaption>
            </Table>
          </CardContent>
        </Card>
      </main>
      
    </div>
  )
}
