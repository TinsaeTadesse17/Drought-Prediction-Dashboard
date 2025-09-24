import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const hasDb = !!process.env.DATABASE_URL

export async function POST(req: Request) {
  try {
    if (!hasDb) {
      const fallback = { id: 'local-' + Math.random().toString(36).slice(2), name: '', email: '', role: null, region: null, woreda: null }
      return NextResponse.json(fallback)
    }
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name : ''
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const role = typeof body.role === 'string' ? body.role : null
    const region = typeof body.region === 'string' ? body.region : null
    const woreda = typeof body.woreda === 'string' ? body.woreda : null
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const data: any = { name, email }
    if (role) data.role = role
    if (region) data.region = region
    if (woreda) data.woreda = woreda
    if (hasDb) {
      try {
        const user = await prisma.user.upsert({
          where: { email },
          update: data,
          create: data,
        })
        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, region: user.region, woreda: user.woreda })
      } catch {
        const fallback = { id: 'local-' + Math.random().toString(36).slice(2), ...data }
        return NextResponse.json(fallback)
      }
    }
    const fallback = { id: 'local-' + Math.random().toString(36).slice(2), ...data }
    return NextResponse.json(fallback)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}
