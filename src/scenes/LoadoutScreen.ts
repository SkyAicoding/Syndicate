import type { AppController } from "../core/App";
import { getGeneratedPortraitUrl } from "../assets/generatedArt";
import { MISSIONS } from "../data/missions";
import type { WeaponId } from "../data/types";
import { WEAPON_OPTIONS } from "../data/weapons";
import { formatCredits, titleCase } from "../utils/format";
import type { Screen } from "./Screen";

export class LoadoutScreen implements Screen {
  public readonly id = "loadout";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const state = this.app.getState();
    const missionId = state.selectedMissionId ?? state.availableMissions[0];
    const mission = MISSIONS[missionId];
    const deployedAgents = state.agents.filter((agent) => agent.deployed);
    const assistAgents = deployedAgents.filter((agent) => agent.controlMode === "assist");

    this.container = container;
    container.innerHTML = `
      <section class="screen screen--loadout">
        <header class="screen-header">
          <div>
            <p class="eyebrow">Squad prep</p>
            <h1>${mission.name}</h1>
            <p>${mission.briefing}</p>
          </div>
          <div class="header-actions">
            <span class="resource-pill">${formatCredits(state.credits)}</span>
            <span class="resource-pill">${deployedAgents.length}/4 deployed</span>
            <span class="resource-pill">${assistAgents.length} assist AI</span>
            <button class="button button--ghost" data-action="back">Back to Map</button>
          </div>
        </header>
        <div class="agent-grid">
          ${state.agents
            .map((agent) => {
              const portraitUrl = getGeneratedPortraitUrl(agent.id);
              return `
                <article class="agent-card${agent.deployed ? "" : " agent-card--benched"}" data-agent-id="${agent.id}">
                  <div class="portrait-swatch" style="--accent:${agent.accent}">
                    ${
                      portraitUrl
                        ? `<img class="portrait-image" src="${portraitUrl}" alt="${agent.callsign} portrait" />`
                        : `<span>${agent.callsign.slice(0, 2)}</span>`
                    }
                  </div>
                  <div class="agent-card__header">
                    <div>
                      <p class="eyebrow">${titleCase(agent.role)}</p>
                      <h2>${agent.callsign}</h2>
                    </div>
                    <span class="chip">${agent.deployed ? "Deployed" : "Benched"} / ${agent.controlMode === "manual" ? "Direct" : "Assist AI"}</span>
                  </div>
                  <p class="muted">${agent.description}</p>
                  <div class="weapon-selector">
                    <button
                      class="option-chip${agent.deployed ? " option-chip--selected" : ""}"
                      data-agent-deploy="${agent.id}:deploy"
                    >
                      ${agent.deployed ? "Ready For Drop" : "Add To Squad"}
                    </button>
                    <button
                      class="option-chip${agent.controlMode === "manual" ? " option-chip--selected" : ""}"
                      data-agent-control="${agent.id}:manual"
                    >
                      Direct Control
                    </button>
                    <button
                      class="option-chip${agent.controlMode === "assist" ? " option-chip--selected" : ""}"
                      data-agent-control="${agent.id}:assist"
                    >
                      Assist AI
                    </button>
                  </div>
                  <div class="weapon-selector">
                    ${WEAPON_OPTIONS.map(
                      (weapon) => `
                        <button
                          class="option-chip${weapon.id === agent.weaponId ? " option-chip--selected" : ""}"
                          data-agent-weapon="${agent.id}:${weapon.id}"
                        >
                          ${weapon.name}
                        </button>
                      `
                    ).join("")}
                  </div>
                  <div class="detail-grid">
                    <div><span class="label">Utility</span><strong>Medkit</strong></div>
                    <div><span class="label">Ability</span><strong>${titleCase(agent.abilityId)}</strong></div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
        <footer class="screen-footer">
          <button class="button button--primary" data-action="launch" data-testid="launch-mission-button">Deploy Strike Team</button>
          <button class="button" data-action="research">Open Research</button>
        </footer>
      </section>
    `;

    container
      .querySelectorAll<HTMLButtonElement>("[data-agent-weapon]")
      .forEach((button) => button.addEventListener("click", this.handleWeaponChange));
    container
      .querySelectorAll<HTMLButtonElement>("[data-agent-deploy]")
      .forEach((button) => button.addEventListener("click", this.handleDeploymentToggle));
    container
      .querySelectorAll<HTMLButtonElement>("[data-agent-control]")
      .forEach((button) => button.addEventListener("click", this.handleControlChange));
    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-agent-weapon]")
      .forEach((button) => button.removeEventListener("click", this.handleWeaponChange));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-agent-deploy]")
      .forEach((button) => button.removeEventListener("click", this.handleDeploymentToggle));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-agent-control]")
      .forEach((button) => button.removeEventListener("click", this.handleControlChange));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.container = null;
  }

  private handleWeaponChange = (event: Event): void => {
    const value = (event.currentTarget as HTMLButtonElement).dataset.agentWeapon;
    if (!value) {
      return;
    }

    const [agentId, weaponId] = value.split(":");
    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentWeapon(agentId, weaponId as WeaponId);
    this.app.refresh();
  };

  private handleDeploymentToggle = (event: Event): void => {
    const value = (event.currentTarget as HTMLButtonElement).dataset.agentDeploy;
    if (!value) {
      return;
    }

    const agentId = value.split(":")[0];
    const agent = this.app.getStore().getAgent(agentId);
    if (!agent) {
      return;
    }

    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentDeployment(agentId, !agent.deployed);
    this.app.refresh();
  };

  private handleControlChange = (event: Event): void => {
    const value = (event.currentTarget as HTMLButtonElement).dataset.agentControl;
    if (!value) {
      return;
    }

    const [agentId, controlMode] = value.split(":");
    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentControlMode(agentId, controlMode === "assist" ? "assist" : "manual");
    this.app.refresh();
  };

  private handleAction = (event: Event): void => {
    const action = (event.currentTarget as HTMLButtonElement).dataset.action;
    this.app.touchAudio();
    this.app.getAudio().playUi(true);

    if (action === "launch") {
      const state = this.app.getState();
      const deployedAgents = state.agents.filter((agent) => agent.deployed);
      const manualAgents = deployedAgents.filter((agent) => agent.controlMode === "manual");
      if (!deployedAgents.length) {
        this.app.showToast("Select at least one agent for the mission.");
        return;
      }
      if (!manualAgents.length) {
        this.app.showToast("Keep at least one agent under direct control.");
        return;
      }
      this.app.navigate("mission");
      return;
    }

    if (action === "research") {
      this.app.navigate("research");
      return;
    }

    this.app.navigate("world");
  };
}
