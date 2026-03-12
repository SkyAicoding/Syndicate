import type { AppController } from "../core/App";
import type { Screen } from "./Screen";

export class MenuScreen implements Screen {
  public readonly id = "menu";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const state = this.app.getState();
    const hasSave = this.app.getStore().hasSave();
    this.container = container;
    container.innerHTML = `
      <section class="screen screen--menu">
        <div class="hero-panel" data-testid="main-menu-screen">
          <p class="eyebrow">Corporate blackout // tactical strike cell</p>
          <h1 class="hero-title">Shardline Protocol</h1>
          <p class="hero-copy">
            Lead a four-agent intrusion crew through corporate plazas, sealed labs,
            and covert industrial blacksites in a fast, readable cyber-SF tactics slice.
          </p>
          <div class="menu-actions menu-actions--hero">
            <button class="button button--primary menu-action-button menu-action-button--primary" data-action="continue" data-testid="continue-button" ${
              hasSave ? "" : "disabled"
            }><span class="menu-action-button__label">Continue Operation</span></button>
            <button class="button menu-action-button menu-action-button--compact" data-action="new" data-testid="new-campaign-button"><span class="menu-action-button__label">New Campaign</span></button>
            <button class="button menu-action-button menu-action-button--compact" data-action="settings"><span class="menu-action-button__label">Settings</span></button>
            <button class="button button--ghost menu-action-button menu-action-button--compact" data-action="reset"><span class="menu-action-button__label">Reset Save</span></button>
          </div>
          <div class="status-strip status-strip--hero">
            <div class="status-strip__item">
              <span class="label">Credits</span>
              <strong>${state.credits}</strong>
            </div>
            <div class="status-strip__item">
              <span class="label">Completed</span>
              <strong>${state.completedMissions.length}/3</strong>
            </div>
            <div class="status-strip__item">
              <span class="label">Available</span>
              <strong>${state.availableMissions.length} operations</strong>
            </div>
          </div>
        </div>
        <div class="intel-grid">
          <article class="intel-card">
            <h2>Design Pillars</h2>
            <p>Fast squad control, readable real-time combat, compact progression, and a polished corporate dystopia tone.</p>
          </article>
          <article class="intel-card">
            <h2>Vertical Slice</h2>
            <p>Three operations with distinct objectives: elimination, rescue and extraction, sabotage and escape.</p>
          </article>
          <article class="intel-card">
            <h2>Build Notes</h2>
            <p>Playable placeholder art is separated from the production art plan so the slice stays stable while visuals scale up.</p>
          </article>
        </div>
      </section>
    `;

    container.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((button) => {
      button.addEventListener("click", this.handleClick);
    });
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("button[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleClick));
    this.container = null;
  }

  private handleClick = (event: Event): void => {
    const action = (event.currentTarget as HTMLButtonElement).dataset.action;
    this.app.touchAudio();
    this.app.getAudio().playUi(true);

    if (action === "continue") {
      this.app.navigate("world");
      return;
    }

    if (action === "new") {
      this.app.getStore().startNewCampaign();
      this.app.showToast("New campaign initialized.");
      this.app.navigate("world");
      return;
    }

    if (action === "settings") {
      this.app.openSettings("menu");
      return;
    }

    if (action === "reset") {
      this.app.getStore().resetCampaign();
      this.app.showToast("Local save reset.");
      this.app.navigate("menu");
    }
  };
}
