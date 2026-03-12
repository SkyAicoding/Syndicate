import Phaser from "phaser";
import {
  CAMERA_ZOOM_DEFAULT,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN
} from "../data/constants";

interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class CameraController {
  private readonly scene: Phaser.Scene;

  private readonly cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  private readonly moveKeys: { [key: string]: Phaser.Input.Keyboard.Key };

  private targetX = 0;

  private targetY = 0;

  private targetZoom = CAMERA_ZOOM_DEFAULT;

  private targetFloorBiasY = 0;

  private currentFloorBiasY = 0;

  private targetFloorZoomOffset = 0;

  private currentFloorZoomOffset = 0;

  private bounds: CameraBounds = {
    minX: -500,
    maxX: 500,
    minY: -500,
    maxY: 500
  };

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cursorKeys = scene.input.keyboard!.createCursorKeys();
    this.moveKeys = scene.input.keyboard!.addKeys("W,A,S,D") as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };
    scene.input.on("wheel", (_pointer: unknown, _go: unknown, _dx: number, dy: number) => {
      this.targetZoom = Phaser.Math.Clamp(this.targetZoom - dy * 0.001, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
    });
  }

  public setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
  }

  public centerOn(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public setFloorFocus(level: number): void {
    this.targetFloorBiasY = level * 34;
    this.targetFloorZoomOffset = Math.min(0.08, level * 0.03);
  }

  public update(deltaSeconds: number, edgeScroll: boolean): void {
    const camera = this.scene.cameras.main;
    const pointer = this.scene.input.activePointer;
    const speed = 620 * deltaSeconds / camera.zoom;
    const padding = 26;

    if (this.cursorKeys.left.isDown || this.moveKeys.A.isDown) {
      this.targetX -= speed;
    }
    if (this.cursorKeys.right.isDown || this.moveKeys.D.isDown) {
      this.targetX += speed;
    }
    if (this.cursorKeys.up.isDown || this.moveKeys.W.isDown) {
      this.targetY -= speed;
    }
    if (this.cursorKeys.down.isDown || this.moveKeys.S.isDown) {
      this.targetY += speed;
    }

    if (edgeScroll) {
      if (pointer.x < padding) {
        this.targetX -= speed * 0.9;
      }
      if (pointer.x > camera.width - padding) {
        this.targetX += speed * 0.9;
      }
      if (pointer.y < padding) {
        this.targetY -= speed * 0.9;
      }
      if (pointer.y > camera.height - padding) {
        this.targetY += speed * 0.9;
      }
    }

    this.targetX = Phaser.Math.Clamp(this.targetX, this.bounds.minX, this.bounds.maxX);
    this.targetY = Phaser.Math.Clamp(this.targetY, this.bounds.minY, this.bounds.maxY);
    this.currentFloorBiasY = Phaser.Math.Linear(this.currentFloorBiasY, this.targetFloorBiasY, 0.14);
    this.currentFloorZoomOffset = Phaser.Math.Linear(
      this.currentFloorZoomOffset,
      this.targetFloorZoomOffset,
      0.16
    );

    camera.scrollX = Phaser.Math.Linear(camera.scrollX, this.targetX, 0.12);
    camera.scrollY = Phaser.Math.Linear(
      camera.scrollY,
      Phaser.Math.Clamp(this.targetY + this.currentFloorBiasY, this.bounds.minY, this.bounds.maxY),
      0.12
    );
    camera.zoom = Phaser.Math.Linear(
      camera.zoom,
      Phaser.Math.Clamp(
        this.targetZoom + this.currentFloorZoomOffset,
        CAMERA_ZOOM_MIN,
        CAMERA_ZOOM_MAX
      ),
      0.18
    );
  }
}
