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
      "An executive courier node is holding a live broker imprint in Spire Ward. Drop the escort, eliminate the courier, and fracture the board's local response web before it relocates.",
    successText:
      "The courier cell collapsed on-site. Shardline now owns the broker imprint and the ward slips into contested blackout.",
    failureText:
      "The target survived the strike window. Corporate traffic hardened and the ward's security lattice closed around the district.",
    extractionRequired: false
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
      "A defector systems biologist is being held inside an Aegis relay lab. Breach the complex, secure the scientist, and escort them to the extraction lift before the lab shutters.",
    successText:
      "The scientist is out and their vault keys came with them. Aegis containment protocols are broken wide open.",
    failureText:
      "The relay lab sealed or the asset was lost in the breach. No transfer, no leverage, and no route through Aegis data space.",
    extractionRequired: true
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
      "A covert fabrication annex is producing counter-intrusion hardware. Plant a cascade on the reactor stack, survive the alert spike, and exfiltrate before the site locks down.",
    successText:
      "The annex is dark, the fabricators are slag, and the blackout ripple is spreading through the Verge logistics spine.",
    failureText:
      "The cascade failed or the team was trapped in the shutdown grid. The site remains online and the Verge stays hostile.",
    extractionRequired: true
  }
};

export const getMission = (missionId: MissionId): MissionMeta => MISSIONS[missionId];
