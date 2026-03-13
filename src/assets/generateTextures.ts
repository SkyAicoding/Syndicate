import Phaser from "phaser";

const diamondPoints = (width: number, height: number): Phaser.Geom.Point[] => [
  new Phaser.Geom.Point(width / 2, 0),
  new Phaser.Geom.Point(width, height / 2),
  new Phaser.Geom.Point(width / 2, height),
  new Phaser.Geom.Point(0, height / 2)
];

const drawDiamond = (
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  fill: number,
  highlight: number,
  shadow: number,
  stripe = false
): void => {
  graphics.fillStyle(fill, 1);
  graphics.fillPoints(diamondPoints(width, height), true);
  graphics.fillStyle(highlight, 0.36);
  graphics.fillPoints(
    [
      new Phaser.Geom.Point(width / 2, 4),
      new Phaser.Geom.Point(width - 6, height / 2),
      new Phaser.Geom.Point(width / 2, height / 2 + 4),
      new Phaser.Geom.Point(6, height / 2)
    ],
    true
  );
  graphics.fillStyle(shadow, 0.34);
  graphics.fillPoints(
    [
      new Phaser.Geom.Point(width / 2, height / 2 + 2),
      new Phaser.Geom.Point(width - 8, height / 2),
      new Phaser.Geom.Point(width / 2, height - 4),
      new Phaser.Geom.Point(8, height / 2)
    ],
    true
  );
  graphics.lineStyle(2, 0xffffff, 0.06);
  graphics.strokePoints(diamondPoints(width, height), true);

  if (stripe) {
    graphics.lineStyle(3, 0x73dfff, 0.18);
    graphics.beginPath();
    graphics.moveTo(width / 2, 10);
    graphics.lineTo(width - 16, height / 2);
    graphics.lineTo(width / 2, height - 10);
    graphics.strokePath();
  }
};

const drawBoxProp = (
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  topColor: number,
  sideColor: number,
  accent: number
): void => {
  const top = [
    new Phaser.Geom.Point(width / 2, 12),
    new Phaser.Geom.Point(width - 10, 30),
    new Phaser.Geom.Point(width / 2, 48),
    new Phaser.Geom.Point(10, 30)
  ];
  const left = [
    new Phaser.Geom.Point(10, 30),
    new Phaser.Geom.Point(width / 2, 48),
    new Phaser.Geom.Point(width / 2, height - 12),
    new Phaser.Geom.Point(10, height - 30)
  ];
  const right = [
    new Phaser.Geom.Point(width - 10, 30),
    new Phaser.Geom.Point(width / 2, 48),
    new Phaser.Geom.Point(width / 2, height - 12),
    new Phaser.Geom.Point(width - 10, height - 30)
  ];

  graphics.fillStyle(topColor, 1);
  graphics.fillPoints(top, true);
  graphics.fillStyle(sideColor, 1);
  graphics.fillPoints(left, true);
  graphics.fillStyle(Phaser.Display.Color.IntegerToColor(sideColor).darken(18).color, 1);
  graphics.fillPoints(right, true);
  graphics.fillStyle(accent, 0.38);
  graphics.fillRoundedRect(width / 2 - 18, height / 2 - 2, 36, 8, 4);
  graphics.lineStyle(2, 0xffffff, 0.08);
  graphics.strokePoints(top, true);
}

type SegmentDirection = "diag-left" | "diag-right";

type SegmentPoint = {
  x: number;
  y: number;
};

const orientSegment = (
  points: SegmentPoint[],
  width: number,
  direction: SegmentDirection
): Phaser.Geom.Point[] =>
  points.map(
    (point) =>
      new Phaser.Geom.Point(direction === "diag-right" ? point.x : width - point.x, point.y)
  );

const fillPanel = (
  graphics: Phaser.GameObjects.Graphics,
  points: Phaser.Geom.Point[],
  color: number,
  alpha = 1
): void => {
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(points, true);
};

const strokePanel = (
  graphics: Phaser.GameObjects.Graphics,
  points: Phaser.Geom.Point[],
  width: number,
  color: number,
  alpha = 1
): void => {
  graphics.lineStyle(width, color, alpha);
  graphics.strokePoints(points, true);
};

