import Phaser from "phaser";
import type { GridPos } from "../core/missionTypes";
import type { AudioDirector } from "../core/audio";
import type { WeaponDefinition } from "../data/types";
import { WEAPONS } from "../data/weapons";
import { IsoMap } from "./IsoMap";
import { Prop } from "../entities/Prop";
import { Unit } from "../entities/Unit";
import { Pathfinding } from "./Pathfinding";

interface CombatCallbacks {
  onNoise: (cell: GridPos) => void;
  onUnitDown: (unit: Unit) => void;
  onPropDestroyed: (prop: Prop) => void;
}

export class CombatSystem {
  private readonly scene: Phaser.Scene;

  private readonly map: IsoMap;

  private readonly audio: AudioDirector;

  private readonly callbacks: CombatCallbacks;

  private readonly breachDamageBonus: number;

  private readonly screenShakeEnabled: boolean;

  public constructor(
    scene: Phaser.Scene,
    map: IsoMap,
    audio: AudioDirector,
    callbacks: CombatCallbacks,
    breachDamageBonus = 1,
    screenShakeEnabled = true
  ) {
    this.scene = scene;
    this.map = map;
    this.audio = audio;
    this.callbacks = callbacks;
    this.breachDamageBonus = breachDamageBonus;
    this.screenShakeEnabled = screenShakeEnabled;
  }

  public update(units: Unit[], props: Prop[], time: number): void {
    const coverCells = props.filter((prop) => prop.cover && !prop.destroyed).map((prop) => prop.cell);

    units.forEach((unit) => {
      if (!unit.alive || !unit.weaponId) {
        return;
      }

      const weapon = WEAPONS[unit.weaponId];
      const hostileUnits = units.filter(
        (candidate) =>
          candidate.alive &&
          (unit.side === "player"
            ? candidate.side === "enemy"
            : candidate.side === "player" ||
              (candidate.side === "vip" && (unit.aggro || candidate.escortTargetId !== null)))
      );

      if (unit.currentTarget instanceof Unit && !unit.currentTarget.alive) {
        unit.clearTarget();
      }

      if (unit.currentTarget instanceof Prop && unit.currentTarget.destroyed) {
        unit.clearTarget();
      }

      if (!unit.currentTarget) {
        const canAutoAcquire =
          unit.side !== "player" || unit.selected || unit.aggro;
        const autoTarget = hostileUnits
          .filter(
            (candidate) =>
              unit.getCellDistanceTo(candidate.currentCell) <=
                weapon.range + unit.getRangeBonus() + 0.2 &&
              this.canSee(unit.currentCell, candidate.currentCell, props)
          )
          .sort(
            (a, b) =>
              unit.getCellDistanceTo(a.currentCell) - unit.getCellDistanceTo(b.currentCell)
          )[0];

        if (
          canAutoAcquire &&
          autoTarget &&
          (!unit.movePath.length || unit.side === "enemy")
        ) {
          unit.setTarget(autoTarget, false);
        }
      }

      const target = unit.currentTarget;
      if (!target) {
        return;
      }

      const targetCell =
        target instanceof Unit ? target.currentCell : target.cell;
      const distance = unit.getCellDistanceTo(targetCell);

      if (!this.canSee(unit.currentCell, targetCell, props)) {
        if (unit.side === "player" && unit.movePath.length) {
          return;
        }
        unit.clearTarget();
        return;
      }

      if (distance > weapon.range + unit.getRangeBonus() + 0.5) {
        return;
      }

      if (unit.shotCooldown > 0) {
        return;
      }

      if (!unit.hasAmmoForAttack()) {
        return;
      }

      const movementPenalty = unit.movePath.length ? weapon.movePenalty : 0;
      const coverPenalty =
        target instanceof Unit
          ? this.map.getDirectionalCoverBonus(unit.currentCell, target.currentCell, coverCells)
          : 0;
      const effectiveRange = weapon.range + unit.getRangeBonus();
      const distancePenalty = Math.max(0, distance - effectiveRange * 0.68) * 0.1;
      const hitChance = Phaser.Math.Clamp(
        weapon.accuracy * unit.getAccuracy() - movementPenalty - coverPenalty - distancePenalty,
        0.18,
        0.96
      );

      unit.shotCooldown =
        (weapon.rate + Phaser.Math.FloatBetween(0.02, 0.08)) / unit.fireRateMultiplier;
      unit.consumeAmmoForAttack();
      this.audio.playWeapon(unit.weaponId);
      this.callbacks.onNoise(unit.currentCell);
      const targetLevel =
        target instanceof Unit
          ? this.map.getElevationAt(target.currentCell.x, target.currentCell.y)
          : this.map.getElevationAt(target.cell.x, target.cell.y);
      this.renderShot(unit, targetCell, weapon, targetLevel);

      const hit = Math.random() <= hitChance;
      if (target instanceof Unit) {
        target.applyPressure(weapon.pressure);
        if (hit) {
          const burstFactor =
            weapon.burst >= 5 ? 1.4 : weapon.burst === 4 ? 1.33 : weapon.burst === 3 ? 1.26 : weapon.burst === 2 ? 1.12 : 1;
          target.takeDamage(weapon.damage * burstFactor);
          this.renderImpact(
            target.getWorldPosition(),
            false,
            false,
            this.map.getElevationAt(target.currentCell.x, target.currentCell.y),
            weapon
          );
          this.audio.playImpact(weapon.id);
          if (!target.alive) {
            this.callbacks.onUnitDown(target);
          }
        }
      } else {
        const damage =
          weapon.damage *
          weapon.propDamageMultiplier *
          (target.kind === "barrel" ? this.breachDamageBonus : 1);
        if (target.takeDamage(damage)) {
          this.callbacks.onPropDestroyed(target);
          this.renderImpact(
            this.map.gridToWorld(target.cell),
            true,
            false,
            this.map.getElevationAt(target.cell.x, target.cell.y),
            weapon
          );
          if (target.kind === "barrel") {
            this.audio.playExplosion();
            this.explodeAt(target.cell, units, props);
          }
        }
      }

      if (target instanceof Unit && !hit) {
        this.renderImpact(
          target.getWorldPosition(),
          false,
          true,
          this.map.getElevationAt(target.currentCell.x, target.currentCell.y),
          weapon
        );
      }

      if (unit.side === "enemy" && distance < weapon.range * 0.85) {
        unit.clearPath();
      }
      unit.setAggro(true);
      if (target instanceof Unit) {
        target.setAggro(true);
      }

      if (time % 6000 < 40 && unit.side === "player") {
        this.callbacks.onNoise(targetCell);
      }
    });
  }

