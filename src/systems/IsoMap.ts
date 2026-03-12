import Phaser from "phaser";
import { LEVEL_HEIGHT, TILE_HEIGHT, TILE_WIDTH } from "../data/constants";
import type { GridPos, ParsedMissionMap, TiledObjectData } from "../core/missionTypes";

const CARDINAL_DIRECTIONS: GridPos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

const ALL_DIRECTIONS: GridPos[] = [
  ...CARDINAL_DIRECTIONS,
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 }
];

const keyOf = (x: number, y: number): string => `${x},${y}`;

const getProperties = (
  properties: Phaser.Types.Tilemaps.TiledObject["properties"] | undefined
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    (properties ?? []).map(
      (property: { name: string; value: string | number | boolean }) => [
        property.name,
        property.value
      ]
    )
  );

interface FloorRenderable {
  baseAlpha: number;
  cell?: GridPos;
  level: number;
  objects: Array<{ setAlpha: (value?: number) => unknown }>;
  type: "surface" | "detail" | "transition" | "face" | "overlay" | "ceiling";
}

export class IsoMap {
  public readonly width: number;

  public readonly height: number;

  public readonly ground: number[][];

  public readonly detail: number[][];

  public readonly elevation: number[][];

  public readonly traversal: number[][];

  public readonly objects: TiledObjectData[];

  private readonly scene: Phaser.Scene;

  private readonly originX: number;

  private readonly originY: number;

  private readonly elevatorLinks = new Map<string, GridPos[]>();

  private readonly floorRenderables: FloorRenderable[] = [];

  private focusedFloor = -1;

  private cutawayCells: GridPos[] = [];

  public constructor(scene: Phaser.Scene, parsedMap: ParsedMissionMap) {
    this.scene = scene;
    this.width = parsedMap.width;
    this.height = parsedMap.height;
    this.ground = parsedMap.ground;
    this.detail = parsedMap.detail;
    this.elevation = parsedMap.elevation;
    this.traversal = parsedMap.traversal;
    this.objects = parsedMap.objects;
    this.originX = this.height * (TILE_WIDTH / 2);
    this.originY = 220;

    this.objects
      .filter((object) => object.type === "nav_elevator")
      .forEach((object) => {
        const from = {
          x: Number(object.properties.gridX ?? 0),
          y: Number(object.properties.gridY ?? 0)
        };
        const to = {
          x: Number(object.properties.linkX ?? from.x),
          y: Number(object.properties.linkY ?? from.y)
        };
        this.addElevatorLink(from, to);
        this.addElevatorLink(to, from);
      });
  }

  public static parseFromTilemap(tilemap: Phaser.Tilemaps.Tilemap): ParsedMissionMap {
    const parseTileLayer = (layerName: string): number[][] => {
      const layer = tilemap.layers.find((candidate) => candidate.name === layerName) ?? null;
      const rows: number[][] = [];

      if (layer) {
        for (let y = 0; y < tilemap.height; y += 1) {
          const row: number[] = [];
          for (let x = 0; x < tilemap.width; x += 1) {
            row.push(layer.data[y][x]?.index ?? 0);
          }
          rows.push(row);
        }
      } else {
        for (let y = 0; y < tilemap.height; y += 1) {
          rows.push(Array.from({ length: tilemap.width }, () => 0));
        }
      }

      return rows;
    };

    const objectLayer = tilemap.getObjectLayer("objects");
    const objects: TiledObjectData[] = (objectLayer?.objects ?? []).map((object) => ({
      id: object.id,
      name: object.name,
      type: object.type,
      properties: getProperties(object.properties)
    }));

    return {
      width: tilemap.width,
      height: tilemap.height,
      ground: parseTileLayer("ground"),
      detail: parseTileLayer("detail"),
      elevation: parseTileLayer("elevation"),
      traversal: parseTileLayer("traversal"),
      objects
    };
  }