const drawFacadeSegment = (
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  direction: SegmentDirection
): void => {
  const wallDepth = 132;
  const postDepth = 144;
  const top = orientSegment(
    [
      { x: 22, y: 46 },
      { x: 138, y: 100 },
      { x: 126, y: 106 },
      { x: 10, y: 52 }
    ],
    width,
    direction
  );
  const face = orientSegment(
    [
      { x: 10, y: 52 },
      { x: 126, y: 106 },
      { x: 126, y: 106 + wallDepth },
      { x: 10, y: 52 + wallDepth }
    ],
    width,
    direction
  );
  const startPost = orientSegment(
    [
      { x: 10, y: 40 },
      { x: 26, y: 48 },
      { x: 26, y: 48 + postDepth },
      { x: 10, y: 40 + postDepth }
    ],
    width,
    direction
  );
  const endPost = orientSegment(
    [
      { x: 122, y: 94 },
      { x: 138, y: 102 },
      { x: 138, y: 102 + postDepth },
      { x: 122, y: 94 + postDepth }
    ],
    width,
    direction
  );

  graphics.fillStyle(0x071117, 0.2);
  graphics.fillEllipse(width / 2, height - 12, 124, 22);
  fillPanel(graphics, face, 0x1a2732, 1);
  fillPanel(graphics, top, 0x516674, 1);
  fillPanel(graphics, startPost, 0x22323e, 1);
  fillPanel(graphics, endPost, 0x101a22, 1);
  strokePanel(graphics, top, 2, 0xc5ecff, 0.1);
  strokePanel(graphics, face, 2, 0x091116, 0.34);

  const leftTop = face[0];
  const rightTop = face[1];
  const rightBottom = face[2];
  const leftBottom = face[3];
  for (let index = 1; index <= 3; index += 1) {
    const t = index / 4;
    const left = new Phaser.Math.Vector2(
      Phaser.Math.Linear(leftTop.x, leftBottom.x, t),
      Phaser.Math.Linear(leftTop.y, leftBottom.y, t)
    );
    const right = new Phaser.Math.Vector2(
      Phaser.Math.Linear(rightTop.x, rightBottom.x, t),
      Phaser.Math.Linear(rightTop.y, rightBottom.y, t)
    );
    graphics.lineStyle(2, 0x091118, 0.22);
    graphics.strokeLineShape(new Phaser.Geom.Line(left.x, left.y, right.x, right.y));
  }

  graphics.lineStyle(4, 0x79e2ff, 0.16);
  graphics.strokeLineShape(
    new Phaser.Geom.Line(
      Phaser.Math.Linear(top[0].x, top[1].x, 0.16),
      Phaser.Math.Linear(top[0].y, top[1].y, 0.16),
      Phaser.Math.Linear(top[0].x, top[1].x, 0.84),
      Phaser.Math.Linear(top[0].y, top[1].y, 0.84)
    )
  );
  graphics.fillStyle(0x99f4ff, 0.22);
  [top[0], top[1]].forEach((point) => graphics.fillCircle(point.x, point.y + 8, 4));
};

const drawFenceSegment = (
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  direction: SegmentDirection
): void => {
  const postDepth = 124;
  const postA = orientSegment(
    [
      { x: 18, y: 34 },
      { x: 30, y: 40 },
      { x: 30, y: 40 + postDepth },
      { x: 18, y: 34 + postDepth }
    ],
    width,
    direction
  );
  const postB = orientSegment(
    [
      { x: 126, y: 86 },
      { x: 138, y: 92 },
      { x: 138, y: 92 + postDepth },
      { x: 126, y: 86 + postDepth }
    ],
    width,
    direction
  );
  const upperRail = orientSegment(
    [
      { x: 24, y: 58 },
      { x: 132, y: 110 },
      { x: 124, y: 116 },
      { x: 16, y: 64 }
    ],
    width,
    direction
  );
  const lowerRail = orientSegment(
    [
      { x: 24, y: 114 },
      { x: 132, y: 166 },
      { x: 124, y: 172 },
      { x: 16, y: 120 }
    ],
    width,
    direction
  );

  graphics.fillStyle(0x071117, 0.16);
  graphics.fillEllipse(width / 2, height - 12, 120, 18);
  fillPanel(graphics, postA, 0x283642, 1);
  fillPanel(graphics, postB, 0x161f27, 1);
  fillPanel(graphics, upperRail, 0x22313b, 1);
  fillPanel(graphics, lowerRail, 0x1a252d, 1);
  strokePanel(graphics, upperRail, 2, 0xa0e9ff, 0.12);
  strokePanel(graphics, lowerRail, 2, 0x091118, 0.4);

  for (let index = 0; index < 4; index += 1) {
    const t = (index + 1) / 5;
    const topA = new Phaser.Math.Vector2(
      Phaser.Math.Linear(upperRail[0].x, upperRail[1].x, t),
      Phaser.Math.Linear(upperRail[0].y, upperRail[1].y, t)
    );
    const topB = new Phaser.Math.Vector2(
      Phaser.Math.Linear(lowerRail[0].x, lowerRail[1].x, t),
      Phaser.Math.Linear(lowerRail[0].y, lowerRail[1].y, t)
    );
    graphics.lineStyle(2, 0x314652, 0.92);
    graphics.strokeLineShape(new Phaser.Geom.Line(topA.x, topA.y, topB.x, topB.y));
  }

  graphics.lineStyle(2, 0xc88d52, 0.38);
  graphics.strokeLineShape(
    new Phaser.Geom.Line(
      Phaser.Math.Linear(upperRail[0].x, upperRail[1].x, 0.12),
      Phaser.Math.Linear(upperRail[0].y, upperRail[1].y, 0.12),
      Phaser.Math.Linear(upperRail[0].x, upperRail[1].x, 0.88),
      Phaser.Math.Linear(upperRail[0].y, upperRail[1].y, 0.88)
    )
  );
};

const createTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): void => {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
};

const createCharacterTexture = (
  scene: Phaser.Scene,
  key: string,
  bodyColor: number,
  accentColor: number,
  bulk = 0
): void => {
  createTexture(scene, key, 84, 112, (graphics) => {
    graphics.fillStyle(0x000000, 0.24);
    graphics.fillEllipse(42, 102, 34, 14);
    graphics.fillStyle(bodyColor, 1);
    graphics.fillEllipse(42, 24, 22, 18);
    graphics.fillRoundedRect(28 - bulk, 32, 28 + bulk * 2, 32, 10);
    graphics.fillRoundedRect(20 - bulk, 44, 14 + bulk, 26, 6);
    graphics.fillRoundedRect(50, 44, 14 + bulk, 26, 6);
    graphics.fillRoundedRect(31, 64, 12, 30, 5);
    graphics.fillRoundedRect(43, 64, 12, 30, 5);
    graphics.fillStyle(accentColor, 1);
    graphics.fillRoundedRect(29 - bulk, 38, 26 + bulk * 2, 9, 4);
    graphics.fillRoundedRect(47, 52, 19, 5, 2);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(28 - bulk, 32, 28 + bulk * 2, 32, 10);
  });
};

