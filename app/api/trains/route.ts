import { getActiveTrains } from "@/lib/gtfs"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const trains = getActiveTrains()
    return NextResponse.json(trains)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to load trains" }, { status: 500 })
  }
}
