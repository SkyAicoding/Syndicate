import { STORAGE_KEY, createDefaultCampaign } from "../data/constants";
import type { CampaignState } from "../data/types";

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
          ...parsed.agents.find((candidate) => candidate.id === agent.id)
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
