"use client"

interface Props { onClose: () => void }

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="animate-slide-in relative w-full max-w-md rounded-2xl bg-[#12121c]/95 backdrop-blur-md border border-white/10 shadow-[0_0_60px_rgba(59,130,246,0.25)] text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-blue-600/30 via-cyan-500/15 to-transparent border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors duration-200"
            title="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚆</span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                <span className="text-gradient">TRAIN RADAR</span>
              </h2>
              <p className="text-xs text-cyan-300/80">France · Temps réel</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-white/70 text-sm leading-relaxed mb-5">
            Carte interactive des trains TER français en circulation, avec positions
            interpolées en temps réel à partir des horaires officiels SNCF.
          </p>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {[
              { value: "~1 000", label: "trains" },
              { value: "1 s", label: "interpolation" },
              { value: "GTFS", label: "open data" },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-center"
              >
                <div className="text-lg font-bold text-gradient tabular-nums">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tech badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            {["Next.js", "Leaflet", "SNCF GTFS", "TypeScript"].map(t => (
              <span
                key={t}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="space-y-2 text-sm mb-6">
            <div className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">●</span>
              <span className="text-white/70">Position <b className="text-white">interpolée à la seconde</b> entre chaque gare</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">●</span>
              <span className="text-white/70">Retards temps réel <b className="text-white">à venir</b> (clé API Navitia)</span>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="https://github.com/sacha9214/train-radar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
            >
              Explorer la carte
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
