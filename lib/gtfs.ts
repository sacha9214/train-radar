import fs from "fs"
import path from "path"

// [id, [[lat, lon, depMin, name], ...], firstStop, lastStop]
type RawTrip = [string, [number, number, number, string][], string, string]

export interface LiveTrain {
  id: string
  lat1: number
  lon1: number
  lat2: number
  lon2: number
  progress: number   // 0-1 at time of fetch
  speed: number      // progress units per minute
  from: string
  to: string
  prevStop: string
  nextStop: string
  route: [number, number][] // full route [[lat,lon],...]
}

let cache: RawTrip[] | null = null

function loadTrips(): RawTrip[] {
  if (cache) return cache
  const file = path.join(process.cwd(), "data", "gtfs-today.json")
  cache = JSON.parse(fs.readFileSync(file, "utf8"))
  return cache!
}

function interpolate(lat1: number, lon1: number, lat2: number, lon2: number, t: number) {
  return { lat: lat1 + (lat2 - lat1) * t, lon: lon1 + (lon2 - lon1) * t }
}

export function getActiveTrains(): LiveTrain[] {
  const trips = loadTrips()
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

  const active: LiveTrain[] = []

  for (const [id, stops, from, to] of trips) {
    if (stops.length < 2) continue

    const firstDep = stops[0][2]
    const lastDep = stops[stops.length - 1][2]

    // Skip trips not running right now
    if (nowMin < firstDep || nowMin > lastDep + 30) continue

    // Find current segment
    let segIdx = -1
    for (let i = 0; i < stops.length - 1; i++) {
      if (stops[i][2] <= nowMin && nowMin <= stops[i + 1][2]) {
        segIdx = i
        break
      }
    }
    if (segIdx === -1) continue

    const [lat1, lon1, dep1, name1] = stops[segIdx]
    const [lat2, lon2, dep2, name2] = stops[segIdx + 1]

    const segDuration = dep2 - dep1
    const progress = segDuration > 0 ? (nowMin - dep1) / segDuration : 0
    const segDurationMin = dep2 - dep1
    const speed = segDurationMin > 0 ? 1 / segDurationMin : 0

    const route: [number, number][] = stops.map((s) => [s[0], s[1]])

    active.push({
      id,
      lat1, lon1, lat2, lon2,
      progress: Math.min(1, Math.max(0, progress)),
      speed,
      from,
      to,
      prevStop: name1,
      nextStop: name2,
      route,
    })
  }

  return active
}
