# Kamen Rider OOO Medal Fighter

A browser-based 2D fighting game prototype built with Phaser 3, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The title menu offers **1 Player vs CPU** and **2 Players**; use **Up / Down** to select and **Enter** to start (2 Players is selected by default). In either mode, Player 1 moves with **A / D**, jumps with **W**, blocks with **S**, uses light/heavy/special attacks with **J / K / L**, and swaps Head / Arms / Legs with **U / I / O**. In 2-player mode, Player 2 moves with **Left / Right Arrow**, jumps with **Up Arrow**, blocks with **Down Arrow**, uses light/heavy/special attacks with **Numpad 1 / 2 / 3**, and swaps slots with **Numpad 4 / 5 / 6**. Double-tap the same movement direction within 10 frames to dash when the selected Legs medal supports a dash. Both fighters start with the **TaToBa** loadout. Swaps cycle one medal at a time, lock the fighter for 12 frames, and have independent 180-frame cooldowns per slot; swapping is allowed only from neutral states. The HUD shows both loadouts, cooldowns, and active same-color set name. Taka fires a projectile, Lion performs a close-range flash burst, and Kuwagata lunges electrically. Tajadol projectiles apply a refreshing burn; Gatakiriba improves movement and stun duration; LaToraTar boosts damage and dash speed. The CPU approaches when outside its attack reach, attacks when a move can reach, sometimes blocks an in-range attack, and changes its Head medal with distance. Fighters use original pixel-art sprite sheets with separate animations for IDLE, WALK, JUMP, ATTACK, BLOCK, HITSTUN, SWAP, and KO; combat hurtboxes and hitboxes remain independent of sprite dimensions. Fights also have health bars, a 120-second timer, and best-of-three rounds; press **Enter** to advance after a round or restart after a match. Fighters are bounded by stage walls, fall under gravity, and automatically face each other. Press **F1** to toggle hurtbox, hitbox, and projectile debug outlines.

## Verify a production build

```sh
npm run build
npm run preview
```

Vite writes the static production site to `dist/`.

## Smoke tests

```sh
npm run test:slice7
npm run test:slice8
npm run test:slice9
```

Run `node scripts/generate-fighter-sheets.mjs` to regenerate the original player sprite sheets.

## Vercel

- Framework preset: **Vite** (or Other)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
