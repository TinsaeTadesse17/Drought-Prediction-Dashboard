export type Region = "afar" | "somali"

export const REGION_WOREDAS: Record<Region, string[]> = {
  afar: ["Elidar", "Bidu", "Kori"],
  somali: ["Gode", "Fik", "Hargele"],
}

// Rough bounding boxes [ [southWestLat, southWestLng], [northEastLat, northEastLng] ]
export const ETHIOPIA_BOUNDS: [[number, number], [number, number]] = [
  [3.3, 32.8],
  [14.9, 48.2],
]

export const REGION_BOUNDS: Record<Region, [[number, number], [number, number]]> = {
  // Afar Region (approximate)
  afar: [
    [8.8, 39.2],
    [14.6, 42.9],
  ],
  // Somali Region (approximate)
  somali: [
    [4.0, 40.5],
    [11.5, 47.8],
  ],
}

// Simple representative coordinates for the listed Woredas (approximate)
export const WOREDA_COORDS: Record<string, [number, number]> = {
  // Afar
  Elidar: [12.0, 41.9],
  Bidu: [13.0, 41.5],
  Kori: [12.6, 40.5],
  // Somali
  Gode: [5.95, 43.45],
  Fik: [8.13, 43.88],
  Hargele: [6.07, 44.27],
}
