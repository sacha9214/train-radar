const API_BASE = "https://api.sncf.com/v1/coverage/sncf"
const API_KEY = process.env.SNCF_API_KEY!

export interface StopTime {
  stop_point: { name: string; coord: { lat: string; lon: string } }
  arrival_date_time: string
  departure_date_time: string
  base_arrival_date_time?: string
  base_departure_date_time?: string
}

export interface VehicleJourney {
  id: string
  name: string
  stop_times: StopTime[]
  disruptions?: { severity: { effect: string }; messages: { text: string }[] }[]
}

export interface Train {
  id: string
  name: string
  lat: number
  lon: number
  delayMinutes: number
  nextStop: string
  prevStop: string
  progress: number
}

function parseDateTime(dt: string): Date {
  // Format: 20260604T143000
  const y = dt.slice(0, 4)
  const mo = dt.slice(4, 6)
  const d = dt.slice(6, 8)
  const h = dt.slice(9, 11)
  const mi = dt.slice(11, 13)
  const s = dt.slice(13, 15)
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+02:00`)
}

function interpolate(lat1: number, lon1: number, lat2: number, lon2: number, t: number) {
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lon: lon1 + (lon2 - lon1) * t,
  }
}

async function sncfFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(API_KEY + ":").toString("base64")}` },
    next: { revalidate: 30 },
  })
  if (!res.ok) throw new Error(`SNCF API error ${res.status}`)
  return res.json()
}

export async function getLiveTrains(): Promise<Train[]> {
  const now = new Date()
  const data = await sncfFetch("/vehicle_journeys?count=100&depth=2")
  const journeys: VehicleJourney[] = data.vehicle_journeys ?? []

  const trains: Train[] = []

  for (const journey of journeys) {
    const stops = journey.stop_times
    if (stops.length < 2) continue

    // Find current segment
    let prevIdx = -1
    for (let i = 0; i < stops.length - 1; i++) {
      const dep = parseDateTime(stops[i].departure_date_time)
      const arr = parseDateTime(stops[i + 1].arrival_date_time)
      if (dep <= now && now <= arr) {
        prevIdx = i
        break
      }
    }
    if (prevIdx === -1) continue

    const prev = stops[prevIdx]
    const next = stops[prevIdx + 1]

    const dep = parseDateTime(prev.departure_date_time)
    const arr = parseDateTime(next.arrival_date_time)
    const progress = (now.getTime() - dep.getTime()) / (arr.getTime() - dep.getTime())

    const lat1 = parseFloat(prev.stop_point.coord.lat)
    const lon1 = parseFloat(prev.stop_point.coord.lon)
    const lat2 = parseFloat(next.stop_point.coord.lat)
    const lon2 = parseFloat(next.stop_point.coord.lon)

    const pos = interpolate(lat1, lon1, lat2, lon2, Math.min(1, Math.max(0, progress)))

    // Delay: diff between real and base departure
    let delayMinutes = 0
    if (prev.base_departure_date_time) {
      const base = parseDateTime(prev.base_departure_date_time)
      const real = parseDateTime(prev.departure_date_time)
      delayMinutes = Math.round((real.getTime() - base.getTime()) / 60000)
    }

    trains.push({
      id: journey.id,
      name: journey.name,
      lat: pos.lat,
      lon: pos.lon,
      delayMinutes,
      nextStop: next.stop_point.name,
      prevStop: prev.stop_point.name,
      progress,
    })
  }

  return trains
}
