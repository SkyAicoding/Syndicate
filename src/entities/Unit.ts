import Phaser from "phaser";
import type { GridPos, HudUnitSnapshot } from "../core/missionTypes";
import type { AbilityId, AgentControlMode, AgentRoleId, WeaponId } from "../data/types";
import { WEAPONS } from "../data/weapons";
import { IsoMap } from "../systems/IsoMap";
import type { Prop } from "./Prop";

export type UnitSide = "player" | "enemy" | "civilian" | "vip";
export type UnitRole = AgentRoleId | "enemy" | "civilian" | "vip";
export type UnitMind = "idle" | "moving" | "combat" | "panic" | "escort";
export type UnitAttackTarget = Unit | Prop | null;

export interface UnitConfig {
  id: string;
  label: string;
  side: UnitSide;
  role: UnitRole;
  weaponId: WeaponId | null;
  controlMode?: AgentControlMode;
  abilityId?: AbilityId;
  cell: GridPos;
  maxHealth: number;
  armor: number;
  accuracy: number;
  moveSpeed: number;
  vision: number;
  textureKey: string;
  medkits?: number;
  patrol?: GridPos[];
  objectiveTarget?: boolean;
  rangeBonus?: number;
  pressureGainMultiplier?: number;
  accuracyPressureResistance?: number;
  fireRateMultiplier?: number;
  medkitPowerBonus?: number;
  abilityCooldownMultiplier?: number;
}

export class Unit {
  public readonly id: string;

  public readonly label: string;

  public readonly side: UnitSide;

  public readonly role: UnitRole;

  public readonly weaponId: WeaponId | null;

  public readonly controlMode: AgentControlMode;

  public readonly abilityId?: AbilityId;

  public readonly patrol: GridPos[];

  public readonly objectiveTarget: boolean;

  public readonly root: Phaser.GameObjects.Container;

  private readonly body: Phaser.GameObjects.Image;

  private readonly selectionRing: Phaser.GameObjects.Image;

  private readonly healthFill: Phaser.GameObjects.Rectangle;

  private readonly pressureFill: Phaser.GameObjects.Rectangle;

  private readonly alertPip: Phaser.GameObjects.Arc;

  public currentHealth: number;

  public readonly maxHealth: number;

  public armor: number;

  public baseAccuracy: number;

  public readonly baseMoveSpeed: number;

  public readonly vision: number;

  public readonly rangeBonus: number;

  public readonly pressureGainMultiplier: number;

  public readonly accuracyPressureResistance: number;

  public readonly fireRateMultiplier: number;

  public readonly medkitPowerBonus: number;

  public readonly abilityCooldownMultiplier: number;

  public pressure = 0;

  public selected = false;

  public holdPosition = false;

  public alive = true;

  public medkits: number;

  public abilityCooldown = 0;

  public abilityActiveUntil = 0;

  public shotCooldown = 0;

  public brainState: UnitMind = "idle";

  public currentCell: GridPos;

  public currentTarget: UnitAttackTarget = null;

  public manualAttackOrder = false;

  public movePath: GridPos[] = [];

  public lastKnownEnemyCell: GridPos | null = null;

  public patrolIndex = 0;

  public aggro = false;

  public escortTargetId: string | null = null;

  private worldPosition: Phaser.Math.Vector2;

  private currentLevel: number;

  public constructor(scene: Phaser.Scene, map: IsoMap, config: UnitConfig) {
    this.id = config.id;
    this.label = config.label;
    this.side = config.side;
    this.role = config.role;
    this.weaponId = config.weaponId;
    this.controlMode = config.controlMode ?? "manual";
    this.abilityId = config.abilityId;
    this.currentCell = { ...config.cell };
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.maxHealth;
    this.armor = config.armor;
    this.baseAccuracy = config.accuracy;
    this.baseMoveSpeed = config.moveSpeed;
    this.vision = config.vision;
    this.medkits = config.medkits ?? 1;
    this.patrol = config.patrol ?? [];
    this.objectiveTarget = config.objectiveTarget ?? false;
    this.rangeBonus = config.rangeBonus ?? 0;
    this.pressureGainMultiplier = config.pressureGainMultiplier ?? 1;
    this.accuracyPressureResistance = config.accuracyPressureResistance ?? 1;
    this.fireRateMultiplier = config.fireRateMultiplier ?? 1;
    this.medkitPowerBonus = config.medkitPowerBonus ?? 0;
    this.abilityCooldownMultiplier = config.abilityCooldownMultiplier ?? 1;
    this.worldPosition = map.gridToWorld(this.currentCell);
    this.currentLevel = map.getElevationAt(this.currentCell.x, this.currentCell.y);

    this.selectionRing = scene.add.image(0, 4, this.side === "enemy" ? "selection-ring-enemy" : "selection-ring");
    this.selectionRing.setVisible(false);
    this.body = scene.add.image(0, 0, config.textureKey);
    this.body.setOrigin(0.5, 1);
    const healthBg = scene.add.rectangle(0, -84, 44, 5, 0x000000, 0.48);
    this.healthFill = scene.add.rectangle(-21, -84, 44, 5, 0x76ffc3, 1);
    this.healthFill.setOrigin(0, 0.5);
    this.pressureFill = scene.add.rectangle(-21, -76, 44, 4, 0xff8e66, 1);
    this.pressureFill.setOrigin(0, 0.5);
    this.alertPip = scene.add.circle(0, -96, 4, 0xff7d7d, 1);
    this.alertPip.setVisible(false);

    this.root = scene.add.container(this.worldPosition.x, this.worldPosition.y, [
      this.selectionRing,
      this.body,
      healthBg,
      this.healthFill,
      this.pressureFill,
      this.alertPip
    ]);
    this.root.setDepth(this.worldPosition.y);
    this.root.setSize(72, 112);
  }

