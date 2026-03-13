# Next Development Plan

## Goal

Strengthen the vertical slice without bloating it: improve mission readability, finish the weapon loop, and make the city combat spaces feel more deliberate and legible.

## Priority 1: Weapon Loop Completion

- Add live acquisition routes for:
  - `Sniper Rifle`
  - `Anti-Materiel Rifle`
- Add clearer pickup affordances:
  - hovered / nearby pickup prompt
  - HUD ammo and weapon change feedback
  - better handling when multiple dropped weapons overlap
- Deepen weapon identity:
  - stronger muzzle / tracer / impact differences
  - more distinct enemy weapon read
  - clearer prop-hit vs unit-hit feedback

## Priority 2: Tactical Map Readability

- Continue city-map pass so traversal is obvious at a glance:
  - roads
  - alleys
  - rooftops
  - fenced zones
  - building edges
- Improve occlusion readability:
  - clearer silhouette fallback behind tall structures
  - more consistent wall / fence joins
  - better contrast between passable floor and blocked structures

## Priority 3: Mission UX Polish

- Improve mission HUD communication:
  - selected squad intent
  - current target / move order feedback
  - ammo state visibility
- Refine result and research screen spacing on generated-art frames.
- Add more smoke assertions for pickups, retries, and loadout persistence edge cases.

## Priority 4: GitHub / Release Readiness

- Keep `README.md` in sync with shipped controls and systems.
- Keep generated placeholder expectations documented.
- Consider adding:
  - release checklist
  - contribution notes
  - screenshot section in README

## Suggested Implementation Order

1. Place `Sniper Rifle` and `Anti-Materiel Rifle` in missions.
2. Add pickup HUD prompts and stacked-drop selection handling.
3. Improve city map readability around blocked routes and building silhouettes.
4. Deepen weapon VFX / SFX differentiation.
5. Refresh docs and smoke coverage again before the next GitHub push.
