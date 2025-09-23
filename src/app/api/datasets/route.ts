import { NextResponse } from 'next/server'
export async function GET() {
  const items = [
    { id: 'ds-001', name: 'Historical CDI 2015-2024', region: 'afar', variable: 'CDI', type: 'Historical', lastUpdated: '2025-08-01', records: 1080, status: 'active' },
    { id: 'ds-002', name: 'Forecast CDI Aug25-Aug26', region: 'somali', variable: 'CDI', type: 'Forecast', lastUpdated: '2025-08-15', records: 360, status: 'active' },
    { id: 'ds-003', name: 'Rainfall Observations 2025', region: 'afar', variable: 'Rainfall', type: 'Ingest', lastUpdated: '2025-08-18', records: 240, status: 'processing' },
    { id: 'ds-004', name: 'Vegetation Index (NDVI)', region: 'somali', variable: 'NDVI', type: 'Remote Sensing', lastUpdated: '2025-08-10', records: 520, status: 'active' },
    { id: 'ds-005', name: 'Soil Moisture (Surface)', region: 'afar', variable: 'Soil Moisture', type: 'Remote Sensing', lastUpdated: '2025-08-12', records: 520, status: 'archived' },
  ]
  return NextResponse.json(items)
}
