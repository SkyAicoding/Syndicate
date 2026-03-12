import { STORAGE_KEY, createDefaultCampaign } from "../data/constants";
import { MISSION_SEQUENCE, MISSIONS } from "../data/missions";
import { CYBER_UPGRADES, RESEARCH_UPGRADES } from "../data/upgrades";
import type {
  AgentDefinition,
  CampaignState,
  CyberUpgradeId,
  AgentControlMode,
  MissionId,
  MissionResult,
  ResearchId,
  SettingsState,
  WeaponId
} from "../data/types";
import { clearCampaign, loadCampaign, saveCampaign } from "./storage";

type Listener = (state: CampaignState) => void;

const nextMission = (missionId: MissionId): MissionId | null => {
  const currentIndex = MISSION_SEQUENCE.indexOf(missionId);
  return MISSION_SEQUENCE[currentIndex + 1] ?? null;
};

export class CampaignStore {
  private state: CampaignState;

  private listeners = new Set<Listener>();

  public constructor() {
    this.state = loadCampaign();
  }

  public getState(): CampaignState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public hasSave(): boolean {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  }

  public startNewCampaign(): void {
    this.state = {
      ...createDefaultCampaign(),
      settings: { ...this.state.settings }
    };
    this.commit();
  }

  public resetCampaign(): void {
    clearCampaign();
    this.state = {
      ...createDefaultCampaign(),
      settings: { ...this.state.settings }
    };
    this.commit();
  }

  public setSelectedMission(missionId: MissionId): void {
    this.state = {
      ...this.state,
      selectedMissionId: missionId
    };
    this.commit();
  }

  public updateAgentWeapon(agentId: string, weaponId: WeaponId): void {
    const agents = this.state.agents.map((agent) =>
      agent.id === agentId ? { ...agent, weaponId } : agent
    );

    this.state = {
      ...this.state,
      agents
    };
    this.commit();
  }

  public updateAgentDeployment(agentId: string, deployed: boolean): void {
    this.state = {
      ...this.state,
      agents: this.state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, deployed } : agent
      )
    };
    this.commit();
  }

  public updateAgentControlMode(agentId: string, controlMode: AgentControlMode): void {
    this.state = {
      ...this.state,
      agents: this.state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, controlMode } : agent
      )
    };
    this.commit();
  }

  public updateSettings(partial: Partial<SettingsState>): void {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...partial
      }
    };
    this.commit();
  }

  public purchaseResearch(upgradeId: ResearchId): boolean {
    if (this.state.researchUnlocked.includes(upgradeId)) {
      return false;
    }

    const upgrade = RESEARCH_UPGRADES[upgradeId];
    if (this.state.credits < upgrade.cost) {
      return false;
    }

    this.state = {
      ...this.state,
      credits: this.state.credits - upgrade.cost,
      researchUnlocked: [...this.state.researchUnlocked, upgradeId]
    };
    this.commit();
    return true;
  }

  public purchaseCyber(upgradeId: CyberUpgradeId): boolean {
    if (this.state.cyberUnlocked.includes(upgradeId)) {
      return false;
    }

    const upgrade = CYBER_UPGRADES[upgradeId];
    if (this.state.credits < upgrade.cost) {
      return false;
    }

    this.state = {
      ...this.state,
      credits: this.state.credits - upgrade.cost,
      cyberUnlocked: [...this.state.cyberUnlocked, upgradeId]
    };
    this.commit();
    return true;
  }

  public applyMissionResult(result: MissionResult): void {
    const completed = result.success
      ? Array.from(new Set([...this.state.completedMissions, result.missionId]))
      : this.state.completedMissions;

    const newlyUnlocked = nextMission(result.missionId);
    const availableMissions = new Set(this.state.availableMissions);

    if (result.success && newlyUnlocked) {
      availableMissions.add(newlyUnlocked);
    }

    const mission = MISSIONS[result.missionId];
    const regionControl = { ...this.state.regionControl };

    if (result.success) {
      regionControl[mission.region] = "secured";
      if (newlyUnlocked) {
        regionControl[MISSIONS[newlyUnlocked].region] = "contested";
      }
    }

    this.state = {
      ...this.state,
      credits: this.state.credits + result.creditsEarned,
      completedMissions: completed,
      availableMissions: Array.from(availableMissions),
      regionControl,
      selectedMissionId: result.success
        ? newlyUnlocked ?? result.missionId
        : result.missionId,
      lastResult: result
    };
    this.commit();
  }

  public getAgent(agentId: string): AgentDefinition | undefined {
    return this.state.agents.find((agent) => agent.id === agentId);
  }

  private commit(): void {
    saveCampaign(this.state);
    this.listeners.forEach((listener) => listener(this.state));
  }
}
