import type {
  AbilityId,
  AgentControlMode,
  AgentRoleId,
  MissionId,
  MissionResult,
  WeaponId
} from "../data/types";

export interface GridPos {
  x: number;
  y: number;
}

export type MissionAlertLevel = "low" | "elevated" | "lockdown";
export type MissionEventTone = "info" | "warning" | "success" | "danger";

export interface MissionEventSnapshot {
  id: string;
  text: string;
  tone: MissionEventTone;
}

export interface MinimapMarker extends GridPos {
  level: number;
}

export interface HudUnitSnapshot {
  id: string;
  label: string;
  role: AgentRoleId | "enemy" | "civilian" | "vip";
  controlMode?: AgentControlMode;
  level: number;
  weaponId: WeaponId | null;
  currentHealth: number;
  maxHealth: number;
  pressure: number;
  selected: boolean;
  abilityId?: AbilityId;
  abilityReady?: boolean;
  abilityRemainingSeconds: number;
  holdPosition?: boolean;
  medkits?: number;
  brainState: "idle" | "moving" | "combat" | "panic" | "escort";
  aggro: boolean;
  cell: GridPos;
}

export interface MissionSnapshot {
  missionId: MissionId;
  missionName: string;
  objectiveText: string;
  phaseLabel: string;
  alertLevel: MissionAlertLevel;
  focusFloor: number;
  statusText: string;
  timerSeconds: number;
  fps: number;
  missionState: "active" | "success" | "failure";
  debugVisible: boolean;
  selectedIds: string[];
  selectedUnits: HudUnitSnapshot[];
  squad: HudUnitSnapshot[];
  events: MissionEventSnapshot[];
  minimap: {
    width: number;
    height: number;
    maxFloor: number;
    players: MinimapMarker[];
    enemies: MinimapMarker[];
    civilians: MinimapMarker[];
    objectives: MinimapMarker[];
  };
}

export interface MissionCallbacks {
  onSnapshot: (snapshot: MissionSnapshot) => void;
  onToast: (message: string) => void;
  onMissionEnd: (result: MissionResult) => void;
}

export interface TiledObjectData {
  id: number;
  name: string;
  type: string;
  properties: Record<string, string | number | boolean>;
}

export interface ParsedMissionMap {
  width: number;
  height: number;
  ground: number[][];
  detail: number[][];
  elevation: number[][];
  traversal: number[][];
  objects: TiledObjectData[];
}

export type MissionOutcome = "success" | "failure";
