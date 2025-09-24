import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth-options'
import { NextResponse } from 'next/server'
import { FALLBACK_PREDICTIONS } from '@/lib/predictions-fallback'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const regionFromQuery = searchParams.get('region')
  let woreda = searchParams.get('woreda')
  const session = await getServerSession(authOptions)
  const region = regionFromQuery || ((session as any)?.region)
  if (!woreda) woreda = (session as any)?.woreda
  // Removed legacy mapping of 'Gode' to 'Godey'; only 'Godey' is supported now.

  if (!woreda) {
    return NextResponse.json({ error: 'Missing woreda parameter' }, { status: 400 })
  }

  try {
    const url = new URL('https://deepd-model-api.onrender.com/analyze')
    url.searchParams.set('woreda_name', woreda as string)
    const r = await fetch(url.toString(), { cache: 'no-store' })
    if (!r.ok) {
      console.error('[predictions] upstream non-OK', r.status, woreda)
      const fb = FALLBACK_PREDICTIONS[String(woreda)] || []
      return NextResponse.json({ region, woreda_name: woreda, aggregated_prediction: fb })
    }
    const data = await r.json()
    const woreda_name: string = data.woreda_name || (woreda as string)
    let raw = data.aggregated_prediction
    let arr: number[] = Array.isArray(raw) ? raw.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n)) : []
    if (arr.length > 12) arr = arr.slice(0, 12)
    if (arr.length === 0) {
      const fb = FALLBACK_PREDICTIONS[String(woreda_name)] || []
      return NextResponse.json({ region, woreda_name, aggregated_prediction: fb })
    }
    return NextResponse.json({ region, woreda_name, aggregated_prediction: arr })
  } catch (e: any) {
    console.error('[predictions] upstream fetch failed', woreda, e?.message)
    const fb = FALLBACK_PREDICTIONS[String(woreda)] || []
    return NextResponse.json({ region, woreda_name: woreda, aggregated_prediction: fb })
  }
}