  public renderGround(): void {
    const tileKeys: Record<number, string> = {
      1: "tile-road",
      2: "tile-sidewalk",
      3: "tile-plaza",
      4: "tile-lab",
      5: "tile-industrial",
      6: "tile-hazard"
    };

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const groundId = this.ground[y][x];
        if (!groundId) {
          continue;
        }

        const cell = { x, y };
        const level = this.getElevationAt(x, y);
        const world = this.gridToWorld(cell, level);
        this.drawElevationFaces(cell, level, world);

        const groundKey = tileKeys[groundId] ?? "tile-sidewalk";
        const tile = this.scene.add.image(world.x, world.y, groundKey);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(world.y);
        this.registerFloorRenderable(level, [tile], "surface", 1, cell);

        if (level > 0) {
          const overlayKey = this.isInteriorFloorCell(x, y, level)
            ? "tile-overlay-interior"
            : "tile-overlay-roof";
          const overlayAlpha = overlayKey === "tile-overlay-interior" ? 0.58 : 0.34;
          const overlay = this.scene.add.image(world.x, world.y - 1, overlayKey);
          overlay.setOrigin(0.5, 0.5);
          overlay.setDepth(world.y + 0.16);
          overlay.setBlendMode(Phaser.BlendModes.SCREEN);
          overlay.setAlpha(overlayAlpha);
          this.registerFloorRenderable(level, [overlay], "overlay", overlayAlpha, cell);
        }

        if (level > 0 && this.isInteriorFloorCell(x, y, level)) {
          const ceiling = this.scene.add.image(world.x, world.y - 2, "tile-ceiling-panel");
          ceiling.setOrigin(0.5, 0.5);
          ceiling.setDepth(world.y + 0.18);
          ceiling.setAlpha(0.92);
          this.registerFloorRenderable(level, [ceiling], "ceiling", 0.92, cell);
        }

        const detailId = this.detail[y][x];
        if (detailId > 0 && detailId !== groundId) {
          const detailTile = this.scene.add.image(
            world.x,
            world.y,
            tileKeys[detailId] ?? "tile-plaza"
          );
          detailTile.setOrigin(0.5, 0.5);
          detailTile.setDepth(world.y + 0.2);
          detailTile.setAlpha(0.66);
          detailTile.setBlendMode(Phaser.BlendModes.SCREEN);
          this.registerFloorRenderable(level, [detailTile], "detail", 0.66, cell);
        }

        const traversalMode = this.getTraversalAt(x, y);
        if (traversalMode === 1) {
          const stairs = this.scene.add.image(world.x, world.y - 6, "nav-stairs");
          stairs.setDepth(world.y + 14);
          this.registerFloorRenderable(level, [stairs], "transition", 1, cell);
        } else if (traversalMode === 2) {
          const elevator = this.scene.add.image(world.x, world.y - 8, "nav-elevator");
          elevator.setDepth(world.y + 14);
          this.registerFloorRenderable(level, [elevator], "transition", 1, cell);
        }
      }
    }

    this.setFloorFocus(0);
  }

  public gridToWorld(cell: GridPos, elevationOverride?: number): Phaser.Math.Vector2 {
    const elevation = elevationOverride ?? this.getElevationAt(cell.x, cell.y);
    return new Phaser.Math.Vector2(
      this.originX + (cell.x - cell.y) * (TILE_WIDTH / 2),
      this.originY + (cell.x + cell.y) * (TILE_HEIGHT / 2) - elevation * LEVEL_HEIGHT
    );
  }

  public worldToGrid(worldX: number, worldY: number): GridPos {
    const localX = worldX - this.originX;
    const localY = worldY - this.originY;
    const roughX = (localY / (TILE_HEIGHT / 2) + localX / (TILE_WIDTH / 2)) / 2;
    const roughY = (localY / (TILE_HEIGHT / 2) - localX / (TILE_WIDTH / 2)) / 2;
    const origin = {
      x: Math.round(roughX),
      y: Math.round(roughY)
    };

    let best = origin;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let y = origin.y - 3; y <= origin.y + 3; y += 1) {
      for (let x = origin.x - 3; x <= origin.x + 3; x += 1) {
        if (!this.inBounds(x, y) || !this.isPlayableCell(x, y)) {
          continue;
        }

        const point = this.gridToWorld({ x, y });
        const distance = Phaser.Math.Distance.Squared(worldX, worldY, point.x, point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }

    return best;
  }

  public isPlayableCell(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.ground[y][x] > 0;
  }

  public getElevationAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) {
      return 0;
    }

    const raw = this.elevation[y][x];
    return raw > 0 ? raw - 1 : 0;
  }

  public getTraversalAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) {
      return 0;
    }

    return this.traversal[y][x] ?? 0;
  }

  public isTransitionCell(x: number, y: number): boolean {
    return this.getTraversalAt(x, y) > 0;
  }

  public getTraversalNeighbors(
    cell: GridPos,
    canOccupy: (x: number, y: number) => boolean
  ): GridPos[] {
    const neighbors: GridPos[] = [];

    ALL_DIRECTIONS.forEach((direction) => {
      const next = {
        x: cell.x + direction.x,
        y: cell.y + direction.y
      };

      const isDiagonal = direction.x !== 0 && direction.y !== 0;
      if (!canOccupy(next.x, next.y) || !this.canTraverseBetween(cell, next)) {
        return;
      }

      if (isDiagonal) {
        const orthogonalA = { x: cell.x + direction.x, y: cell.y };
        const orthogonalB = { x: cell.x, y: cell.y + direction.y };
        if (
          !canOccupy(orthogonalA.x, orthogonalA.y) ||
          !canOccupy(orthogonalB.x, orthogonalB.y) ||
          !this.canTraverseBetween(cell, orthogonalA) ||
          !this.canTraverseBetween(cell, orthogonalB)
        ) {
          return;
        }
      }

      neighbors.push(next);
    });

    if (this.getTraversalAt(cell.x, cell.y) === 2) {
      (this.elevatorLinks.get(keyOf(cell.x, cell.y)) ?? []).forEach((linkedCell) => {
        if (canOccupy(linkedCell.x, linkedCell.y)) {
          neighbors.push(linkedCell);
        }
      });
    }

    return neighbors;
  }

  public getObjectGroup(type: string): TiledObjectData[] {
    return this.objects.filter((object) => object.type === type);
  }

  public setFloorFocus(focusFloor: number): void {
    if (this.focusedFloor === focusFloor && this.cutawayCells.length === 0) {
      return;
    }

    this.focusedFloor = focusFloor;
    this.refreshFloorVisibility();
  }

  public setCutawayCells(cells: GridPos[]): void {
    this.cutawayCells = cells;
    this.refreshFloorVisibility();
  }

  public getCellsAtLevel(level: number): GridPos[] {
    const cells: GridPos[] = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.ground[y][x] > 0 && this.getElevationAt(x, y) === level) {
          cells.push({ x, y });
        }
      }
    }

    return cells;
  }

  private refreshFloorVisibility(): void {
    this.floorRenderables.forEach((renderable) => {
      const alpha =
        renderable.baseAlpha *
        this.getFloorAlpha(renderable.level, this.focusedFloor, renderable.type, renderable.cell);
      renderable.objects.forEach((object) => object.setAlpha(alpha));
    });
  }

  public getWorldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const renderableCells: GridPos[] = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.ground[y][x] > 0) {
          renderableCells.push({ x, y });
        }
      }
    }

    const corners = (renderableCells.length ? renderableCells : [
      { x: 0, y: 0 },
      { x: this.width, y: 0 },
      { x: 0, y: this.height },
      { x: this.width, y: this.height }
    ]).map((cell) => this.gridToWorld(cell));

    return {
      minX: Math.min(...corners.map((corner) => corner.x)) - 420,
      maxX: Math.max(...corners.map((corner) => corner.x)) + 420,
      minY: Math.min(...corners.map((corner) => corner.y)) - 320,
      maxY: Math.max(...corners.map((corner) => corner.y)) + 260
    };
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  public findNearestOpen(
    target: GridPos,
    isWalkable: (x: number, y: number) => boolean
  ): GridPos {
    if (isWalkable(target.x, target.y)) {
      return target;
    }

    for (let radius = 1; radius < 14; radius += 1) {
      for (let y = target.y - radius; y <= target.y + radius; y += 1) {
        for (let x = target.x - radius; x <= target.x + radius; x += 1) {
          if (!this.inBounds(x, y)) {
            continue;
          }

          if (isWalkable(x, y)) {
            return { x, y };
          }
        }
      }
    }

    return target;
  }

  public getDirectionalCoverBonus(
    attacker: GridPos,
    target: GridPos,
    blockingCells: GridPos[]
  ): number {
    const stepX = Math.sign(target.x - attacker.x);
    const stepY = Math.sign(target.y - attacker.y);
    const coverCell = {
      x: target.x - stepX,
      y: target.y - stepY
    };

    return blockingCells.some((cell) => cell.x === coverCell.x && cell.y === coverCell.y)
      ? 0.16
      : 0;
  }

  private canTraverseBetween(from: GridPos, to: GridPos): boolean {
    if (!this.isPlayableCell(to.x, to.y)) {
      return false;
    }

    const fromLevel = this.getElevationAt(from.x, from.y);
    const toLevel = this.getElevationAt(to.x, to.y);
    const difference = Math.abs(fromLevel - toLevel);

    if (difference === 0) {
      return true;
    }

    if (difference > 1) {
      return false;
    }

    return this.isTransitionCell(from.x, from.y) || this.isTransitionCell(to.x, to.y);
  }

  private drawElevationFaces(
    cell: GridPos,
    level: number,
    world: Phaser.Math.Vector2
  ): void {
    if (level <= 0) {
      return;
    }

    const leftNeighbor = this.getElevationAt(cell.x, cell.y + 1);
    const rightNeighbor = this.getElevationAt(cell.x + 1, cell.y);

    if (level > leftNeighbor) {
      const face = this.drawFace(
        [
          { x: world.x - TILE_WIDTH / 2, y: world.y },
          { x: world.x, y: world.y + TILE_HEIGHT / 2 },
          { x: world.x, y: world.y + TILE_HEIGHT / 2 + (level - leftNeighbor) * LEVEL_HEIGHT },
          {
            x: world.x - TILE_WIDTH / 2,
            y: world.y + (level - leftNeighbor) * LEVEL_HEIGHT
          }
        ],
        world.y - 0.4,
        0x182634
      );
      this.registerFloorRenderable(level, [face], "face", 0.96, cell);
    }

    if (level > rightNeighbor) {
      const face = this.drawFace(
        [
          { x: world.x + TILE_WIDTH / 2, y: world.y },
          { x: world.x, y: world.y + TILE_HEIGHT / 2 },
          { x: world.x, y: world.y + TILE_HEIGHT / 2 + (level - rightNeighbor) * LEVEL_HEIGHT },
          {
            x: world.x + TILE_WIDTH / 2,
            y: world.y + (level - rightNeighbor) * LEVEL_HEIGHT
          }
        ],
        world.y - 0.2,
        0x223445
      );
      this.registerFloorRenderable(level, [face], "face", 0.96, cell);
    }
  }

  private drawFace(
    points: Array<{ x: number; y: number }>,
    depth: number,
    fillColor: number
  ): Phaser.GameObjects.Polygon {
    const polygon = this.scene.add.polygon(
      0,
      0,
      points.flatMap((point) => [point.x, point.y]),
      fillColor,
      0.96
    );
    polygon.setOrigin(0, 0);
    polygon.setDepth(depth);
    polygon.setStrokeStyle(1, 0x7acfff, 0.07);
    return polygon;
  }

  private addElevatorLink(from: GridPos, to: GridPos): void {
    const key = keyOf(from.x, from.y);
    const existing = this.elevatorLinks.get(key) ?? [];
    existing.push(to);
    this.elevatorLinks.set(key, existing);
  }

  private registerFloorRenderable(
    level: number,
    objects: Array<{ setAlpha: (value?: number) => unknown }>,
    type: FloorRenderable["type"],
    baseAlpha = 1,
    cell?: GridPos
  ): void {
    this.floorRenderables.push({
      level,
      objects,
      type,
      baseAlpha,
      cell
    });
  }

  private getFloorAlpha(
    level: number,
    focusFloor: number,
    type: FloorRenderable["type"],
    cell?: GridPos
  ): number {
    const delta = level - focusFloor;
    if (delta === 0) {
      if (!cell) {
        return type === "face" ? 0.76 : 1;
      }

      const cutawayDistance = this.getCutawayDistance(cell);
      if (type === "ceiling") {
        return cutawayDistance <= 1.8 ? 0.02 : cutawayDistance <= 3.2 ? 0.18 : 0.76;
      }
      if (type === "overlay") {
        return cutawayDistance <= 1.8 ? 0.08 : cutawayDistance <= 3.2 ? 0.22 : 1;
      }
      if (type === "face") {
        return cutawayDistance <= 1.5 ? 0.18 : cutawayDistance <= 3 ? 0.42 : 0.76;
      }

      return 1;
    }

    if (delta > 0) {
      return type === "ceiling"
        ? 0.03
        : type === "overlay"
          ? 0.04
          : type === "face"
            ? 0.22
            : type === "detail"
              ? 0.14
              : 0.16;
    }

    return type === "ceiling"
      ? 0.08
      : type === "overlay"
        ? 0.12
        : type === "face"
          ? 0.44
          : type === "detail"
            ? 0.38
            : 0.52;
  }

  private isInteriorFloorCell(x: number, y: number, level: number): boolean {
    return CARDINAL_DIRECTIONS.every((direction) => {
      const nextX = x + direction.x;
      const nextY = y + direction.y;
      return this.inBounds(nextX, nextY) && this.getElevationAt(nextX, nextY) >= level;
    });
  }

  private getCutawayDistance(cell: GridPos): number {
    if (!this.cutawayCells.length) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.min(
      ...this.cutawayCells.map((focus) =>
        Phaser.Math.Distance.Between(cell.x, cell.y, focus.x, focus.y)
      )
    );
  }
}
