# Kamen Rider OOO Medal Fighter

A browser-based 2D fighting game prototype built with Phaser 3, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Player 1 moves with **A / D**, jumps with **W**, blocks with **S**, attacks with **J / K**, and swaps Head / Arms / Legs with **U / I / O**. Player 2 moves with **Left / Right Arrow**, jumps with **Up Arrow**, blocks with **Down Arrow**, attacks with **Numpad 1 / 2**, and swaps slots with **Numpad 4 / 5 / 6**. Both fighters start with the **TaToBa** loadout. Swaps cycle one medal at a time, lock the fighter for 12 frames, and have independent 180-frame cooldowns per slot; swapping is allowed only from neutral states. The HUD shows both loadouts and cooldowns. Fights also have health bars, a 120-second timer, and best-of-three rounds; press **Enter** to advance after a round or restart after a match. Fighters are bounded by stage walls, fall under gravity, and automatically face each other. Press **F1** to toggle hurtbox and active-hitbox debug outlines. Specials, set bonuses, and special movement abilities are reserved for later slices.

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
