# Shardline Protocol

Shardline Protocol is an original web-based cyber-SF isometric real-time squad tactics vertical slice built with Vite, TypeScript, and Phaser 3. It delivers a playable menu-to-mission-to-result loop with three missions, squad loadouts, research upgrades, settings, local save data, and browser smoke tests.

## What Is Included

- Main menu, region map, squad prep, research/upgrades, tactical mission, result, and settings screens.
- Three missions with distinct goals:
  - `Glassline Cut`: eliminate a corporate courier target.
  - `Quiet Relay`: rescue a scientist and escort them to extraction.
  - `Static Bloom`: sabotage a reactor terminal and escape.
- Four controllable agents with persistent weapon loadouts and role abilities.
- Real-time tactical controls:
  - click or UI-select agents
  - drag-select in the mission view
  - right-click move / contextual attack
  - regroup, hold position, abilities, medkits
  - mission restart and abort-to-map controls
  - keyboard camera pan, zoom, focus, hotkeys
- State-driven enemy behavior with line-of-sight checks, civilian panic, destructible props, explosive barrels, alert phases, and mission event feeds.
- Persistent progression in `localStorage`.
- Playwright smoke tests covering boot, persistence, map/loadout flow, mission launch, selection, movement, combat, progression unlocks, retry, and abort screens.

## Run Commands

```bash
npm install
npx playwright install
npm run dev
npm run build
npm run test:e2e
```

Default dev URL: `http://127.0.0.1:4173`

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

- `Left click`: select an agent
- `Left drag`: box-select agents
- `Right click`: move / attack / interact
- `1-4`: select individual agents
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
- `src/core/App.ts`
- `src/scenes/MissionScreen.ts`
- `src/systems/CombatSystem.ts`
- `src/systems/AISystem.ts`
- `docs/art-bible.md`
- `docs/asset-plan.md`
