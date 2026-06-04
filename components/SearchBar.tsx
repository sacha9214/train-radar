"use client"

import { useState, useMemo, useRef, useEffect } from "react"

interface Station { name: string; lat: number; lon: number }

interface Props {
  stations: Station[]
  onSelect: (lat: number, lon: number) => void
}

export default function SearchBar({ stations, onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return stations.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, stations])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div ref={ref} className="relative w-64">
      <div className="flex items-center bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 gap-2">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          className="bg-transparent text-white text-sm placeholder-gray-500 outline-none w-full"
          placeholder="Rechercher une gare..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false) }} className="text-gray-500 hover:text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-50">
          {results.map(s => (
            <button
              key={s.name}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-2"
              onClick={() => { onSelect(s.lat, s.lon); setQuery(s.name); setOpen(false) }}
            >
              <span className="text-red-400 text-xs">●</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
