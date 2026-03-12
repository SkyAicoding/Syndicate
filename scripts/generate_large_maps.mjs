import fs from "node:fs";
import path from "node:path";

const WIDTH = 120;
const HEIGHT = 120;

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

  const addProp = (kind, x, y, extra = {}) =>
    addObject(`prop_${kind}`, { gridX: x, gridY: y, ...extra }, `${kind}-${x}-${y}`);

  const addExtract = (x, y) =>
    addObject("marker_extract", { gridX: x, gridY: y }, `extract-${x}-${y}`);

  const addReinforcement = (x, y) =>
    addObject("spawn_reinforcement", { gridX: x, gridY: y }, `reinforce-${x}-${y}`);

  const addObjectiveTerminal = (x, y) =>
    addObject("objective_terminal", { gridX: x, gridY: y }, `terminal-${x}-${y}`);

  const addStairs = (cells) => {
    cells.forEach((cell) => setCell(traversal, cell.x, cell.y, 1));
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

  const addRoofRail = (x, y, width, height) => {
    for (let column = x; column < x + width; column += 2) {
      if (traversal[y][column] === 0) {
        addProp("barrier", column, y);
      }
      if (traversal[y + height - 1][column] === 0) {
        addProp("barrier", column, y + height - 1);
      }
    }
    for (let row = y + 1; row < y + height - 1; row += 2) {
      if (traversal[row][x] === 0) {
        addProp("barrier", x, row);
      }
      if (traversal[row][x + width - 1] === 0) {
        addProp("barrier", x + width - 1, row);
      }
    }
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
    addElevator,
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

const buildGlasslineCut = () => {
  const map = createBuilder();

  map.fillRect(map.ground, 24, 66, 58, 10, 1);
  map.fillRect(map.ground, 50, 34, 12, 50, 1);
  map.fillRect(map.ground, 22, 64, 62, 14, 2);
  map.fillRect(map.ground, 46, 32, 20, 54, 2);
  map.fillRect(map.ground, 52, 40, 20, 18, 3);
  map.fillRect(map.ground, 56, 42, 12, 10, 3);
  map.fillRect(map.elevation, 56, 42, 12, 10, 2);
  map.fillRect(map.ground, 34, 74, 12, 10, 2);
  map.fillRect(map.ground, 70, 58, 12, 10, 2);
  map.checker(map.detail, 52, 40, 20, 18, 3, 3);
  map.checker(map.detail, 24, 66, 58, 10, 2, 4);
  map.strokeRect(map.detail, 56, 42, 12, 10, 2);

  map.addStairs([
    { x: 55, y: 46 },
    { x: 56, y: 46 },
    { x: 55, y: 47 },
    { x: 56, y: 47 },
    { x: 68, y: 48 },
    { x: 67, y: 48 },
    { x: 68, y: 47 },
    { x: 67, y: 47 }
  ]);
  map.addElevator({ x: 62, y: 54 }, { x: 62, y: 49 });
  map.addRoofRail(56, 42, 12, 10);

  map.addPlayerSpawns([
    { x: 28, y: 76 },
    { x: 30, y: 76 },
    { x: 28, y: 77 },
    { x: 30, y: 77 }
  ]);

  map.addEnemy("Broker Courier", 63, 46, "pistol", {
    elite: true,
    objectiveTarget: true,
    rooftop: true
  });
  map.addEnemy("Escort", 59, 44, "rifle", {
    patrol: "59,44|64,44|64,49|59,49",
    rooftop: true
  });
  map.addEnemy("Sentinel", 66, 49, "smg", {
    patrol: "66,49|66,45|64,45|64,49",
    rooftop: true
  });
  map.addEnemy("Patrol", 51, 64, "rifle", {
    patrol: "51,64|57,64|57,71|51,71"
  });
  map.addEnemy("Lookout", 73, 66, "smg", {
    patrol: "73,66|78,66|78,72|73,72"
  });
  map.addEnemy("Boulevard Watch", 43, 74, "rifle");

  map.addCivilian("Pedestrian", 38, 80);
  map.addCivilian("Vendor", 46, 78);
  map.addCivilian("Clerk", 70, 70);

  [
    [40, 70],
    [76, 72]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [74, 40],
    [68, 60]
  ].forEach(([x, y]) => map.addProp("neon", x, y));
  [
    [60, 53],
    [64, 53]
  ].forEach(([x, y]) => map.addProp("door", x, y));
  [
    [58, 43],
    [65, 43],
    [58, 50],
    [65, 50]
  ].forEach(([x, y]) => map.addProp("glass", x, y));
  [
    [53, 60],
    [69, 62],
    [57, 74],
    [74, 64]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
  [
    [55, 61],
    [71, 63]
  ].forEach(([x, y]) => map.addProp("barrel", x, y));
  [
    [61, 45],
    [63, 50]
  ].forEach(([x, y]) => map.addProp("terminal", x, y));
  [
    [57, 49],
    [65, 47]
  ].forEach(([x, y]) => map.addProp("hvac", x, y));
  [
    [60, 43]
  ].forEach(([x, y]) => map.addProp("skylight", x, y));
  [
    [67, 50]
  ].forEach(([x, y]) => map.addProp("uplink", x, y));
  [
    [58, 47]
  ].forEach(([x, y]) => map.addProp("stairwell", x, y));
  [
    [70, 42]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
  map.addProp("uplink", 63, 48, {
    interactive: true,
    interactionId: "spire-uplink",
    interactionLabel: "Sync rooftop uplink"
  });

  return map.toJson();
};

const buildQuietRelay = () => {
  const map = createBuilder();

  map.fillRect(map.ground, 20, 80, 26, 14, 1);
  map.fillRect(map.ground, 18, 78, 30, 18, 2);
  map.fillRect(map.ground, 34, 64, 26, 22, 2);
  map.fillRect(map.ground, 48, 52, 24, 18, 4);
  map.fillRect(map.ground, 56, 36, 14, 14, 4);
  map.fillRect(map.elevation, 56, 36, 14, 14, 2);
  map.fillRect(map.ground, 72, 44, 10, 12, 4);
  map.fillRect(map.ground, 54, 70, 12, 8, 3);
  map.checker(map.detail, 48, 52, 24, 18, 4, 3);
  map.checker(map.detail, 56, 36, 14, 14, 4, 2);
  map.strokeRect(map.detail, 56, 36, 14, 14, 2);

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
  map.addRoofRail(56, 36, 14, 14);

  map.addPlayerSpawns([
    { x: 24, y: 90 },
    { x: 26, y: 90 },
    { x: 24, y: 92 },
    { x: 26, y: 92 }
  ]);
  map.addExtract(24, 88);
  map.addVip("Dr. Sera Iven", 64, 41);

  map.addEnemy("Hall Guard", 58, 60, "rifle", {
    patrol: "58,60|64,60|64,66|58,66"
  });
  map.addEnemy("Containment Guard", 61, 44, "smg", {
    patrol: "61,44|66,44|66,47|61,47",
    rooftop: true
  });
  map.addEnemy("Lab Enforcer", 67, 40, "shotgun", {
    elite: true,
    rooftop: true
  });
  map.addEnemy("Observer", 50, 64, "rifle", {
    patrol: "50,64|54,64|54,58|50,58"
  });
  map.addEnemy("Atrium Watch", 74, 48, "smg");

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
    [44, 82],
    [58, 74]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [46, 78],
    [71, 52],
    [66, 70]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
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
    [72, 40]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
  map.addProp("uplink", 63, 42, {
    interactive: true,
    interactionId: "aegis-relay",
    interactionLabel: "Override roof relay"
  });

  return map.toJson();
};

const buildStaticBloom = () => {
  const map = createBuilder();

  map.fillRect(map.ground, 20, 78, 22, 16, 2);
  map.fillRect(map.ground, 24, 56, 60, 28, 5);
  map.fillRect(map.ground, 70, 44, 12, 10, 6);
  map.fillRect(map.ground, 64, 36, 22, 16, 5);
  map.fillRect(map.elevation, 64, 36, 22, 16, 2);
  map.fillRect(map.ground, 82, 60, 12, 14, 1);
  map.fillRect(map.ground, 44, 86, 18, 8, 1);
  map.checker(map.detail, 24, 56, 60, 28, 6, 4);
  map.checker(map.detail, 64, 36, 22, 16, 5, 3);
  map.strokeRect(map.detail, 64, 36, 22, 16, 2);

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
  map.addRoofRail(64, 36, 22, 16);

  map.addPlayerSpawns([
    { x: 24, y: 90 },
    { x: 26, y: 90 },
    { x: 24, y: 92 },
    { x: 26, y: 92 }
  ]);
  map.addExtract(24, 88);
  map.addObjectiveTerminal(76, 42);

  map.addEnemy("Yard Guard", 48, 72, "rifle");
  map.addEnemy("Machine Guard", 70, 54, "smg", {
    patrol: "70,54|78,54|78,60|70,60"
  });
  map.addEnemy("Core Enforcer", 80, 42, "shotgun", {
    elite: true,
    rooftop: true
  });
  map.addEnemy("Road Patrol", 88, 68, "rifle", {
    patrol: "88,68|92,68|92,74|88,74"
  });
  map.addEnemy("Stack Watch", 66, 40, "smg");
  map.addEnemy("Roof Sniper", 84, 44, "rifle", {
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
    [90, 70]
  ].forEach(([x, y]) => map.addProp("vehicle", x, y));
  [
    [58, 70],
    [62, 72],
    [71, 58],
    [82, 54]
  ].forEach(([x, y]) => map.addProp("crate", x, y));
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
    [86, 40]
  ].forEach(([x, y]) => map.addProp("billboard", x, y));
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
