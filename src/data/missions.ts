import type { MissionId, MissionMeta } from "./types";

export const MISSION_SEQUENCE: MissionId[] = ["m01", "m02", "m03"];

export const MISSIONS: Record<MissionId, MissionMeta> = {
  m01: {
    id: "m01",
    name: "Glassline Cut",
    region: "spire",
    regionName: "Spire Ward",
    statusLabel: "Corporate plaza hit",
    objectiveKind: "eliminate",
    mapKey: "mission_target",
    difficulty: "Moderate",
    reward: 320,
    briefing:
      "A courier node in Spire Ward carries a live broker imprint. Drop the escort, eliminate the courier, and break the local response web before it relocates.",
    successText:
      "The courier cell collapsed on-site. Shardline owns the broker imprint and the ward slips into blackout.",
    failureText:
      "The target survived the strike window. Corporate traffic hardened and the ward sealed itself down.",
    extractionRequired: false,
    openingFocusCell: { x: 72, y: 52 }
  },
  m02: {
    id: "m02",
    name: "Quiet Relay",
    region: "aegis",
    regionName: "Aegis Biolabs",
    statusLabel: "Scientist recovery",
    objectiveKind: "rescue",
    mapKey: "mission_rescue",
    difficulty: "High",
    reward: 420,
    briefing:
      "A defector biologist is trapped in an Aegis relay lab. Breach the site, secure the scientist, and reach the extraction lift before lockdown shutters the floor.",
    successText:
      "The scientist is out and their vault keys came too. Aegis containment protocols are wide open.",
    failureText:
      "The lab sealed or the asset was lost in the breach. No transfer and no route through Aegis data space.",
    extractionRequired: true,
    openingFocusCell: { x: 20, y: 84 }
  },
  m03: {
    id: "m03",
    name: "Static Bloom",
    region: "blacksite",
    regionName: "Blacksite Verge",
    statusLabel: "Sabotage and escape",
    objectiveKind: "sabotage",
    mapKey: "mission_sabotage",
    difficulty: "Severe",
    reward: 520,
    briefing:
      "A covert annex is producing counter-intrusion hardware. Plant a cascade on the reactor stack, survive the alert spike, and exfiltrate before the site locks down.",
    successText:
      "The annex is dark, the fabricators are slag, and the blackout ripple is spreading through the Verge spine.",
    failureText:
      "The cascade failed or the team was trapped in the shutdown grid. The site stays online and the Verge stays hostile.",
    extractionRequired: true,
    openingFocusCell: { x: 20, y: 84 }
  }
};

export const getMission = (missionId: MissionId): MissionMeta => MISSIONS[missionId];
