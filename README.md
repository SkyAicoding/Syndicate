# Shardline Protocol

Shardline Protocol is an original cyber-SF isometric real-time squad tactics vertical slice built with Vite, TypeScript, and Phaser 3. It currently ships a playable menu-to-mission-to-result loop with three missions, squad loadouts, research upgrades, field pickups, persistent saves, and browser smoke coverage.

## Quick Start

Clone the repository first, then install dependencies and run the local dev server.

```bash
git clone https://github.com/SkyAicoding/Syndicate.git
cd Syndicate
npm install
npx playwright install
npm run dev -- --host 127.0.0.1 --port 4173
```

Default local URL: `http://127.0.0.1:4173`

## Current Slice

- Main menu, region map, squad prep, research, tactical mission, result, and settings screens are fully playable.
- Three mission flows are implemented:
  - `Glassline Cut`: eliminate a courier target.
  - `Quiet Relay`: rescue a scientist and extract.
  - `Static Bloom`: sabotage a reactor terminal and escape.
- Four agents persist across the campaign with deployment mode, control mode, starting weapon choice, and role abilities.
- Weapon loop:
  - base starting weapons: `Colt`, `Uiz`, `Breach-12`, `Assault Rifle`
  - advanced field pickups: `Battle Rifle`, `PDW (P90)`, `Machine Gun`
  - enemy-only weapons with separate profiles and drops
  - ammo reserves, ammo crates, field armories, and enemy weapon drops
- Tactical combat systems:
  - left-click squad selection and move / attack orders
  - double-click visible ally to select the visible squad
  - right-click fallback move / interact
  - regroup, hold, medkits, role abilities, restart, and abort
  - keyboard camera pan, mouse-wheel zoom, floor-drag panning
- Mission runtime includes line-of-sight, alert states, destructible props, enemy pressure / retreat logic, civilians, mission event feed, and result handling.
- Progression persists in browser `localStorage`.
- Playwright smoke tests cover boot, persistence, map/loadout flow, mission launch, movement, combat, retries, aborts, armory pickup, and ammo supply interactions.

## Run Commands

```bash
npm run dev
npm run typecheck:strict
npm run build
npm run test:e2e
npm run verify
```

## Resume On Another PC

The repo is prepared so you can continue on another machine without rebuilding the art pipeline first.

1. Clone the repository.
2. Run `npm install`.
3. Run `npx playwright install` once for browser test binaries.
4. Run `npm run dev -- --host 127.0.0.1 --port 4173`.

Notes:

- Generated runtime art under `public/generated` is committed and enabled by default through `.env`.
- Build output, local dependencies, test artifacts, and image batch source output are intentionally not committed.
- Mission saves remain in browser `localStorage`, so campaign progress does not transfer through Git.

Generated art prep after a successful image batch:

```bash
C:\Users\USER\AppData\Local\Python\bin\python.exe scripts\prepare_generated_art.py
VITE_USE_GENERATED_ART=1 npm run dev -- --host 127.0.0.1 --port 4173
```

## Controls

- `Left click`:
  - select an ally
  - with allies selected, click ground to move
  - with allies selected, click an enemy to attack-move into that target
- `Left drag`: pan the tactical floor
- `Left double-click ally`: select the visible direct-control squad
- `Right click`: fallback move / interact with ammo crates, armories, and dropped weapons
- `Right drag`: pan the tactical floor
- `1-4`: select direct-control agents
- `G`: regroup selected agents
- `H`: hold position toggle
- `Q`: use selected agent ability
- `Space`: center camera on squad
- `WASD` or arrow keys: pan camera
- `Mouse wheel`: zoom
- `F1`: toggle debug overlay
- Mission HUD buttons: regroup, hold, restart mission, abort to map

## Project Structure

- `src/core`: app shell, campaign state, storage, audio, mission runtime bridge
- `src/scenes`: menu/map/loadout/research/result/settings screens and `MissionScene`
- `src/entities`: units and destructible/interactive props
- `src/systems`: isometric map parser, camera, AI, combat, mission logic, pathfinding
- `src/data`: missions, weapons, upgrades, roster, constants, types
- `src/assets`: runtime-generated placeholder textures
- `public/maps`: Tiled-format isometric JSON maps
- `public/sprites`: placeholder tilesheet and favicon
- `tests`: Playwright smoke coverage
- `docs`: art bible and first-slice asset plan

## Development Status

- Current status summary: [docs/development-status.md](docs/development-status.md)
- Next-step plan: [docs/next-plan.md](docs/next-plan.md)

## Save Data

- Save slot: browser `localStorage`
- Storage key: `shardline-protocol-save`
- New campaigns, upgrades, selected mission, settings, loadouts, credits, and mission results persist automatically.

## Asset Pipeline Notes

- Runtime engine: Phaser 3
- Map pipeline: Tiled JSON loaded from `public/maps`
- Optional generated art hook: set `VITE_USE_GENERATED_ART=1` and place generated assets under `public/generated`
- Current shipped visuals:
  - runtime-generated 2D placeholder tiles, units, props, markers, and VFX
  - synthesized placeholder audio via Web Audio
  - clean cyber-SF UI panels and telemetry styling
- Final intended workflow:
  - concept and style frames via image generation
  - modular environment pieces via Asset Forge or a similar 3D-to-2D pipeline
  - cleanup, VFX atlases, and icon polish via Aseprite
  - Kenney-style assets remain blockout-only, not final identity

## Placeholder vs Final

Current placeholders:

- All in-mission unit, prop, tile, VFX, and marker art generated at runtime.
- Audio is synthesized, not final designed sound.
- Portraits are UI swatches, not final character art.
- Minimap is functional but utilitarian.
- Prepared image generation batch for a first-pass replacement pack: `tmp/imagegen/pass1-art-batch.jsonl`

Intended final-first-slice targets:

- Pre-rendered or 3D-to-2D environment tiles and prop sheets.
- Character renders with stronger silhouette differentiation.
- Final UI icon atlas, portraits, and minimap frame treatment.
- Layered ambient, weapon, impact, and mission audio.

## Verification

Verified locally:

- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

## Files To Review First

- `src/scenes/MissionScene.ts`
- `src/scenes/LoadoutScreen.ts`
- `src/scenes/MissionScreen.ts`
- `src/systems/CombatSystem.ts`
- `src/systems/IsoMap.ts`
- `src/data/weapons.ts`
- `docs/development-status.md`
- `docs/next-plan.md`
