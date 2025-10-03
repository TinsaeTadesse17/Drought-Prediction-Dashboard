import { NextResponse } from 'next/server'
import { FALLBACK_PREDICTIONS } from '@/lib/predictions-fallback'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const regionFromQuery = searchParams.get('region')
  let woreda = searchParams.get('woreda')
  const only = searchParams.get('only') // e.g. 'aggregate' to omit points in the response
  const region = regionFromQuery || undefined
  // Do not depend on session for woreda; require it via query
  // Removed legacy mapping of 'Gode' to 'Godey'; only 'Godey' is supported now.

  if (!woreda) {
    return NextResponse.json({ error: 'Missing woreda parameter' }, { status: 400 })
  }

  try {
  // Use only the primary endpoint; do not fall back to any other external service
  const PRIMARY = process.env.PREDICTIONS_API_URL || 'http://45.134.226.201:8001/analyze'

    const buildUrl = (base: string) => {
      const u = new URL(base)
      u.searchParams.set('woreda_name', woreda as string)
      return u
    }

    const fetchJson = async (u: URL) => {
      const res = await fetch(u.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error(`non-OK ${res.status}`)
      return res.json()
    }

    let data: any | null = null
    try {
      data = await fetchJson(buildUrl(PRIMARY))
    } catch (e) {
      console.error('[predictions] primary non-OK', woreda, (e as any)?.message)
      data = null
    }

    const woreda_name: string = data?.woreda_name || (woreda as string)
    // Normalize aggregates
    let raw = data?.aggregated_prediction
    let arr: number[] = Array.isArray(raw) ? raw.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n)) : []
    if (arr.length > 12) arr = arr.slice(0, 12)

    // Normalize points using local helper
    let pointsRaw: unknown[] = Array.isArray(data?.points) ? (data!.points as unknown[]) : []
    const points = pointsRaw
      .map((p: any) => {
        const lat = Number(p.lat ?? p.latitude)
        const lon = Number(p.lon ?? p.long ?? p.longitude)
        const predRaw = p.prediction ?? p.predictions ?? p.values ?? p.spei
        const prediction = Array.isArray(predRaw)
          ? predRaw.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n)).slice(0, 12)
          : []
        const shap_values = p.shap_values ?? p.shapValues
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || prediction.length === 0) return null
        return { lat, lon, prediction, ...(shap_values ? { shap_values } : {}) }
      })
      .filter(Boolean) as { lat: number; lon: number; prediction: number[]; shap_values?: any }[]

    // If aggregates missing but we have points, compute simple mean per month
    if ((arr.length === 0 || arr.every((n) => !Number.isFinite(n))) && points.length > 0) {
      const months = Math.min(12, points.reduce((max: number, p) => Math.max(max, p.prediction.length), 0)) || 12
      const computed: number[] = []
      for (let i = 0; i < months; i++) {
        const vals = points.map((p) => p.prediction[i]).filter((v): v is number => Number.isFinite(v as number))
        computed.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN)
      }
      arr = computed
    }

    // User requested aggregate only
    const outPoints = only === 'aggregate' ? [] : points

    if (arr.length === 0) {
      const fb = FALLBACK_PREDICTIONS[String(woreda_name)] || []
      return NextResponse.json({ region, woreda_name, aggregated_prediction: fb, points: outPoints })
    }
    return NextResponse.json({ region, woreda_name, aggregated_prediction: arr, points: outPoints })
  } catch (e: any) {
    console.error('[predictions] upstream fetch failed', woreda, e?.message)
    const fb = FALLBACK_PREDICTIONS[String(woreda)] || []
    return NextResponse.json({ region, woreda_name: woreda, aggregated_prediction: fb, points: [] })
  }
}
