import type { AppController } from "../core/App";
import { getGeneratedPortraitUrl } from "../assets/generatedArt";
import { MISSIONS } from "../data/missions";
import type { WeaponId } from "../data/types";
import { PLAYER_WEAPON_OPTIONS, WEAPONS } from "../data/weapons";
import { formatCredits, titleCase } from "../utils/format";
import type { Screen } from "./Screen";

const DEPLOYMENT_OPTIONS = {
  bench: {
    label: "Stand By",
    description: "Keep this agent off the insertion roster and hold them in reserve.",
    stats: ["Reserve slot", "No initial spawn"]
  },
  deploy: {
    label: "Deploy Agent",
    description: "Insert this agent with the strike cell at mission start.",
    stats: ["Active slot", "Mission ready"]
  }
} as const;

const CONTROL_MODE_OPTIONS = {
  manual: {
    label: "Direct Control",
    description: "Player-issued movement and attack orders drive this agent.",
    stats: ["Manual orders", "Primary selection"]
  },
  assist: {
    label: "Assist AI",
    description: "This agent shadows the squad and responds through support AI.",
    stats: ["AI support", "Lower micromanage"]
  }
} as const;

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
          <div class="screen-header__copy">
            <p class="eyebrow">Squad prep</p>
            <h1>${mission.name}</h1>
            <p class="screen-copy">${mission.briefing}</p>
          </div>
          <div class="header-actions">
            <span class="resource-pill"><span class="resource-pill__value">${formatCredits(state.credits)}</span></span>
            <span class="resource-pill"><span class="resource-pill__value">${deployedAgents.length}/4 deployed</span></span>
            <span class="resource-pill"><span class="resource-pill__value">${assistAgents.length} assist AI</span></span>
            <button class="button button--ghost" data-action="back"><span class="button__label">Back to Map</span></button>
          </div>
        </header>
        <div class="agent-grid">
          ${state.agents
            .map((agent) => {
              const portraitUrl = getGeneratedPortraitUrl(agent.id);
              const selectedWeapon = WEAPONS[agent.weaponId];
              const deploymentOption = agent.deployed
                ? DEPLOYMENT_OPTIONS.deploy
                : DEPLOYMENT_OPTIONS.bench;
              const controlOption = CONTROL_MODE_OPTIONS[agent.controlMode];
              return `
                <article class="agent-card${agent.deployed ? "" : " agent-card--benched"}" data-agent-id="${agent.id}">
                  <div class="agent-card__identity">
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
                        <p class="muted agent-card__summary">${agent.description}</p>
                      </div>
                      <span class="chip agent-card__status"><span class="chip__label">${agent.deployed ? "Deployed" : "Benched"} / ${agent.controlMode === "manual" ? "Direct" : "Assist AI"}</span></span>
                    </div>
                  </div>
                  <div class="agent-card__groups">
                    <section class="agent-card__group">
                      <p class="agent-card__group-title">Deployment</p>
                      <label class="weapon-combo" data-agent-deploy-panel="${agent.id}">
                        <span class="weapon-combo__caption">Entry state</span>
                        <select class="weapon-combo__select" data-agent-deploy-select="${agent.id}">
                          <option value="bench" ${!agent.deployed ? "selected" : ""}>${DEPLOYMENT_OPTIONS.bench.label}</option>
                          <option value="deploy" ${agent.deployed ? "selected" : ""}>${DEPLOYMENT_OPTIONS.deploy.label}</option>
                        </select>
                        <div class="weapon-combo__summary">
                          <strong>${deploymentOption.label}</strong>
                          <span>${deploymentOption.description}</span>
                          <div class="weapon-combo__stats">
                            ${deploymentOption.stats.map((stat) => `<span>${stat}</span>`).join("")}
                          </div>
                        </div>
                      </label>
                    </section>
                    <section class="agent-card__group">
                      <p class="agent-card__group-title">Control Mode</p>
                      <label class="weapon-combo" data-agent-control-panel="${agent.id}">
                        <span class="weapon-combo__caption">Command profile</span>
                        <select class="weapon-combo__select" data-agent-control-select="${agent.id}">
                          <option value="manual" ${agent.controlMode === "manual" ? "selected" : ""}>${CONTROL_MODE_OPTIONS.manual.label}</option>
                          <option value="assist" ${agent.controlMode === "assist" ? "selected" : ""}>${CONTROL_MODE_OPTIONS.assist.label}</option>
                        </select>
                        <div class="weapon-combo__summary">
                          <strong>${controlOption.label}</strong>
                          <span>${controlOption.description}</span>
                          <div class="weapon-combo__stats">
                            ${controlOption.stats.map((stat) => `<span>${stat}</span>`).join("")}
                          </div>
                        </div>
                      </label>
                    </section>
                    <section class="agent-card__group agent-card__group--loadout">
                      <p class="agent-card__group-title">Starting Weapon</p>
                      <label class="weapon-combo" data-agent-weapon-panel="${agent.id}">
                        <span class="weapon-combo__caption">Base loadout</span>
                        <select class="weapon-combo__select" data-agent-weapon-select="${agent.id}">
                          ${PLAYER_WEAPON_OPTIONS.map(
                            (weapon) => `
                              <option value="${weapon.id}" ${weapon.id === agent.weaponId ? "selected" : ""}>
                                ${weapon.name}
                              </option>
                            `
                          ).join("")}
                        </select>
                        <div class="weapon-combo__summary">
                          <strong>${selectedWeapon.name}</strong>
                          <span>${selectedWeapon.description}</span>
                          <div class="weapon-combo__stats">
                            <span>DMG ${selectedWeapon.damage}</span>
                            <span>RNG ${selectedWeapon.range.toFixed(1)}</span>
                            <span>BURST ${selectedWeapon.burst}</span>
                            <span>AMMO ${selectedWeapon.startingAmmo}</span>
                          </div>
                        </div>
                      </label>
                    </section>
                  </div>
                  <div class="detail-grid detail-grid--agent">
                    <div class="detail-card"><span class="label">Utility</span><strong>Medkit</strong></div>
                    <div class="detail-card"><span class="label">Ability</span><strong>${titleCase(agent.abilityId)}</strong></div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
        <footer class="screen-footer">
          <button class="button button--primary" data-action="launch" data-testid="launch-mission-button"><span class="button__label">Deploy Strike Team</span></button>
          <button class="button" data-action="research"><span class="button__label">Open Research</span></button>
        </footer>
      </section>
    `;

    container
      .querySelectorAll<HTMLSelectElement>("[data-agent-weapon-select]")
      .forEach((select) => select.addEventListener("change", this.handleWeaponChange));
    container
      .querySelectorAll<HTMLSelectElement>("[data-agent-deploy-select]")
      .forEach((select) => select.addEventListener("change", this.handleDeploymentToggle));
    container
      .querySelectorAll<HTMLSelectElement>("[data-agent-control-select]")
      .forEach((select) => select.addEventListener("change", this.handleControlChange));
    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLSelectElement>("[data-agent-weapon-select]")
      .forEach((select) => select.removeEventListener("change", this.handleWeaponChange));
    this.container
      .querySelectorAll<HTMLSelectElement>("[data-agent-deploy-select]")
      .forEach((select) => select.removeEventListener("change", this.handleDeploymentToggle));
    this.container
      .querySelectorAll<HTMLSelectElement>("[data-agent-control-select]")
      .forEach((select) => select.removeEventListener("change", this.handleControlChange));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.container = null;
  }

  private handleWeaponChange = (event: Event): void => {
    const select = event.currentTarget as HTMLSelectElement;
    const agentId = select.dataset.agentWeaponSelect;
    const weaponId = select.value;
    if (!agentId || !weaponId) {
      return;
    }

    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentWeapon(agentId, weaponId as WeaponId);
    this.refreshPreservingScroll();
  };

  private handleDeploymentToggle = (event: Event): void => {
    const select = event.currentTarget as HTMLSelectElement;
    const agentId = select.dataset.agentDeploySelect;
    const mode = select.value;
    if (!agentId || !mode) {
      return;
    }

    const agent = this.app.getStore().getAgent(agentId);
    if (!agent) {
      return;
    }

    const nextDeployed = mode === "deploy";
    if (agent.deployed === nextDeployed) {
      return;
    }

    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentDeployment(agentId, nextDeployed);
    this.refreshPreservingScroll();
  };

  private handleControlChange = (event: Event): void => {
    const select = event.currentTarget as HTMLSelectElement;
    const agentId = select.dataset.agentControlSelect;
    const controlMode = select.value;
    if (!agentId || !controlMode) {
      return;
    }

    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().updateAgentControlMode(agentId, controlMode === "assist" ? "assist" : "manual");
    this.refreshPreservingScroll();
  };

  private refreshPreservingScroll(): void {
    const shellScroller = this.container?.closest(".app-shell__screen") as HTMLElement | null;
    const agentGrid = this.container?.querySelector<HTMLElement>(".agent-grid") ?? null;
    const shellScrollTop = shellScroller?.scrollTop ?? 0;
    const gridScrollTop = agentGrid?.scrollTop ?? 0;

    this.app.refresh();

    window.requestAnimationFrame(() => {
      const nextShellScroller = document.querySelector<HTMLElement>(".app-shell__screen");
      const nextGrid = document.querySelector<HTMLElement>(".screen--loadout .agent-grid");
      if (nextShellScroller) {
        nextShellScroller.scrollTop = shellScrollTop;
      }
      if (nextGrid) {
        nextGrid.scrollTop = gridScrollTop;
      }
    });
  }

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
