"use client"

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoIcon, Download } from 'lucide-react'
import { REGION_WOREDAS } from '@/lib/regions'
import { getCurrentUser } from '@/lib/auth'

type RegionKey = keyof typeof REGION_WOREDAS

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Dynamic: 12 months back from current month
const getMonthName = (monthIndex: number) => {
  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 11 + monthIndex, 1)
  return MONTH_NAMES[targetDate.getMonth()]
}

const getMonthYear = (monthIndex: number) => {
  const now = new Date()
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 11 + monthIndex, 1)
  return targetDate.toLocaleString("en-US", { month: "short", year: "numeric" })
}

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
  const [reportType, setReportType] = useState<'woreda' | 'pixel'>('woreda')

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
      // Fetch predictions directly from client side
      const qs = new URLSearchParams()
      if (region) qs.set('region', region)
      qs.set('woreda', woreda)
      
      const res = await fetch(`/api/predictions?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Predictions API error:', res.status, errorText)
        setReport({ error: `Failed to fetch predictions (${res.status}): ${errorText || 'Request failed'}` })
        return
      }
      
      const data = await res.json()
      console.log('Predictions data received:', data)
      
      // Process the data into report format
      const agg: number[] = Array.isArray(data?.aggregated_prediction) 
        ? data.aggregated_prediction.slice(0, 12).map((v: any) => {
            const n = Number(v)
            return Number.isFinite(n) ? n : NaN
          })
        : []
      
      const points = Array.isArray(data?.points) ? data.points : []
      
      // Generate monthly report
      const monthlyReport = agg.map((v, i) => ({
        monthIndex: i,
        spei: Number.isFinite(v) ? v : null,
        classification: classifyPixelSPEI(v),
        phase: getPhaseFromClass(classifyPixelSPEI(v))
      }))
      
      // Generate daily approximation
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      const dailyApprox: number[] = []
      for (let i = 0; i < 12; i++) {
        const val = Number.isFinite(agg[i]) ? agg[i] : NaN
        for (let d = 0; d < daysInMonth[i]; d++) dailyApprox.push(val)
      }
      
      setReport({
        woreda,
        region,
        monthly: monthlyReport,
        dailyApprox,
        points
      })
    } catch (e) {
      console.error('Report generation error:', e)
      setReport({ error: (e as any)?.message || 'Request failed' })
    } finally { setLoading(false) }
  }
  
  function getPhaseFromClass(classification: string) {
    if (classification === 'Extreme Drought') return 'Alert'
    if (classification === 'Severe Drought' || classification === 'Moderate Drought') return 'Warn'
    return 'Watch'
  }

  function downloadMonthly(){
    if (!report?.monthly) return
    const headers = ['month','monthIndex','spei','classification','phase']
    const rows = report.monthly.map((m:any)=>[getMonthName(m.monthIndex), m.monthIndex, m.spei, m.classification, m.phase])
    const csv = toCSV(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${report.woreda || 'report'}-monthly-woreda.csv`; a.click(); URL.revokeObjectURL(url)
  }

  function downloadPixelData(){
    if (!report?.points) return
    const headers = ['latitude','longitude','month','monthIndex','spei','classification']
    const rows: any[][] = []
    report.points.forEach((pt:any) => {
      if (Array.isArray(pt.prediction)) {
        pt.prediction.forEach((spei:number, monthIdx:number) => {
          const classification = classifyPixelSPEI(spei)
          rows.push([pt.lat, pt.lon, getMonthName(monthIdx), monthIdx, spei, classification])
        })
      }
    })
    const csv = toCSV(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${report.woreda || 'report'}-pixel-level.csv`; a.click(); URL.revokeObjectURL(url)
  }

  function classifyPixelSPEI(spei: number | null | undefined) {
    if (spei == null || !Number.isFinite(spei)) return 'No Data'
    if (spei <= -1.5) return 'Extreme Drought'
    if (spei <= -1) return 'Severe Drought'
    if (spei <= -0.5) return 'Moderate Drought'
    if (spei <= 0.5) return 'Normal'
    return 'No Drought'
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
    <TooltipProvider>
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">Generate monthly and daily reports from the model predictions. Choose between woreda-level aggregated data or detailed pixel-level grid data.</p>
        </div>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Generate Report
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Select a region and woreda to generate reports. Woreda-level reports show aggregated averages, while pixel-level reports preserve individual grid point data for detailed analysis.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Select region, woreda, and report type</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
                  <label className="text-xs font-medium mb-1 flex items-center gap-1">
                    Report Type
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs"><strong>Woreda:</strong> Single aggregated value per month (average across all grid points)<br/><strong>Pixel:</strong> Individual values for each grid point, preserving spatial detail</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select value={reportType} onValueChange={(v)=>setReportType(v as 'woreda' | 'pixel')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="woreda">Woreda-level (Aggregated)</SelectItem>
                      <SelectItem value="pixel">Pixel-level (Grid)</SelectItem>
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
                {reportType === 'woreda' ? (
              <>
                <Card>
                  <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Woreda-Level Monthly Report
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs"><strong>SPEI (Standardized Precipitation-Evapotranspiration Index):</strong> Measures drought severity. Values below -0.5 indicate drought conditions.</p>
                            </TooltipContent>
                          </Tooltip>
                          <Badge variant="secondary" className="ml-auto">Aggregated</Badge>
                        </CardTitle>
                        <CardDescription>12-month SPEI forecast for {report.woreda || 'selected woreda'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                          <div className="font-semibold mb-2">Drought Classification Legend:</div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">Extreme</Badge><span className="text-muted-foreground">SPEI ≤ -1.5</span></div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">Severe</Badge><span className="text-muted-foreground">-1.5 &lt; SPEI ≤ -1.0</span></div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">Moderate</Badge><span className="text-muted-foreground">-1.0 &lt; SPEI ≤ -0.5</span></div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">Normal</Badge><span className="text-muted-foreground">-0.5 &lt; SPEI ≤ 0.5</span></div>
                          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">No Drought</Badge><span className="text-muted-foreground">SPEI &gt; 0.5</span></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                          {report.monthly?.map((m:any, idx:number) => {
                            const classification = m.classification ?? '–'
                            let badgeClass = 'bg-gray-100 text-gray-800'
                            if (classification.includes('Extreme')) badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                            else if (classification.includes('Severe')) badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
                            else if (classification.includes('Moderate')) badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                            else if (classification === 'Normal') badgeClass = 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                            else if (classification.includes('No Drought')) badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                            
                            return (
                              <div key={idx} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                <div className="font-semibold text-sm mb-1">{getMonthName(m.monthIndex ?? idx)}</div>
                                <div className="text-muted-foreground mb-2">SPEI: <span className="font-mono font-medium text-foreground">{Number.isFinite(m.spei) ? m.spei.toFixed(2) : '–'}</span></div>
                                <Badge variant="outline" className={`text-xs ${badgeClass}`}>{classification}</Badge>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button onClick={downloadMonthly} size="sm"><Download className="h-4 w-4 mr-2" />Download Woreda-Level CSV</Button>
                    </div>
                  </CardContent>
                </Card>

                {report.dailyApprox && (
                  <Card>
                    <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            Daily Approximation
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">Daily values are simple expansions of monthly SPEI values for export. Each day within a month has the same SPEI value as that month.</p>
                              </TooltipContent>
                            </Tooltip>
                          </CardTitle>
                          <CardDescription>First 30 days preview (full year available in CSV)</CardDescription>
                    </CardHeader>
                    <CardContent>
                          <div className="text-xs overflow-x-auto mb-2 p-2 bg-muted/30 rounded font-mono">
                        {(report.dailyApprox||[]).slice(0,30).map((d:any,i:number)=> (
                              <span key={i} className="inline-block w-14 p-1">{Number.isFinite(d)?d.toFixed(2):'–'}</span>
                        ))}
                      </div>
                          <div><Button onClick={downloadDaily} size="sm"><Download className="h-4 w-4 mr-2" />Download Daily CSV</Button></div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Pixel-Level Report
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Pixel-level data preserves individual grid point predictions across the woreda. This provides full spatial detail rather than a single averaged value.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Badge variant="secondary" className="ml-auto">Full Grid Detail</Badge>
                      </CardTitle>
                      <CardDescription>
                        Grid-level predictions for {report.woreda || 'selected woreda'}
                        {report.points && <span className="ml-2 font-semibold">({report.points.length} grid points)</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
                        <div style={{color: 'black'}} className="font-semibold mb-1 dark:text-blue-100">💡 Understanding Pixel-Level Data</div>
                        <p style={{color: 'black'}} className="dark:text-blue-200">
                          Unlike woreda-level reports which show a single aggregated value, pixel-level reports include individual SPEI predictions for each grid point (~5km resolution) within the woreda. This preserves spatial variability and allows for detailed sub-woreda analysis.
                        </p>
                      </div>
                      
                      {report.points && report.points.length > 0 ? (
                        <>
                          <div className="mb-4">
                            <div className="text-sm font-semibold mb-2">Sample Grid Points (First 5):</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-muted">
                                    <th className="border p-2 text-left">Latitude</th>
                                    <th className="border p-2 text-left">Longitude</th>
                                    <th className="border p-2 text-left">Sample Month</th>
                                    <th className="border p-2 text-left">SPEI</th>
                                    <th className="border p-2 text-left">Classification</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {report.points.slice(0, 5).map((pt:any, idx:number) => {
                                    const sampleSpei = Array.isArray(pt.prediction) ? pt.prediction[0] : null
                                    const classification = classifyPixelSPEI(sampleSpei)
                                    return (
                                      <tr key={idx}>
                                        <td className="border p-2 font-mono">{pt.lat?.toFixed(4)}</td>
                                        <td className="border p-2 font-mono">{pt.lon?.toFixed(4)}</td>
                                        <td className="border p-2">{getMonthName(0)}</td>
                                        <td className="border p-2 font-mono">{Number.isFinite(sampleSpei) ? sampleSpei.toFixed(2) : '–'}</td>
                                        <td className="border p-2">{classification}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
                            <strong>Note:</strong> Full pixel-level data for all {report.points.length} grid points across all 12 months is available in the downloadable CSV file.
                          </div>
                          <div className="mt-4">
                            <Button onClick={downloadPixelData} size="sm"><Download className="h-4 w-4 mr-2" />Download Pixel-Level CSV ({report.points.length * 12} rows)</Button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                          No pixel-level data available. The API may not have returned grid points for this woreda.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
    </TooltipProvider>
  )
}
