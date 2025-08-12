"use client"

import { useEffect, useRef } from "react"
import type { LatLngTuple, Control } from "leaflet"

export function DroughtMap() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Load Leaflet dynamically
    const loadMap = async () => {
      const L = (await import("leaflet")).default

      // Import Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Clear existing map
      mapRef.current!.innerHTML = ""

      // Initialize map centered on Afar region, Ethiopia
      const map = L.map(mapRef.current!, {
        center: [11.7, 40.9], // Afar region coordinates
        zoom: 8,
        zoomControl: true,
      })

      // Always use the same light OSM tiles in both themes for consistent appearance
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      })

      tileLayer.addTo(map)

      // Ensure the Leaflet map always matches its container size
      const invalidate = () => map.invalidateSize()
      map.whenReady(invalidate)
      // In case the map is created before its container fully lays out
      setTimeout(invalidate, 0)

      // Keep the map synced with container and window resizes
      const ro = new ResizeObserver(() => invalidate())
      ro.observe(mapRef.current!)
      window.addEventListener("resize", invalidate)

      // Define drought severity colors
      const droughtColors = {
        extreme: "#dc2626", // red-600
        severe: "#f97316", // orange-500
        moderate: "#eab308", // yellow-500
        mild: "#60a5fa", // blue-400
        normal: "#22c55e", // green-500
      }

      // Add drought severity polygons for different areas in Afar region
      const droughtAreas: {
        name: string
        coordinates: LatLngTuple[]
        severity: keyof typeof droughtColors
        population: string
      }[] = [
        {
          name: "Zone 1 - Severe Drought",
          coordinates: [
            [11.8, 40.7] as LatLngTuple,
            [12.2, 40.7] as LatLngTuple,
            [12.2, 41.1] as LatLngTuple,
            [11.8, 41.1] as LatLngTuple,
          ],
          severity: "severe",
          population: "450K",
        },
        {
          name: "Zone 2 - Moderate Drought",
          coordinates: [
            [11.4, 40.8] as LatLngTuple,
            [11.8, 40.8] as LatLngTuple,
            [11.8, 41.2] as LatLngTuple,
            [11.4, 41.2] as LatLngTuple,
          ],
          severity: "moderate",
          population: "320K",
        },
        {
          name: "Zone 3 - Extreme Drought",
          coordinates: [
            [12.0, 41.1] as LatLngTuple,
            [12.4, 41.1] as LatLngTuple,
            [12.4, 41.5] as LatLngTuple,
            [12.0, 41.5] as LatLngTuple,
          ],
          severity: "extreme",
          population: "280K",
        },
      ]

      // Add drought polygons to map
      droughtAreas.forEach((area) => {
        const polygon = L.polygon(area.coordinates, {
          color: droughtColors[area.severity],
          fillColor: droughtColors[area.severity],
          fillOpacity: 0.6,
          weight: 2,
        }).addTo(map)

        polygon.bindPopup(`
          <div class="p-3 min-w-[200px]">
            <h3 class="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">${area.name}</h3>
            <div class="space-y-1">
              <p class="text-xs text-gray-600 dark:text-gray-300">
                <span class="font-medium">Population:</span> ${area.population}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-300">
                <span class="font-medium">Severity:</span> ${area.severity.charAt(0).toUpperCase() + area.severity.slice(1)}
              </p>
              <div class="flex items-center gap-2 mt-2">
                <div class="w-3 h-3 rounded" style="background-color: ${droughtColors[area.severity]}"></div>
                <span class="text-xs font-medium text-gray-700 dark:text-gray-200">${area.severity.toUpperCase()} DROUGHT</span>
              </div>
            </div>
          </div>
        `)
      })

      // Add city markers
      const cities: { name: string; coords: LatLngTuple; isCapital: boolean }[] = [
        { name: "Semera", coords: [11.79, 41.0] as LatLngTuple, isCapital: true },
        { name: "Asaita", coords: [11.57, 41.44] as LatLngTuple, isCapital: false },
        { name: "Awash", coords: [11.11, 40.17] as LatLngTuple, isCapital: false },
        { name: "Dubti", coords: [11.73, 41.08] as LatLngTuple, isCapital: false },
      ]

      cities.forEach((city) => {
        const marker = L.circleMarker(city.coords, {
          radius: city.isCapital ? 8 : 5,
          fillColor: city.isCapital ? "#3b82f6" : "#6b7280",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map)

        marker.bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">${city.name}</h3>
            ${city.isCapital ? '<p class="text-xs text-blue-600 dark:text-blue-400 font-medium">Regional Capital</p>' : ""}
          </div>
        `)
      })

      // Use factory via any cast to avoid TS lib typing issue where L.control is not callable
      const legend = (L as any).control({ position: "bottomright" }) as Control
      ;(legend as any).onAdd = () => {
        const div = L.DomUtil.create("div", "legend")
        div.innerHTML = `
          <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border dark:border-gray-600 min-w-[160px]">
            <h4 class="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2">Drought Severity</h4>
            <div class="space-y-2 text-xs">
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded border border-gray-300 dark:border-gray-500" style="background-color: ${droughtColors.extreme}"></div>
                <span class="text-gray-700 dark:text-gray-300 font-medium">Extreme</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded border border-gray-300 dark:border-gray-500" style="background-color: ${droughtColors.severe}"></div>
                <span class="text-gray-700 dark:text-gray-300 font-medium">Severe</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded border border-gray-300 dark:border-gray-500" style="background-color: ${droughtColors.moderate}"></div>
                <span class="text-gray-700 dark:text-gray-300 font-medium">Moderate</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded border border-gray-300 dark:border-gray-500" style="background-color: ${droughtColors.mild}"></div>
                <span class="text-gray-700 dark:text-gray-300 font-medium">Mild</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded border border-gray-300 dark:border-gray-500" style="background-color: ${droughtColors.normal}"></div>
                <span class="text-gray-700 dark:text-gray-300 font-medium">Normal</span>
              </div>
            </div>
          </div>
        `
        return div
      }
      legend.addTo(map)

      // Cleanup function
      return () => {
        window.removeEventListener("resize", invalidate)
        ro.disconnect()
        map.remove()
      }
    }

    loadMap()
  }, [])

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] relative rounded-lg overflow-hidden border dark:border-gray-700"
      style={{
        height: "400px",
        backgroundColor: "#f3f4f6", // ensure visible while tiles load
      }}
    />
  )
}
