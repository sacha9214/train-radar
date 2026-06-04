"use client"

import { useState, useMemo, useRef, useEffect } from "react"

interface Station { name: string; lat: number; lon: number }

interface Props {
  stations: Station[]
  onSelect: (lat: number, lon: number) => void
}

function highlight(name: string, query: string) {
  const q = query.trim()
  if (!q) return name
  const idx = name.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return name
  return (
    <>
      {name.slice(0, idx)}
      <span className="text-cyan-300 font-semibold">{name.slice(idx, idx + q.length)}</span>
      {name.slice(idx + q.length)}
    </>
  )
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
    <div ref={ref} className="relative w-72">
      <div className="search-focus flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-200">
        <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          className="bg-transparent text-white text-sm placeholder-white/40 outline-none w-full"
          placeholder="Rechercher une gare..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false) }}
            className="text-white/40 hover:text-white transition-colors duration-200"
            title="Effacer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="animate-results-in absolute top-full mt-2 w-full rounded-xl bg-[#12121c]/95 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden z-50">
          {results.map(s => (
            <button
              key={s.name}
              className="group w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors duration-200"
              onClick={() => { onSelect(s.lat, s.lon); setQuery(s.name); setOpen(false) }}
            >
              <span className="w-2 h-2 rounded-[2px] bg-red-500 ring-2 ring-red-500/20 shrink-0 group-hover:ring-red-500/40 transition-all duration-200" />
              <span className="truncate">{highlight(s.name, query)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
