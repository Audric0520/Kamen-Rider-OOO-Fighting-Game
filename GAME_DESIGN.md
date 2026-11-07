# Kamen Rider OOO Medal Fighter: Design Doc

Draft v1 · MVP first, then expand · Give this file to your AI agent at the start of every session.

## 1. Vision

A 2D, one-on-one fighting game where your fighter is built from three swappable medals (Head, Arms, Legs), inspired by Kamen Rider OOO. You win by reading the matchup and swapping medals mid-fight, not by memorizing a huge move list. It runs in the browser and is deployed on Vercel.

**Design pillars**

- **Medals are the game.** Every system exists to support loadout choice and mid-fight swapping.
- **Simple inputs, readable fights.** Few buttons. Depth comes from medals, not from command inputs.
- **Data-driven.** Adding a medal means adding a JSON entry, not rewriting engine code.
- **Always playable.** Every build slice ends with a game that runs and can be deployed.

## 2. Tech stack

- Phaser 3 + TypeScript + Vite
- Deploy to Vercel as a static site (build command `npm run build`, output folder `dist`)
- No backend for the MVP: local 2-player on one keyboard, then player vs simple AI
- Placeholder art first (colored rectangles). Use original or self-made sprites, not ripped official assets.

## 3. MVP scope

**In**

- One stage, two fighters, best-of-3 rounds, round timer
- Move, jump, block, light attack, heavy attack, special
- 9 medals (3 per slot) with swapping and the set bonuses in section 8
- HUD: health bars, medal slots, timer, round wins
- Simple AI opponent (after local 2P works)

**Out (later)**

- Online multiplayer, story/arcade mode, character select
- Extra forms (Sagohzo, Shauta, Putotyra), Scanning Charge finisher, full sound design

## 4. Match rules

- Health: 1000 per fighter
- Round timer: 99 seconds. When it ends, the fighter with more health wins the round.
- Best of 3 rounds
- Fighters always face each other (auto-flip based on position)
- Stage is a flat strip with left and right walls

## 5. Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Jump | W | Up |
| Block | S | Down |
| Light attack | J | Numpad 1 |
| Heavy attack | K | Numpad 2 |
| Special | L | Numpad 3 |
| Swap Head medal | U | Numpad 4 |
| Swap Arms medal | I | Numpad 5 |
| Swap Legs medal | O | Numpad 6 |

Keep key bindings in one config file so they are easy to change.

## 6. Fighter state machine

**States:** IDLE, WALK, JUMP, ATTACK, BLOCK, HITSTUN, SWAP, KO

**Rules**

- A fighter is in exactly one state at a time.
- All transitions go through a single `changeState()` method. Never set state directly elsewhere.
- ATTACK has three phases: startup (cannot hit yet), active (hitbox live), recovery (cannot act).
- HITSTUN: no actions until the stun timer ends.
- SWAP: a short lock (about 12 frames) while the medal changes. The fighter can still be hit during it.
- KO: ends the round, no input accepted.

## 7. Combat rules

- Run logic on a fixed 60 updates per second. **All timings are in frames, not milliseconds.**
- Each fighter has a **hurtbox** (where they can be hit). Each attack defines a **hitbox** (rectangle with offset, size, active frames).
- Hitboxes and hurtboxes are independent of the sprite size.
- An attack can hit a target only once per use.
- Hit result: damage, hitstun frames, knockback. A blocked hit deals reduced damage (about 10%) and shorter blockstun.
- Projectiles are separate entities with speed, lifetime, damage, and a hitbox.
- Add a debug toggle (F1) that draws all hitboxes and hurtboxes. This is essential for debugging.

## 8. Medal system

### 8.1 Slots

Every fighter has three slots, and each slot controls a different part of the moveset.

- **Head:** the special move
- **Arms:** the light and heavy attack set
- **Legs:** movement (jump, speed, dash)

### 8.2 Starting medals (3 colors × 3 slots)

| Slot | Red | Yellow | Green |
| --- | --- | --- | --- |
| Head | Taka (Hawk): feather projectile | Lion: flash burst that briefly stuns up close | Kuwagata (Stag Beetle): short electric lunge |
| Arms | Kujaku (Peacock): fire fan, ranged chip damage | Tora (Tiger): claw slashes, multi-hit | Kamakiri (Mantis): blade, fast and long reach, low damage |
| Legs | Condor: air dash / glide | Cheetah: fast ground dash | Batta (Grasshopper): high jump + double jump |

All numbers are placeholders. Tune them while playtesting.

### 8.3 Loadouts and bonuses

- **TaToBa** (Taka + Tora + Batta): the default starting loadout and the show's signature form. Balanced, no set bonus.
- **Same-color set** (all three medals the same color) triggers a set bonus:
  - **Tajadol** (all red): projectiles apply a burn (damage over time)
  - **Gatakiriba** (all green): faster movement and hits cause a short shock stun
  - **LaToraTar** (all yellow): faster dash and a damage boost
- Any other mix works but gets no bonus. The choice is flexibility vs commitment.

