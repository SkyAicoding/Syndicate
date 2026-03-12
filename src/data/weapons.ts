import type { WeaponDefinition, WeaponId } from "./types";

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: "pistol",
    name: "Sidearm-9",
    damage: 16,
    range: 5.5,
    rate: 0.45,
    accuracy: 0.82,
    pressure: 6,
    spread: 0.08,
    burst: 1,
    movePenalty: 0.05,
    color: 0xffd96b,
    description: "Fast draw, stable fire, low suppression."
  },
  smg: {
    id: "smg",
    name: "Vector SMG",
    damage: 10,
    range: 4.75,
    rate: 0.18,
    accuracy: 0.68,
    pressure: 10,
    spread: 0.16,
    burst: 3,
    movePenalty: 0.12,
    color: 0x66f5cf,
    description: "Short-range burst weapon with strong pressure output."
  },
  shotgun: {
    id: "shotgun",
    name: "Breach-12",
    damage: 34,
    range: 3.4,
    rate: 0.92,
    accuracy: 0.74,
    pressure: 18,
    spread: 0.28,
    burst: 1,
    movePenalty: 0.2,
    color: 0xff9950,
    description: "Heavy close-range blast for doors, cover, and panic."
  },
  rifle: {
    id: "rifle",
    name: "AR-4 Meridian",
    damage: 20,
    range: 6.5,
    rate: 0.36,
    accuracy: 0.8,
    pressure: 12,
    spread: 0.12,
    burst: 2,
    movePenalty: 0.1,
    color: 0x48c4ff,
    description: "Balanced service rifle for flexible squad control."
  }
};

export const WEAPON_OPTIONS = Object.values(WEAPONS);
