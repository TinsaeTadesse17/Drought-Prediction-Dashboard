import { NextResponse } from "next/server"

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_TRANSLATE_API_KEY" }, { status: 500 })
    }

    const body = await req.json()
    const { q, target, source } = body as { q: string | string[]; target: string; source?: string }

    if (!q || !target) {
      return NextResponse.json({ error: "Missing q or target" }, { status: 400 })
    }

    const params = new URLSearchParams()
    const items = Array.isArray(q) ? q : [q]
    items.forEach((t) => params.append("q", t))
    params.set("target", target)
    if (source) params.set("source", source)
    params.set("format", "text")
    params.set("key", API_KEY)

    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      // Ensure server-side fetch
      cache: "no-store",
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    const translations: string[] = (data?.data?.translations || []).map((t: any) => t.translatedText)
    return NextResponse.json({ translations })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
