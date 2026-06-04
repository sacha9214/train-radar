"use client"

import dynamic from "next/dynamic"

const TrainMap = dynamic(() => import("@/components/TrainMap"), { ssr: false })

export default function Home() {
  return (
    <main className="w-screen h-screen bg-gray-950">
      <TrainMap />
    </main>
  )
}
