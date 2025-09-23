import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth-options'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region') || (session as any).region
  let woreda = searchParams.get('woreda') || (session as any).woreda
  if (typeof woreda === 'string' && woreda.toLowerCase() === 'gode') woreda = 'Godey'

  if (!woreda) {
    return NextResponse.json({ error: 'Missing woreda parameter' }, { status: 400 })
  }

  try {
    const url = new URL('https://deepd-model-api.onrender.com/analyze')
    url.searchParams.set('woreda_name', woreda as string)
    const r = await fetch(url.toString(), { cache: 'no-store' })
    if (!r.ok) {
      console.error('[predictions] upstream non-OK', r.status, woreda)
      return NextResponse.json({ region, woreda_name: woreda, aggregated_prediction: [] })
    }
    const data = await r.json()
    const woreda_name: string = data.woreda_name || (woreda as string)
    let raw = data.aggregated_prediction
    let arr: number[] = Array.isArray(raw) ? raw.map((v: any) => Number(v)).filter((n: any) => Number.isFinite(n)) : []
    if (arr.length > 12) arr = arr.slice(0, 12)
    return NextResponse.json({ region, woreda_name, aggregated_prediction: arr })
  } catch (e: any) {
    console.error('[predictions] upstream fetch failed', woreda, e?.message)
    return NextResponse.json({ region, woreda_name: woreda, aggregated_prediction: [] })
  }
}
