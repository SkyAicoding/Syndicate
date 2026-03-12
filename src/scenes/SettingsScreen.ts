import type { ScreenId } from "../data/types";
import type { AppController } from "../core/App";
import type { Screen } from "./Screen";

export class SettingsScreen implements Screen {
  public readonly id = "settings";

  private readonly app: AppController;

  private readonly returnTo: ScreenId;

  private container: HTMLElement | null = null;

  public constructor(app: AppController, returnTo: ScreenId) {
    this.app = app;
    this.returnTo = returnTo;
  }

  public mount(container: HTMLElement): void {
    const settings = this.app.getState().settings;
    this.container = container;

    container.innerHTML = `
      <section class="screen screen--settings">
        <header class="screen-header">
          <div>
            <p class="eyebrow">System settings</p>
            <h1>Runtime controls</h1>
          </div>
          <button class="button button--ghost" data-action="back">Back</button>
        </header>
        <div class="settings-grid">
          <label class="setting-row">
            <span>Master Volume</span>
            <input type="range" min="0" max="1" step="0.05" value="${settings.masterVolume}" data-setting="masterVolume" />
          </label>
          <label class="setting-row">
            <span>Music Volume</span>
            <input type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}" data-setting="musicVolume" />
          </label>
          <label class="setting-row">
            <span>SFX Volume</span>
            <input type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}" data-setting="sfxVolume" />
          </label>
          <label class="toggle-row">
            <span>Edge Scroll</span>
            <input type="checkbox" ${settings.edgeScroll ? "checked" : ""} data-setting="edgeScroll" />
          </label>
          <label class="toggle-row">
            <span>High FX</span>
            <input type="checkbox" ${settings.highFx ? "checked" : ""} data-setting="highFx" />
          </label>
          <label class="toggle-row">
            <span>Screen Shake</span>
            <input type="checkbox" ${settings.screenShake ? "checked" : ""} data-setting="screenShake" />
          </label>
          <label class="toggle-row">
            <span>Debug Overlay</span>
            <input type="checkbox" ${settings.showDebug ? "checked" : ""} data-setting="showDebug" />
          </label>
        </div>
      </section>
    `;

    container
      .querySelectorAll<HTMLInputElement>("[data-setting]")
      .forEach((input) => input.addEventListener("change", this.handleChange));
    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleBack));
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLInputElement>("[data-setting]")
      .forEach((input) => input.removeEventListener("change", this.handleChange));
    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.removeEventListener("click", this.handleBack));
    this.container = null;
  }

  private handleChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const setting = input.dataset.setting;

    if (!setting) {
      return;
    }

    const value =
      input.type === "checkbox" ? input.checked : Number(input.value);

    this.app.touchAudio();
    this.app.getStore().updateSettings({ [setting]: value } as never);
    this.app.getAudio().applySettings(this.app.getState().settings);
    this.app.getAudio().playUi();
  };

  private handleBack = (): void => {
    this.app.touchAudio();
    this.app.getAudio().playUi(true);
    this.app.navigate(this.returnTo);
  };
}
