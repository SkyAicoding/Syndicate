import Phaser from "phaser";
import type { GridPos } from "../core/missionTypes";
import { Prop } from "../entities/Prop";
import { Unit } from "../entities/Unit";
import { IsoMap } from "./IsoMap";
import { Pathfinding } from "./Pathfinding";

interface NoiseEvent {
  cell: GridPos;
  ttl: number;
}

const randomChoice = <T>(values: T[]): T => values[Math.floor(Math.random() * values.length)];

export class AISystem {
  private readonly decisionTimers = new Map<string, number>();

  public update(
    time: number,
    map: IsoMap,
    units: Unit[],
    props: Prop[],
    noises: NoiseEvent[],
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): void {
    const players = units.filter((unit) => unit.side === "player" && unit.alive);
    const manualPlayers = players.filter((unit) => unit.controlMode === "manual");
    const assistPlayers = players.filter((unit) => unit.controlMode === "assist");
    const hostiles = units.filter((unit) => unit.side === "enemy" && unit.alive);
    const civilians = units.filter((unit) => unit.side === "civilian" && unit.alive);
    const vip = units.find((unit) => unit.side === "vip");

    if (assistPlayers.length && manualPlayers.length) {
      this.updateAssistPlayers(
        time,
        map,
        manualPlayers,
        assistPlayers,
        hostiles,
        props,
        units,
        isWalkableForUnit
      );
    }

    hostiles.forEach((enemy) => {
      if ((this.decisionTimers.get(enemy.id) ?? 0) > time || !enemy.alive) {
        return;
      }

      this.decisionTimers.set(enemy.id, time + 360);
      const visiblePlayer = players
        .filter(
          (player) =>
            enemy.getCellDistanceTo(player.currentCell) <= enemy.vision &&
            this.canSee(enemy.currentCell, player.currentCell, props)
        )
        .sort(
          (a, b) =>
            enemy.getCellDistanceTo(a.currentCell) - enemy.getCellDistanceTo(b.currentCell)
        )[0];

      if (visiblePlayer) {
        enemy.setAggro(true);
        enemy.lastKnownEnemyCell = { ...visiblePlayer.currentCell };
        enemy.setTarget(visiblePlayer);

        const lowOnHealth = enemy.currentHealth < enemy.maxHealth * 0.42 || enemy.pressure > 56;
        if (lowOnHealth) {
          const retreatCell = this.findRetreatCell(enemy, visiblePlayer.currentCell, map, props, units, isWalkableForUnit);
          if (retreatCell) {
            enemy.setPath(this.findPath(enemy, retreatCell, map, isWalkableForUnit));
          }
          return;
        }

        const weapon = enemy.getActiveWeapon();
        const desiredRange = weapon?.range ?? 4.8;
        if (enemy.getCellDistanceTo(visiblePlayer.currentCell) > desiredRange * 0.88) {
          const approach = this.findApproachCell(
            enemy,
            visiblePlayer.currentCell,
            desiredRange - 0.6,
            map,
            isWalkableForUnit
          );
          if (approach) {
            enemy.setPath(this.findPath(enemy, approach, map, isWalkableForUnit));
          }
        }
        return;
      }

      const heardNoise = noises
        .filter(
          (noise) =>
            Phaser.Math.Distance.Between(
              enemy.currentCell.x,
              enemy.currentCell.y,
              noise.cell.x,
              noise.cell.y
            ) <= 6
        )
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(enemy.currentCell.x, enemy.currentCell.y, a.cell.x, a.cell.y) -
            Phaser.Math.Distance.Between(enemy.currentCell.x, enemy.currentCell.y, b.cell.x, b.cell.y)
        )[0];

      if (heardNoise) {
        enemy.setAggro(true);
        enemy.lastKnownEnemyCell = { ...heardNoise.cell };
      }

      if (enemy.lastKnownEnemyCell) {
        if (enemy.getCellDistanceTo(enemy.lastKnownEnemyCell) <= 1.1) {
          enemy.lastKnownEnemyCell = null;
          enemy.setAggro(false);
        } else if (!enemy.movePath.length) {
          const destination = map.findNearestOpen(enemy.lastKnownEnemyCell, (x, y) =>
            isWalkableForUnit(enemy, x, y)
          );
          enemy.setPath(
            this.findPath(enemy, destination, map, isWalkableForUnit)
          );
        }
        return;
      }

      if (!enemy.patrol.length) {
        enemy.setAggro(false);
        return;
      }

      if (!enemy.movePath.length) {
        const patrolTarget = enemy.patrol[enemy.patrolIndex % enemy.patrol.length];
        enemy.patrolIndex += 1;
        enemy.setPath(this.findPath(enemy, patrolTarget, map, isWalkableForUnit));
      }
    });

