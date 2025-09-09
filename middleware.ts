import type { NextRequest } from 'next/server'

// No-op middleware to disable NextAuth enforcement in this demo build.
export function middleware(_req: NextRequest) {
  return
}

// Match nothing; keep file present without affecting routes.
export const config = { matcher: [] }
