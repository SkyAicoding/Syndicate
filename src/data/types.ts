export type ScreenId =
  | "menu"
  | "world"
  | "loadout"
  | "research"
  | "mission"
  | "result"
  | "settings";

export type MissionId = "m01" | "m02" | "m03";
export type RegionStatus = "locked" | "contested" | "secured";
export type RegionId = "spire" | "aegis" | "blacksite";
export type WeaponId = "pistol" | "smg" | "shotgun" | "rifle";
export type UtilityId = "medkit";
export type AgentControlMode = "manual" | "assist";
export type AgentRoleId =
  | "operator"
  | "breacher"
  | "infiltrator"
  | "support";
export type AbilityId = "focus" | "bulwark" | "ghost" | "nanowave";
export type ResearchId =
  | "ballistic-weave"
  | "smartlink"
  | "suppressor-routing"
  | "med-gel"
  | "breach-charge"
  | "overclock-bus";
export type CyberUpgradeId =
  | "ocular-uplink"
  | "servo-fibers"
  | "dermal-mesh"
  | "nerve-filter"
  | "reflex-stack"
  | "recovery-nodes";
export type ObjectiveKind = "eliminate" | "rescue" | "sabotage";

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  damage: number;
  range: number;
  rate: number;
  accuracy: number;
  pressure: number;
  spread: number;
  burst: number;
  movePenalty: number;
  color: number;
  description: string;
}

export interface AgentDefinition {
  id: string;
  callsign: string;
  role: AgentRoleId;
  abilityId: AbilityId;
  description: string;
  weaponId: WeaponId;
  utilityId: UtilityId;
  accent: string;
  deployed: boolean;
  controlMode: AgentControlMode;
}

export interface UpgradeDefinition {
  id: ResearchId | CyberUpgradeId;
  name: string;
  category: "research" | "cyber";
  cost: number;
  description: string;
  effectText: string;
}

export interface MissionMeta {
  id: MissionId;
  name: string;
  region: RegionId;
  regionName: string;
  statusLabel: string;
  objectiveKind: ObjectiveKind;
  mapKey: string;
  difficulty: string;
  reward: number;
  briefing: string;
  successText: string;
  failureText: string;
  extractionRequired: boolean;
}

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  edgeScroll: boolean;
  highFx: boolean;
  screenShake: boolean;
  showDebug: boolean;
}

export interface CampaignState {
  version: number;
  title: string;
  credits: number;
  completedMissions: MissionId[];
  availableMissions: MissionId[];
  regionControl: Record<RegionId, RegionStatus>;
  selectedMissionId: MissionId | null;
  researchUnlocked: ResearchId[];
  cyberUnlocked: CyberUpgradeId[];
  agents: AgentDefinition[];
  settings: SettingsState;
  lastResult: MissionResult | null;
}

export interface MissionResult {
  missionId: MissionId;
  success: boolean;
  title: string;
  summary: string;
  creditsEarned: number;
  casualties: string[];
}

export interface ScreenContext {
  app: unknown;
}
