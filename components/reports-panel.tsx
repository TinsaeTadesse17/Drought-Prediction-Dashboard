"use client"

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { REGION_WOREDAS } from '@/lib/regions'
import { getCurrentUser } from '@/lib/auth'

type RegionKey = keyof typeof REGION_WOREDAS

function toCSV(headers: string[], rows: any[][]) {
  const esc = (s:any) => String(s ?? '').replace(/"/g,'""')
  const lines = [headers.map(h=>`"${esc(h)}"`).join(',')]
  for (const r of rows) lines.push(r.map(c=>`"${esc(c)}"`).join(','))
  return lines.join('\n')
}

export default function ReportsPanel(){
  const user = getCurrentUser()
  const regionKeys = Object.keys(REGION_WOREDAS) as RegionKey[]
  const [region, setRegion] = useState<RegionKey>( (user?.placeOfInterest?.region as RegionKey) ?? regionKeys[0] ?? 'afar' )
  const [woreda, setWoreda] = useState<string | undefined>( user?.placeOfInterest?.woreda ?? REGION_WOREDAS[region][0] )
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    setWoreda(prev => {
      if (prev && REGION_WOREDAS[region].includes(prev)) return prev
      return REGION_WOREDAS[region][0]
    })
  }, [region])

  const runReport = async () => {
    if (!woreda) return
    setLoading(true); setReport(null)
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region, woreda, type: 'both' }) })
      const j = await res.json()
      setReport(j)
    } catch (e) {
      setReport({ error: (e as any)?.message || 'Request failed' })
    } finally { setLoading(false) }
  }

  function downloadMonthly(){
    if (!report?.monthly) return
    const headers = ['monthIndex','spei','classification','phase']
    const rows = report.monthly.map((m:any)=>[m.monthIndex, m.spei, m.classification, m.phase])
    const csv = toCSV(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${report.woreda || 'report'}-monthly.csv`; a.click(); URL.revokeObjectURL(url)
  }

  function downloadDaily(){
    if (!report?.dailyApprox) return
    const headers = ['day','spei']
    const rows = report.dailyApprox.map((v:any,i:number)=>[i+1, Number.isFinite(v)?v:''])
    const csv = toCSV(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${report.woreda || 'report'}-daily.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const woredas = REGION_WOREDAS[region]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate monthly and daily reports from the model predictions. Data are computed from aggregated model output; daily values are a simple expansion of monthly values for export.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select region and woreda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-medium mb-1 block">Region</label>
                <Select value={region} onValueChange={(v)=>setRegion(v as RegionKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {regionKeys.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Woreda</label>
                <Select value={woreda} onValueChange={(v)=>setWoreda(v)}>
                  <SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent>
                    {woredas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button onClick={runReport} disabled={loading || !woreda}>{loading ? 'Generating...' : 'Generate'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {report && (
          <div className="space-y-4">
            {report.error ? (
              <Card><CardContent><div className="text-red-600">{report.error}</div></CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Report</CardTitle>
                    <CardDescription>12-month SPEI summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {report.monthly?.map((m:any, idx:number) => (
                        <div key={idx} className="p-2 border rounded">
                          <div className="font-medium">Month #{(m.monthIndex ?? idx) + 1}</div>
                          <div>SPEI: {Number.isFinite(m.spei) ? m.spei.toFixed(2) : (m.spei ?? '—')}</div>
                          <div>Class: {m.classification ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3"><Button onClick={downloadMonthly}>Download monthly CSV</Button></div>
                  </CardContent>
                </Card>

                {report.dailyApprox && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Approximation</CardTitle>
                      <CardDescription>First 30 days preview</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs overflow-x-auto mb-2">
                        {(report.dailyApprox||[]).slice(0,30).map((d:any,i:number)=> (
                          <span key={i} className="inline-block w-12">{Number.isFinite(d)?d.toFixed(2):'—'}</span>
                        ))}
                      </div>
                      <div><Button onClick={downloadDaily}>Download daily CSV</Button></div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
