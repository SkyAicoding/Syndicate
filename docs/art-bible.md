# Art Bible

## Visual Pillars

- Premium corporate dystopia, not retro nostalgia.
- Clean 2.5D isometric readability with strong depth cues.
- Wet hard-surface materials, controlled neon, restrained clutter.
- Clear silhouettes and deliberate contrast over scene noise.

## Camera And Presentation Rules

- Isometric diamond ground with consistent world scale.
- Tactical camera should show nearby cover, target lanes, and destination space without excessive zoom.
- Default desktop framing must keep the squad visible on mission start.
- Use smooth camera easing, not snappy teleports, except for explicit debug/test routing.

## Unit Readability Rules

- Player silhouettes stay bright and distinct against darker ground planes.
- Enemy silhouettes use cooler steel bodies with red or orange hostility accents.
- VIPs and civilians must never read as combatants at a glance.
- Selection rings, health bars, and pressure bars should remain readable over all floor types.

## Color Palette

- Base environment: deep petroleum blue, gunmetal, cool concrete, oxidized steel.
- Accent lights: cyan primary, mint secondary, amber for warnings, red for hostile states.
- Avoid full-spectrum neon noise. Accents should be sparse and directional.

## Faction Color Logic

- Player: cyan, mint, pale tactical whites.
- Enemy security: desaturated steel with red-orange alerts.
- Neutral civilian/VIP: soft neutral gray-blue with no aggressive warm accent.
- Objectives/extraction: cyan or green markers depending on task state.

## Material Language

- Glass: cool, slightly emissive edges, low-opacity interiors.
- Steel: dark brushed surfaces with controlled specular highlights.
- Concrete: cool muted slabs, minimal saturation.
- Holographic/UI surfaces: thin luminous edge treatment, not thick cartoon glow.

## Lighting Rules

- Outdoor scenes: cool rain-night ambience with reflected edge light.
- Indoor scenes: sterile strip lighting with cyan monitor spill.
- Industrial scenes: warmer warning tones only where hazard or heat is narratively relevant.
- Use light to guide targets, doors, extraction, and interactable machinery.

## Environment Motifs

- Streets: barriers, neon signage, service kiosks, parked vehicles, reflective paving.
- Labs: glass partitions, sealed doors, terminals, containment lanes, controlled contrast.
- Blacksites: reactor cores, hazard-striped floor zones, reinforced barriers, stacked crates.

## UI Design Language

- Dense but clean panel design with rounded industrial corners and thin linework.
- Typography should feel engineered and angular, not playful.
- UI panels use low-opacity dark surfaces with crisp luminous borders.
- Tactical HUD must privilege current objective, selected unit state, and quick commands.

## VFX Style Rules

- Muzzle flashes are brief and sharp.
- Impacts favor sparks, heat pops, smoke, and pressure cues over gore.
- Explosions should read as overpressure and electrical rupture, not fireball spectacle.
- Smoke and rain stay subtle enough to preserve tactical legibility.

## Placeholder Vs Final Rules

- Shipped runtime-generated visuals are placeholder production art.
- Placeholder art must preserve final scale, palette intent, and readability rules.
- Do not build gameplay around placeholder-specific proportions that a final render pass cannot match.
- Final art should replace generated textures without changing map metrics or control readability.

## Scale Consistency

- One ground tile represents one tactical cell.
- Player and enemy feet must land clearly inside a single cell footprint.
- Cover props should visually justify whether they block movement, grant cover, or both.
- Door, terminal, and vehicle footprint logic must match the actual collision behavior.
