# Kamen Rider OOO Medal Fighter

A browser-based 2D fighting game prototype built with Phaser 3, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Player 1 moves with **A / D** and jumps with **W**. Player 2 moves with **Left / Right Arrow** and jumps with **Up Arrow**. Each fighter is bounded by the stage walls, falls under gravity, and automatically faces the other fighter. The remaining controls are mapped in `src/config.ts` for later slices; attacks, blocking, and medal swapping are not implemented yet.

## Verify a production build

```sh
npm run build
npm run preview
```

Vite writes the static production site to `dist/`.

## Vercel

- Framework preset: **Vite** (or Other)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