  public update(deltaSeconds: number, map: IsoMap, time: number): void {
    if (this.alive) {
      this.pressure = Math.max(0, this.pressure - deltaSeconds * 9);
      this.abilityCooldown = Math.max(0, this.abilityCooldown - deltaSeconds);
      this.shotCooldown = Math.max(0, this.shotCooldown - deltaSeconds);
      this.updateMovement(deltaSeconds, map);
    }

    const displayState = this.escortTargetId ? "escort" : this.brainState;
    const alertColor =
      displayState === "escort"
        ? 0x7fffd1
        : displayState === "panic"
          ? 0xffc46b
          : 0xff7d7d;

    this.alertPip.setVisible((this.aggro || displayState === "panic" || displayState === "escort") && this.alive);
    this.alertPip.setFillStyle(alertColor, 1);
    this.selectionRing.setVisible(this.selected && this.alive);
    this.selectionRing.setAlpha(this.selected ? 0.95 : 0);
    this.selectionRing.setScale(this.selected ? 0.96 + Math.sin(time / 120) * 0.05 : 1);
    this.root.setDepth(this.worldPosition.y + 8);

    const healthRatio = Phaser.Math.Clamp(this.currentHealth / this.maxHealth, 0, 1);
    const pressureRatio = Phaser.Math.Clamp(this.pressure / 100, 0, 1);
    this.healthFill.width = 44 * healthRatio;
    this.pressureFill.width = 44 * pressureRatio;
    this.root.alpha = this.alive ? 1 : 0.32;

    if (this.abilityActiveUntil > time) {
      this.body.setTint(0xbff8ff);
    } else {
      this.body.clearTint();
    }
  }

  public setSelected(value: boolean): void {
    this.selected = value;
  }

  public setAggro(value: boolean): void {
    this.aggro = value;
  }

  public setPath(path: GridPos[]): void {
    this.movePath = [...path];
    this.brainState = this.escortTargetId ? "escort" : path.length ? "moving" : "idle";
  }

  public clearPath(): void {
    this.movePath = [];
    this.brainState = this.escortTargetId ? "escort" : "idle";
  }

  public setTarget(target: UnitAttackTarget, manual = false): void {
    this.currentTarget = target;
    this.manualAttackOrder = manual;
    if (target) {
      this.brainState = "combat";
    }
  }

  public clearTarget(): void {
    this.currentTarget = null;
    this.manualAttackOrder = false;
    if (!this.movePath.length) {
      this.brainState = "idle";
    }
  }

  public getCellDistanceTo(cell: GridPos): number {
    return Phaser.Math.Distance.Between(this.currentCell.x, this.currentCell.y, cell.x, cell.y);
  }

  public getActiveWeapon() {
    return this.weaponId ? WEAPONS[this.weaponId] : null;
  }

  public getMoveSpeed(): number {
    let value = this.baseMoveSpeed * (1 - Math.min(this.pressure, 90) / 260);
    if (this.abilityId === "ghost" && this.abilityActiveUntil > this.root.scene.time.now) {
      value += 68;
    }
    if (this.abilityId === "bulwark" && this.abilityActiveUntil > this.root.scene.time.now) {
      value += 26;
    }
    return value;
  }

  public getAccuracy(): number {
    let value = this.baseAccuracy;
    if (this.abilityId === "focus" && this.abilityActiveUntil > this.root.scene.time.now) {
      value += 0.16;
    }
    value -= (this.pressure / 180) * this.accuracyPressureResistance;
    return Phaser.Math.Clamp(value, 0.2, 0.97);
  }

  public getRangeBonus(): number {
    let value = this.rangeBonus;
    if (this.abilityId === "focus" && this.abilityActiveUntil > this.root.scene.time.now) {
      value += 0.6;
    }
    return value;
  }

