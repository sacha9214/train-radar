import fs from "fs"
import path from "path"

// Parse CSV lines efficiently
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n")
  const headers = lines[0].split(",")
  return lines.slice(1).map((line) => {
    const values = line.split(",")
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] || "").trim()]))
  })
}

const GTFS_DIR = "/tmp/sncf-gtfs"
const OUT_DIR = path.join(process.cwd(), "public")

console.log("Loading GTFS data...")

const stops = parseCSV(fs.readFileSync(`${GTFS_DIR}/stops.txt`, "utf8"))
const trips = parseCSV(fs.readFileSync(`${GTFS_DIR}/trips.txt`, "utf8"))
const stopTimes = parseCSV(fs.readFileSync(`${GTFS_DIR}/stop_times.txt`, "utf8"))
const calendarDates = parseCSV(fs.readFileSync(`${GTFS_DIR}/calendar_dates.txt`, "utf8"))

// Build stop lookup (only stop points, not areas)
const stopMap: Record<string, { name: string; lat: number; lon: number }> = {}
for (const s of stops) {
  if (s.location_type === "0") {
    stopMap[s.stop_id] = {
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lon: parseFloat(s.stop_lon),
    }
  }
}

// Map today's day-of-week to an equivalent date in the GTFS range (2025)
// GTFS data covers Jan-Apr 2025, so we use a representative date per weekday
const DOW_TO_DATE: Record<number, string> = {
  0: "20250127", // Monday
  1: "20250128", // Tuesday
  2: "20250122", // Wednesday
  3: "20250123", // Thursday
  4: "20250124", // Friday
  5: "20250125", // Saturday
  6: "20250126", // Sunday
}
const today = new Date()
const mappedDate = DOW_TO_DATE[today.getDay()]
console.log(`Today is ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][today.getDay()]}, using GTFS date ${mappedDate}`)

const activeServices = new Set(
  calendarDates.filter((d) => d.date === mappedDate && d.exception_type === "1").map((d) => d.service_id)
)
console.log(`Active services: ${activeServices.size}`)

// Get active trip IDs
const tripServiceMap: Record<string, string> = {}
for (const t of trips) {
  tripServiceMap[t.trip_id] = t.service_id
}
const activeTrips = new Set(trips.filter((t) => activeServices.has(t.service_id)).map((t) => t.trip_id))
console.log(`Active trips: ${activeTrips.size}`)

// Group stop times by trip, only for active trips
const tripStops: Record<string, { stopId: string; arr: string; dep: string; seq: number }[]> = {}
for (const st of stopTimes) {
  if (!activeTrips.has(st.trip_id)) continue
  if (!tripStops[st.trip_id]) tripStops[st.trip_id] = []
  tripStops[st.trip_id].push({
    stopId: st.stop_id,
    arr: st.arrival_time,
    dep: st.departure_time,
    seq: parseInt(st.stop_sequence),
  })
}

// Convert "HH:MM:SS" to minutes since midnight
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// Sort stops by sequence and build compact structure
// Format: [shortId, [[lat, lon, depMin], ...]]
type CompactTrip = [string, [number, number, number, string][], string, string]
// [id, [[lat, lon, depMin, stopName], ...], firstStop, lastStop]

const result: CompactTrip[] = []
let idx = 0

for (const [, stops] of Object.entries(tripStops)) {
  stops.sort((a, b) => a.seq - b.seq)
  const resolved: [number, number, number, string][] = []

  for (const s of stops) {
    const stop = stopMap[s.stopId]
    if (!stop || isNaN(stop.lat) || isNaN(stop.lon)) continue
    resolved.push([
      Math.round(stop.lat * 10000) / 10000,
      Math.round(stop.lon * 10000) / 10000,
      toMinutes(s.dep),
      stop.name,
    ])
  }

  if (resolved.length >= 2) {
    const firstName = resolved[0][3]
    const lastName = resolved[resolved.length - 1][3]
    result.push([String(idx++), resolved, firstName, lastName])
  }
}

console.log(`Trips with valid stops: ${result.length}`)

const json = JSON.stringify(result)
fs.writeFileSync(path.join(OUT_DIR, "gtfs-today.json"), json)
console.log(`Written to public/gtfs-today.json (${(json.length / 1024).toFixed(0)} KB)`)
