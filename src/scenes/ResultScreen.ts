import type { AppController } from "../core/App";
import { MISSIONS } from "../data/missions";
import { formatCredits } from "../utils/format";
import type { Screen } from "./Screen";

export class ResultScreen implements Screen {
  public readonly id = "result";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const result = this.app.getState().lastResult;

    if (!result) {
      this.app.navigate("world");
      return;
    }

    const mission = MISSIONS[result.missionId];
    this.container = container;
    container.innerHTML = `
      <section class="screen screen--result">
        <div class="result-panel ${result.success ? "is-success" : "is-failure"}" data-testid="mission-result-screen">
          <p class="eyebrow">${mission.name}</p>
          <h1>${result.title}</h1>
          <p>${result.summary}</p>
          <div class="detail-grid">
            <div><span class="label">Payout</span><strong>${formatCredits(result.creditsEarned)}</strong></div>
            <div><span class="label">Casualties</span><strong>${result.casualties.length || 0}</strong></div>
            <div><span class="label">Region</span><strong>${mission.regionName}</strong></div>
            <div><span class="label">Status</span><strong>${result.success ? "Secured" : "Compromised"}</strong></div>
          </div>
          ${
            result.casualties.length
              ? `<div class="casualty-list"><p class="label">Agents down</p><strong>${result.casualties.join(", ")}</strong></div>`
              : ""
          }
          <div class="panel-actions">
            <button class="button button--primary" data-action="map">Return to Region Map</button>
            <button class="button" data-action="retry">Retry Operation</button>
          </div>
        </div>
      </section>
    `;

    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.container = null;
  }

  private handleAction = (event: Event): void => {
    const action = (event.currentTarget as HTMLButtonElement).dataset.action;
    this.app.touchAudio();
    this.app.getAudio().playUi(true);

    if (action === "retry") {
      this.app.navigate("mission");
      return;
    }

    this.app.navigate("world");
  };
}
