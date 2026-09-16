# Train Radar

Carte des trains TER en circulation en France, avec la position de chaque train recalculée à la seconde entre deux gares.

**[Ouvrir la carte →](https://sacha9214.github.io/train-radar/)**

## Fonctionnalités

- **Positions interpolées** à la seconde entre la gare précédente et la suivante, avec le cap du train
- **Tracé réel du réseau ferré national** (GeoJSON SNCF)
- **Affichage adapté au zoom** : points à grande échelle, silhouettes orientées et trajet complet de près
- **Recherche de gare**
- **Rendu canvas** avec culling du viewport pour garder la carte fluide avec des centaines de trains

## Fonctionnement

1. `scripts/preprocess-gtfs.ts` convertit l'export GTFS de la SNCF en un fichier compact, `public/gtfs-today.json` : trajets, arrêts, coordonnées et heures de passage
2. Dans le navigateur, `components/TrainMap.tsx` charge ce fichier et calcule, pour chaque train en circulation, sa position entre deux arrêts
3. Le site est exporté en statique (`output: "export"`) et publié sur GitHub Pages par GitHub Actions à chaque push sur `main`

## Limites

Les positions viennent des horaires théoriques, pas du GPS des trains : les retards et les suppressions n'apparaissent pas.

## Stack

Next.js 16 · React 19 · TypeScript · Leaflet · Tailwind CSS 4 · GitHub Actions

## Lancer en local

```bash
npm ci
npm run dev
# http://localhost:3000/train-radar
```

## Licence

[MIT](LICENSE)
