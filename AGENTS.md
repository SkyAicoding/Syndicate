# AGENTS.md

## Core Rules

- Preserve a fully playable vertical slice over speculative expansion.
- Keep every screen functional. Do not add dead buttons or fake menus.
- Do not copy copyrighted names, art, story, maps, UI, or logos from Syndicate or any other source IP.
- Use Phaser for tactical runtime work and keep DOM-shell UI coherent with the existing cyber-SF direction.
- Keep Tiled JSON maps in `public/maps` and do not replace the map pipeline with ad hoc data blobs.

## Coding Expectations

- Run `npm run typecheck`, `npm run build`, and `npm run test:e2e` after meaningful gameplay or UI changes.
- Keep architecture practical:
  - `src/scenes` for screen flow and mission scene
  - `src/entities` for units and props
  - `src/systems` for AI, combat, camera, pathfinding, and map logic
  - `src/data` for balance and mission data
- Prefer small, explicit systems over generic abstractions.
- Keep local save compatibility in mind when changing `CampaignState`.

## Gameplay Guardrails

- Prioritize readable real-time tactics over feature count.
- Player agents should not auto-rush enemies; advancing into danger should come from explicit commands.
- Mission objectives must remain winnable and must not self-fail immediately on load.
- Maintain reliable win/fail conditions for all three missions.
- Preserve the debug/test bridge on `window.__shardline` unless you replace it with an equally testable interface.

## Art And Placeholder Rules

- Current runtime-generated art is placeholder production art, not final.
- Do not introduce retro pixel-art styling.
- Any new placeholder visuals should stay clean, high-contrast, and readable at desktop scale.
- Keep placeholder/final distinctions documented when asset expectations change.

## UI And UX

- The tactical surface must fit inside the initial desktop viewport.
- Keep squad controls low-friction:
  - selection
  - move
  - attack
  - regroup
  - hold
  - abilities
- Maintain keyboard camera controls and zoom behavior.

## Testing

- Keep Playwright smoke coverage aligned with shipped claims.
- If you add a new user-facing control or mission-critical state, add or update a smoke assertion for it.
- Prefer deterministic bridge-assisted test setup, but keep at least one real browser-input interaction in mission smoke coverage.
