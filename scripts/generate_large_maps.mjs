import fs from "node:fs";
import path from "node:path";

const WIDTH = 120;
const HEIGHT = 120;
const BLOCKED = 3;
const MAX_CITY_BOUNDS = {
  left: 2,
  top: 4,
  right: 117,
  bottom: 117
};

const keyOf = (x, y) => `${x},${y}`;

const createGrid = (fill = 0) =>
  Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => fill));

const flatten = (grid) => grid.flatMap((row) => row);

const toProperty = (name, value) => ({
  name,
  type:
    typeof value === "boolean"
      ? "bool"
      : typeof value === "number"
        ? Number.isInteger(value)
          ? "int"
          : "float"
        : "string",
  value
});

const createBuilder = () => {
  const ground = createGrid(0);
  const detail = createGrid(0);
  const elevation = createGrid(0);
  const traversal = createGrid(0);
  const objects = [];
  const propKindsByCell = new Map();
  let nextObjectId = 1;

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;

  const setCell = (layer, x, y, value) => {
    if (inBounds(x, y)) {
      layer[y][x] = value;
    }
  };

  const fillRect = (layer, x, y, width, height, value) => {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        setCell(layer, column, row, value);
      }
    }
  };

  const strokeRect = (layer, x, y, width, height, value) => {
    for (let column = x; column < x + width; column += 1) {
      setCell(layer, column, y, value);
      setCell(layer, column, y + height - 1, value);
    }
    for (let row = y; row < y + height; row += 1) {
      setCell(layer, x, row, value);
      setCell(layer, x + width - 1, row, value);
    }
  };

  const checker = (layer, x, y, width, height, value, step = 2) => {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        if ((column + row) % step === 0 && ground[row]?.[column] > 0) {
          setCell(layer, column, row, value);
        }
      }
    }
  };

  const addObject = (type, properties = {}, name = type) => {
    objects.push({
      id: nextObjectId,
      name,
      type,
      x: 0,
      y: 0,
      properties: Object.entries(properties).map(([key, value]) => toProperty(key, value))
    });
    nextObjectId += 1;
  };

  const addPlayerSpawns = (cells) => {
    cells.forEach((cell, index) =>
      addObject("spawn_player", { gridX: cell.x, gridY: cell.y }, `p${index + 1}`)
    );
  };

  const addEnemy = (label, x, y, weapon, extra = {}) =>
    addObject(
      "spawn_enemy",
      {
        gridX: x,
        gridY: y,
        label,
        weapon,
        ...extra
      },
      label.toLowerCase().replace(/\s+/g, "-")
    );

  const addCivilian = (label, x, y) =>
    addObject("spawn_civilian", { gridX: x, gridY: y, label }, label.toLowerCase());

  const addVip = (label, x, y) =>
    addObject("spawn_vip", { gridX: x, gridY: y, label }, label.toLowerCase());

  const hasNearbyPropKind = (x, y, kinds) => {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (!inBounds(x + offsetX, y + offsetY)) {
          continue;
        }
        const nearby = propKindsByCell.get(keyOf(x + offsetX, y + offsetY));
        if (nearby && kinds.some((kind) => nearby.has(kind))) {
          return true;
        }
      }
    }

    return false;
  };

  const addProp = (kind, x, y, extra = {}) => {
    if (!inBounds(x, y)) {
      return;
    }

    const key = keyOf(x, y);
    const existing = propKindsByCell.get(key) ?? new Set();

    if (existing.has(kind)) {
      return;
    }

    // Prefer solid wall silhouettes over a second fence line hugging the same boundary.
    if (
      kind === "fence" &&
      hasNearbyPropKind(x, y, ["facade-wall", "facade-corner"])
    ) {
      return;
    }

    existing.add(kind);
    propKindsByCell.set(key, existing);
    addObject(`prop_${kind}`, { gridX: x, gridY: y, ...extra }, `${kind}-${x}-${y}`);
  };

  const addExtract = (x, y) =>
    addObject("marker_extract", { gridX: x, gridY: y }, `extract-${x}-${y}`);

  const addReinforcement = (x, y) =>
    addObject("spawn_reinforcement", { gridX: x, gridY: y }, `reinforce-${x}-${y}`);

  const addObjectiveTerminal = (x, y) =>
    addObject("objective_terminal", { gridX: x, gridY: y }, `terminal-${x}-${y}`);

  const addStairs = (cells) => {
    cells.forEach((cell) => setCell(traversal, cell.x, cell.y, 1));
  };

  const blockCell = (x, y) => setCell(traversal, x, y, BLOCKED);

  const blockRect = (x, y, width, height) => {
    fillRect(traversal, x, y, width, height, BLOCKED);
  };

  const clearBlockedCell = (x, y) => {
    if (traversal[y]?.[x] === BLOCKED) {
      setCell(traversal, x, y, 0);
    }
  };

  const addElevator = (from, to) => {
    setCell(traversal, from.x, from.y, 2);
    setCell(traversal, to.x, to.y, 2);
    addObject(
      "nav_elevator",
      {
        gridX: from.x,
        gridY: from.y,
        linkX: to.x,
        linkY: to.y
      },
      `lift-${from.x}-${from.y}`
    );
  };

  const addEdgePropLine = (kind, from, to, extra = {}, skipCells = new Set()) => {
    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      for (let x = minX; x <= maxX; x += 1) {
        if (!inBounds(x, from.y) || traversal[from.y][x] !== 0 || skipCells.has(keyOf(x, from.y))) {
          continue;
        }
        addProp(kind, x, from.y, { ...extra, variant: "diag-right" });
      }
      return;
    }

    if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      for (let y = minY; y <= maxY; y += 1) {
        if (!inBounds(from.x, y) || traversal[y][from.x] !== 0 || skipCells.has(keyOf(from.x, y))) {
          continue;
        }
        addProp(kind, from.x, y, { ...extra, variant: "diag-left" });
      }
    }
  };

  const addOutlinedPropLoop = (kind, { left, top, right, bottom, skipCells = [] }) => {
    const skip = new Set(skipCells.map((cell) => keyOf(cell.x, cell.y)));
    addEdgePropLine(kind, { x: left, y: top }, { x: right, y: top }, {}, skip);
    addEdgePropLine(kind, { x: left, y: bottom }, { x: right, y: bottom }, {}, skip);
    addEdgePropLine(kind, { x: left, y: top }, { x: left, y: bottom }, {}, skip);
    addEdgePropLine(kind, { x: right, y: top }, { x: right, y: bottom }, {}, skip);
  };

  const addRoofRail = (x, y, width, height, openings = []) => {
    addOutlinedPropLoop("fence", {
      left: x,
      top: y,
      right: x + width - 1,
      bottom: y + height - 1,
      skipCells: openings
    });
  };

  return {
    ground,
    detail,
    elevation,
    traversal,
    objects,
    fillRect,
    strokeRect,
    checker,
    setCell,
    addPlayerSpawns,
    addEnemy,
    addCivilian,
    addVip,
    addProp,
    addExtract,
    addReinforcement,
    addObjectiveTerminal,
    addStairs,
    blockCell,
    blockRect,
    clearBlockedCell,
    addElevator,
    addEdgePropLine,
    addOutlinedPropLoop,
    addRoofRail,
    toJson: () => ({
      compressionlevel: -1,
      height: HEIGHT,
      infinite: false,
      layers: [
        {
          data: flatten(ground),
          height: HEIGHT,
          id: 1,
          name: "ground",
          opacity: 1,
          type: "tilelayer",
          visible: true,
          width: WIDTH,
          x: 0,
          y: 0
        },
        {
          data: flatten(detail),
          height: HEIGHT,
          id: 2,
          name: "detail",
          opacity: 1,
          type: "tilelayer",
          visible: true,
          width: WIDTH,
          x: 0,
          y: 0
        },
        {
          data: flatten(elevation),
          height: HEIGHT,
          id: 3,
          name: "elevation",
          opacity: 1,
          type: "tilelayer",
          visible: true,
          width: WIDTH,
          x: 0,
          y: 0
        },
        {
          data: flatten(traversal),
          height: HEIGHT,
          id: 4,
          name: "traversal",
          opacity: 1,
          type: "tilelayer",
          visible: true,
          width: WIDTH,
          x: 0,
          y: 0
        },
        {
          draworder: "topdown",
          id: 5,
          name: "objects",
          objects,
          opacity: 1,
          type: "objectgroup",
          visible: true,
          x: 0,
          y: 0
        }
      ],
      nextlayerid: 6,
      nextobjectid: nextObjectId,
      orientation: "isometric",
      renderorder: "right-down",
      tiledversion: "1.10.2",
      tileheight: 64,
      tilesets: [
        {
          firstgid: 1,
          image: "../sprites/iso-tiles.svg",
          imageheight: 64,
          imagewidth: 768,
          margin: 0,
          name: "iso-tiles",
          spacing: 0,
          tilecount: 6,
          tileheight: 64,
          tilewidth: 128
        }
      ],
      tilewidth: 128,
      type: "map",
      version: "1.10",
      width: WIDTH
    })
  };
};