  private canSee(start: GridPos, end: GridPos, props: Prop[]): boolean {
    return Pathfinding.lineOfSight(start, end, (x, y) =>
      props.some(
        (prop) =>
          prop.isBlocking &&
          prop.kind !== "glass" &&
          !(prop.cell.x === end.x && prop.cell.y === end.y) &&
          prop.cell.x === x &&
          prop.cell.y === y
      )
    );
  }

  private renderShot(
    unit: Unit,
    targetCell: GridPos,
    weapon: WeaponDefinition,
    targetLevel: number
  ): void {
    const start = unit.getWorldPosition();
    const end = this.map.gridToWorld(targetCell);
    const startLevel = this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y);
    const flash = this.scene.add.image(start.x + 10, start.y - 66, "flash");
    flash.setScale(weapon.flashScale);
    flash.setTint(weapon.color);
    flash.setDepth(start.y + 90);

    const tracer = this.scene.add.graphics();
    tracer.lineStyle(weapon.tracerWidth, weapon.color, 0.95);
    tracer.beginPath();
    tracer.moveTo(start.x + 8, start.y - 56);
    tracer.lineTo(end.x, end.y - 42);
    tracer.strokePath();
    if (weapon.id === "breach-12") {
      [-16, -7, 9, 18].forEach((offset) => {
        tracer.lineStyle(1.1, weapon.color, 0.62);
        tracer.beginPath();
        tracer.moveTo(start.x + 8, start.y - 56);
        tracer.lineTo(end.x + offset, end.y - 40 + offset * 0.12);
        tracer.strokePath();
      });
    } else if (weapon.burst >= 4) {
      [-6, 6].forEach((offset) => {
        tracer.lineStyle(Math.max(1, weapon.tracerWidth - 0.6), weapon.color, 0.52);
        tracer.beginPath();
        tracer.moveTo(start.x + 8 + offset * 0.35, start.y - 56);
        tracer.lineTo(end.x + offset, end.y - 42 + offset * 0.2);
        tracer.strokePath();
      });
    }
    tracer.setDepth((start.y + end.y) / 2 + 80);

    this.scene.time.delayedCall(weapon.tracerLifeMs, () => {
      flash.destroy();
      tracer.destroy();
    });

