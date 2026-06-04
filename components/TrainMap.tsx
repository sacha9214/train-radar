"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Train {
  id: string
  lat1: number; lon1: number
  lat2: number; lon2: number
  progress: number
  speed: number
  from: string; to: string
  prevStop: string; nextStop: string
}

interface LivePos { lat: number; lon: number; bearing: number }

function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function interpolate(t: Train, elapsedMin: number): LivePos {
  const p = Math.min(1, Math.max(0, t.progress + t.speed * elapsedMin))
  return {
    lat: t.lat1 + (t.lat2 - t.lat1) * p,
    lon: t.lon1 + (t.lon2 - t.lon1) * p,
    bearing: bearing(t.lat1, t.lon1, t.lat2, t.lon2),
  }
}

function trainIcon(deg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:18px;transform:rotate(${deg}deg);line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">🚆</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
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
  const [positions, setPositions] = useState<Record<string, LivePos>>({})
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const fetchTimeRef = useRef<number>(Date.now())

  async function fetchTrains() {
    try {
      const res = await fetch("/api/trains")
      const data = await res.json()
      if (Array.isArray(data)) {
        fetchTimeRef.current = Date.now()
        setTrains(data)
        setCount(data.length)
        // Compute initial positions
        const pos: Record<string, LivePos> = {}
        for (const t of data) pos[t.id] = interpolate(t, 0)
        setPositions(pos)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch every 30s
  useEffect(() => {
    fetchTrains()
    const interval = setInterval(fetchTrains, 30000)
    return () => clearInterval(interval)
  }, [])

  // Animate every second
  useEffect(() => {
    if (trains.length === 0) return
    const tick = setInterval(() => {
      const elapsedMin = (Date.now() - fetchTimeRef.current) / 60000
      const pos: Record<string, LivePos> = {}
      for (const t of trains) pos[t.id] = interpolate(t, elapsedMin)
      setPositions(pos)
    }, 1000)
    return () => clearInterval(tick)
  }, [trains])

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[46.8, 2.3]} zoom={6} className="w-full h-full" zoomControl>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {trains.map((train) => {
          const pos = positions[train.id]
          if (!pos) return null
          return (
            <Marker
              key={train.id}
              position={[pos.lat, pos.lon]}
              icon={trainIcon(pos.bearing)}
            >
              <Popup>
                <div className="text-sm font-semibold">{train.from} → {train.to}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {train.prevStop} → <span className="font-medium">{train.nextStop}</span>
                </div>
              </Popup>
            </Marker>
          )
        })}

        <RecenterButton />
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🚆 Train Radar</span>
          <span className="text-xs bg-blue-600 rounded-full px-2 py-0.5">TER France</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {loading ? "Chargement..." : `${count} trains en circulation`}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Horaires typiques · Données SNCF open data</div>
      </div>
    </div>
  )
}
