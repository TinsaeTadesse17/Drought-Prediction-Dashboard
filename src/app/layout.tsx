import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
// Temporarily disable client providers during build isolation
// import { ThemeProvider } from "@/components/theme-provider"
// import { AppSessionProvider } from '@/components/app-session-provider'

export const metadata: Metadata = {
  title: "Drought Early Warning System",
  description: "Disaster Risk Management Dashboard",
  generator: "v0.dev",
}

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