### 8.4 Swap rules

- Swap one slot at a time with its key (cycles to the next medal in that slot).
- Swapping triggers the SWAP state (short lock).
- Each slot has its own cooldown (about 3 seconds) so players cannot spam swaps.
- Cannot swap during HITSTUN or KO.
- Skilled play: swapping at the right moment, such as Legs to Batta to escape, or Head to Taka at range.

### 8.5 Later: Medal Gauge and Scanning Charge

Gauge fills as you deal damage. When full, a Scanning Charge finisher consumes it. Not part of the MVP.

## 9. Medal data format

Medals live in `src/data/medals.json`. Example head medal:

```json
{
  "id": "taka",
  "name": "Taka (Hawk)",
  "slot": "head",
  "color": "red",
  "modifiers": { "moveSpeed": 1.0, "jumpPower": 1.0, "damage": 1.0 },
  "special": {
    "id": "feather_shot",
    "damage": 60,
    "startup": 14,
    "active": 4,
    "recovery": 22,
    "projectile": { "speed": 9, "lifetime": 50, "width": 24, "height": 12 }
  }
}
```

Arms medals define `light` and `heavy` attacks with the same fields (damage, startup, active, recovery, hitbox, hitstun, knockback). Legs medals define movement modifiers and optional `dash` or `doubleJump` settings.

## 10. Project structure

```
src/
  main.ts
  config.ts            // keybindings, constants, frame rate
  scenes/
    BootScene.ts
    MenuScene.ts
    FightScene.ts
  entities/
    Fighter.ts
    Projectile.ts
  systems/
    InputSystem.ts
    CombatSystem.ts    // hit detection, damage
    MedalSystem.ts     // loadout, swapping, set bonus
    AISystem.ts
  ui/
    Hud.ts
  data/
    medals.json
public/assets/         // sprites, audio
```

Keep game logic (Fighter, CombatSystem, MedalSystem) independent of Phaser's scene code where possible, so it is easier to test and change.

## 11. Build slices and prompts

Build in this order. Finish, run, test, and commit each slice before starting the next.

**Slice 0: Scaffold and deploy**

> Set up a Phaser 3 + TypeScript + Vite project using the structure in the design doc. Show a blank scene with the text 'OOO Fighter'. Make sure `npm run build` works so I can deploy it to Vercel.

**Slice 1: One fighter**

> In FightScene, add one Fighter drawn as a colored rectangle. Add left/right movement, jump with gravity, and stage boundaries. Use a fixed 60 updates per second and put constants in config.ts.

**Slice 2: Two fighters and input**

> Add a second fighter and an InputSystem with the Player 1 and Player 2 key maps from the design doc. Fighters should auto-face each other.

**Slice 3: State machine and attacks**

> Implement the fighter state machine from section 6 with IDLE, WALK, JUMP, ATTACK, HITSTUN, KO. Add a light and heavy attack with startup/active/recovery frames, hitboxes, damage, health bars, and KO. Add an F1 debug view for hitboxes and hurtboxes.

**Slice 4: Block, knockback, rounds**

> Add BLOCK, knockback, blockstun, a 99-second timer, and best-of-3 rounds with a round-end screen.

**Slice 5: Medal data**

> Create medals.json with the 9 medals in section 8.2 and a MedalSystem that holds a fighter's loadout (head, arms, legs). Apply medal modifiers and attack sets to the Fighter. Start both fighters in the TaToBa loadout.

**Slice 6: Swapping and HUD**

> Add medal swapping with the swap keys, the SWAP state, and per-slot cooldowns. Add a HUD showing each fighter's three medals and their cooldowns.

**Slice 7: Specials and set bonuses**

> Implement the Head medal specials (including projectiles) and detect same-color set bonuses (Tajadol, Gatakiriba, LaToraTar). Show the active set name in the HUD.

**Slice 8: Simple AI**

> Add an AISystem that controls Player 2: approach, attack at range, block sometimes, and swap medals based on distance. Add a menu option for 1P vs CPU.

**Slice 9: Sprites and animation**

> Replace rectangles with sprite sheets and animations per state. Keep hitboxes independent of sprite size.

**Slice 10: Polish**

> Add sound effects, a title menu, screen shake on hit, and balance tuning in medals.json.

## 12. Rules for the AI agent

Paste this at the start of each session:

- Follow the design doc. If something conflicts or is missing, ask before inventing.
- Do one slice at a time. Do not build features from later slices.
- Use frames for all timing. No magic numbers: put constants in config.ts or medals.json.
- Keep Fighter state changes going through `changeState()`.
- Do not refactor or rename unrelated files.
- After each change, list the files you changed and explain what each change does.
- Make sure `npm run build` passes.

## 13. Open questions

- How should same-color bonuses scale? Small and constant, or larger with a tradeoff?
- Should swapping be allowed mid-attack as a combo extender (high skill) or only from neutral?
- Do you want the Putotyra form as a late-game comeback mechanic with a drain meter?
- Art direction: pixel art, or a cleaner flat style?
