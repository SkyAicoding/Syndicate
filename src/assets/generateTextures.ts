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
