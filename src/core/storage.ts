import { STORAGE_KEY, createDefaultCampaign } from "../data/constants";
import type { CampaignState } from "../data/types";
import { resolveWeaponId } from "../data/weapons";

export const loadCampaign = (): CampaignState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const defaults = createDefaultCampaign();

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as CampaignState;
    const parsedAgents = Array.isArray(parsed.agents)
      ? defaults.agents.map((agent) => ({
          ...agent,
          weaponId:
            resolveWeaponId(
              parsed.agents.find((candidate) => candidate.id === agent.id)?.weaponId,
              agent.weaponId
            ),
          utilityId:
            parsed.agents.find((candidate) => candidate.id === agent.id)?.utilityId ??
            agent.utilityId,
          deployed:
            parsed.agents.find((candidate) => candidate.id === agent.id)?.deployed ??
            agent.deployed,
          controlMode:
            parsed.agents.find((candidate) => candidate.id === agent.id)?.controlMode ??
            agent.controlMode
        }))
      : defaults.agents;

    return {
      ...defaults,
      ...parsed,
      agents: parsedAgents,
      settings: {
        ...defaults.settings,
        ...parsed.settings
      }
    };
  } catch {
    return defaults;
  }
};

export const saveCampaign = (campaign: CampaignState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
};

export const clearCampaign = (): void => {
  window.localStorage.removeItem(STORAGE_KEY);
};
