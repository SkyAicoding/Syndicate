import { AudioDirector } from "./audio";
import { CampaignStore } from "./campaign";
import { USE_GENERATED_ART } from "../assets/generatedArt";
import type { MissionId, ScreenId } from "../data/types";
import { LoadoutScreen } from "../scenes/LoadoutScreen";
import { MenuScreen } from "../scenes/MenuScreen";
import type { MissionRuntime } from "./MissionRuntime";
import { MissionScreen } from "../scenes/MissionScreen";
import { ResearchScreen } from "../scenes/ResearchScreen";
import { ResultScreen } from "../scenes/ResultScreen";
import { SettingsScreen } from "../scenes/SettingsScreen";
import type { Screen } from "../scenes/Screen";
import { WorldMapScreen } from "../scenes/WorldMapScreen";

interface AppBridge {
  getScreen: () => ScreenId;
  getState: () => ReturnType<AppController["getState"]>;
  navigate: (screen: ScreenId) => void;
  startMission: (missionId?: MissionId) => Promise<void>;
  getMissionState: () => Record<string, unknown> | null;
  forceMissionEnd: (success: boolean) => void;
  selectMissionAgent: (index: number) => void;
  moveSelectedAgent: (x: number, y: number) => void;
  focusMissionCell: (x: number, y: number) => void;
  interactMissionProp: (propId: string) => void;
}

declare global {
  interface Window {
    __shardline?: AppBridge;
  }
}

export class AppController {
  private readonly root: HTMLElement;

  private readonly store = new CampaignStore();

  private readonly audio = new AudioDirector();

  private currentScreen: Screen | null = null;

  private currentScreenId: ScreenId = "menu";

  private currentSettingsReturnTo: ScreenId = "menu";

  private missionRuntime: MissionRuntime | null = null;

  private screenRoot!: HTMLDivElement;

  private toastRoot!: HTMLDivElement;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public mount(): void {
    this.root.innerHTML = `
      <div class="app-shell${USE_GENERATED_ART ? " app-shell--generated-art" : ""}">
        <div class="app-shell__backdrop"></div>
        <div class="app-shell__grid"></div>
        <div class="app-shell__screen"></div>
        <div class="app-shell__toast"></div>
      </div>
    `;

    this.screenRoot = this.root.querySelector<HTMLDivElement>(".app-shell__screen")!;
    this.toastRoot = this.root.querySelector<HTMLDivElement>(".app-shell__toast")!;

    window.__shardline = {
      getScreen: () => this.currentScreenId,
      getState: () => this.getState(),
      navigate: (screen) => this.navigate(screen),
      startMission: async (missionId) => {
        if (missionId) {
          this.store.setSelectedMission(missionId);
        }
        this.navigate("mission");
        await this.missionRuntime?.whenReady();
      },
      getMissionState: () => this.missionRuntime?.getTestState() ?? null,
      forceMissionEnd: (success) => this.missionRuntime?.forceEnd(success),
      selectMissionAgent: (index) => this.missionRuntime?.selectPlayerByIndex(index),
      moveSelectedAgent: (x, y) => this.missionRuntime?.commandMoveSelected({ x, y }),
      focusMissionCell: (x, y) => this.missionRuntime?.focusCameraOnCell({ x, y }),
      interactMissionProp: (propId) => this.missionRuntime?.interactWithProp(propId)
    };

    this.audio.applySettings(this.store.getState().settings);
    this.audio.setMusicMode("menu");

    const autoStartMission = this.getAutoStartMission();
    if (autoStartMission) {
      this.store.setSelectedMission(autoStartMission);
      this.navigate("mission");
      return;
    }

    this.navigate("menu");
  }

  public navigate(screenId: ScreenId): void {
    this.currentScreen?.destroy();
    this.currentScreen = null;
    this.currentScreenId = screenId;

    switch (screenId) {
      case "menu":
        this.audio.setMusicMode("menu");
        this.currentScreen = new MenuScreen(this);
        break;
      case "world":
        this.audio.setMusicMode("menu");
        this.currentScreen = new WorldMapScreen(this);
        break;
      case "loadout":
        this.audio.setMusicMode("menu");
        this.currentScreen = new LoadoutScreen(this);
        break;
      case "research":
        this.audio.setMusicMode("menu");
        this.currentScreen = new ResearchScreen(this);
        break;
      case "result":
        this.audio.setMusicMode("menu");
        this.currentScreen = new ResultScreen(this);
        break;
      case "settings":
        this.audio.setMusicMode("menu");
        this.currentScreen = new SettingsScreen(this, this.currentSettingsReturnTo);
        break;
      case "mission":
        this.audio.setMusicMode("mission");
        this.currentScreen = new MissionScreen(this);
        break;
    }

    this.screenRoot.innerHTML = "";
    this.currentScreen.mount(this.screenRoot);
  }

  public refresh(): void {
    this.navigate(this.currentScreenId);
  }

  public openSettings(returnTo: ScreenId): void {
    this.currentSettingsReturnTo = returnTo;
    this.navigate("settings");
  }

  public showToast(message: string): void {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    this.toastRoot.appendChild(toast);
    window.setTimeout(() => toast.classList.add("toast--visible"), 10);
    window.setTimeout(() => {
      toast.classList.remove("toast--visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

  public touchAudio(): void {
    this.audio.touch();
  }

  public getState() {
    return this.store.getState();
  }

  public getStore(): CampaignStore {
    return this.store;
  }

  public getAudio(): AudioDirector {
    return this.audio;
  }

  public setMissionRuntime(runtime: MissionRuntime | null): void {
    this.missionRuntime = runtime;
  }

  private getAutoStartMission(): MissionId | null {
    const raw = new URLSearchParams(window.location.search).get("autostartMission");
    if (raw === "m01" || raw === "m02" || raw === "m03") {
      return raw;
    }
    return null;
  }
}
