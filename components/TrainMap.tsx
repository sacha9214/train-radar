"use client"

import { useEffect, useRef, useState, useMemo, memo } from "react"
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Train {
  id: string
  lat1: number; lon1: number
  lat2: number; lon2: number
  progress: number; speed: number
  from: string; to: string
  prevStop: string; nextStop: string
  route: [number, number, string][]
}

interface LivePos { lat: number; lon: number; bearing: number }
interface Bounds { n: number; s: number; e: number; w: number }

const ZOOM_DETAIL = 10
const ZOOM_STATIONS = 11

function bear(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (d: number) => (d * Math.PI) / 180
  const dLon = r(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(r(lat2))
  const x = Math.cos(r(lat1)) * Math.sin(r(lat2)) - Math.sin(r(lat1)) * Math.cos(r(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function interpPos(t: Train, elapsedMin: number): LivePos {
  const p = Math.min(1, Math.max(0, t.progress + t.speed * elapsedMin))
  return {
    lat: t.lat1 + (t.lat2 - t.lat1) * p,
    lon: t.lon1 + (t.lon2 - t.lon1) * p,
    bearing: bear(t.lat1, t.lon1, t.lat2, t.lon2),
  }
}

function inBounds(lat: number, lon: number, b: Bounds, pad = 0.5) {
  return lat >= b.s - pad && lat <= b.n + pad && lon >= b.w - pad && lon <= b.e + pad
}

// Icon cache keyed by rounded bearing
const iconCache = new Map<number, L.DivIcon>()
function trainIcon(deg: number) {
  const key = Math.round(deg / 10) * 10
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: "",
      html: `<div style="font-size:20px;transform:rotate(${key}deg);line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.9))">🚆</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }))
  }
  return iconCache.get(key)!
}

const stationIconCache = new Map<string, L.DivIcon>()
function stationIcon(name: string) {
  if (!stationIconCache.has(name)) {
    stationIconCache.set(name, L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <span style="background:#ef4444;color:white;font-size:9px;font-weight:700;padding:1px 3px;border-radius:2px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,.8)">${name}</span>
        <div style="width:8px;height:8px;background:#ef4444;border:1.5px solid white;border-radius:1px;margin-top:1px;box-shadow:0 1px 3px rgba(0,0,0,.8)"></div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 9],
    }))
  }
  return stationIconCache.get(name)!
}

// Canvas renderer instance for perf
const canvasRenderer = typeof window !== "undefined" ? L.canvas({ padding: 0.5 }) : undefined

function MapEvents({ onZoom, onBounds }: { onZoom: (z: number) => void; onBounds: (b: Bounds) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoom(map.getZoom())
      const b = map.getBounds()
      onBounds({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() })
    },
    moveend: () => {
      const b = map.getBounds()
      onBounds({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() })
    },
  })
  return null
}

const TrainDot = memo(function TrainDot({ lat, lon, from, to, prev, next }: {
  lat: number; lon: number; from: string; to: string; prev: string; next: string
}) {
  return (
    <CircleMarker
      center={[lat, lon]}
      radius={4}
      renderer={canvasRenderer}
      pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 1 }}
    >
      <Popup><b>{from} → {to}</b><br /><small>{prev} → {next}</small></Popup>
    </CircleMarker>
  )
})

const TrainDetailed = memo(function TrainDetailed({ train, pos }: { train: Train; pos: LivePos }) {
  const routeLatLng = useMemo(() => train.route.map(([lat, lon]) => [lat, lon] as [number, number]), [train.id])
  return (
    <>
      <Polyline positions={routeLatLng} pathOptions={{ color: "#3b82f6", weight: 2.5, opacity: 0.65 }} />
      <Marker position={[pos.lat, pos.lon]} icon={trainIcon(pos.bearing)}>
        <Popup><b>{train.from} → {train.to}</b><br /><small>{train.prevStop} → {train.nextStop}</small></Popup>
      </Marker>
    </>
  )
})

export default function TrainMap() {
  const [trains, setTrains] = useState<Train[]>([])
  const [positions, setPositions] = useState<Record<string, LivePos>>({})
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(6)
  const [bounds, setBounds] = useState<Bounds>({ n: 51.5, s: 42, e: 9, w: -5 })
  const fetchTimeRef = useRef<number>(Date.now())
  const mapRef = useRef<L.Map | null>(null)

  async function fetchTrains() {
    try {
      const res = await fetch("/api/trains")
      const data = await res.json()
      if (Array.isArray(data)) {
        fetchTimeRef.current = Date.now()
        setTrains(data)
        const pos: Record<string, LivePos> = {}
        for (const t of data) pos[t.id] = interpPos(t, 0)
        setPositions(pos)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrains()
    const interval = setInterval(fetchTrains, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!trains.length) return
    const tick = setInterval(() => {
      const elapsed = (Date.now() - fetchTimeRef.current) / 60000
      const pos: Record<string, LivePos> = {}
      for (const t of trains) pos[t.id] = interpPos(t, elapsed)
      setPositions(pos)
    }, 1000)
    return () => clearInterval(tick)
  }, [trains])

  const detailed = zoom >= ZOOM_DETAIL
  const showStations = zoom >= ZOOM_STATIONS

  // Only trains visible in current viewport
  const visibleTrains = useMemo(() => {
    if (!detailed) return trains.filter(t => inBounds(t.lat1, t.lon1, bounds))
    return trains.filter(t => {
      const pos = positions[t.id]
      return pos && inBounds(pos.lat, pos.lon, bounds)
    })
  }, [trains, positions, bounds, detailed])

  // Deduplicated station markers from visible trains' routes
  const stations = useMemo(() => {
    if (!showStations) return []
    const seen = new Map<string, [number, number, string]>()
    for (const t of visibleTrains) {
      for (const [lat, lon, name] of t.route) {
        if (!seen.has(name) && inBounds(lat, lon, bounds, 0)) {
          seen.set(name, [lat, lon, name])
        }
      }
    }
    return Array.from(seen.values())
  }, [visibleTrains, showStations, bounds])

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[46.8, 2.3]}
        zoom={6}
        className="w-full h-full"
        zoomControl
        ref={mapRef}
        preferCanvas
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapEvents onZoom={setZoom} onBounds={setBounds} />

        {!detailed && visibleTrains.map((t) => {
          const pos = positions[t.id]
          if (!pos) return null
          return <TrainDot key={t.id} lat={pos.lat} lon={pos.lon} from={t.from} to={t.to} prev={t.prevStop} next={t.nextStop} />
        })}

        {detailed && visibleTrains.map((t) => {
          const pos = positions[t.id]
          if (!pos) return null
          return <TrainDetailed key={t.id} train={t} pos={pos} />
        })}

        {showStations && stations.map(([lat, lon, name]) => (
          <Marker key={name} position={[lat, lon]} icon={stationIcon(name)} interactive={false} />
        ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🚆 Train Radar</span>
          <span className="text-xs bg-blue-600 rounded-full px-2 py-0.5">TER France</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {loading ? "Chargement..." : `${trains.length} trains · ${visibleTrains.length} visibles`}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">Horaires typiques · Données SNCF</div>
      </div>

      <button
        onClick={() => mapRef.current?.setView([46.8, 2.3], 6)}
        className="absolute bottom-6 right-4 z-[1000] bg-white rounded-lg px-3 py-2 text-sm font-medium shadow-lg border border-gray-200 hover:bg-gray-50"
      >
        France entière
      </button>
    </div>
  )
}