  public isAbilityActive(time: number): boolean {
    return this.abilityActiveUntil > time;
  }

  public applyPressure(amount: number): void {
    this.pressure = Phaser.Math.Clamp(
      this.pressure + amount * this.pressureGainMultiplier,
      0,
      100
    );
  }

  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.pressure = Math.max(0, this.pressure - 24);
  }

  public takeDamage(amount: number): void {
    const shielded =
      this.abilityId === "bulwark" && this.abilityActiveUntil > this.root.scene.time.now
        ? 0.55
        : 1;
    const damage = Math.max(1, amount - this.armor) * shielded;
    this.currentHealth -= damage;
    this.aggro = true;
    this.body.setTintFill(0xffffff);
    this.root.scene.time.delayedCall(70, () => this.body.clearTint());
    this.applyPressure(18);

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.alive = false;
      this.clearPath();
      this.clearTarget();
      this.root.setScale(0.98, 0.82);
      this.body.setTint(0x7c8893);
    }
  }

  public useMedkit(target: Unit): boolean {
    if (!this.alive || this.medkits <= 0 || !target.alive) {
      return false;
    }

    this.medkits -= 1;
    target.heal((this.role === "support" ? 34 : 24) + this.medkitPowerBonus);
    return true;
  }

  public useAbility(time: number, nearbyAllies: Unit[]): boolean {
    if (!this.alive || !this.abilityId || this.abilityCooldown > 0) {
      return false;
    }

    switch (this.abilityId) {
      case "focus":
        this.abilityCooldown = 18 * this.abilityCooldownMultiplier;
        this.abilityActiveUntil = time + 6_000;
        return true;
      case "bulwark":
        this.abilityCooldown = 22 * this.abilityCooldownMultiplier;
        this.abilityActiveUntil = time + 5_000;
        this.pressure = Math.max(0, this.pressure - 30);
        return true;
      case "ghost":
        this.abilityCooldown = 18 * this.abilityCooldownMultiplier;
        this.abilityActiveUntil = time + 5_500;
        return true;
      case "nanowave":
        this.abilityCooldown = 24 * this.abilityCooldownMultiplier;
        nearbyAllies
          .filter((ally) => ally.alive && this.getCellDistanceTo(ally.currentCell) <= 2.2)
          .forEach((ally) => ally.heal(18 + this.medkitPowerBonus * 0.5));
        this.heal(18 + this.medkitPowerBonus * 0.5);
        return true;
    }
  }

  public autoOpenDoors(props: Prop[]): void {
    props.forEach((prop) => {
      if (prop.kind !== "door" || prop.destroyed) {
        return;
      }

      const distance = this.getCellDistanceTo(prop.cell);
      prop.setOpened(distance <= 1.2);
    });
  }

  public getHudSnapshot(): HudUnitSnapshot {
    const abilityRemainingSeconds =
      this.abilityCooldown > 0 ? Number(this.abilityCooldown.toFixed(1)) : 0;

    return {
      id: this.id,
      label: this.label,
      role: this.role,
      controlMode: this.controlMode,
      level: this.currentLevel,
      weaponId: this.weaponId,
      currentHealth: Math.round(this.currentHealth),
      maxHealth: this.maxHealth,
      pressure: Math.round(this.pressure),
      selected: this.selected,
      abilityId: this.abilityId,
      abilityReady: this.abilityCooldown <= 0,
      abilityRemainingSeconds,
      holdPosition: this.holdPosition,
      medkits: this.medkits,
      brainState: this.escortTargetId ? "escort" : this.brainState,
      aggro: this.aggro,
      cell: { ...this.currentCell }
    };
  }

  public getWorldPosition(): Phaser.Math.Vector2 {
    return this.worldPosition.clone();
  }

  private updateMovement(deltaSeconds: number, map: IsoMap): void {
    if (!this.movePath.length) {
      return;
    }

    const nextCell = this.movePath[0];
    const target = map.gridToWorld(nextCell);
    const speed = this.getMoveSpeed();
    const distance = Phaser.Math.Distance.Between(this.worldPosition.x, this.worldPosition.y, target.x, target.y);

    if (distance <= speed * deltaSeconds) {
      this.worldPosition.copy(target);
      this.currentCell = { ...nextCell };
      this.currentLevel = map.getElevationAt(nextCell.x, nextCell.y);
      this.movePath.shift();
      if (!this.movePath.length && this.brainState === "moving") {
        this.brainState = "idle";
      }
    } else {
      const angle = Phaser.Math.Angle.Between(this.worldPosition.x, this.worldPosition.y, target.x, target.y);
      this.worldPosition.x += Math.cos(angle) * speed * deltaSeconds;
      this.worldPosition.y += Math.sin(angle) * speed * deltaSeconds;
    }

    this.root.setPosition(this.worldPosition.x, this.worldPosition.y);
  }
}
