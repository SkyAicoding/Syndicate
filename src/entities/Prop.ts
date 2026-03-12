import Phaser from "phaser";
import type { GridPos } from "../core/missionTypes";
import { IsoMap } from "../systems/IsoMap";

export type PropKind =
  | "barrier"
  | "crate"
  | "barrel"
  | "terminal"
  | "door"
  | "glass"
  | "vehicle"
  | "neon"
  | "hvac"
  | "skylight"
  | "uplink"
  | "stairwell"
  | "billboard";

export interface PropConfig {
  id: string;
  kind: PropKind;
  cell: GridPos;
  blocking?: boolean;
  destructible?: boolean;
  cover?: boolean;
  objective?: boolean;
  interactive?: boolean;
  interactionId?: string;
  interactionLabel?: string;
  hp?: number;
}

const TEXTURE_BY_KIND: Record<PropKind, string> = {
  barrier: "prop-barrier",
  crate: "prop-crate",
  barrel: "prop-barrel",
  terminal: "prop-terminal",
  door: "prop-door",
  glass: "prop-glass",
  vehicle: "prop-vehicle",
  neon: "prop-neon",
  hvac: "prop-hvac",
  skylight: "prop-skylight",
  uplink: "prop-uplink",
  stairwell: "prop-stairwell",
  billboard: "prop-billboard"
};

const HEIGHT_OFFSET: Record<PropKind, number> = {
  barrier: 30,
  crate: 22,
  barrel: 18,
  terminal: 56,
  door: 70,
  glass: 70,
  vehicle: 42,
  neon: 74,
  hvac: 56,
  skylight: 28,
  uplink: 86,
  stairwell: 84,
  billboard: 116
};

export class Prop {
  public readonly id: string;

  public readonly kind: PropKind;

  public readonly cell: GridPos;

  public readonly blocking: boolean;

  public readonly cover: boolean;

  public readonly destructible: boolean;

  public readonly objective: boolean;

  public readonly interactive: boolean;

  public readonly interactionId: string | null;

  public readonly interactionLabel: string | null;

  public readonly level: number;

  public currentHealth: number;

  public readonly maxHealth: number;

  public destroyed = false;

  public opened = false;

  public interacted = false;

  public readonly image: Phaser.GameObjects.Image;

  private readonly baseY: number;

  private floorAlpha = 1;

  public constructor(scene: Phaser.Scene, map: IsoMap, config: PropConfig) {
    this.id = config.id;
    this.kind = config.kind;
    this.cell = config.cell;
    this.blocking =
      config.blocking ??
      [
        "barrier",
        "crate",
        "barrel",
        "door",
        "glass",
        "vehicle",
        "terminal",
        "hvac",
        "skylight",
        "uplink",
        "stairwell",
        "billboard"
      ].includes(config.kind);
    this.cover = config.cover ?? ["barrier", "crate", "vehicle", "terminal", "hvac", "stairwell", "billboard"].includes(config.kind);
    this.destructible = config.destructible ?? ["crate", "barrel", "glass", "skylight"].includes(config.kind);
    this.objective = config.objective ?? false;
    this.interactive = config.interactive ?? false;
    this.interactionId = config.interactionId ?? null;
    this.interactionLabel = config.interactionLabel ?? null;
    this.maxHealth =
      config.hp ??
      (config.kind === "barrel"
        ? 36
        : config.kind === "glass" || config.kind === "skylight"
          ? 18
          : config.kind === "billboard"
            ? 74
            : 52);
    this.currentHealth = this.maxHealth;
    this.level = map.getElevationAt(this.cell.x, this.cell.y);

    const world = map.gridToWorld(this.cell);
    this.image = scene.add.image(world.x, world.y + 8, TEXTURE_BY_KIND[this.kind]);
    this.image.setOrigin(0.5, 1);
    this.image.setDepth(world.y + HEIGHT_OFFSET[this.kind]);
    this.baseY = world.y + 8;
    this.refreshAppearance();
  }

  public get isBlocking(): boolean {
    if (this.destroyed) {
      return false;
    }

    if (this.kind === "door") {
      return !this.opened;
    }

    return this.blocking;
  }

  public canInteract(): boolean {
    return this.interactive && !this.interacted && !this.destroyed;
  }

  public takeDamage(amount: number): boolean {
    if (this.destroyed || !this.destructible) {
      return false;
    }

    this.currentHealth -= amount;
    this.image.setTintFill(0xffffff);
    this.image.scene.time.delayedCall(70, () => this.image.clearTint());

    if (this.currentHealth <= 0) {
      this.destroyed = true;
      this.image.setTint(0x808080);
      this.refreshAppearance();
      return true;
    }

    return false;
  }

  public setOpened(value: boolean): void {
    this.opened = value;
    this.image.setY(this.baseY + (value ? -8 : 0));
    this.refreshAppearance();
  }

  public markInteracted(): void {
    if (!this.interactive) {
      return;
    }

    this.interacted = true;
    this.refreshAppearance();
  }

  public setFloorVisibility(focusFloor: number): void {
    const delta = this.level - focusFloor;
    if (delta > 0) {
      this.floorAlpha = this.kind === "billboard" ? 0.2 : 0.16;
    } else if (delta < 0) {
      this.floorAlpha = this.kind === "billboard" ? 0.55 : 0.62;
    } else {
      this.floorAlpha = 1;
    }

    this.refreshAppearance();
  }

  private refreshAppearance(): void {
    let alpha = this.floorAlpha;
    if (this.destroyed) {
      alpha *= this.kind === "glass" || this.kind === "skylight" ? 0.15 : 0.25;
    } else if (this.kind === "door" && this.opened) {
      alpha *= 0.45;
    } else if (this.interacted) {
      alpha *= 0.48;
    }

    this.image.setAlpha(alpha);
    if (this.interacted) {
      this.image.setTint(0x6ccad4);
    } else {
      this.image.clearTint();
    }
  }
}