const addStreetlights = (map, cells) => {
  cells.forEach(([x, y]) => map.addProp("streetlight", x, y));
};

const addCheckpoints = (map, cells) => {
  cells.forEach(([x, y]) => map.addProp("checkpoint", x, y));
};

const addCityPerimeter = (map, { left, top, right, bottom, skipCells = [] }) => {
  map.addOutlinedPropLoop("facade-wall", {
    left,
    top,
    right,
    bottom,
    skipCells
  });
};

const addBlockedBuilding = (
  map,
  { x, y, width, height, groundTile = 4, detailTile = 6, extras = [] }
) => {
  map.fillRect(map.ground, x, y, width, height, groundTile);
  map.checker(map.detail, x, y, width, height, detailTile, 5);
  map.blockRect(x, y, width, height);
  map.addOutlinedPropLoop("facade-wall", {
    left: x,
    top: y,
    right: x + width - 1,
    bottom: y + height - 1
  });
  extras.forEach(([kind, cellX, cellY]) => map.addProp(kind, cellX, cellY));
};

const addFenceLine = (map, from, to) => {
  map.addEdgePropLine("fence", from, to);
};

const fillMissionEnvelope = (map, groundTile, detailTile, detailStep) => {
  map.fillRect(
    map.ground,
    MAX_CITY_BOUNDS.left,
    MAX_CITY_BOUNDS.top,
    MAX_CITY_BOUNDS.right - MAX_CITY_BOUNDS.left + 1,
    MAX_CITY_BOUNDS.bottom - MAX_CITY_BOUNDS.top + 1,
    groundTile
  );
  map.checker(
    map.detail,
    MAX_CITY_BOUNDS.left,
    MAX_CITY_BOUNDS.top,
    MAX_CITY_BOUNDS.right - MAX_CITY_BOUNDS.left + 1,
    MAX_CITY_BOUNDS.bottom - MAX_CITY_BOUNDS.top + 1,
    detailTile,
    detailStep
  );
};

