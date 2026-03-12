import type { AppController } from "../core/App";
import { MISSIONS } from "../data/missions";
import type { MissionId } from "../data/types";
import { formatCredits } from "../utils/format";
import type { Screen } from "./Screen";

const REGION_ART = {
  spire: "Spire Ward",
  aegis: "Aegis Biolabs",
  blacksite: "Blacksite Verge"
} as const;

export class WorldMapScreen implements Screen {
  public readonly id = "world";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const state = this.app.getState();
    const selectedMissionId = state.selectedMissionId ?? state.availableMissions[0];
    const selectedMission = MISSIONS[selectedMissionId];

    this.container = container;
    container.innerHTML = `
      <section class="screen screen--world" data-testid="world-map-screen">
        <header class="screen-header">
          <div>
            <p class="eyebrow">Region map</p>
            <h1>Strike routing</h1>
          </div>
          <div class="header-actions">
            <span class="resource-pill">${formatCredits(state.credits)}</span>
            <button class="button button--ghost" data-action="menu">Main Menu</button>
            <button class="button button--ghost" data-action="settings">Settings</button>
          </div>
        </header>
        <div class="world-layout">
          <div class="map-panel">
            <div class="map-diagram">
              ${Object.entries(REGION_ART)
                .map(
                  ([regionId, name]) => `
                    <button class="region-node region-node--${
                      state.regionControl[regionId as keyof typeof REGION_ART]
                    }">
                      <span>${name}</span>
                      <strong>${
                        state.regionControl[regionId as keyof typeof REGION_ART]
                      }</strong>
                    </button>
                  `
                )
                .join("")}
            </div>
            <div class="briefing-panel">
              <p class="eyebrow">Operational summary</p>
              <h2>${selectedMission.name}</h2>
              <p>${selectedMission.briefing}</p>
              <div class="detail-grid">
                <div><span class="label">Region</span><strong>${selectedMission.regionName}</strong></div>
                <div><span class="label">Objective</span><strong>${selectedMission.objectiveKind}</strong></div>
                <div><span class="label">Difficulty</span><strong>${selectedMission.difficulty}</strong></div>
                <div><span class="label">Reward</span><strong>${formatCredits(selectedMission.reward)}</strong></div>
              </div>
              <div class="panel-actions">
                <button class="button button--primary" data-action="prep" data-testid="open-loadout-button">Open Squad Prep</button>
                <button class="button" data-action="research">Research & Upgrades</button>
              </div>
            </div>
          </div>
          <aside class="mission-list">
            <p class="eyebrow">Operations</p>
            ${Object.values(MISSIONS)
              .map((mission) => {
                const isUnlocked = state.availableMissions.includes(mission.id);
                const isComplete = state.completedMissions.includes(mission.id);
                const selectedClass =
                  mission.id === selectedMissionId ? " mission-card--selected" : "";
                return `
                  <button
                    class="mission-card${selectedClass}"
                    data-mission-id="${mission.id}"
                    data-testid="mission-card-${mission.id}"
                    ${isUnlocked ? "" : "disabled"}
                  >
                    <span class="mission-card__status ${isComplete ? "is-complete" : ""}">
                      ${isComplete ? "Secured" : isUnlocked ? "Open" : "Locked"}
                    </span>
                    <strong>${mission.name}</strong>
                    <span>${mission.statusLabel}</span>
                  </button>
                `;
              })
              .join("")}
          </aside>
        </div>
      </section>
    `;

    container
      .querySelectorAll<HTMLButtonElement>("[data-mission-id]")
      .forEach((button) => button.addEventListener("click", this.handleSelectMission));
    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-mission-id]")
      .forEach((button) => button.removeEventListener("click", this.handleSelectMission));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.container = null;
  }

  private handleSelectMission = (event: Event): void => {
    const missionId = (event.currentTarget as HTMLButtonElement).dataset
      .missionId as MissionId;
    this.app.touchAudio();
    this.app.getAudio().playUi();
    this.app.getStore().setSelectedMission(missionId);
    this.app.refresh();
  };

  private handleAction = (event: Event): void => {
    const action = (event.currentTarget as HTMLButtonElement).dataset.action;
    this.app.touchAudio();
    this.app.getAudio().playUi(true);

    if (action === "prep") {
      this.app.navigate("loadout");
      return;
    }

    if (action === "research") {
      this.app.navigate("research");
      return;
    }

    if (action === "settings") {
      this.app.openSettings("world");
      return;
    }

    this.app.navigate("menu");
  };
}
