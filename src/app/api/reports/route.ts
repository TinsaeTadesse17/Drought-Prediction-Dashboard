import { NextResponse } from 'next/server'

export async function GET() {
  const items = [
    { id: 'r-101', title: 'Afar Monthly Situation - Jul 2025', region: 'afar', period: 'Jul 2025', type: 'Situation', created: '2025-08-01', status: 'ready', sizeKB: 412 },
    { id: 'r-102', title: 'Somali Forecast Outlook (Q4 2025)', region: 'somali', period: 'Q4 2025', type: 'Forecast', created: '2025-08-12', status: 'ready', sizeKB: 655 },
    { id: 'r-103', title: 'Afar Rainfall Anomaly Snapshot', region: 'afar', period: 'Aug 2025', type: 'Rainfall', created: '2025-08-16', status: 'generating', sizeKB: 0 },
  ]
  return NextResponse.json(items)
}
