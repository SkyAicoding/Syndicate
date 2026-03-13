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

  private pointerDragStart: Phaser.Math.Vector2 | null = null;

  private pointerDragOrigin: Phaser.Math.Vector2 | null = null;

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

  public jumpTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.clampTargets();
    const camera = this.scene.cameras.main;
    camera.scrollX = this.targetX;
    camera.scrollY = Phaser.Math.Clamp(
      this.targetY + this.currentFloorBiasY,
      this.bounds.minY,
      this.bounds.maxY
    );
  }

  public setFloorFocus(level: number): void {
    this.targetFloorBiasY = level * 34;
    this.targetFloorZoomOffset = Math.min(0.08, level * 0.03);
  }

  public beginPointerDrag(screenX: number, screenY: number): void {
    this.pointerDragStart = new Phaser.Math.Vector2(screenX, screenY);
    this.pointerDragOrigin = new Phaser.Math.Vector2(this.targetX, this.targetY);
  }

  public dragPointerTo(screenX: number, screenY: number): void {
    if (!this.pointerDragStart || !this.pointerDragOrigin) {
      return;
    }

    const zoom = Math.max(this.scene.cameras.main.zoom, 0.001);
    this.targetX = this.pointerDragOrigin.x - (screenX - this.pointerDragStart.x) / zoom;
    this.targetY = this.pointerDragOrigin.y - (screenY - this.pointerDragStart.y) / zoom;
    this.clampTargets();
  }

  public endPointerDrag(): void {
    this.pointerDragStart = null;
    this.pointerDragOrigin = null;
  }

  public update(deltaSeconds: number): void {
    const camera = this.scene.cameras.main;
    const speed = 620 * deltaSeconds / camera.zoom;

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
    this.clampTargets();
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

  private clampTargets(): void {
    this.targetX = Phaser.Math.Clamp(this.targetX, this.bounds.minX, this.bounds.maxX);
    this.targetY = Phaser.Math.Clamp(this.targetY, this.bounds.minY, this.bounds.maxY);
  }
}
