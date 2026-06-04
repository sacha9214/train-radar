"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

interface Train {
  id: string
  lat: number
  lon: number
  from: string
  to: string
  prevStop: string
  nextStop: string
  progress: number
}

function RecenterButton() {
  const map = useMap()
  return (
    <button
      onClick={() => map.setView([46.8, 2.3], 6)}
      className="absolute bottom-6 right-4 z-[1000] bg-white rounded-lg px-3 py-2 text-sm font-medium shadow-lg border border-gray-200 hover:bg-gray-50"
    >
      France entière
    </button>
  )
}

export default function TrainMap() {
  const [trains, setTrains] = useState<Train[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selected, setSelected] = useState<Train | null>(null)

  async function fetchTrains() {
    try {
      const res = await fetch("/api/trains")
      const data = await res.json()
      if (Array.isArray(data)) {
        setTrains(data)
        setLastUpdate(new Date())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrains()
    const interval = setInterval(fetchTrains, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[46.8, 2.3]} zoom={6} className="w-full h-full" zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {trains.map((train) => (
          <CircleMarker
            key={train.id}
            center={[train.lat, train.lon]}
            radius={5}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 1.5 }}
            eventHandlers={{ click: () => setSelected(train) }}
          >
            <Popup>
              <div className="text-sm font-semibold">{train.from} → {train.to}</div>
              <div className="text-xs text-gray-500 mt-1">
                {train.prevStop} → <span className="font-medium text-gray-700">{train.nextStop}</span>
              </div>
              <div className="text-xs mt-1 text-blue-600">{Math.round(train.progress * 100)}% du trajet</div>
            </Popup>
          </CircleMarker>
        ))}

        <RecenterButton />
      </MapContainer>

      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🚆 Train Radar</span>
          <span className="text-xs bg-blue-600 rounded-full px-2 py-0.5">TER France</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {loading ? "Chargement..." : `${trains.length} trains en circulation`}
          {lastUpdate && ` · ${lastUpdate.toLocaleTimeString("fr-FR")}`}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Horaires typiques · Données SNCF</div>
      </div>
    </div>
  )
}
