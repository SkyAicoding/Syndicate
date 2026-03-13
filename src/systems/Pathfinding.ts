import type { GridPos } from "../core/missionTypes";

const STRAIGHT_COST = 1;
const DIAGONAL_COST = 1.4;

const directions: GridPos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 }
];

const heuristic = (a: GridPos, b: GridPos): number => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const diagonalSteps = Math.min(dx, dy);
  const straightSteps = Math.max(dx, dy) - diagonalSteps;
  return diagonalSteps * DIAGONAL_COST + straightSteps * STRAIGHT_COST;
};

const keyOf = (x: number, y: number): string => `${x},${y}`;

export class Pathfinding {
  public static findPath(
    start: GridPos,
    goal: GridPos,
    isWalkable: (x: number, y: number) => boolean
  ): GridPos[] {
    return this.findPathByNeighbors(start, goal, (cell) => {
      const neighbors: GridPos[] = [];

      directions.forEach((direction) => {
        const next = {
          x: cell.x + direction.x,
          y: cell.y + direction.y
        };

        const isDiagonal = direction.x !== 0 && direction.y !== 0;
        if (!isWalkable(next.x, next.y)) {
          return;
        }

        if (isDiagonal) {
          if (
            !isWalkable(cell.x + direction.x, cell.y) ||
            !isWalkable(cell.x, cell.y + direction.y)
          ) {
            return;
          }
        }

        neighbors.push(next);
      });

      return neighbors;
    });
  }

  public static findPathByNeighbors(
    start: GridPos,
    goal: GridPos,
    getNeighbors: (cell: GridPos) => GridPos[]
  ): GridPos[] {
    const frontier: GridPos[] = [start];
    const cameFrom = new Map<string, GridPos | null>([[keyOf(start.x, start.y), null]]);
    const costSoFar = new Map<string, number>([[keyOf(start.x, start.y), 0]]);

    while (frontier.length) {
      frontier.sort((a, b) => {
        const aKey = keyOf(a.x, a.y);
        const bKey = keyOf(b.x, b.y);
        return (
          (costSoFar.get(aKey) ?? 0) + heuristic(a, goal) -
          ((costSoFar.get(bKey) ?? 0) + heuristic(b, goal))
        );
      });

      const current = frontier.shift()!;

      if (current.x === goal.x && current.y === goal.y) {
        break;
      }

      getNeighbors(current).forEach((next) => {
        const isDiagonal = current.x !== next.x && current.y !== next.y;
        const nextKey = keyOf(next.x, next.y);
        const newCost =
          (costSoFar.get(keyOf(current.x, current.y)) ?? 0) +
          (isDiagonal ? DIAGONAL_COST : STRAIGHT_COST);

        if (!costSoFar.has(nextKey) || newCost < (costSoFar.get(nextKey) ?? Number.MAX_VALUE)) {
          costSoFar.set(nextKey, newCost);
          cameFrom.set(nextKey, current);
          frontier.push(next);
        }
      });
    }

    const goalKey = keyOf(goal.x, goal.y);
    if (!cameFrom.has(goalKey)) {
      return [];
    }

    const path: GridPos[] = [];
    let current: GridPos | null = goal;
    while (current) {
      path.push(current);
      current = cameFrom.get(keyOf(current.x, current.y)) ?? null;
    }

    return path.reverse().slice(1);
  }

  public static lineOfSight(
    start: GridPos,
    end: GridPos,
    isBlocked: (x: number, y: number) => boolean
  ): boolean {
    let x0 = start.x;
    let y0 = start.y;
    const x1 = end.x;
    const y1 = end.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (x0 !== x1 || y0 !== y1) {
      if (!(x0 === start.x && y0 === start.y) && isBlocked(x0, y0)) {
        return false;
      }

      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return true;
  }
}
