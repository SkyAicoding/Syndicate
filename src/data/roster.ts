import type { AgentDefinition } from "./types";

export const DEFAULT_AGENTS: AgentDefinition[] = [
  {
    id: "agent-1",
    callsign: "Vanta",
    role: "operator",
    abilityId: "focus",
    description: "Precision fire lead tuned for objective execution.",
    weaponId: "rifle",
    utilityId: "medkit",
    accent: "#3dc9ff",
    deployed: true,
    controlMode: "manual"
  },
  {
    id: "agent-2",
    callsign: "Rook",
    role: "breacher",
    abilityId: "bulwark",
    description: "Frontline breacher with pressure-resistant kinetics.",
    weaponId: "shotgun",
    utilityId: "medkit",
    accent: "#ff9e4d",
    deployed: true,
    controlMode: "manual"
  },
  {
    id: "agent-3",
    callsign: "Shade",
    role: "infiltrator",
    abilityId: "ghost",
    description: "High-mobility flanker built for pursuit and rescue.",
    weaponId: "smg",
    utilityId: "medkit",
    accent: "#86ffb5",
    deployed: true,
    controlMode: "manual"
  },
  {
    id: "agent-4",
    callsign: "Mender",
    role: "support",
    abilityId: "nanowave",
    description: "Combat medic and stabilizer for sustained incursions.",
    weaponId: "pistol",
    utilityId: "medkit",
    accent: "#ffd96b",
    deployed: true,
    controlMode: "manual"
  }
];
