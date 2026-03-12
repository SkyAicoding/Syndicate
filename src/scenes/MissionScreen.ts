import type { AppController } from "../core/App";
import type { MissionSnapshot } from "../core/missionTypes";
import { MissionRuntime } from "../core/MissionRuntime";
import { MISSIONS } from "../data/missions";
import type { Screen } from "./Screen";

export class MissionScreen implements Screen {
  public readonly id = "mission";

  private readonly app: AppController;

  private container: HTMLElement | null = null;

  private runtime: MissionRuntime | null = null;

  private snapshot: MissionSnapshot | null = null;

  private viewportEl!: HTMLDivElement;

  private objectiveEl!: HTMLParagraphElement;

  private phaseEl!: HTMLSpanElement;

  private alertEl!: HTMLSpanElement;

  private floorEl!: HTMLSpanElement;

  private statusEl!: HTMLParagraphElement;

  private squadEl!: HTMLDivElement;

  private selectedEl!: HTMLDivElement;

  private eventsEl!: HTMLDivElement;

  private debugEl!: HTMLPreElement;

  private minimapEl!: HTMLCanvasElement;

  public constructor(app: AppController) {
    this.app = app;
  }

  public mount(container: HTMLElement): void {
    const state = this.app.getState();
    const missionId = state.selectedMissionId ?? state.availableMissions[0];
    const mission = MISSIONS[missionId];
    this.container = container;

    container.innerHTML = `
      <section class="screen screen--mission" data-testid="mission-screen">
        <div class="mission-layout">
          <aside class="mission-sidebar">
            <div class="mission-panel">
              <p class="eyebrow">Active operation</p>
              <h1>${mission.name}</h1>
              <p class="mission-copy">${mission.briefing}</p>
              <p class="mission-objective" data-slot="objective"></p>
              <div class="mission-status-strip">
                <span class="mission-pill" data-slot="phase"></span>
                <span class="mission-pill" data-slot="floor"></span>
                <span class="mission-pill mission-pill--alert" data-slot="alert"></span>
              </div>
              <p class="mission-status" data-slot="status"></p>
              <div class="mission-controls">
                <button class="button button--primary" data-action="regroup">Regroup</button>
                <button class="button" data-action="hold">Hold Position</button>
                <button class="button" data-action="focus">Center Squad</button>
                <button class="button button--ghost" data-action="debug">Toggle Debug</button>
                <button class="button" data-action="restart">Restart Mission</button>
                <button class="button button--ghost" data-action="abort">Abort to Map</button>
              </div>
            </div>
            <div class="mission-panel">
              <p class="eyebrow">Situation feed</p>
              <div class="mission-feed" data-slot="events"></div>
              <p class="eyebrow">Controls</p>
              <p class="mission-copy">
                Left click or drag to select. Right click to move or attack. WASD / arrows pan. Mouse wheel zooms.
                Keys: 1-4 select agent, G regroup, H hold, Q ability, Space center, F1 debug.
              </p>
              <canvas width="200" height="200" class="mission-minimap" data-slot="minimap"></canvas>
            </div>
          </aside>
          <div class="mission-stage">
            <div class="mission-viewport" data-testid="mission-viewport"></div>
          </div>
          <aside class="mission-sidebar">
            <div class="mission-panel">
              <p class="eyebrow">Selected units</p>
              <div class="mission-card-list" data-slot="selected"></div>
            </div>
            <div class="mission-panel">
              <p class="eyebrow">Squad telemetry</p>
              <div class="mission-card-list" data-slot="squad"></div>
            </div>
            <div class="mission-panel">
              <p class="eyebrow">Debug</p>
              <pre class="mission-debug" data-slot="debug"></pre>
            </div>
          </aside>
        </div>
      </section>
    `;

    this.viewportEl = container.querySelector<HTMLDivElement>("[data-testid='mission-viewport']")!;
    this.objectiveEl = container.querySelector<HTMLParagraphElement>("[data-slot='objective']")!;
    this.phaseEl = container.querySelector<HTMLSpanElement>("[data-slot='phase']")!;
    this.floorEl = container.querySelector<HTMLSpanElement>("[data-slot='floor']")!;
    this.alertEl = container.querySelector<HTMLSpanElement>("[data-slot='alert']")!;
    this.statusEl = container.querySelector<HTMLParagraphElement>("[data-slot='status']")!;
    this.squadEl = container.querySelector<HTMLDivElement>("[data-slot='squad']")!;
    this.selectedEl = container.querySelector<HTMLDivElement>("[data-slot='selected']")!;
    this.eventsEl = container.querySelector<HTMLDivElement>("[data-slot='events']")!;
    this.debugEl = container.querySelector<HTMLPreElement>("[data-slot='debug']")!;
    this.minimapEl = container.querySelector<HTMLCanvasElement>("[data-slot='minimap']")!;

    container
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => button.addEventListener("click", this.handleAction));

