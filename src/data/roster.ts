import type { AgentDefinition } from "./types";

export const DEFAULT_AGENTS: AgentDefinition[] = [
  {
    id: "agent-1",
    callsign: "Vanta",
    role: "operator",
    abilityId: "focus",
    description: "Precision lead for clean eliminations.",
    weaponId: "assault-rifle",
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
    description: "Shock breacher built to hold pressure.",
    weaponId: "breach-12",
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
    description: "Fast flanker for pursuit and extraction.",
    weaponId: "uiz",
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
    description: "Combat medic for sustained pushes.",
    weaponId: "colt",
    utilityId: "medkit",
    accent: "#ffd96b",
    deployed: true,
    controlMode: "manual"
  }
];