    civilians.forEach((civilian) => {
      if ((this.decisionTimers.get(civilian.id) ?? 0) > time || !civilian.alive) {
        return;
      }

      this.decisionTimers.set(civilian.id, time + 520);
      const threat = [...players, ...hostiles]
        .filter(
          (unit) =>
            unit.alive &&
            Phaser.Math.Distance.Between(
              civilian.currentCell.x,
              civilian.currentCell.y,
              unit.currentCell.x,
              unit.currentCell.y
            ) <= 4.5
        )
        .sort(
          (a, b) =>
            civilian.getCellDistanceTo(a.currentCell) - civilian.getCellDistanceTo(b.currentCell)
        )[0];
      const heardNoise = noises
        .filter(
          (noise) =>
            Phaser.Math.Distance.Between(
              civilian.currentCell.x,
              civilian.currentCell.y,
              noise.cell.x,
              noise.cell.y
            ) <= 5.5
        )
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(
              civilian.currentCell.x,
              civilian.currentCell.y,
              a.cell.x,
              a.cell.y
            ) -
            Phaser.Math.Distance.Between(
              civilian.currentCell.x,
              civilian.currentCell.y,
              b.cell.x,
              b.cell.y
            )
        )[0];

      if (threat || heardNoise) {
        civilian.brainState = "panic";
        const fleeOptions: GridPos[] = [];
        for (let y = civilian.currentCell.y - 4; y <= civilian.currentCell.y + 4; y += 1) {
          for (let x = civilian.currentCell.x - 4; x <= civilian.currentCell.x + 4; x += 1) {
            if (!map.inBounds(x, y) || !isWalkableForUnit(civilian, x, y)) {
              continue;
            }
            fleeOptions.push({ x, y });
          }
        }

        if (fleeOptions.length) {
          const target = fleeOptions.sort((a, b) => {
            const aThreat = threat
              ? Phaser.Math.Distance.Between(a.x, a.y, threat.currentCell.x, threat.currentCell.y)
              : 0;
            const bThreat = threat
              ? Phaser.Math.Distance.Between(b.x, b.y, threat.currentCell.x, threat.currentCell.y)
              : 0;
            return bThreat - aThreat;
          })[0];

          civilian.setPath(
            this.findPath(civilian, target, map, isWalkableForUnit)
          );
        }
      }
    });

    if (vip && vip.alive && vip.escortTargetId) {
      const escort = players.find((player) => player.id === vip.escortTargetId);
      if (escort && vip.getCellDistanceTo(escort.currentCell) > 1.4) {
        const offsets = [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 0, y: -1 }
        ];
        const target = offsets
          .map((offset) => ({
            x: escort.currentCell.x + offset.x,
            y: escort.currentCell.y + offset.y
          }))
          .find((cell) => map.inBounds(cell.x, cell.y) && isWalkableForUnit(vip, cell.x, cell.y));

        if (target) {
          vip.setPath(this.findPath(vip, target, map, isWalkableForUnit));
        }
      }
    }
  }

  private updateAssistPlayers(
    time: number,
    map: IsoMap,
    manualPlayers: Unit[],
    assistPlayers: Unit[],
    hostiles: Unit[],
    props: Prop[],
    units: Unit[],
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): void {
    assistPlayers.forEach((assistant) => {
      if ((this.decisionTimers.get(assistant.id) ?? 0) > time || !assistant.alive) {
        return;
      }

      this.decisionTimers.set(assistant.id, time + 260);

      const anchor =
        manualPlayers
          .slice()
          .sort((a, b) => {
            const aThreat =
              hostiles.filter((enemy) => enemy.getCellDistanceTo(a.currentCell) <= 6).length * 10 -
              assistant.getCellDistanceTo(a.currentCell);
            const bThreat =
              hostiles.filter((enemy) => enemy.getCellDistanceTo(b.currentCell) <= 6).length * 10 -
              assistant.getCellDistanceTo(b.currentCell);
            return bThreat - aThreat;
          })[0] ?? manualPlayers[0];

      if (!anchor) {
        return;
      }

      const anchorThreats = hostiles.filter(
        (enemy) =>
          enemy.alive &&
          Phaser.Math.Distance.Between(
            enemy.currentCell.x,
            enemy.currentCell.y,
            anchor.currentCell.x,
            anchor.currentCell.y
          ) <= 8.2
      );
      const anchorLevel = map.getElevationAt(anchor.currentCell.x, anchor.currentCell.y);
      const assistantLevel = map.getElevationAt(
        assistant.currentCell.x,
        assistant.currentCell.y
      );
      const regroupCoverCell = this.findCoverSupportCell(
        assistant,
        anchor.currentCell,
        anchorThreats,
        map,
        props,
        isWalkableForUnit
      );

      const woundedAlly = [...manualPlayers, ...assistPlayers]
        .filter(
          (ally) =>
            ally.alive &&
            ally.id !== assistant.id &&
            (ally.currentHealth / ally.maxHealth < 0.62 || ally.pressure > 58)
        )
        .sort(
          (a, b) =>
            assistant.getCellDistanceTo(a.currentCell) - assistant.getCellDistanceTo(b.currentCell)
        )[0];

      if (woundedAlly && assistant.medkits > 0) {
        if (assistant.getCellDistanceTo(woundedAlly.currentCell) <= 2.2) {
          assistant.clearPath();
          assistant.clearTarget();
          assistant.useMedkit(woundedAlly);
          return;
        }

        const medCell = this.findSupportCell(
          assistant,
          woundedAlly.currentCell,
          map,
          isWalkableForUnit
        );
        if (medCell) {
          assistant.clearTarget();
          assistant.setPath(this.findPath(assistant, medCell, map, isWalkableForUnit));
          return;
        }
      }

      if (
        (assistant.currentHealth / assistant.maxHealth < 0.58 || assistant.pressure > 60) &&
        regroupCoverCell
      ) {
        assistant.clearTarget();
        assistant.setAggro(true);
        assistant.setPath(this.findPath(assistant, regroupCoverCell, map, isWalkableForUnit));
        if (assistant.abilityCooldown <= 0 && assistant.abilityId === "bulwark") {
          assistant.useAbility(time, [...manualPlayers, ...assistPlayers]);
        }
        return;
      }

      const visibleEnemy = hostiles
        .filter(
          (enemy) =>
            enemy.alive &&
            assistant.getCellDistanceTo(enemy.currentCell) <= assistant.vision &&
            this.canSee(assistant.currentCell, enemy.currentCell, props)
        )
        .sort((a, b) => {
          const aScore =
            anchor.getCellDistanceTo(a.currentCell) + assistant.getCellDistanceTo(a.currentCell) * 0.5;
          const bScore =
            anchor.getCellDistanceTo(b.currentCell) + assistant.getCellDistanceTo(b.currentCell) * 0.5;
          return aScore - bScore;
        })[0];

      if (visibleEnemy) {
        assistant.setAggro(true);
        assistant.lastKnownEnemyCell = { ...visibleEnemy.currentCell };
        assistant.setTarget(visibleEnemy);

        if (assistant.abilityCooldown <= 0) {
          if (assistant.abilityId === "nanowave" && woundedAlly && assistant.getCellDistanceTo(anchor.currentCell) <= 2.2) {
            assistant.useAbility(time, [...manualPlayers, ...assistPlayers]);
          } else if (
            (assistant.abilityId === "focus" || assistant.abilityId === "ghost") &&
            assistant.getCellDistanceTo(visibleEnemy.currentCell) <= (assistant.getActiveWeapon()?.range ?? 4.5) + 2
          ) {
            assistant.useAbility(time, [...manualPlayers, ...assistPlayers]);
          } else if (
            assistant.abilityId === "bulwark" &&
            (assistant.pressure > 32 || assistant.getCellDistanceTo(visibleEnemy.currentCell) <= 3.6)
          ) {
            assistant.useAbility(time, [...manualPlayers, ...assistPlayers]);
          }
        }

        const weaponRange = (assistant.getActiveWeapon()?.range ?? 4.2) + assistant.getRangeBonus();
        const combatCoverCell = this.findCoverSupportCell(
          assistant,
          anchor.currentCell,
          [visibleEnemy],
          map,
          props,
          isWalkableForUnit
        );

        if (
          (assistant.currentHealth / assistant.maxHealth < 0.7 || assistant.pressure > 42) &&
          combatCoverCell &&
          assistant.getCellDistanceTo(combatCoverCell) > 0.6
        ) {
          assistant.setPath(this.findPath(assistant, combatCoverCell, map, isWalkableForUnit));
          return;
        }

        if (assistant.getCellDistanceTo(visibleEnemy.currentCell) > weaponRange * 0.88) {
          const approach = this.findAssistApproachCell(
            assistant,
            visibleEnemy.currentCell,
            anchor,
            [visibleEnemy],
            weaponRange,
            map,
            props,
            isWalkableForUnit
          );
          if (approach) {
            assistant.setPath(this.findPath(assistant, approach, map, isWalkableForUnit));
          }
        } else if (combatCoverCell && assistant.getCellDistanceTo(combatCoverCell) > 0.6) {
          assistant.setPath(this.findPath(assistant, combatCoverCell, map, isWalkableForUnit));
        } else {
          assistant.clearPath();
        }
        return;
      }

      if (assistant.currentTarget && assistant.currentTarget instanceof Unit && !assistant.currentTarget.alive) {
        assistant.clearTarget();
      }

      const supportCell =
        regroupCoverCell ??
        this.findSupportCell(assistant, anchor.currentCell, map, isWalkableForUnit);
      const needsRegroup =
        assistant.getCellDistanceTo(anchor.currentCell) > 2.6 ||
        assistantLevel !== anchorLevel ||
        (anchorThreats.length > 0 && assistant.getCellDistanceTo(anchor.currentCell) > 1.8);

      if (supportCell && needsRegroup) {
        assistant.clearTarget();
        assistant.setAggro(false);
        assistant.setPath(this.findPath(assistant, supportCell, map, isWalkableForUnit));
      } else if (!assistant.movePath.length) {
        assistant.brainState = "idle";
      }
    });
  }

  private findRetreatCell(
    unit: Unit,
    from: GridPos,
    map: IsoMap,
    props: Prop[],
    units: Unit[],
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): GridPos | null {
    const options: GridPos[] = [];
    for (let y = unit.currentCell.y - 3; y <= unit.currentCell.y + 3; y += 1) {
      for (let x = unit.currentCell.x - 3; x <= unit.currentCell.x + 3; x += 1) {
        if (!map.inBounds(x, y) || !isWalkableForUnit(unit, x, y)) {
          continue;
        }

        options.push({ x, y });
      }
    }

    if (!options.length) {
      return null;
    }

    const coverCells = props.filter((prop) => prop.cover && !prop.destroyed).map((prop) => prop.cell);
    return options.sort((a, b) => {
      const score = (cell: GridPos) => {
        const distance = Phaser.Math.Distance.Between(cell.x, cell.y, from.x, from.y);
        const cover = map.getDirectionalCoverBonus(from, cell, coverCells) * 10;
        const congestion = units.some((candidate) => candidate.alive && candidate.id !== unit.id && candidate.currentCell.x === cell.x && candidate.currentCell.y === cell.y)
          ? -5
          : 0;
        return distance + cover + congestion;
      };

      return score(b) - score(a);
    })[0];
  }

  private findApproachCell(
    unit: Unit,
    target: GridPos,
    preferredRange: number,
    map: IsoMap,
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): GridPos | null {
    const candidates: GridPos[] = [];
    for (let y = target.y - 4; y <= target.y + 4; y += 1) {
      for (let x = target.x - 4; x <= target.x + 4; x += 1) {
        if (!map.inBounds(x, y) || !isWalkableForUnit(unit, x, y)) {
          continue;
        }
        const distance = Phaser.Math.Distance.Between(x, y, target.x, target.y);
        if (distance <= preferredRange + 0.6 && distance >= Math.max(1.2, preferredRange - 1.2)) {
          candidates.push({ x, y });
        }
      }
    }

    if (!candidates.length) {
      return null;
    }

    return randomChoice(
      candidates.sort(
        (a, b) =>
          Phaser.Math.Distance.Between(a.x, a.y, unit.currentCell.x, unit.currentCell.y) -
          Phaser.Math.Distance.Between(b.x, b.y, unit.currentCell.x, unit.currentCell.y)
      ).slice(0, 4)
    );
  }

  private findAssistApproachCell(
    unit: Unit,
    target: GridPos,
    anchor: Unit,
    threats: Unit[],
    preferredRange: number,
    map: IsoMap,
    props: Prop[],
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): GridPos | null {
    const coverApproach = this.findCoverSupportCell(
      unit,
      anchor.currentCell,
      threats,
      map,
      props,
      isWalkableForUnit,
      { minDistance: Math.max(1.8, preferredRange - 1.4), maxDistance: preferredRange + 0.7 }
    );

    if (coverApproach) {
      return coverApproach;
    }

    const approach = this.findApproachCell(
      unit,
      target,
      preferredRange,
      map,
      isWalkableForUnit
    );

    if (
      approach &&
      Phaser.Math.Distance.Between(approach.x, approach.y, anchor.currentCell.x, anchor.currentCell.y) <= 6.2
    ) {
      return approach;
    }

    return this.findSupportCell(unit, anchor.currentCell, map, isWalkableForUnit);
  }

  private findCoverSupportCell(
    unit: Unit,
    anchor: GridPos,
    threats: Unit[],
    map: IsoMap,
    props: Prop[],
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean,
    options?: { minDistance?: number; maxDistance?: number }
  ): GridPos | null {
    const coverCells = props.filter((prop) => prop.cover && !prop.destroyed).map((prop) => prop.cell);
    const anchorLevel = map.getElevationAt(anchor.x, anchor.y);
    const minDistance = options?.minDistance ?? 1.2;
    const maxDistance = options?.maxDistance ?? 4.8;
    const primaryThreat =
      threats
        .slice()
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(a.currentCell.x, a.currentCell.y, anchor.x, anchor.y) -
            Phaser.Math.Distance.Between(b.currentCell.x, b.currentCell.y, anchor.x, anchor.y)
        )[0] ?? null;

    const candidates: GridPos[] = [];
    for (let y = anchor.y - 4; y <= anchor.y + 4; y += 1) {
      for (let x = anchor.x - 4; x <= anchor.x + 4; x += 1) {
        if (!map.inBounds(x, y) || !isWalkableForUnit(unit, x, y)) {
          continue;
        }

        const distanceToAnchor = Phaser.Math.Distance.Between(x, y, anchor.x, anchor.y);
        if (distanceToAnchor < minDistance || distanceToAnchor > maxDistance) {
          continue;
        }

        if (Math.abs(map.getElevationAt(x, y) - anchorLevel) > 1) {
          continue;
        }

        candidates.push({ x, y });
      }
    }

    if (!candidates.length) {
      return null;
    }

    return candidates.sort((a, b) => {
      const score = (cell: GridPos) => {
        const anchorDistance = Phaser.Math.Distance.Between(cell.x, cell.y, anchor.x, anchor.y);
        const moveDistance = Phaser.Math.Distance.Between(
          cell.x,
          cell.y,
          unit.currentCell.x,
          unit.currentCell.y
        );
        const sameLevel = map.getElevationAt(cell.x, cell.y) === anchorLevel ? 4 : -3;
        const coverScore = primaryThreat
          ? map.getDirectionalCoverBonus(primaryThreat.currentCell, cell, coverCells) * 32
          : 0;
        const losPenalty = primaryThreat && this.canSee(primaryThreat.currentCell, cell, props) ? -2 : 1.5;
        return coverScore + losPenalty + sameLevel - Math.abs(anchorDistance - 2.4) * 1.4 - moveDistance * 0.32;
      };

      return score(b) - score(a);
    })[0];
  }

  private findSupportCell(
    unit: Unit,
    anchor: GridPos,
    map: IsoMap,
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): GridPos | null {
    const offsets = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 }
    ];

    return offsets
      .map((offset) => ({
        x: anchor.x + offset.x,
        y: anchor.y + offset.y
      }))
      .filter((cell) => map.inBounds(cell.x, cell.y) && isWalkableForUnit(unit, cell.x, cell.y))
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(a.x, a.y, unit.currentCell.x, unit.currentCell.y) -
          Phaser.Math.Distance.Between(b.x, b.y, unit.currentCell.x, unit.currentCell.y)
      )[0] ?? null;
  }

  private findPath(
    unit: Unit,
    target: GridPos,
    map: IsoMap,
    isWalkableForUnit: (unit: Unit, x: number, y: number) => boolean
  ): GridPos[] {
    if (unit.currentCell.x === target.x && unit.currentCell.y === target.y) {
      return [];
    }

    return Pathfinding.findPathByNeighbors(unit.currentCell, target, (cell) =>
      map.getTraversalNeighbors(cell, (x, y) => isWalkableForUnit(unit, x, y))
    );
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
}
