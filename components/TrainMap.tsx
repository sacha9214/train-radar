"use client"

import { useEffect, useRef, useState, useMemo, memo } from "react"
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import SearchBar from "./SearchBar"
import AboutModal from "./AboutModal"

// [id, [[lat, lon, depMin, name], ...], firstStop, lastStop]
type RawTrip = [string, [number, number, number, string][], string, string]

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

function computeActiveTrains(raw: RawTrip[], nowMin: number): Train[] {
  const active: Train[] = []
  for (const [id, stops, from, to] of raw) {
    if (stops.length < 2) continue
    const firstDep = stops[0][2]
    const lastDep = stops[stops.length - 1][2]
    if (nowMin < firstDep || nowMin > lastDep + 30) continue

    let segIdx = -1
    for (let i = 0; i < stops.length - 1; i++) {
      if (stops[i][2] <= nowMin && nowMin <= stops[i + 1][2]) { segIdx = i; break }
    }
    if (segIdx === -1) continue

    const [lat1, lon1, dep1, name1] = stops[segIdx]
    const [lat2, lon2, dep2, name2] = stops[segIdx + 1]
    const segDur = dep2 - dep1
    const progress = segDur > 0 ? (nowMin - dep1) / segDur : 0
    const speed = segDur > 0 ? 1 / segDur : 0
    const route: [number, number, string][] = stops.map(s => [s[0], s[1], s[3]])

    active.push({
      id, lat1, lon1, lat2, lon2,
      progress: Math.min(1, Math.max(0, progress)),
      speed, from, to,
      prevStop: name1, nextStop: name2, route,
    })
  }
  return active
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

function trainSVG(deg: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="-14 -14 28 28"
    style="transform:rotate(${deg}deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,.85));overflow:visible">
    <rect x="-4" y="-11" width="8" height="22" rx="4" ry="4" fill="white" stroke="#1d4ed8" stroke-width="1"/>
    <ellipse cx="0" cy="-11" rx="4" ry="3" fill="#3b82f6"/>
    <rect x="-2.5" y="-7" width="5" height="3" rx="1" fill="#93c5fd"/>
    <rect x="-2.5" y="-2" width="5" height="3" rx="1" fill="#93c5fd"/>
    <rect x="-2.5" y="3"  width="5" height="3" rx="1" fill="#93c5fd"/>
    <rect x="-5" y="9" width="10" height="2.5" rx="1" fill="#1d4ed8"/>
  </svg>`
}

const iconCache = new Map<number, L.DivIcon>()
function trainIcon(deg: number) {
  const key = Math.round(deg / 10) * 10
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({ className: "", html: trainSVG(key), iconSize: [28, 28], iconAnchor: [14, 14] }))
  }
  return iconCache.get(key)!
}

const stationIconCache = new Map<string, L.DivIcon>()
function stationIcon(name: string) {
  if (!stationIconCache.has(name)) {
    stationIconCache.set(name, L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <span style="background:#ef4444;color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:2px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,.8)">${name}</span>
        <div style="width:8px;height:8px;background:#ef4444;border:1.5px solid white;border-radius:1px;margin-top:1px;box-shadow:0 1px 3px rgba(0,0,0,.8)"></div>
      </div>`,
      iconSize: [0, 0], iconAnchor: [0, 9],
    }))
  }
  return stationIconCache.get(name)!
}

const canvasRenderer = typeof window !== "undefined" ? L.canvas({ padding: 0.5 }) : undefined

function MapEvents({ onZoom, onBounds }: { onZoom: (z: number) => void; onBounds: (b: Bounds) => void }) {
  const map = useMapEvents({
    zoomend: () => { onZoom(map.getZoom()); const b = map.getBounds(); onBounds({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() }) },
    moveend: () => { const b = map.getBounds(); onBounds({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() }) },
  })
  return null
}