    this.app.touchAudio();
    this.app.getAudio().setMusicMode("mission");

    this.runtime = new MissionRuntime(this.viewportEl, {
      missionId,
      campaign: structuredClone(state),
      audio: this.app.getAudio(),
      callbacks: {
        onSnapshot: (snapshot) => this.renderSnapshot(snapshot),
        onToast: (message) => this.app.showToast(message),
        onMissionEnd: (result) => {
          this.app.getStore().applyMissionResult(result);
          this.app.navigate("result");
        }
      }
    });

    this.app.setMissionRuntime(this.runtime);
  }

  public destroy(): void {
    if (!this.container) {
      return;
    }

    this.container
      .querySelectorAll<HTMLButtonElement>("[data-action], [data-command]")
      .forEach((button) => button.removeEventListener("click", this.handleAction));
    this.runtime?.destroy();
    this.runtime = null;
    this.app.setMissionRuntime(null);
    this.container = null;
  }

  private renderSnapshot(snapshot: MissionSnapshot): void {
    this.snapshot = snapshot;
    this.objectiveEl.textContent = snapshot.objectiveText;
    this.phaseEl.textContent = snapshot.phaseLabel;
    this.floorEl.textContent = `Deck ${snapshot.focusFloor + 1}`;
    this.alertEl.textContent = `${snapshot.alertLevel} alert`;
    this.alertEl.dataset.alert = snapshot.alertLevel;
    this.minimapEl.dataset.alert = snapshot.alertLevel;
    this.statusEl.textContent = `${snapshot.statusText} // ${snapshot.timerSeconds}s // ${snapshot.fps} FPS`;

    this.selectedEl.innerHTML = snapshot.selectedUnits.length
      ? snapshot.selectedUnits
          .map(
            (unit) => `
              <article class="tactical-card tactical-card--selected-panel">
                <div class="tactical-card__head">
                  <strong>${unit.label}</strong>
                  <span>${Math.round(unit.currentHealth)}/${unit.maxHealth} HP</span>
                </div>
                <div class="tactical-card__chips">${this.renderUnitChips(unit)}</div>
                <span>${unit.weaponId ?? "unarmed"} // ${unit.pressure} pressure</span>
                <div class="tactical-card__actions">
                  ${
                    unit.abilityId
                      ? `<button class="button" data-command="ability:${unit.id}" ${unit.abilityReady ? "" : "disabled"}>${unit.abilityReady ? unit.abilityId : `${unit.abilityId} ${unit.abilityRemainingSeconds}s`}</button>`
                      : ""
                  }
                  <button class="button" data-command="medkit:${unit.id}" ${unit.medkits ? "" : "disabled"}>Medkit</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<p class="muted">Select an agent or drag a box across the squad.</p>`;

    this.squadEl.innerHTML = snapshot.squad
      .map((unit, index) => {
        const manualIndex = snapshot.squad
          .filter((candidate) => candidate.controlMode !== "assist")
          .findIndex((candidate) => candidate.id === unit.id);
        const command =
          unit.controlMode === "assist" || manualIndex < 0
            ? ""
            : `data-command="select:${manualIndex}"`;

        return `
          <button class="tactical-card tactical-card--button ${unit.selected ? "is-selected" : ""}" ${command} ${unit.controlMode === "assist" ? "disabled" : ""}>
            <div class="tactical-card__head">
              <strong>${unit.label}</strong>
              <span>${Math.round(unit.currentHealth)}/${unit.maxHealth} HP</span>
            </div>
            <div class="tactical-card__chips">${this.renderUnitChips(unit)}</div>
            <span>${unit.weaponId ?? "unarmed"} // ${unit.pressure} pressure</span>
          </button>
        `;
      })
      .join("");

    this.eventsEl.innerHTML = snapshot.events
      .map(
        (event) => `
          <div class="event-row event-row--${event.tone}">
            <span>${event.text}</span>
          </div>
        `
      )
      .join("");

    this.debugEl.textContent = snapshot.debugVisible
      ? JSON.stringify(
          {
            state: snapshot.missionState,
            phase: snapshot.phaseLabel,
            alert: snapshot.alertLevel,
            floor: snapshot.focusFloor,
            selected: snapshot.selectedIds,
            timer: snapshot.timerSeconds,
            events: snapshot.events.slice(0, 3).map((event) => event.text)
          },
          null,
          2
        )
      : "Debug overlay disabled.";

    this.container
      ?.querySelectorAll<HTMLButtonElement>("[data-command]")
      .forEach((button) => {
        button.removeEventListener("click", this.handleAction);
        button.addEventListener("click", this.handleAction);
      });

    this.renderMinimap(snapshot);
  }

  private renderMinimap(snapshot: MissionSnapshot): void {
    const ctx = this.minimapEl.getContext("2d");
    if (!ctx) {
      return;
    }

    const { width, height, maxFloor, players, enemies, civilians, objectives } = snapshot.minimap;
    ctx.clearRect(0, 0, this.minimapEl.width, this.minimapEl.height);
    ctx.fillStyle = "#071118";
    ctx.fillRect(0, 0, this.minimapEl.width, this.minimapEl.height);
    ctx.strokeStyle = "rgba(103, 202, 255, 0.25)";
    ctx.strokeRect(8, 8, this.minimapEl.width - 16, this.minimapEl.height - 16);

    const drawPoint = (
      cell: { x: number; y: number; level: number },
      color: string,
      size = 4
    ) => {
      const x = 12 + (cell.x / Math.max(1, width - 1)) * (this.minimapEl.width - 24);
      const y = 28 + (cell.y / Math.max(1, height - 1)) * (this.minimapEl.height - 40);
      const alpha =
        cell.level === snapshot.focusFloor
          ? 1
          : cell.level > snapshot.focusFloor
            ? 0.28
            : 0.48;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
    };

    const floorChipWidth = 24;
    const floorChipGap = 6;
    for (let floor = 0; floor <= maxFloor; floor += 1) {
      const chipX = 12 + floor * (floorChipWidth + floorChipGap);
      const chipY = 12;
      ctx.fillStyle =
        floor === snapshot.focusFloor ? "rgba(85, 220, 255, 0.28)" : "rgba(255,255,255,0.08)";
      ctx.strokeStyle =
        floor === snapshot.focusFloor ? "rgba(133, 241, 255, 0.62)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, floorChipWidth, 12, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = floor === snapshot.focusFloor ? "#bff8ff" : "rgba(223,236,244,0.7)";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`D${floor + 1}`, chipX + floorChipWidth / 2, chipY + 6.5);
    }

    objectives.forEach((cell) => drawPoint(cell, "#78efff", 5));
    civilians.forEach((cell) => drawPoint(cell, "#9fb3c5", 3));
    enemies.forEach((cell) => drawPoint(cell, "#ff7d7d", 4));
    players.forEach((cell) => drawPoint(cell, "#8affbd", 5));
    snapshot.squad
      .filter((unit) => unit.selected)
      .forEach((unit) => {
        drawPoint({ ...unit.cell, level: unit.level }, "#43d7ff", 8);
        drawPoint({ ...unit.cell, level: unit.level }, "#8affbd", 4);
      });
  }

  private renderUnitChips(unit: MissionSnapshot["squad"][number]): string {
    const chips = [
      `<span class="status-chip status-chip--${unit.brainState}">${unit.brainState}</span>`
    ];

    if (unit.selected) {
      chips.push('<span class="status-chip status-chip--selected">selected</span>');
    }
    if (unit.controlMode) {
      chips.push(
        `<span class="status-chip">${unit.controlMode === "assist" ? "assist ai" : "direct"}</span>`
      );
    }
    if (unit.aggro) {
      chips.push('<span class="status-chip status-chip--aggro">engaged</span>');
    }
    if (unit.holdPosition) {
      chips.push('<span class="status-chip status-chip--hold">hold</span>');
    }
    if (unit.medkits) {
      chips.push(`<span class="status-chip">med ${unit.medkits}</span>`);
    }

    return chips.join("");
  }

  private handleAction = (event: Event): void => {
    const action =
      (event.currentTarget as HTMLButtonElement).dataset.action ??
      (event.currentTarget as HTMLButtonElement).dataset.command;

    if (!action || !this.runtime) {
      return;
    }

    this.app.touchAudio();

    if (action === "regroup") {
      this.runtime.regroupSelected();
      this.app.getAudio().playUi(true);
      return;
    }

    if (action === "hold") {
      this.runtime.toggleHoldSelected();
      this.app.getAudio().playUi(true);
      return;
    }

    if (action === "focus") {
      this.runtime.focusOnSquad();
      this.app.getAudio().playUi(true);
      return;
    }

    if (action === "debug") {
      const nextValue = !this.app.getState().settings.showDebug;
      this.app.getStore().updateSettings({ showDebug: nextValue });
      this.runtime.setDebugVisible(nextValue);
      this.app.getAudio().playUi();
      return;
    }

    if (action === "restart") {
      this.app.getAudio().playUi(true);
      this.app.navigate("mission");
      return;
    }

    if (action === "abort") {
      this.app.getAudio().playUi();
      this.app.showToast("Operation aborted.");
      this.app.navigate("world");
      return;
    }

    const [command, value] = action.split(":");
    if (command === "ability") {
      this.runtime.useAbility(value);
      return;
    }

    if (command === "medkit") {
      this.runtime.useMedkit(value);
      return;
    }

    if (command === "select") {
      this.runtime.selectPlayerByIndex(Number(value));
    }
  };
}
