"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

interface Train {
  id: string
  name: string
  lat: number
  lon: number
  delayMinutes: number
  nextStop: string
  prevStop: string
  progress: number
}

function delayColor(delay: number) {
  if (delay <= 0) return "#22c55e"
  if (delay <= 5) return "#f59e0b"
  return "#ef4444"
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
      <MapContainer
        center={[46.8, 2.3]}
        zoom={6}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {trains.map((train) => (
          <CircleMarker
            key={train.id}
            center={[train.lat, train.lon]}
            radius={7}
            pathOptions={{
              color: delayColor(train.delayMinutes),
              fillColor: delayColor(train.delayMinutes),
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{train.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                {train.prevStop} → {train.nextStop}
              </div>
              <div className={`text-xs mt-1 font-semibold ${train.delayMinutes > 0 ? "text-red-500" : "text-green-500"}`}>
                {train.delayMinutes > 0 ? `+${train.delayMinutes} min` : "À l'heure"}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        <RecenterButton />
      </MapContainer>

      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🚆 Train Radar</span>
          <span className="text-xs bg-blue-600 rounded-full px-2 py-0.5">LIVE</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {loading ? "Chargement..." : `${trains.length} trains en circulation`}
          {lastUpdate && ` · ${lastUpdate.toLocaleTimeString("fr-FR")}`}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-3 py-2 text-white text-xs shadow-xl space-y-1">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> À l'heure</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> &lt; 5 min</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Retard important</div>
      </div>
    </div>
  )
}
