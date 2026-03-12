import type { CampaignState, SettingsState } from "./types";
import { DEFAULT_AGENTS } from "./roster";

export const GAME_TITLE = "Shardline Protocol";
export const STORAGE_KEY = "shardline-protocol-save";
export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 64;
export const LEVEL_HEIGHT = 42;
export const CAMERA_ZOOM_MIN = 0.55;
export const CAMERA_ZOOM_MAX = 1.25;
export const CAMERA_ZOOM_DEFAULT = 0.82;

export const DEFAULT_SETTINGS: SettingsState = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 0.75,
  edgeScroll: true,
  highFx: true,
  screenShake: true,
  showDebug: false
};

export const createDefaultCampaign = (): CampaignState => ({
  version: 2,
  title: GAME_TITLE,
  credits: 900,
  completedMissions: [],
  availableMissions: ["m01"],
  regionControl: {
    spire: "contested",
    aegis: "locked",
    blacksite: "locked"
  },
  selectedMissionId: "m01",
  researchUnlocked: [],
  cyberUnlocked: [],
  agents: DEFAULT_AGENTS.map((agent) => ({ ...agent })),
  settings: { ...DEFAULT_SETTINGS },
  lastResult: null
});
