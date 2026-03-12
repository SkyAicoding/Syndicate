import type { AppController } from "../core/App";
import { CYBER_LIST, RESEARCH_LIST } from "../data/upgrades";
import { formatCredits } from "../utils/format";
import type { Screen } from "./Screen";

const renderUpgradeCards = (
  list: typeof RESEARCH_LIST,
  unlocked: string[],
  credits: number,
  prefix: string
): string =>
  list
    .map((upgrade) => {
      const isUnlocked = unlocked.includes(upgrade.id);
      const affordable = credits >= upgrade.cost;
      return `
        <article class="upgrade-card${isUnlocked ? " upgrade-card--owned" : ""}">
          <div class="upgrade-card__header">
            <div>
              <p class="eyebrow">${upgrade.category}</p>
              <h3>${upgrade.name}</h3>
            </div>
            <span class="resource-pill">${upgrade.cost} cr</span>
          </div>
          <p>${upgrade.description}</p>
          <p class="muted">${upgrade.effectText}</p>
          <button
            class="button ${isUnlocked ? "button--ghost" : affordable ? "button--primary" : ""}"
            data-upgrade="${prefix}:${upgrade.id}"
            ${isUnlocked || !affordable ? "disabled" : ""}
          >
            ${isUnlocked ? "Unlocked" : affordable ? "Purchase" : "Insufficient Credits"}
          </button>
        </article>
      `;
    })
    .join("");

export class ResearchScreen implements Screen {
  public readonly id = "research";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const state = this.app.getState();
    this.container = container;

    container.innerHTML = `
      <section class="screen screen--research">
        <header class="screen-header">
          <div>
            <p class="eyebrow">R&D and cybernetics</p>
            <h1>Upgrade lattice</h1>
            <p>Spend field credits on team-wide research and cybernetic tuning that persists across missions.</p>
          </div>
          <div class="header-actions">
            <span class="resource-pill">${formatCredits(state.credits)}</span>
            <button class="button button--ghost" data-action="back">Back</button>
          </div>
        </header>
        <div class="upgrade-columns">
          <div>
            <h2>Research</h2>
            <div class="upgrade-grid">
              ${renderUpgradeCards(
                RESEARCH_LIST,
                state.researchUnlocked,
                state.credits,
                "research"
              )}
            </div>
          </div>
          <div>
            <h2>Cyber Upgrades</h2>
            <div class="upgrade-grid">
              ${renderUpgradeCards(
                CYBER_LIST,
                state.cyberUnlocked,
                state.credits,
                "cyber"
              )}
            </div>
          </div>
        </div>
      </section>
    `;

    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));
    container
      .querySelectorAll<HTMLButtonElement>("[data-upgrade]")
      .forEach((button) => button.addEventListener("click", this.handleUpgrade));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-upgrade]")
      .forEach((button) => button.removeEventListener("click", this.handleUpgrade));
    this.container = null;
  }

  private handleAction = (): void => {
    this.app.touchAudio();
    this.app.getAudio().playUi(true);
    this.app.navigate("world");
  };

  private handleUpgrade = (event: Event): void => {
    const value = (event.currentTarget as HTMLButtonElement).dataset.upgrade;
    if (!value) {
      return;
    }

    this.app.touchAudio();
    const [category, upgradeId] = value.split(":");
    const result =
      category === "research"
        ? this.app.getStore().purchaseResearch(upgradeId as never)
        : this.app.getStore().purchaseCyber(upgradeId as never);

    this.app.getAudio().playUi(result);
    this.app.showToast(result ? "Upgrade purchased." : "Unable to purchase upgrade.");
    this.app.refresh();
  };
}
