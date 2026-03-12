import Phaser from "phaser";
import type { MissionSceneConfig } from "../scenes/MissionScene";
import { MissionScene } from "../scenes/MissionScene";

export class MissionRuntime {
  private readonly host: HTMLElement;

  private readonly scene: MissionScene;

  private readonly game: Phaser.Game;

  private readonly readyPromise: Promise<void>;

  private resolveReady!: () => void;

  private isReady = false;

  public constructor(host: HTMLElement, config: MissionSceneConfig) {
    this.host = host;
    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });

    this.scene = new MissionScene({
      ...config,
      onReady: (scene) => {
        config.onReady?.(scene);
        this.isReady = true;
        this.resolveReady();
      }
    });

    const width = Math.max(960, Math.floor(host.clientWidth || 1280));
    const height = Math.max(540, Math.floor(host.clientHeight || 720));

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width,
      height,
      backgroundColor: "#071219",
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width,
        height
      },
      scene: [this.scene]
    });

    window.addEventListener("resize", this.handleResize);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.handleResize);
    this.game.destroy(true);
  }

  public regroupSelected(): void {
    this.scene.regroupSelected();
  }

  public toggleHoldSelected(): void {
    this.scene.toggleHoldSelected();
  }

  public useAbility(unitId?: string): boolean {
    return this.scene.useAbility(unitId);
  }

  public useMedkit(unitId?: string): boolean {
    return this.scene.useMedkit(unitId);
  }

  public focusOnSquad(): void {
    this.scene.focusOnSquad();
  }

  public setDebugVisible(value: boolean): void {
    this.scene.setDebugVisible(value);
  }

  public forceEnd(success: boolean): void {
    this.scene.forceEnd(success);
  }

  public selectPlayerByIndex(index: number): void {
    this.scene.selectPlayerByIndex(index);
  }

  public getMissionScene(): MissionScene {
    return this.scene;
  }

  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public commandMoveSelected(cell: { x: number; y: number }): void {
    this.scene.commandMoveSelected(cell);
  }

  public getTestState(): Record<string, unknown> {
    return this.isReady ? this.scene.getTestState() : {};
  }

  private handleResize = (): void => {
    const width = Math.max(960, Math.floor(this.host.clientWidth || 1280));
    const height = Math.max(540, Math.floor(this.host.clientHeight || 720));
    this.game.scale.resize(width, height);
  };
}
