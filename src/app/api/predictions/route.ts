import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region') || (session as any).region
  const woreda = searchParams.get('woreda') || (session as any).woreda
  // Mock deterministic
  const seed = region + (woreda || '')
  const arr: number[] = []
  for (let i=0;i<12;i++) {
    const h = seed.split('').reduce((a: number,c: string)=>a+c.charCodeAt(0),0) + i*31
    const v = ((Math.sin(h)+1)/2)*3 - 1.8
    arr.push(Number(v.toFixed(2)))
  }
  return NextResponse.json({ region, woreda, predictions: arr })
}