    if (startLevel > 0 || targetLevel > 0) {
      const ring = this.scene.add.image(start.x + 6, start.y - 46, "roof-ring");
      ring.setDepth(start.y + 98);
      ring.setAlpha(0.38);
      const drift = this.scene.add.image((start.x + end.x) / 2, (start.y + end.y) / 2 - 44, "roof-drift");
      drift.setDepth((start.y + end.y) / 2 + 88);
      drift.setRotation(Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y));
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 220,
        onComplete: () => ring.destroy()
      });
      this.scene.tweens.add({
        targets: drift,
        alpha: 0,
        x: drift.x + 12,
        duration: 260,
        onComplete: () => drift.destroy()
      });
    }
  }

  private renderImpact(
    position: Phaser.Math.Vector2,
    smoke = false,
    miss = false,
    level = 0,
    weapon?: WeaponDefinition
  ): void {
    const key = smoke ? "smoke" : "spark";
    const impact = this.scene.add.image(position.x, position.y - (smoke ? 28 : 44), key);
    impact.setScale(smoke ? Math.max(0.9, weapon?.impactScale ?? 0.9) : weapon?.impactScale ?? 0.7);
    impact.setAlpha(miss ? 0.38 : 0.9);
    if (weapon) {
      impact.setTint(weapon.color);
    }
    impact.setDepth(position.y + 88);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      y: impact.y - (smoke ? 20 : 10),
      duration: smoke ? 600 : 180,
      onComplete: () => impact.destroy()
    });

    if (level > 0) {
      const ring = this.scene.add.image(position.x, position.y - 26, "roof-ring");
      ring.setDepth(position.y + 92);
      ring.setAlpha(miss ? 0.14 : 0.24);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: smoke ? 2.4 : 1.6,
        scaleY: smoke ? 2.4 : 1.6,
        duration: smoke ? 360 : 220,
        onComplete: () => ring.destroy()
      });
    }

    if (!miss) {
      this.shake(smoke ? 120 : 50, smoke ? 0.0018 : 0.0008);
    }
  }

  private explodeAt(originCell: GridPos, units: Unit[], props: Prop[]): void {
    const origin = this.map.gridToWorld(originCell);
    const originLevel = this.map.getElevationAt(originCell.x, originCell.y);
    const burst = this.scene.add.circle(origin.x, origin.y - 26, 18, 0xffb063, 0.48);
    burst.setDepth(origin.y + 86);
    this.scene.tweens.add({
      targets: burst,
      scaleX: 4.6,
      scaleY: 4.6,
      alpha: 0,
      duration: 260,
      onComplete: () => burst.destroy()
    });

    if (originLevel > 0) {
      const ring = this.scene.add.image(origin.x, origin.y - 20, "roof-ring");
      ring.setDepth(origin.y + 94);
      ring.setScale(1.4);
      ring.setAlpha(0.3);
      const drift = this.scene.add.image(origin.x + 6, origin.y - 44, "roof-drift");
      drift.setDepth(origin.y + 92);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 4.2,
        scaleY: 4.2,
        duration: 320,
        onComplete: () => ring.destroy()
      });
      this.scene.tweens.add({
        targets: drift,
        alpha: 0,
        y: drift.y - 18,
        x: drift.x + 10,
        duration: 420,
        onComplete: () => drift.destroy()
      });
    }

    this.shake(180, 0.003);

    this.callbacks.onNoise(originCell);

    units.forEach((unit) => {
      if (!unit.alive) {
        return;
      }

      const distance = unit.getCellDistanceTo(originCell);
      if (distance <= 2.25) {
        unit.takeDamage(28 - distance * 6);
        unit.applyPressure(36);
        if (!unit.alive) {
          this.callbacks.onUnitDown(unit);
        }
      }
    });

    props.forEach((prop) => {
      if (
        !prop.destroyed &&
        prop.destructible &&
        Phaser.Math.Distance.Between(prop.cell.x, prop.cell.y, originCell.x, originCell.y) <= 1.8
      ) {
        if (prop.takeDamage(999)) {
          this.callbacks.onPropDestroyed(prop);
          this.renderImpact(
            this.map.gridToWorld(prop.cell),
            true,
            false,
            this.map.getElevationAt(prop.cell.x, prop.cell.y)
          );
          if (prop.kind === "barrel") {
            this.audio.playExplosion();
            this.explodeAt(prop.cell, units, props);
          }
        }
      }
    });
  }

  private shake(duration: number, intensity: number): void {
    if (!this.screenShakeEnabled) {
      return;
    }

    this.scene.cameras.main.shake(duration, intensity, true);
  }
}
