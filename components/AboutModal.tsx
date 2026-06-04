"use client"

interface Props { onClose: () => void }

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🚆</span>
          <div>
            <h2 className="text-xl font-bold">Train Radar</h2>
            <p className="text-xs text-blue-400">TER France — Temps réel</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Carte interactive des trains TER français en circulation, avec positions interpolées en temps réel à partir des horaires officiels SNCF.
        </p>

        <div className="space-y-2 text-sm mb-5">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">●</span>
            <span className="text-gray-300"><b className="text-white">~1 000 trains</b> affichés simultanément</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">●</span>
            <span className="text-gray-300">Position <b className="text-white">interpolée à la seconde</b> entre chaque gare</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">●</span>
            <span className="text-gray-300">Données <b className="text-white">GTFS open data SNCF</b> — horaires typiques par jour de semaine</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">●</span>
            <span className="text-gray-300">Retards temps réel <b className="text-white">à venir</b> (en attente clé API Navitia)</span>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="https://github.com/sacha9214/train-radar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Explorer la carte
          </button>
        </div>
      </div>
    </div>
  )
}
