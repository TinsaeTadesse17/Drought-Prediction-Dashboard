import { NextResponse } from 'next/server'

type Req = { region?: string; woreda?: string; type?: 'monthly' | 'daily' | 'both' }

function classifySPEI(spei: number | null | undefined) {
  if (spei == null || !Number.isFinite(spei)) return 'No Data'
  if (spei <= -1.5) return 'Extreme Drought'
  if (spei <= -1) return 'Severe Drought'
  if (spei <= -0.5) return 'Moderate Drought'
  if (spei <= 0.5) return 'Normal'
  return 'No Drought'
}

function numeric(arr: any[]) { return arr.map(v => { const n = Number(v); return Number.isFinite(n) ? n : NaN }) }

function monthlySummary(arr: number[]) {
  const valid = arr.filter(v => Number.isFinite(v))
  if (valid.length === 0) return { count: 0, mean: null, min: null, max: null }
  const sum = valid.reduce((a,b)=>a+b,0)
  return { count: valid.length, mean: sum/valid.length, min: Math.min(...valid), max: Math.max(...valid) }
}

function dailyApproxFromMonthly(monthly: number[]) {
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31]
  const out: number[] = []
  for (let i=0;i<12;i++) {
    const val = Number.isFinite(monthly[i]) ? monthly[i] : NaN
    for (let d=0; d<daysInMonth[i]; d++) out.push(val)
  }
  return out
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Req
    const region = body.region
    const woreda = body.woreda
    const type = body.type || 'both'
    if (!woreda) return NextResponse.json({ error: 'Missing woreda' }, { status: 400 })

    // Construct the URL for internal API call
    const origin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const u = new URL(`${origin}/api/predictions`)
    if (region) u.searchParams.set('region', region)
    u.searchParams.set('woreda', woreda)

    console.log('Fetching predictions from:', u.toString())

    let res: Response
    try {
      res = await fetch(u.toString(), { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError.message)
      return NextResponse.json({ 
        error: `Failed to fetch predictions: ${fetchError.message}. URL: ${u.toString()}` 
      }, { status: 502 })
    }

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Predictions API error:', res.status, errorText)
      return NextResponse.json({ 
        error: `Predictions upstream failed (${res.status}): ${errorText}` 
      }, { status: 502 })
    }

    const data = await res.json()

    const agg: number[] = Array.isArray(data?.aggregated_prediction) ? numeric(data.aggregated_prediction).slice(0,12) : []
    const points = Array.isArray(data?.points) ? data.points : []

    const monthlyReport = agg.map((v,i)=>({ monthIndex: i, spei: Number.isFinite(v)?v:null, classification: classifySPEI(v) }))
    const summary = monthlySummary(agg)

    const dailyApprox = (type === 'daily' || type === 'both') ? dailyApproxFromMonthly(Array.from({length:12},(_,i)=>agg[i] ?? NaN)) : null

    return NextResponse.json({ woreda, region, monthly: monthlyReport, summary, dailyApprox, points })
  } catch (e:any) {
    console.error('Reports route error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
