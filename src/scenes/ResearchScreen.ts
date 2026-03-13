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
      const actionLabel = isUnlocked
        ? "Unlocked"
        : affordable
          ? "Purchase"
          : "Need";
      return `
        <article class="upgrade-card${isUnlocked ? " upgrade-card--owned" : ""}">
          <button
            class="button upgrade-card__button ${isUnlocked ? "button--ghost" : affordable ? "button--primary" : ""}"
            data-upgrade="${prefix}:${upgrade.id}"
            ${isUnlocked || !affordable ? "disabled" : ""}
          >
            <span class="button__label">${actionLabel}</span>
            ${isUnlocked ? "" : `<span class="upgrade-card__button-cost">${upgrade.cost} cr</span>`}
          </button>
          <div class="upgrade-card__body">
            <h3 class="upgrade-card__title">${upgrade.name}</h3>
            <p class="upgrade-card__summary">${upgrade.description}</p>
            <p class="muted upgrade-card__effect">${upgrade.effectText}</p>
          </div>
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
          <div class="screen-header__copy research-header__copy">
            <p class="eyebrow">R&D and cybernetics</p>
            <h1>Upgrade lattice</h1>
            <p class="screen-copy">Spend field credits on persistent research and cyber tuning for the whole squad.</p>
          </div>
          <div class="header-actions">
            <span class="resource-pill"><span class="resource-pill__value">${formatCredits(state.credits)}</span></span>
            <button class="button button--ghost" data-action="back"><span class="button__label">Back</span></button>
          </div>
        </header>
        <div class="upgrade-columns">
          <div class="upgrade-column">
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
          <div class="upgrade-column">
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