const addPipeField = (map, { x, y, width, height, rows = 2 }) => {
  map.fillRect(map.ground, x, y, width, height, 5);
  map.checker(map.detail, x, y, width, height, 6, 4);
  map.fillRect(map.elevation, x, y, width, height, 3);
  map.blockRect(x, y, width, height);

  for (let row = 0; row < rows; row += 1) {
    const pipeY = y + 2 + row * 3;
    for (let column = x + 2; column < x + width - 1; column += 4) {
      map.addProp("pipe-bank", column, pipeY);
    }
  }
};

const addVoidZone = (map, { x, y, width, height }) => {
  map.fillRect(map.ground, x, y, width, height, 6);
  map.blockRect(x, y, width, height);
};

const addFacadeFootprint = addBlockedBuilding;

const buildGlasslineCut = () => {
  const map = createBuilder();

  fillMissionEnvelope(map, 2, 1, 6);

  addBlockedBuilding(map, {
    x: 18,
    y: 36,
    width: 20,
    height: 18,
    groundTile: 4,
    detailTile: 6,
    extras: [
      ["neon", 20, 36],
      ["hvac", 28, 42],
      ["skylight", 32, 40],
      ["support-tower", 24, 46]
    ]
  });
  addPipeField(map, { x: 74, y: 36, width: 18, height: 16, rows: 3 });
  map.addProp("tank-cluster", 84, 44);
  map.addProp("support-tower", 76, 50);
  addBlockedBuilding(map, {
    x: 18,
    y: 80,
    width: 14,
    height: 14,
    groundTile: 4,
    detailTile: 6,
    extras: [
      ["door", 24, 92],
      ["terminal", 26, 86],
      ["fence", 18, 88]
    ]
  });
  addBlockedBuilding(map, {
    x: 78,
    y: 78,
    width: 16,
    height: 16,
    groundTile: 4,
    detailTile: 6,
    extras: [
      ["billboard", 86, 78],
      ["hvac", 84, 86],
      ["support-tower", 90, 90]
    ]
  });
  addVoidZone(map, { x: 40, y: 34, width: 20, height: 8 });
  addVoidZone(map, { x: 62, y: 82, width: 12, height: 12 });
  addVoidZone(map, { x: 94, y: 54, width: 6, height: 18 });

  map.fillRect(map.ground, 20, 68, 60, 10, 1);
  map.fillRect(map.ground, 40, 46, 12, 44, 1);
  map.fillRect(map.ground, 58, 58, 34, 10, 1);
  map.fillRect(map.ground, 32, 80, 30, 10, 3);
  map.fillRect(map.ground, 50, 38, 24, 24, 2);
  map.fillRect(map.ground, 54, 42, 16, 12, 3);
  map.fillRect(map.elevation, 54, 42, 16, 12, 2);
  map.checker(map.detail, 20, 68, 60, 10, 2, 4);
  map.checker(map.detail, 40, 46, 12, 44, 2, 4);
  map.checker(map.detail, 58, 58, 34, 10, 2, 4);
  map.checker(map.detail, 32, 80, 30, 10, 2, 4);
  map.checker(map.detail, 50, 38, 24, 24, 2, 4);
  map.checker(map.detail, 54, 42, 16, 12, 2, 3);
  map.strokeRect(map.detail, 54, 42, 16, 12, 2);
  addCityPerimeter(map, MAX_CITY_BOUNDS);

  addFenceLine(map, { x: 40, y: 42 }, { x: 59, y: 42 });
  addFenceLine(map, { x: 62, y: 82 }, { x: 73, y: 82 });
  addFenceLine(map, { x: 74, y: 52 }, { x: 91, y: 52 });
  addFenceLine(map, { x: 74, y: 36 }, { x: 74, y: 51 });

  map.addStairs([
    { x: 53, y: 47 },
    { x: 54, y: 47 },
    { x: 53, y: 48 },
    { x: 54, y: 48 },
    { x: 69, y: 48 },
    { x: 70, y: 48 },
    { x: 69, y: 49 },
    { x: 70, y: 49 }
  ]);
  map.addElevator({ x: 62, y: 60 }, { x: 62, y: 48 });
  map.addRoofRail(54, 42, 16, 12, [
    { x: 54, y: 47 },
    { x: 54, y: 48 },
    { x: 69, y: 48 },
    { x: 69, y: 49 }
  ]);

  map.addPlayerSpawns([
    { x: 36, y: 86 },
    { x: 38, y: 86 },
    { x: 36, y: 88 },
    { x: 38, y: 88 }
  ]);

  map.addEnemy("Broker Courier", 63, 47, "enemy-sidearm", {
    elite: true,
    objectiveTarget: true,
    rooftop: true
  });
  map.addEnemy("Escort", 58, 45, "enemy-carbine", {
    patrol: "58,45|66,45|66,51|58,51",
    rooftop: true
  });
  map.addEnemy("Sentinel", 67, 50, "enemy-needler", {
    patrol: "67,50|67,44|63,44|63,50",
    rooftop: true
  });
  map.addEnemy("Patrol", 47, 72, "enemy-carbine", {
    patrol: "43,72|57,72|57,77|43,77"
  });
  map.addEnemy("Lookout", 82, 62, "enemy-needler", {
    patrol: "74,62|88,62|88,66|74,66"
  });
  map.addEnemy("Boulevard Watch", 60, 84, "enemy-lancer");

  map.addCivilian("Pedestrian", 46, 86);
  map.addCivilian("Vendor", 56, 74);
  map.addCivilian("Clerk", 84, 66);

  [
    [28, 74],
    [66, 72],
    [86, 70]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [18, 68],
    [58, 38],
    [92, 58]
  ].forEach(([x, y]) => map.addProp("neon", x, y));
  [
    [58, 55],
    [66, 55]
  ].forEach(([x, y]) => map.addProp("door", x, y));
  [
    [56, 43],
    [67, 43],
    [56, 52],
    [67, 52]
  ].forEach(([x, y]) => map.addProp("glass", x, y));
  [
    [42, 64],
    [54, 66],
    [72, 70],
    [48, 84]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
  map.addProp("armory-locker", 42, 86, {
    interactive: true,
    interactionId: "field-armory",
    interactionLabel: "Open field armory",
    lootWeapon: "battle-rifle",
    lootAmmoAmount: 16
  });
  [
    [44, 62],
    [76, 68]
  ].forEach(([x, y]) => map.addProp("barrel", x, y));
  [
    [61, 46],
    [63, 50]
  ].forEach(([x, y]) => map.addProp("terminal", x, y));
  [
    [58, 49],
    [66, 47]
  ].forEach(([x, y]) => map.addProp("hvac", x, y));
  [
    [61, 43]
  ].forEach(([x, y]) => map.addProp("skylight", x, y));
  [
    [68, 51]
  ].forEach(([x, y]) => map.addProp("uplink", x, y));
  [
    [56, 48]
  ].forEach(([x, y]) => map.addProp("stairwell", x, y));
  [
    [24, 32],
    [84, 32]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
  addStreetlights(map, [
    [34, 80],
    [44, 80],
    [54, 80],
    [22, 68],
    [34, 68],
    [58, 68],
    [72, 68],
    [84, 58]
  ]);
  addCheckpoints(map, [
    [34, 84],
    [52, 72],
    [88, 60]
  ]);
  map.addProp("uplink", 63, 48, {
    interactive: true,
    interactionId: "spire-uplink",
    interactionLabel: "Sync rooftop uplink"
  });

  return map.toJson();
};

const buildQuietRelay = () => {
  const map = createBuilder();

  fillMissionEnvelope(map, 2, 1, 5);
  map.fillRect(map.ground, 20, 80, 28, 14, 1);
  map.fillRect(map.ground, 34, 76, 34, 12, 1);
  map.fillRect(map.ground, 46, 46, 18, 46, 1);
  map.fillRect(map.ground, 64, 46, 20, 12, 1);
  addFacadeFootprint(map, { x: 18, y: 66, width: 16, height: 10, groundTile: 4, step: 4 });
  addFacadeFootprint(map, { x: 70, y: 64, width: 14, height: 12, groundTile: 4, step: 4 });
  addFacadeFootprint(map, { x: 70, y: 88, width: 14, height: 10, groundTile: 4, step: 4 });
  map.fillRect(map.ground, 34, 64, 26, 22, 4);
  map.fillRect(map.ground, 48, 52, 24, 18, 4);
  map.fillRect(map.ground, 56, 36, 14, 14, 4);
  map.fillRect(map.elevation, 56, 36, 14, 14, 2);
  map.fillRect(map.ground, 72, 44, 12, 14, 4);
  map.fillRect(map.ground, 54, 70, 12, 8, 3);
  map.checker(map.detail, 20, 80, 28, 14, 2, 4);
  map.checker(map.detail, 34, 76, 34, 12, 2, 4);
  map.checker(map.detail, 46, 46, 18, 46, 2, 4);
  map.checker(map.detail, 48, 52, 24, 18, 2, 3);
  map.checker(map.detail, 56, 36, 14, 14, 2, 2);
  map.strokeRect(map.detail, 56, 36, 14, 14, 2);
  addCityPerimeter(map, MAX_CITY_BOUNDS);

  map.addStairs([
    { x: 55, y: 42 },
    { x: 56, y: 42 },
    { x: 55, y: 43 },
    { x: 56, y: 43 },
    { x: 69, y: 46 },
    { x: 68, y: 46 },
    { x: 69, y: 45 },
    { x: 68, y: 45 }
  ]);
  map.addElevator({ x: 62, y: 54 }, { x: 62, y: 44 });
  map.addRoofRail(56, 36, 14, 14, [
    { x: 56, y: 42 },
    { x: 56, y: 43 },
    { x: 69, y: 45 },
    { x: 69, y: 46 }
  ]);

  map.addPlayerSpawns([
    { x: 24, y: 90 },
    { x: 26, y: 90 },
    { x: 24, y: 92 },
    { x: 26, y: 92 }
  ]);
  map.addExtract(24, 88);
  map.addVip("Dr. Sera Iven", 64, 41);

  map.addEnemy("Hall Guard", 58, 60, "enemy-carbine", {
    patrol: "58,60|64,60|64,66|58,66"
  });
  map.addEnemy("Containment Guard", 61, 44, "enemy-needler", {
    patrol: "61,44|66,44|66,47|61,47",
    rooftop: true
  });
  map.addEnemy("Lab Enforcer", 67, 40, "enemy-suppressor", {
    elite: true,
    rooftop: true
  });
  map.addEnemy("Observer", 50, 64, "enemy-carbine", {
    patrol: "50,64|54,64|54,58|50,58"
  });
  map.addEnemy("Atrium Watch", 74, 48, "enemy-lancer");

  [
    [48, 70],
    [73, 58]
  ].forEach(([x, y]) => map.addProp("door", x, y));
  [
    [59, 54],
    [63, 54],
    [58, 38],
    [67, 38]
  ].forEach(([x, y]) => map.addProp("glass", x, y));
  [
    [60, 56],
    [66, 58],
    [63, 41]
  ].forEach(([x, y]) => map.addProp("terminal", x, y));
  [
    [34, 82],
    [44, 82],
    [58, 74]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [40, 66],
    [46, 78],
    [71, 52],
    [66, 70]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
  map.addProp("armory-locker", 30, 90, {
    interactive: true,
    interactionId: "field-armory",
    interactionLabel: "Open field armory",
    lootWeapon: "pdw-90",
    lootAmmoAmount: 32
  });
  [
    [55, 73],
    [69, 57]
  ].forEach(([x, y]) => map.addProp("barrier", x, y));
  [
    [52, 72]
  ].forEach(([x, y]) => map.addProp("neon", x, y));
  [
    [58, 47],
    [67, 47]
  ].forEach(([x, y]) => map.addProp("hvac", x, y));
  [
    [60, 38]
  ].forEach(([x, y]) => map.addProp("skylight", x, y));
  [
    [69, 38]
  ].forEach(([x, y]) => map.addProp("uplink", x, y));
  [
    [57, 46]
  ].forEach(([x, y]) => map.addProp("stairwell", x, y));
  [
    [22, 34],
    [72, 40]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
  addStreetlights(map, [
    [18, 42],
    [18, 74],
    [22, 96],
    [20, 78],
    [30, 78],
    [40, 78],
    [52, 74],
    [70, 56],
    [78, 48]
  ]);
  addCheckpoints(map, [
    [20, 88],
    [48, 80],
    [74, 54]
  ]);
  map.addProp("uplink", 63, 42, {
    interactive: true,
    interactionId: "aegis-relay",
    interactionLabel: "Override roof relay"
  });

  return map.toJson();
};

const buildStaticBloom = () => {
  const map = createBuilder();

  fillMissionEnvelope(map, 5, 6, 5);
  map.fillRect(map.ground, 20, 78, 26, 16, 1);
  map.fillRect(map.ground, 24, 56, 64, 28, 1);
  map.fillRect(map.ground, 44, 44, 12, 52, 1);
  map.fillRect(map.ground, 78, 44, 14, 42, 1);
  addFacadeFootprint(map, { x: 18, y: 66, width: 14, height: 12, groundTile: 5, step: 4 });
  addFacadeFootprint(map, { x: 84, y: 62, width: 12, height: 14, groundTile: 5, step: 4 });
  addFacadeFootprint(map, { x: 18, y: 86, width: 14, height: 12, groundTile: 5, step: 4 });
  addFacadeFootprint(map, { x: 62, y: 86, width: 14, height: 10, groundTile: 5, step: 4 });
  map.fillRect(map.ground, 70, 44, 12, 10, 6);
  map.fillRect(map.ground, 64, 36, 22, 16, 5);
  map.fillRect(map.elevation, 64, 36, 22, 16, 2);
  map.fillRect(map.ground, 82, 60, 12, 14, 1);
  map.fillRect(map.ground, 44, 86, 18, 8, 1);
  map.checker(map.detail, 24, 56, 64, 28, 6, 4);
  map.checker(map.detail, 44, 44, 12, 52, 6, 4);
  map.checker(map.detail, 78, 44, 14, 42, 6, 4);
  map.checker(map.detail, 64, 36, 22, 16, 6, 3);
  map.strokeRect(map.detail, 64, 36, 22, 16, 2);
  addCityPerimeter(map, MAX_CITY_BOUNDS);

  map.addStairs([
    { x: 63, y: 42 },
    { x: 64, y: 42 },
    { x: 63, y: 43 },
    { x: 64, y: 43 },
    { x: 85, y: 46 },
    { x: 84, y: 46 },
    { x: 85, y: 45 },
    { x: 84, y: 45 }
  ]);
  map.addElevator({ x: 72, y: 56 }, { x: 72, y: 44 });
  map.addRoofRail(64, 36, 22, 16, [
    { x: 64, y: 42 },
    { x: 64, y: 43 },
    { x: 85, y: 45 },
    { x: 85, y: 46 }
  ]);

  map.addPlayerSpawns([
    { x: 24, y: 90 },
    { x: 26, y: 90 },
    { x: 24, y: 92 },
    { x: 26, y: 92 }
  ]);
  map.addExtract(24, 88);
  map.addObjectiveTerminal(76, 42);

  map.addEnemy("Yard Guard", 48, 72, "enemy-carbine");
  map.addEnemy("Machine Guard", 70, 54, "enemy-suppressor", {
    patrol: "70,54|78,54|78,60|70,60"
  });
  map.addEnemy("Core Enforcer", 80, 42, "enemy-suppressor", {
    elite: true,
    rooftop: true
  });
  map.addEnemy("Road Patrol", 88, 68, "enemy-carbine", {
    patrol: "88,68|92,68|92,74|88,74"
  });
  map.addEnemy("Stack Watch", 66, 40, "enemy-needler");
  map.addEnemy("Roof Sniper", 84, 44, "enemy-lancer", {
    rooftop: true
  });

  map.addReinforcement(40, 82);
  map.addReinforcement(44, 84);

  [
    [60, 76],
    [74, 52]
  ].forEach(([x, y]) => map.addProp("door", x, y));
  [
    [76, 44],
    [81, 44]
  ].forEach(([x, y]) => map.addProp("glass", x, y));
  [
    [74, 42],
    [68, 58]
  ].forEach(([x, y]) => map.addProp("terminal", x, y));
  [
    [36, 80],
    [52, 88],
    [90, 70]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [58, 70],
    [62, 72],
    [71, 58],
    [82, 54]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
  map.addProp("armory-locker", 30, 90, {
    interactive: true,
    interactionId: "field-armory",
    interactionLabel: "Open field armory",
    lootWeapon: "machine-gun",
    lootAmmoAmount: 36
  });
  [
    [66, 60],
    [72, 60],
    [78, 50]
  ].forEach(([x, y]) => map.addProp("barrel", x, y));
  [
    [54, 74],
    [73, 48],
    [84, 60]
  ].forEach(([x, y]) => map.addProp("barrier", x, y));
  [
    [92, 66]
  ].forEach(([x, y]) => map.addProp("neon", x, y));
  [
    [66, 48],
    [82, 47]
  ].forEach(([x, y]) => map.addProp("hvac", x, y));
  [
    [68, 38]
  ].forEach(([x, y]) => map.addProp("skylight", x, y));
  [
    [84, 38]
  ].forEach(([x, y]) => map.addProp("uplink", x, y));
  [
    [65, 46]
  ].forEach(([x, y]) => map.addProp("stairwell", x, y));
  [
    [24, 34],
    [86, 40]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
  addStreetlights(map, [
    [18, 44],
    [18, 78],
    [22, 96],
    [22, 78],
    [32, 78],
    [42, 78],
    [88, 60],
    [92, 68],
    [74, 84]
  ]);
  addCheckpoints(map, [
    [24, 88],
    [44, 84],
    [86, 66]
  ]);
  map.addProp("uplink", 74, 44, {
    interactive: true,
    interactionId: "verge-uplink",
    interactionLabel: "Prime cascade uplink"
  });

  return map.toJson();
};

const outDir = path.resolve("public/maps");
const maps = {
  mission_target: buildGlasslineCut(),
  mission_rescue: buildQuietRelay(),
  mission_sabotage: buildStaticBloom()
};

Object.entries(maps).forEach(([name, data]) => {
  fs.writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
});

console.log(`Generated ${Object.keys(maps).length} large-format mission maps in ${outDir}`);
