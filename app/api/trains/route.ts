import { getLiveTrains } from "@/lib/sncf"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const trains = await getLiveTrains()
    return NextResponse.json(trains)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch trains" }, { status: 500 })
  }
}