export const ensureMissionTextures = (scene: Phaser.Scene): void => {
  createTexture(scene, "tile-road", 128, 64, (graphics) =>
    drawDiamond(graphics, 128, 64, 0x1b2733, 0x355469, 0x0b1117, true)
  );
  createTexture(scene, "tile-sidewalk", 128, 64, (graphics) =>
    drawDiamond(graphics, 128, 64, 0x2a3946, 0x52697c, 0x131a22, true)
  );
  createTexture(scene, "tile-plaza", 128, 64, (graphics) =>
    drawDiamond(graphics, 128, 64, 0x253543, 0x456479, 0x151d26)
  );
  createTexture(scene, "tile-lab", 128, 64, (graphics) =>
    drawDiamond(graphics, 128, 64, 0x30404b, 0x62819b, 0x182028, true)
  );
  createTexture(scene, "tile-industrial", 128, 64, (graphics) =>
    drawDiamond(graphics, 128, 64, 0x332c2c, 0x6d5449, 0x161112, true)
  );
  createTexture(scene, "tile-hazard", 128, 64, (graphics) => {
    drawDiamond(graphics, 128, 64, 0x3a3024, 0x836438, 0x17120e);
    graphics.lineStyle(4, 0xffb246, 0.36);
    graphics.beginPath();
    graphics.moveTo(30, 38);
    graphics.lineTo(58, 22);
    graphics.lineTo(86, 38);
    graphics.strokePath();
  });

  createTexture(scene, "prop-barrier", 92, 88, (graphics) =>
    drawBoxProp(graphics, 92, 88, 0x4d6a7a, 0x243542, 0x45d8ff)
  );
  createTexture(scene, "prop-crate", 82, 82, (graphics) =>
    drawBoxProp(graphics, 82, 82, 0x54606d, 0x293540, 0x9effd5)
  );
  createTexture(scene, "prop-armory-locker", 92, 138, (graphics) => {
    drawBoxProp(graphics, 92, 126, 0x445360, 0x202b35, 0x62d8ff);
    graphics.fillStyle(0x62d8ff, 0.18);
    graphics.fillRoundedRect(24, 24, 44, 22, 6);
    graphics.fillStyle(0x9fe7ff, 0.58);
    graphics.fillRoundedRect(29, 30, 34, 8, 4);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(22, 16, 48, 102, 10);
    graphics.fillStyle(0x0b1318, 0.74);
    graphics.fillRoundedRect(30, 58, 30, 34, 5);
    graphics.fillStyle(0x62d8ff, 0.2);
    graphics.fillEllipse(46, 32, 54, 36);
  });
  createTexture(scene, "prop-weapon-drop", 72, 46, (graphics) => {
    graphics.fillStyle(0x0d1418, 0.8);
    graphics.fillRoundedRect(14, 18, 44, 14, 6);
    graphics.lineStyle(2, 0x7ddfff, 0.34);
    graphics.strokeRoundedRect(14, 18, 44, 14, 6);
    graphics.fillStyle(0x7ddfff, 0.36);
    graphics.fillRoundedRect(20, 21, 26, 4, 2);
    graphics.fillStyle(0x9cf6d3, 0.28);
    graphics.fillRoundedRect(48, 20, 6, 10, 2);
    graphics.fillStyle(0x000000, 0.22);
    graphics.fillEllipse(36, 34, 34, 10);
  });
  createTexture(scene, "prop-terminal", 84, 118, (graphics) => {
    drawBoxProp(graphics, 84, 104, 0x394852, 0x18252e, 0x58d5ff);
    graphics.fillStyle(0x58d5ff, 0.55);
    graphics.fillRoundedRect(26, 26, 32, 22, 5);
    graphics.fillStyle(0x83fff2, 0.24);
    graphics.fillEllipse(42, 10, 50, 20);
  });
  createTexture(scene, "prop-door", 90, 132, (graphics) => {
    graphics.fillStyle(0x1b2832, 1);
    graphics.fillRoundedRect(22, 16, 46, 104, 12);
    graphics.fillStyle(0x4ee4ff, 0.26);
    graphics.fillRoundedRect(39, 20, 12, 96, 8);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(22, 16, 46, 104, 12);
  });
  createTexture(scene, "prop-glass", 92, 132, (graphics) => {
    graphics.fillStyle(0x72cfff, 0.14);
    graphics.fillRoundedRect(18, 18, 56, 96, 10);
    graphics.lineStyle(4, 0x94ecff, 0.24);
    graphics.strokeRoundedRect(18, 18, 56, 96, 10);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 26, 62, 92));
  });
  createTexture(scene, "prop-vehicle", 128, 100, (graphics) => {
    drawBoxProp(graphics, 128, 90, 0x2f4858, 0x172630, 0x6fe2ff);
    graphics.fillStyle(0xa7f5ff, 0.18);
    graphics.fillRoundedRect(42, 24, 44, 12, 5);
  });
  createTexture(scene, "prop-neon", 72, 132, (graphics) => {
    graphics.fillStyle(0x151f27, 1);
    graphics.fillRoundedRect(24, 16, 20, 98, 8);
    graphics.fillStyle(0x48d3ff, 0.65);
    graphics.fillRoundedRect(28, 22, 12, 34, 5);
    graphics.fillStyle(0x7affcb, 0.55);
    graphics.fillRoundedRect(28, 60, 12, 42, 5);
    graphics.fillStyle(0x48d3ff, 0.16);
    graphics.fillEllipse(34, 36, 46, 66);
  });
  createTexture(scene, "prop-barrel", 64, 92, (graphics) => {
    graphics.fillStyle(0x3d4b55, 1);
    graphics.fillEllipse(32, 18, 26, 12);
    graphics.fillRoundedRect(19, 18, 26, 54, 8);
    graphics.fillStyle(0xff9648, 0.62);
    graphics.fillRoundedRect(21, 34, 22, 12, 4);
    graphics.fillStyle(0x000000, 0.22);
    graphics.fillEllipse(32, 76, 26, 10);
  });
  createTexture(scene, "prop-hvac", 118, 108, (graphics) => {
    drawBoxProp(graphics, 118, 100, 0x526672, 0x23313c, 0x72efff);
    graphics.fillStyle(0x0c151b, 0.9);
    graphics.fillRoundedRect(24, 28, 70, 22, 6);
    graphics.lineStyle(2, 0x7ddfff, 0.2);
    for (let index = 0; index < 5; index += 1) {
      const x = 28 + index * 12;
      graphics.strokeLineShape(new Phaser.Geom.Line(x, 30, x, 48));
    }
    graphics.fillStyle(0x7de1ff, 0.24);
    graphics.fillRoundedRect(82, 26, 16, 44, 5);
  });
  createTexture(scene, "prop-skylight", 108, 72, (graphics) => {
    graphics.fillStyle(0x0b141b, 0.26);
    graphics.fillEllipse(54, 56, 74, 20);
    graphics.fillStyle(0x7cdfff, 0.22);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(24, 42),
        new Phaser.Geom.Point(54, 20),
        new Phaser.Geom.Point(84, 42),
        new Phaser.Geom.Point(54, 60)
      ],
      true
    );
    graphics.lineStyle(3, 0xa8f3ff, 0.28);
    graphics.strokePoints(
      [
        new Phaser.Geom.Point(24, 42),
        new Phaser.Geom.Point(54, 20),
        new Phaser.Geom.Point(84, 42),
        new Phaser.Geom.Point(54, 60)
      ],
      true
    );
    graphics.lineStyle(2, 0xffffff, 0.14);
    graphics.strokeLineShape(new Phaser.Geom.Line(54, 22, 54, 58));
  });
  createTexture(scene, "prop-uplink", 92, 138, (graphics) => {
    graphics.fillStyle(0x0a141b, 0.22);
    graphics.fillEllipse(46, 118, 44, 14);
    graphics.fillStyle(0x253441, 1);
    graphics.fillRoundedRect(36, 84, 20, 28, 6);
    graphics.lineStyle(4, 0x7de1ff, 0.3);
    graphics.beginPath();
    graphics.moveTo(46, 32);
    graphics.lineTo(46, 86);
    graphics.strokePath();
    graphics.fillStyle(0x2f4859, 1);
    graphics.fillEllipse(46, 28, 46, 18);
    graphics.lineStyle(3, 0x9cf5ff, 0.32);
    graphics.strokeEllipse(46, 28, 46, 18);
    graphics.lineStyle(2, 0xffffff, 0.12);
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 26, 64, 30));
  });
  createTexture(scene, "prop-stairwell", 118, 142, (graphics) => {
    drawBoxProp(graphics, 118, 132, 0x4a5764, 0x202b35, 0x7cf1ff);
    graphics.fillStyle(0x0e161d, 0.92);
    graphics.fillRoundedRect(42, 34, 34, 72, 8);
    graphics.fillStyle(0x7de1ff, 0.26);
    graphics.fillRoundedRect(54, 40, 10, 58, 5);
    graphics.fillStyle(0x9cf5ff, 0.18);
    graphics.fillEllipse(59, 20, 48, 18);
  });
  createTexture(scene, "prop-billboard", 138, 176, (graphics) => {
    graphics.fillStyle(0x081117, 0.22);
    graphics.fillEllipse(69, 150, 70, 18);
    graphics.fillStyle(0x22313d, 1);
    graphics.fillRoundedRect(62, 70, 14, 76, 6);
    graphics.fillStyle(0x19232d, 1);
    graphics.fillRoundedRect(24, 16, 90, 58, 10);
    graphics.lineStyle(4, 0x7de1ff, 0.28);
    graphics.strokeRoundedRect(24, 16, 90, 58, 10);
    graphics.fillStyle(0x51d8ff, 0.18);
    graphics.fillRoundedRect(30, 24, 78, 18, 6);
    graphics.fillStyle(0x9dffcf, 0.2);
    graphics.fillRoundedRect(30, 46, 56, 14, 6);
    graphics.fillStyle(0xffffff, 0.08);
    graphics.fillRoundedRect(90, 46, 12, 14, 5);
  });
  createTexture(scene, "prop-facade-wall-diag-right", 172, 272, (graphics) => {
    drawFacadeSegment(graphics, 172, 272, "diag-right");
  });
  createTexture(scene, "prop-facade-wall-diag-left", 172, 272, (graphics) => {
    drawFacadeSegment(graphics, 172, 272, "diag-left");
  });
  createTexture(scene, "prop-fence-diag-right", 172, 232, (graphics) => {
    drawFenceSegment(graphics, 172, 232, "diag-right");
  });
  createTexture(scene, "prop-fence-diag-left", 172, 232, (graphics) => {
    drawFenceSegment(graphics, 172, 232, "diag-left");
  });
  createTexture(scene, "prop-facade-wall", 146, 188, (graphics) => {
    graphics.fillStyle(0x071118, 0.2);
    graphics.fillEllipse(73, 162, 84, 20);
    graphics.fillStyle(0x1b2832, 1);
    graphics.fillRoundedRect(28, 18, 90, 152, 10);
    graphics.fillStyle(0x263845, 1);
    graphics.fillRoundedRect(34, 30, 78, 34, 8);
    graphics.fillRoundedRect(34, 76, 78, 32, 8);
    graphics.fillStyle(0xbff8ff, 0.14);
    graphics.fillRoundedRect(42, 40, 62, 14, 5);
    graphics.fillRoundedRect(42, 86, 62, 12, 5);
    graphics.fillStyle(0x54dbff, 0.22);
    graphics.fillRoundedRect(52, 142, 42, 10, 5);
    graphics.lineStyle(2, 0x9defff, 0.16);
    graphics.strokeRoundedRect(28, 18, 90, 152, 10);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeRoundedRect(34, 30, 78, 34, 8);
    graphics.strokeRoundedRect(34, 76, 78, 32, 8);
  });
  createTexture(scene, "prop-facade-corner", 158, 206, (graphics) => {
    graphics.fillStyle(0x081118, 0.2);
    graphics.fillEllipse(79, 178, 90, 22);
    graphics.fillStyle(0x1c2b36, 1);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(60, 20),
        new Phaser.Geom.Point(116, 42),
        new Phaser.Geom.Point(116, 174),
        new Phaser.Geom.Point(60, 188),
        new Phaser.Geom.Point(24, 164),
        new Phaser.Geom.Point(24, 44)
      ],
      true
    );
    graphics.fillStyle(0x3a4d5b, 1);
    graphics.fillRoundedRect(58, 18, 22, 164, 10);
    graphics.fillStyle(0x263947, 1);
    graphics.fillRoundedRect(36, 46, 22, 108, 6);
    graphics.fillRoundedRect(82, 52, 24, 98, 6);
    graphics.fillStyle(0xc6f6ff, 0.12);
    graphics.fillRoundedRect(86, 72, 16, 20, 4);
    graphics.fillRoundedRect(86, 102, 16, 20, 4);
    graphics.fillStyle(0x54dbff, 0.24);
    graphics.fillRoundedRect(64, 30, 10, 142, 5);
    graphics.lineStyle(2, 0x9defff, 0.16);
    graphics.strokeRoundedRect(58, 18, 22, 164, 10);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokePoints(
      [
        new Phaser.Geom.Point(60, 20),
        new Phaser.Geom.Point(116, 42),
        new Phaser.Geom.Point(116, 174),
        new Phaser.Geom.Point(60, 188),
        new Phaser.Geom.Point(24, 164),
        new Phaser.Geom.Point(24, 44)
      ],
      true
    );
  });
  createTexture(scene, "prop-checkpoint", 154, 134, (graphics) => {
    drawBoxProp(graphics, 118, 108, 0x425665, 0x1d2a34, 0x72efff);
    graphics.fillStyle(0x15212a, 1);
    graphics.fillRoundedRect(18, 28, 70, 54, 8);
    graphics.fillStyle(0x83f5ff, 0.18);
    graphics.fillRoundedRect(24, 34, 58, 18, 6);
    graphics.fillStyle(0x242c33, 1);
    graphics.fillRoundedRect(92, 10, 14, 90, 6);
    graphics.fillStyle(0x72efff, 0.34);
    graphics.fillRoundedRect(96, 22, 6, 24, 3);
    graphics.lineStyle(6, 0xffb864, 0.72);
    graphics.beginPath();
    graphics.moveTo(16, 72);
    graphics.lineTo(4, 96);
    graphics.lineTo(58, 114);
    graphics.strokePath();
    graphics.lineStyle(2, 0xffffff, 0.18);
    graphics.strokeRoundedRect(18, 28, 70, 54, 8);
  });
  createTexture(scene, "prop-streetlight", 84, 196, (graphics) => {
    graphics.fillStyle(0x081117, 0.22);
    graphics.fillEllipse(42, 178, 44, 16);
    graphics.fillStyle(0x1e2b35, 1);
    graphics.fillRoundedRect(22, 126, 40, 42, 8);
    graphics.fillRoundedRect(36, 26, 12, 112, 6);
    graphics.fillRoundedRect(28, 18, 28, 10, 5);
    graphics.fillRoundedRect(18, 16, 22, 8, 4);
    graphics.fillRoundedRect(44, 16, 22, 8, 4);
    graphics.fillStyle(0xf1ffff, 0.82);
    graphics.fillRoundedRect(18, 20, 20, 6, 3);
    graphics.fillRoundedRect(46, 20, 20, 6, 3);
    graphics.fillStyle(0x72efff, 0.22);
    graphics.fillRoundedRect(30, 136, 24, 8, 4);
    graphics.fillCircle(54, 44, 7);
    graphics.lineStyle(2, 0x9defff, 0.14);
    graphics.strokeRoundedRect(22, 126, 40, 42, 8);
    graphics.strokeCircle(54, 44, 7);
  });
  createTexture(scene, "prop-fence", 156, 118, (graphics) => {
    graphics.fillStyle(0x071117, 0.2);
    graphics.fillEllipse(78, 102, 112, 20);
    graphics.fillStyle(0x1d2b35, 1);
    graphics.fillRoundedRect(10, 76, 136, 12, 5);
    graphics.fillRoundedRect(18, 18, 18, 66, 6);
    graphics.fillRoundedRect(120, 18, 18, 66, 6);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(18, 18, 18, 66, 6);
    graphics.strokeRoundedRect(120, 18, 18, 66, 6);
    graphics.lineStyle(2, 0x9defff, 0.2);
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 20, 128, 20));
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 74, 128, 74));
    graphics.lineStyle(2, 0x314653, 0.92);
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 20, 28, 74));
    graphics.strokeLineShape(new Phaser.Geom.Line(78, 20, 78, 74));
    graphics.strokeLineShape(new Phaser.Geom.Line(128, 20, 128, 74));
    graphics.lineStyle(1, 0xaed7e6, 0.2);
    for (let x = 30; x <= 122; x += 10) {
      graphics.strokeLineShape(new Phaser.Geom.Line(x, 24, x + 24, 70));
      graphics.strokeLineShape(new Phaser.Geom.Line(x + 24, 24, x, 70));
    }
    graphics.lineStyle(4, 0x2b3944, 0.95);
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 20, 78, 48));
    graphics.strokeLineShape(new Phaser.Geom.Line(78, 48, 128, 20));
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 74, 78, 48));
    graphics.strokeLineShape(new Phaser.Geom.Line(78, 48, 128, 74));
    graphics.fillStyle(0xffb86c, 0.82);
    graphics.fillRoundedRect(22, 24, 10, 12, 3);
    graphics.fillRoundedRect(124, 24, 10, 12, 3);
    graphics.fillStyle(0x59ddff, 0.26);
    graphics.fillRoundedRect(24, 42, 6, 18, 3);
    graphics.fillRoundedRect(126, 42, 6, 18, 3);
  });
  createTexture(scene, "prop-pipe-bank", 176, 122, (graphics) => {
    graphics.fillStyle(0x091117, 0.2);
    graphics.fillEllipse(88, 104, 126, 18);
    graphics.fillStyle(0x17232b, 1);
    graphics.fillRoundedRect(14, 78, 148, 18, 6);
    const rows = [
      { y: 30, radius: 15, color: 0x2e3338 },
      { y: 48, radius: 14, color: 0x3c4348 },
      { y: 66, radius: 13, color: 0x2d3136 }
    ];
    rows.forEach((row, rowIndex) => {
      for (let x = 28; x <= 144; x += 28) {
        graphics.fillStyle(row.color, 1);
        graphics.fillEllipse(x, row.y, row.radius * 2.4, row.radius);
        graphics.fillRoundedRect(x - 22, row.y, 44, 36 - rowIndex * 4, 8);
        graphics.fillStyle(0xb88749, 0.55);
        graphics.fillRoundedRect(x - 6, row.y + 8, 12, 6, 3);
      }
    });
    graphics.fillStyle(0x23323d, 1);
    graphics.fillRoundedRect(14, 26, 12, 62, 5);
    graphics.fillRoundedRect(150, 26, 12, 62, 5);
    graphics.lineStyle(2, 0xffffff, 0.07);
    graphics.strokeRoundedRect(14, 78, 148, 18, 6);
    graphics.lineStyle(2, 0x7de1ff, 0.12);
    graphics.strokeRoundedRect(20, 82, 136, 10, 4);
  });
  createTexture(scene, "prop-support-tower", 150, 214, (graphics) => {
    graphics.fillStyle(0x081017, 0.22);
    graphics.fillEllipse(75, 188, 94, 18);
    graphics.fillStyle(0x18242d, 1);
    graphics.fillRoundedRect(24, 166, 102, 22, 7);
    graphics.fillRoundedRect(40, 20, 70, 24, 6);
    graphics.fillRoundedRect(48, 64, 54, 18, 6);
    graphics.fillRoundedRect(62, 12, 26, 20, 6);
    graphics.lineStyle(5, 0x243540, 0.96);
    graphics.strokeLineShape(new Phaser.Geom.Line(42, 40, 58, 166));
    graphics.strokeLineShape(new Phaser.Geom.Line(108, 40, 92, 166));
    graphics.strokeLineShape(new Phaser.Geom.Line(58, 40, 92, 166));
    graphics.strokeLineShape(new Phaser.Geom.Line(92, 40, 58, 166));
    graphics.lineStyle(4, 0x314854, 0.84);
    graphics.strokeLineShape(new Phaser.Geom.Line(48, 74, 102, 74));
    graphics.strokeLineShape(new Phaser.Geom.Line(36, 128, 114, 128));
    graphics.strokeLineShape(new Phaser.Geom.Line(48, 74, 92, 128));
    graphics.strokeLineShape(new Phaser.Geom.Line(102, 74, 58, 128));
    graphics.fillStyle(0x243540, 1);
    graphics.fillRoundedRect(68, 36, 14, 126, 5);
    graphics.fillStyle(0xffb86c, 0.8);
    [
      [36, 172],
      [108, 172],
      [50, 132],
      [100, 132],
      [58, 78],
      [92, 78]
    ].forEach(([x, y]) => graphics.fillCircle(x, y, 4));
    graphics.fillStyle(0x5de1ff, 0.2);
    graphics.fillRoundedRect(52, 22, 46, 8, 4);
    graphics.lineStyle(2, 0xffffff, 0.08);
    graphics.strokeRoundedRect(24, 166, 102, 22, 7);
    graphics.strokeRoundedRect(40, 20, 70, 24, 6);
  });
  createTexture(scene, "prop-tank-cluster", 188, 194, (graphics) => {
    graphics.fillStyle(0x081017, 0.22);
    graphics.fillEllipse(94, 170, 132, 18);
    graphics.fillStyle(0x17242e, 1);
    graphics.fillRoundedRect(14, 134, 160, 22, 8);
    const tanks = [
      { x: 54, top: 40, height: 94, width: 36 },
      { x: 94, top: 22, height: 112, width: 42 },
      { x: 134, top: 44, height: 90, width: 36 }
    ];
    tanks.forEach((tank) => {
      graphics.fillStyle(0x374148, 1);
      graphics.fillEllipse(tank.x, tank.top, tank.width, 16);
      graphics.fillRoundedRect(tank.x - tank.width / 2, tank.top, tank.width, tank.height, 12);
      graphics.fillStyle(0xb8cad0, 0.12);
      graphics.fillRoundedRect(tank.x - tank.width / 2 + 6, tank.top + 8, 6, tank.height - 16, 3);
      graphics.lineStyle(2, 0xffffff, 0.08);
      graphics.strokeRoundedRect(tank.x - tank.width / 2, tank.top, tank.width, tank.height, 12);
      graphics.lineStyle(2, 0xc89c5c, 0.44);
      graphics.strokeEllipse(tank.x, tank.top + 48, tank.width - 4, 8);
    });
    graphics.lineStyle(2, 0x283844, 0.95);
    graphics.strokeLineShape(new Phaser.Geom.Line(26, 136, 162, 136));
    graphics.strokeLineShape(new Phaser.Geom.Line(40, 118, 148, 118));
    graphics.lineStyle(2, 0x7de1ff, 0.1);
    graphics.strokeRoundedRect(20, 138, 148, 10, 4);
  });

  createTexture(scene, "nav-stairs", 128, 76, (graphics) => {
    graphics.fillStyle(0x0d1720, 0.22);
    graphics.fillEllipse(64, 58, 84, 20);
    for (let index = 0; index < 5; index += 1) {
      const inset = index * 8;
      graphics.fillStyle(0x243648 + index * 0x020202, 1);
      graphics.fillPoints(
        [
          new Phaser.Geom.Point(30 + inset, 48 - index * 4),
          new Phaser.Geom.Point(64, 30 - index * 4),
          new Phaser.Geom.Point(98 - inset, 48 - index * 4),
          new Phaser.Geom.Point(64, 58 - index * 4)
        ],
        true
      );
    }
    graphics.lineStyle(2, 0x7de1ff, 0.24);
    graphics.strokeEllipse(64, 52, 70, 16);
  });

  createTexture(scene, "nav-elevator", 92, 92, (graphics) => {
    graphics.fillStyle(0x07131c, 0.44);
    graphics.fillEllipse(46, 58, 54, 18);
    graphics.fillStyle(0x173041, 1);
    graphics.fillEllipse(46, 48, 42, 18);
    graphics.lineStyle(4, 0x7de1ff, 0.42);
    graphics.strokeEllipse(46, 48, 42, 18);
    graphics.lineStyle(3, 0xffffff, 0.18);
    graphics.beginPath();
    graphics.moveTo(46, 20);
    graphics.lineTo(46, 42);
    graphics.strokePath();
    graphics.fillStyle(0x7de1ff, 0.68);
    graphics.fillTriangle(46, 12, 38, 26, 54, 26);
  });

  createCharacterTexture(scene, "unit-player-operator", 0xd7e9f6, 0x3dc9ff, 0);
  createCharacterTexture(scene, "unit-player-breacher", 0xe4ded8, 0xffa154, 4);
  createCharacterTexture(scene, "unit-player-infiltrator", 0xd2efe0, 0x7fffcb, 0);
  createCharacterTexture(scene, "unit-player-support", 0xf3ead3, 0xffd96b, 0);
  createCharacterTexture(scene, "unit-enemy-rifle", 0x8aa0b5, 0xff6d6d, 1);
  createCharacterTexture(scene, "unit-enemy-smg", 0x91a6b9, 0xff6d6d, 0);
  createCharacterTexture(scene, "unit-enemy-shotgun", 0x8d9cad, 0xff8e66, 3);
  createCharacterTexture(scene, "unit-civilian", 0x9aa8b8, 0x8ec0ff, 0);
  createCharacterTexture(scene, "unit-vip", 0xf0f7ff, 0x72efff, 0);

  createTexture(scene, "selection-ring", 96, 42, (graphics) => {
    graphics.lineStyle(3, 0x59dfff, 0.85);
    graphics.strokeEllipse(48, 21, 60, 24);
    graphics.lineStyle(1, 0xffffff, 0.25);
    graphics.strokeEllipse(48, 21, 42, 18);
  });
  createTexture(scene, "selection-ring-enemy", 96, 42, (graphics) => {
    graphics.lineStyle(3, 0xff7878, 0.55);
    graphics.strokeEllipse(48, 21, 58, 22);
  });
  createTexture(scene, "objective-marker", 42, 96, (graphics) => {
    graphics.fillStyle(0x72efff, 0.24);
    graphics.fillEllipse(21, 30, 34, 48);
    graphics.lineStyle(3, 0x72efff, 0.9);
    graphics.strokeEllipse(21, 30, 24, 34);
    graphics.lineStyle(2, 0xffffff, 0.4);
    graphics.beginPath();
    graphics.moveTo(21, 0);
    graphics.lineTo(21, 84);
    graphics.strokePath();
  });
  createTexture(scene, "flash", 32, 32, (graphics) => {
    graphics.fillStyle(0xfff6c6, 1);
    graphics.fillCircle(16, 16, 7);
    graphics.fillStyle(0xffaf5a, 0.8);
    graphics.fillCircle(16, 16, 12);
  });
  createTexture(scene, "spark", 20, 20, (graphics) => {
    graphics.fillStyle(0x9befff, 1);
    graphics.fillCircle(10, 10, 4);
    graphics.lineStyle(2, 0xffffff, 0.6);
    graphics.strokeCircle(10, 10, 7);
  });
  createTexture(scene, "smoke", 48, 48, (graphics) => {
    graphics.fillStyle(0xa3bdcf, 0.18);
    graphics.fillCircle(20, 24, 14);
    graphics.fillCircle(30, 18, 12);
    graphics.fillCircle(31, 30, 14);
  });
  createTexture(scene, "command-marker", 44, 24, (graphics) => {
    graphics.lineStyle(3, 0x7de1ff, 0.95);
    graphics.strokeEllipse(22, 12, 30, 12);
  });
  createTexture(scene, "tile-mark-road", 128, 64, (graphics) => {
    graphics.lineStyle(3, 0xe9fbff, 0.18);
    graphics.strokeLineShape(new Phaser.Geom.Line(54, 14, 72, 50));
    graphics.strokeLineShape(new Phaser.Geom.Line(70, 14, 88, 50));
    graphics.lineStyle(2, 0x7de1ff, 0.12);
    graphics.strokeLineShape(new Phaser.Geom.Line(20, 32, 48, 18));
    graphics.strokeLineShape(new Phaser.Geom.Line(80, 46, 108, 32));
  });
  createTexture(scene, "tile-mark-sidewalk", 128, 64, (graphics) => {
    graphics.lineStyle(2, 0xbff6ff, 0.14);
    graphics.strokePoints(
      [
        new Phaser.Geom.Point(64, 8),
        new Phaser.Geom.Point(108, 32),
        new Phaser.Geom.Point(64, 56),
        new Phaser.Geom.Point(20, 32)
      ],
      true
    );
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(44, 22, 84, 22));
    graphics.strokeLineShape(new Phaser.Geom.Line(44, 42, 84, 42));
  });
  createTexture(scene, "tile-mark-plaza", 128, 64, (graphics) => {
    graphics.lineStyle(2, 0xdaf8ff, 0.1);
    graphics.strokeLineShape(new Phaser.Geom.Line(36, 18, 92, 18));
    graphics.strokeLineShape(new Phaser.Geom.Line(28, 32, 100, 32));
    graphics.strokeLineShape(new Phaser.Geom.Line(36, 46, 92, 46));
    graphics.lineStyle(1, 0x7de1ff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(52, 14, 52, 50));
    graphics.strokeLineShape(new Phaser.Geom.Line(76, 14, 76, 50));
  });
  createTexture(scene, "tile-mark-industrial", 128, 64, (graphics) => {
    graphics.lineStyle(2, 0xffbf74, 0.14);
    graphics.strokeLineShape(new Phaser.Geom.Line(30, 38, 54, 24));
    graphics.strokeLineShape(new Phaser.Geom.Line(54, 24, 78, 38));
    graphics.strokeLineShape(new Phaser.Geom.Line(78, 38, 98, 26));
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(42, 16, 86, 16));
    graphics.strokeLineShape(new Phaser.Geom.Line(42, 48, 86, 48));
  });
  createTexture(scene, "tile-overlay-interior", 128, 64, (graphics) => {
    graphics.fillStyle(0x6ed9ff, 0.08);
    graphics.fillPoints(diamondPoints(128, 64), true);
    graphics.lineStyle(2, 0xbef8ff, 0.18);
    graphics.strokePoints(diamondPoints(128, 64), true);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(32, 32, 96, 32));
    graphics.strokeLineShape(new Phaser.Geom.Line(64, 14, 64, 50));
  });
  createTexture(scene, "tile-overlay-roof", 128, 64, (graphics) => {
    graphics.lineStyle(2, 0x8ef0ff, 0.12);
    graphics.strokePoints(diamondPoints(128, 64), true);
    graphics.lineStyle(2, 0x8ef0ff, 0.09);
    graphics.strokeLineShape(new Phaser.Geom.Line(26, 36, 54, 20));
    graphics.strokeLineShape(new Phaser.Geom.Line(54, 20, 82, 36));
    graphics.strokeLineShape(new Phaser.Geom.Line(82, 36, 102, 24));
  });
  createTexture(scene, "tile-ceiling-panel", 128, 64, (graphics) => {
    graphics.fillStyle(0x3f515e, 0.95);
    graphics.fillPoints(diamondPoints(128, 64), true);
    graphics.fillStyle(0x7f9aab, 0.12);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(64, 6),
        new Phaser.Geom.Point(114, 32),
        new Phaser.Geom.Point(64, 58),
        new Phaser.Geom.Point(14, 32)
      ],
      true
    );
    graphics.lineStyle(2, 0xd4edf7, 0.14);
    graphics.strokePoints(diamondPoints(128, 64), true);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeLineShape(new Phaser.Geom.Line(64, 10, 64, 54));
    graphics.strokeLineShape(new Phaser.Geom.Line(24, 32, 104, 32));
  });
  createTexture(scene, "roof-ring", 84, 40, (graphics) => {
    graphics.lineStyle(3, 0x8ef0ff, 0.42);
    graphics.strokeEllipse(42, 20, 56, 18);
    graphics.lineStyle(1, 0xffffff, 0.2);
    graphics.strokeEllipse(42, 20, 34, 12);
  });
  createTexture(scene, "roof-drift", 56, 28, (graphics) => {
    graphics.lineStyle(2, 0x9cf4ff, 0.2);
    graphics.beginPath();
    graphics.moveTo(4, 18);
    graphics.lineTo(18, 10);
    graphics.lineTo(32, 16);
    graphics.lineTo(52, 8);
    graphics.strokePath();
  });
  createTexture(scene, "rain-streak", 6, 20, (graphics) => {
    graphics.lineStyle(2, 0xa7f3ff, 0.35);
    graphics.beginPath();
    graphics.moveTo(1, 0);
    graphics.lineTo(5, 20);
    graphics.strokePath();
  });
};
