# First-Slice Asset Plan

## Priority Asset List

### Characters

- Player agents
  - operator
  - breacher
  - infiltrator
  - support
- Enemy archetypes
  - rifle guard
  - SMG guard
  - shotgun enforcer
  - elite corporate target
- Scientist VIP
- Civilians
  - pedestrian
  - worker / lab tech

### Weapons

- pistol
- SMG
- shotgun
- assault rifle
- medkit visual

### VFX

- muzzle flash
- tracer streak
- impact spark
- smoke puff
- explosion burst
- objective marker
- selection ring
- pressure / alert indicator

### Environment Tiles

- street asphalt
- sidewalk panel
- corporate plaza tile
- lab floor tile
- industrial floor tile
- hazard tile

### Props

- crate
- barrier
- explosive barrel
- terminal
- reinforced door
- glass panel
- neon sign
- parked vehicle
- industrial machinery / reactor support

### UI

- panel frames
- command buttons
- minimap frame
- faction markers
- weapon / utility icons
- ability icons
- portraits or portrait placeholders

## Placeholder Status

Currently placeholder:

- All character, prop, tile, VFX, icon, and portrait visuals.
- Audio stingers and combat sounds.
- Minimap frame and portrait art.

Already production-useful:

- Tiled map data and mission layout structure.
- UI composition and state hierarchy.
- Interaction hooks, HUD density, and mission readability targets.

## Production Order

1. Finalize character silhouette sheets for the four player agents and three enemy archetypes.
2. Replace environment tiles with a consistent pre-rendered street/lab/industrial floor set.
3. Replace cover-critical props first:
   - barriers
   - crates
   - doors
   - terminals
   - explosive barrels
4. Replace objective-critical set dressing:
   - VIP portrait / scientist render
   - corporate target variant
   - extraction and sabotage markers
5. Replace VFX atlas:
   - muzzle
   - impact
   - smoke
   - explosion
6. Replace UI icon atlas, portraits, and minimap frame.
7. Layer final audio and ambient loops after visual timing is stable.

## Waste-Minimizing Rule

- Never produce final art for props or UI states that are not already proven in the playable slice.
- Replace gameplay-critical readability assets first, decorative ambience second.
- Keep all final art aligned to the current tactical cell scale so no mission logic needs to be rebuilt around art changes.
