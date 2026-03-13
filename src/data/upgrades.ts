import type {
  CyberUpgradeId,
  ResearchId,
  UpgradeDefinition
} from "./types";

export const RESEARCH_UPGRADES: Record<ResearchId, UpgradeDefinition> = {
  "ballistic-weave": {
    id: "ballistic-weave",
    name: "Ballistic Weave",
    category: "research",
    cost: 220,
    description: "Layered flex armor for the full team.",
    effectText: "+8 max health squadwide."
  },
  smartlink: {
    id: "smartlink",
    name: "Smartlink Stack",
    category: "research",
    cost: 260,
    description: "Shared targeting telemetry and recoil tuning.",
    effectText: "+7% accuracy squadwide."
  },
  "suppressor-routing": {
    id: "suppressor-routing",
    name: "Suppressor Routing",
    category: "research",
    cost: 240,
    description: "Dampens hostile pressure build and shot bloom.",
    effectText: "-18% pressure decay delay."
  },
  "med-gel": {
    id: "med-gel",
    name: "Med-Gel Synth",
    category: "research",
    cost: 180,
    description: "Combat foam tuned for rapid tissue sealing.",
    effectText: "Medkits heal more and clear pressure."
  },
  "breach-charge": {
    id: "breach-charge",
    name: "Breach Charge Logic",
    category: "research",
    cost: 250,
    description: "Programs charges to rupture more cover.",
    effectText: "+25% explosive and prop damage."
  },
  "overclock-bus": {
    id: "overclock-bus",
    name: "Overclock Bus",
    category: "research",
    cost: 300,
    description: "Ability cores recover faster under heat.",
    effectText: "-20% ability cooldowns."
  }
};

export const CYBER_UPGRADES: Record<CyberUpgradeId, UpgradeDefinition> = {
  "ocular-uplink": {
    id: "ocular-uplink",
    name: "Ocular Uplink",
    category: "cyber",
    cost: 180,
    description: "Rangefinding lenses with target assist.",
    effectText: "+0.5 weapon range squadwide."
  },
  "servo-fibers": {
    id: "servo-fibers",
    name: "Servo Fibers",
    category: "cyber",
    cost: 210,
    description: "Micro-actuated strands improve acceleration.",
    effectText: "+10% move speed."
  },
  "dermal-mesh": {
    id: "dermal-mesh",
    name: "Dermal Mesh",
    category: "cyber",
    cost: 260,
    description: "Reactive carbon mesh disperses impact energy.",
    effectText: "+2 armor."
  },
  "nerve-filter": {
    id: "nerve-filter",
    name: "Nerve Filter",
    category: "cyber",
    cost: 160,
    description: "Combat damping preserves aim under fire.",
    effectText: "-20% accuracy loss from pressure."
  },
  "reflex-stack": {
    id: "reflex-stack",
    name: "Reflex Stack",
    category: "cyber",
    cost: 230,
    description: "Latency trims for faster target transitions.",
    effectText: "+12% fire rate."
  },
  "recovery-nodes": {
    id: "recovery-nodes",
    name: "Recovery Nodes",
    category: "cyber",
    cost: 190,
    description: "Distributed trauma nodes keep agents active.",
    effectText: "Improves downed recovery and healing efficiency."
  }
};

export const RESEARCH_LIST = Object.values(RESEARCH_UPGRADES);
export const CYBER_LIST = Object.values(CYBER_UPGRADES);