const TrainDot = memo(function TrainDot({ lat, lon, from, to, prev, next }: { lat: number; lon: number; from: string; to: string; prev: string; next: string }) {
  return (
    <CircleMarker center={[lat, lon]} radius={4} renderer={canvasRenderer}
      pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 1 }}>
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
  const [rawTrips, setRawTrips] = useState<RawTrip[]>([])
  const [trains, setTrains] = useState<Train[]>([])
  const [positions, setPositions] = useState<Record<string, LivePos>>({})
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(6)
  const [bounds, setBounds] = useState<Bounds>({ n: 51.5, s: 42, e: 9, w: -5 })
  const [showAbout, setShowAbout] = useState(false)
  const [displayCount, setDisplayCount] = useState(0)
  const mapRef = useRef<L.Map | null>(null)
  const computeTimeRef = useRef<number>(Date.now())

  // Load GTFS once
  useEffect(() => {
    fetch("/train-radar/gtfs-today.json")
      .then(r => r.json())
      .then((data: RawTrip[]) => { setRawTrips(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Recompute active trains every 60s (segment changes slowly)
  useEffect(() => {
    if (!rawTrips.length) return
    function compute() {
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
      const active = computeActiveTrains(rawTrips, nowMin)
      computeTimeRef.current = Date.now()
      setTrains(active)
      const pos: Record<string, LivePos> = {}
      for (const t of active) pos[t.id] = interpPos(t, 0)
      setPositions(pos)
    }
    compute()
    const interval = setInterval(compute, 60000)
    return () => clearInterval(interval)
  }, [rawTrips])

  // Animate counter on load
  useEffect(() => {
    if (!trains.length) return
    const target = trains.length
    const step = Math.ceil(target / 40)
    let current = 0
    const t = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayCount(current)
      if (current >= target) clearInterval(t)
    }, 30)
    return () => clearInterval(t)
  }, [trains.length])

  // Animate positions every second
  useEffect(() => {
    if (!trains.length) return
    const tick = setInterval(() => {
      const elapsed = (Date.now() - computeTimeRef.current) / 60000
      const pos: Record<string, LivePos> = {}
      for (const t of trains) pos[t.id] = interpPos(t, elapsed)
      setPositions(pos)
    }, 1000)
    return () => clearInterval(tick)
  }, [trains])

  const detailed = zoom >= ZOOM_DETAIL
  const showStations = zoom >= ZOOM_STATIONS

  const visibleTrains = useMemo(() => {
    return trains.filter(t => {
      const pos = positions[t.id]
      return pos && inBounds(pos.lat, pos.lon, bounds)
    })
  }, [trains, positions, bounds])

  const stations = useMemo(() => {
    if (!showStations) return []
    const seen = new Map<string, [number, number, string]>()
    for (const t of visibleTrains) {
      for (const [lat, lon, name] of t.route) {
        if (!seen.has(name) && inBounds(lat, lon, bounds, 0)) seen.set(name, [lat, lon, name])
      }
    }
    return Array.from(seen.values())
  }, [visibleTrains, showStations, bounds])

  // All unique stations for search
  const allStations = useMemo(() => {
    const seen = new Map<string, { name: string; lat: number; lon: number }>()
    for (const t of trains) {
      for (const [lat, lon, name] of t.route) {
        if (!seen.has(name)) seen.set(name, { name, lat, lon })
      }
    }
    return Array.from(seen.values())
  }, [trains])

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[46.8, 2.3]} zoom={6} className="w-full h-full" zoomControl ref={mapRef} preferCanvas>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapEvents onZoom={setZoom} onBounds={setBounds} />

        {!detailed && visibleTrains.map(t => {
          const pos = positions[t.id]
          if (!pos) return null
          return <TrainDot key={t.id} lat={pos.lat} lon={pos.lon} from={t.from} to={t.to} prev={t.prevStop} next={t.nextStop} />
        })}
        {detailed && visibleTrains.map(t => {
          const pos = positions[t.id]
          if (!pos) return null
          return <TrainDetailed key={t.id} train={t} pos={pos} />
        })}
        {showStations && stations.map(([lat, lon, name]) => (
          <Marker key={name} position={[lat, lon]} icon={stationIcon(name)} interactive={false} />
        ))}
      </MapContainer>

      {/* Header */}
      <div className="absolute top-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-xl px-4 py-3 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">🚆 Train Radar</span>
          <span className="text-xs bg-blue-600 rounded-full px-2 py-0.5">TER France</span>
          <button
            onClick={() => setShowAbout(true)}
            className="ml-1 text-gray-400 hover:text-white transition-colors"
            title="À propos"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="text-xs text-gray-400 mt-1">Chargement des données...</div>
        ) : (
          <div className="mt-1">
            <span className="text-2xl font-bold tabular-nums text-white">{displayCount.toLocaleString("fr-FR")}</span>
            <span className="text-xs text-gray-400 ml-1">trains en circulation</span>
          </div>
        )}
        <div className="text-xs text-gray-500 mt-0.5">Horaires typiques · Données SNCF</div>
      </div>

      {/* Search */}
      <div className="absolute top-4 right-4 z-[1000]">
        <SearchBar
          stations={allStations}
          onSelect={(lat, lon) => mapRef.current?.setView([lat, lon], 13)}
        />
      </div>

      {/* Recenter */}
      <button
        onClick={() => mapRef.current?.setView([46.8, 2.3], 6)}
        className="absolute bottom-6 right-4 z-[1000] bg-white rounded-lg px-3 py-2 text-sm font-medium shadow-lg border border-gray-200 hover:bg-gray-50"
      >
        France entière
      </button>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
