# Development Status

## Snapshot

- Project: `Shardline Protocol`
- Stack: `Vite + TypeScript + Phaser 3 + Playwright`
- Status: playable vertical slice with three end-to-end missions
- Save compatibility: legacy weapon ids are still migrated through `resolveWeaponId(...)`

## Shipped Systems

- Screen flow:
  - main menu
  - region map
  - squad prep
  - research
  - mission runtime
  - result
  - settings
- Tactical controls:
  - ally selection
  - left-click move and attack orders
  - floor drag panning
  - right-click fallback move / interact
  - regroup
  - hold
  - medkits
  - role abilities
- Progression:
  - persistent credits
  - mission unlocks
  - research upgrades
  - persistent squad loadouts
- Weapons and pickups:
  - base starting weapons in loadout UI
  - advanced field armory pickups
  - enemy-only weapon roster
  - ammo reserves
  - ammo crates
  - enemy weapon drops
- Mission runtime:
  - AI alert logic
  - line of sight
  - destructible props
  - civilian panic
  - result / retry / abort flow

## Content State

- Missions:
  - `Glassline Cut`
  - `Quiet Relay`
  - `Static Bloom`
- Player weapon roster:
  - `Colt`
  - `Uiz`
  - `Breach-12`
  - `Assault Rifle`
  - `Battle Rifle`
  - `Sniper Rifle`
  - `Machine Gun`
  - `PDW (P90)`
  - `Anti-Materiel Rifle`
- Enemy weapon roster:
  - `Pulse Sidearm`
  - `Needler SMG`
  - `Lancer Carbine`
  - `Rail Lancer`
  - `Suppressor MG`

## Verified Checks

- `npm run typecheck`
- `npm run typecheck:strict`
- `npm run build`
- `npm run test:e2e`

## Audit Notes

- Unused local code found by strict TypeScript audit was removed from:
  - `src/scenes/MissionScene.ts`
  - `src/scenes/MissionScreen.ts`
  - `src/systems/AISystem.ts`
- README controls and feature list were updated to match the current implementation.
- Repo hygiene improved:
  - `tmp/` is ignored
  - `progress.md` is ignored
  - reusable audit scripts were added to `package.json`

## Known Gaps

- `Sniper Rifle` and `Anti-Materiel Rifle` are defined but still need live acquisition routes in missions.
- Tactical readability can still improve around dense occlusion, pickup visibility, and more bespoke weapon VFX.
- Some generated-art assets are placeholder production art and still need a more cohesive final environment pass.
