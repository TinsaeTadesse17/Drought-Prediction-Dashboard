"use client"

import { useEffect, useRef, useState } from "react"
import type { LatLngTuple, Control, Map as LeafletMap, Layer, GeoJSON as LeafletGeoJSON, PathOptions } from "leaflet"
import type { Region } from "@/lib/regions"
import { REGION_BOUNDS, REGION_WOREDAS } from "@/lib/regions"

/*
Enhancements:
1. Uses GeoJSON region-specific shapefile (/geo/{region}_woredas.geojson) to display ONLY that region by applying a mask layer that hides everything else (world mask minus region polygons) producing a clipped visual.
2. Legend lists the original three woredas from REGION_WOREDAS (unchanged) and allows clicking to select one (emits via optional onSelectWoreda prop).
3. Loading spinner while GeoJSON is being fetched.
4. Placeholder drought severity styling per feature (random for now) with future hook for real data.
*/

type Props = {
  region?: Region
  woreda?: string
  disableInteraction?: boolean
  onSelectWoreda?: (w: string) => void
  monthIndex?: number
  predictions?: number[]
}

export function DroughtMap({ region, woreda, disableInteraction, onSelectWoreda, monthIndex = 0, predictions = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LeafletMap | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const geojsonCache = useRef<Record<Region, any | null>>({ afar: null, somali: null })
  const regionLayerRef = useRef<LeafletGeoJSON | null>(null)
  const highlightLayerRef = useRef<Layer | null>(null)
  const legendRef = useRef<Control | null>(null)
  const maskLayerRef = useRef<Layer | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const severityColors: Record<string, string> = {
    extreme: "#dc2626",
    severe: "#f97316",
    moderate: "#eab308",
    mild: "#60a5fa",
    normal: "#22c55e",
  }
  const severities = Object.keys(severityColors)

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return

    let cancelled = false
    const initMap = async () => {
      const L = (await import("leaflet")).default
      if (cancelled) return
      const container = mapRef.current
      if (!container || !container.isConnected) return

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      if (!mapInstance.current) {
        try {
          mapInstance.current = L.map(container, {
            center: [9.5, 42.0],
            zoom: 6,
            zoomControl: true,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
          })
        } catch (e) {
          // If container disappeared during async load, abort silently
          return
        }

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstance.current)

        const invalidate = () => mapInstance.current && mapInstance.current.invalidateSize()
        mapInstance.current.whenReady(invalidate)
        setTimeout(invalidate, 0)
        roRef.current = new ResizeObserver(() => invalidate())
        roRef.current.observe(container)
        window.addEventListener("resize", invalidate)

        // Legend (region + woredas + severity key)
        const legend = (L as any).control({ position: "bottomright" }) as Control
        ;(legend as any).onAdd = () => {
          const div = L.DomUtil.create("div", "legend")
          div.className = "leaflet-control bg-white/95 dark:bg-gray-800/90 backdrop-blur rounded-md shadow border border-gray-300 dark:border-gray-600 p-3 text-xs max-w-[220px] text-gray-800 dark:text-gray-100";
          div.innerHTML = `
            <div class='font-semibold mb-1' id='legend-region-name'>Region</div>
            <div class='mb-2 max-h-28 overflow-auto pr-1' id='legend-woreda-list'></div>
            <div class='mt-2 border-t pt-2'>
              <div class='font-semibold mb-1'>Severity</div>
              ${severities.map(s=>`<div class='flex items-center gap-2 mb-1'><span class='w-3 h-3 rounded border border-gray-400/50' style='background:${severityColors[s]}'></span><span class='capitalize'>${s}</span></div>`).join("")}
            </div>
          `
          return div
        }
        legend.addTo(mapInstance.current)
        legendRef.current = legend

        // Loading overlay element
        const loading = document.createElement("div")
        loading.className = "absolute inset-0 flex items-center justify-center pointer-events-none"
        loading.innerHTML = `<div class='bg-white/80 dark:bg-gray-900/80 px-4 py-2 rounded text-sm font-medium shadow'>Loading map…</div>`
        loading.style.display = "none"
        container.appendChild(loading)
        loadingRef.current = loading
        setMapReady(true)
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapInstance.current && roRef.current && mapRef.current) {
        try { roRef.current.unobserve(mapRef.current) } catch {}
      }
    }
  }, [])

  // Helper: show/hide loading
  const setLoading = (val: boolean) => {
    if (loadingRef.current) loadingRef.current.style.display = val ? "flex" : "none"
  }

  // Fetch & render region
  useEffect(() => {
    if (!region || !mapInstance.current || !mapReady) return

    const loadRegionGeo = async () => {
      setLoading(true)
      try {
        if (!geojsonCache.current[region]) {
          const resp = await fetch(`/geo/filtered_woredas.geojson`)
            .catch(() => fetch(`/filtered_woredas.geojson`)) // fallback if not under /geo
          if (!resp || !resp.ok) throw new Error("GeoJSON fetch failed")
          geojsonCache.current[region] = await resp.json()
        }
      } catch (e) {
        console.warn(e)
      } finally {
        setLoading(false)
      }
      renderRegion()
    }

    const renderRegion = async () => {
      const L = (await import("leaflet")).default
      const data = geojsonCache.current[region]
      if (!data || !mapInstance.current) return

      // Remove existing region/highlight/mask layers
      if (regionLayerRef.current) { try { mapInstance.current.removeLayer(regionLayerRef.current) } catch {} }
      if (highlightLayerRef.current) { try { mapInstance.current.removeLayer(highlightLayerRef.current) } catch {} }
      if (maskLayerRef.current) { try { mapInstance.current.removeLayer(maskLayerRef.current) } catch {} }
      regionLayerRef.current = null
      highlightLayerRef.current = null
      maskLayerRef.current = null

      // Assign random severity for placeholder styling
      const pickSeverity = () => severities[Math.floor(Math.random()*severities.length)]

      // Build layer
      const layer = L.geoJSON(data, {
        style: (feature: any): PathOptions => {
          // derive CDI per feature using its index for determinism
          const idx = (data.features || []).indexOf(feature)
          const cdi = predictions[monthIndex] ?? 0
          const cls = classify(cdi)
          const isSelected = (feature.properties?.ADM3_EN||'').toLowerCase() === (woreda||'').toLowerCase()
          const baseColor = cls === 'Extreme Drought' ? '#dc2626' : cls === 'Severe Drought' ? '#f97316' : cls === 'Moderate Drought' ? '#eab308' : cls === 'Normal' ? '#22c55e' : '#3b82f6'
          return { color: baseColor, weight: isSelected ? 3 : 1, fillColor: baseColor, fillOpacity: isSelected ? 0.65 : 0.4 }
        },
        onEachFeature: (feature, lyr) => {
          const name = feature.properties?.ADM3_EN || 'Unknown'
          const cdi = predictions[monthIndex] ?? 0
          const cls = classify(cdi)
          const phase = phaseOf(cls)
          lyr.on('click', () => {
            onSelectWoreda && onSelectWoreda(name)
            lyr.bindPopup(`<div class='text-sm font-semibold mb-1'>${name}</div><div class='text-xs'>CDI: ${cdi.toFixed(2)}</div><div class='text-xs'>Class: ${cls}</div><div class='text-xs'>Phase: ${phase}</div>`).openPopup()
          })
        }
      })
      layer.addTo(mapInstance.current)
      regionLayerRef.current = layer

      // Mask outside region or outside selected woreda if woreda provided
      try {
        const allBounds = layer.getBounds()
        if (maskLayerRef.current) mapInstance.current.removeLayer(maskLayerRef.current)
        const rect = L.rectangle([[-60,-180],[85,180]], { color: '#000', weight: 0, fillOpacity: 0.75, fillColor: '#0f172a' })
        rect.addTo(mapInstance.current)
        maskLayerRef.current = rect
        layer.bringToFront()
        if (woreda) {
          // Dim other woredas
          regionLayerRef.current.eachLayer((l: any) => {
            const n = (l.feature?.properties?.ADM3_EN||'').toLowerCase()
            const sel = n === woreda.toLowerCase()
            l.setStyle({ fillOpacity: sel ? 0.65 : 0.05, opacity: sel ? 1 : 0.3 })
          })
        }
        if (woreda) {
          // Zoom to selected feature
          regionLayerRef.current.eachLayer((l: any) => {
            if ((l.feature?.properties?.ADM3_EN||'').toLowerCase() === woreda.toLowerCase() && l.getBounds) {
              mapInstance.current!.fitBounds(l.getBounds(), { padding: [40,40], maxZoom: 10 })
            }
          })
        } else if (allBounds?.isValid()) {
          mapInstance.current.fitBounds(allBounds, { padding: [30,30] })
        }
      } catch {}

      updateLegend()
      highlightSelected(woreda)
      // Mark map as ready so it becomes visible (prevents initial full-world flicker)
      if (!ready) setReady(true)
    }

    const updateLegend = () => {
      const regionNameEl = document.getElementById("legend-region-name")
      if (regionNameEl) regionNameEl.textContent = region === "afar" ? "Afar Region" : "Somali Region"
      const listEl = document.getElementById("legend-woreda-list")
      if (listEl) {
        listEl.innerHTML = ""
        REGION_WOREDAS[region].forEach(w => {
          const div = document.createElement("div")
            div.textContent = w
            div.className = `cursor-pointer rounded px-1 py-0.5 ${w === woreda ? 'bg-blue-600 text-white' : 'hover:bg-blue-100 dark:hover:bg-gray-700'}`
            div.onclick = () => { if (onSelectWoreda) onSelectWoreda(w) }
            listEl.appendChild(div)
        })
      }
    }

    const highlightSelected = (w?: string) => {
      if (!regionLayerRef.current || !mapInstance.current) return
      if (highlightLayerRef.current) { try { mapInstance.current.removeLayer(highlightLayerRef.current) } catch {} }
      highlightLayerRef.current = null
      if (!w) return
      try {
        regionLayerRef.current.eachLayer((l: any) => {
          const n = (l.feature?.properties?.ADM3_EN || "").toLowerCase()
          const match = n === w.toLowerCase()
          l.setStyle({ weight: match ? 3 : 1, fillOpacity: match ? 0.7 : 0.35 })
          if (match && l.getBounds) {
            mapInstance.current!.fitBounds(l.getBounds(), { padding: [40,40], maxZoom: 10 })
          }
        })
      } catch {}
    }

    loadRegionGeo()
  }, [region, woreda, onSelectWoreda, monthIndex, predictions, mapReady])

  // Ensure a default region if none provided to prevent blank map
  useEffect(() => {
    if (!region && !mapInstance.current) {
      // ensure a default region if none provided to prevent blank map
    }
  }, [region])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        try { mapInstance.current.remove() } catch {}
        mapInstance.current = null
      }
      if (roRef.current) {
        try { roRef.current.disconnect() } catch {}
        roRef.current = null
      }
    }
  }, [])

  const classify = (cdi: number) => {
    if (cdi <= -1.5) return 'Extreme Drought'
    if (cdi <= -1) return 'Severe Drought'
    if (cdi <= -0.5) return 'Moderate Drought'
    if (cdi <= 0.5) return 'Normal'
    return 'No Drought'
  }
  const phaseOf = (cls: string) => cls === 'Extreme Drought' ? 'Alert' : (cls === 'Severe Drought' || cls === 'Moderate Drought') ? 'Warn' : 'Watch'

  return (
    <div
      ref={mapRef}
      className={`relative w-full h-[500px] rounded-md border border-border overflow-hidden transition-opacity ${ready ? "opacity-100" : "opacity-0"} ${disableInteraction ? "pointer-events-none opacity-40" : ""}`}
      style={{ height: "500px" }}
    />
  )
}
