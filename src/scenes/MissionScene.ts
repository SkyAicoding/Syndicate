import Phaser from "phaser";
import { ensureMissionTextures } from "../assets/generateTextures";
import { preloadGeneratedMissionArt } from "../assets/generatedArt";
import type { AudioDirector } from "../core/audio";
import type {
  GridPos,
  MissionAlertLevel,
  MissionCallbacks,
  MissionEventSnapshot,
  MissionEventTone,
  MissionSnapshot,
  TiledObjectData
} from "../core/missionTypes";
import type {
  AgentDefinition,
  CampaignState,
  MissionId,
  MissionResult,
  WeaponId
} from "../data/types";
import { MISSIONS } from "../data/missions";
import { Prop, type PropKind } from "../entities/Prop";
import { Unit } from "../entities/Unit";
import { AISystem } from "../systems/AISystem";
import { CameraController } from "../systems/CameraController";
import { CombatSystem } from "../systems/CombatSystem";
import { IsoMap } from "../systems/IsoMap";
import { MissionDirector } from "../systems/MissionDirector";
import { Pathfinding } from "../systems/Pathfinding";

export interface MissionSceneConfig {
  missionId: MissionId;
  campaign: CampaignState;
  audio: AudioDirector;
  callbacks: MissionCallbacks;
  onReady?: (scene: MissionScene) => void;
}

interface NoiseEvent {
  cell: GridPos;
  ttl: number;
}

interface MarkerSprite {
  image: Phaser.GameObjects.Image;
  resolve: () => { cell: GridPos | null; visible: boolean };
}

const roleTexture = (agent: AgentDefinition): string => {
  switch (agent.role) {
    case "operator":
      return "unit-player-operator";
    case "breacher":
      return "unit-player-breacher";
    case "infiltrator":
      return "unit-player-infiltrator";
    case "support":
      return "unit-player-support";
  }
};

const getCellFromObject = (object: TiledObjectData): GridPos => ({
  x: Number(object.properties.gridX ?? 0),
  y: Number(object.properties.gridY ?? 0)
});

const getPatrolPath = (object: TiledObjectData): GridPos[] => {
  const raw = String(object.properties.patrol ?? "");
  if (!raw) {
    return [];
  }

  return raw.split("|").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });
};

export class MissionScene extends Phaser.Scene {
  private readonly configData: MissionSceneConfig;

  private map!: IsoMap;

  private director!: MissionDirector;

  private cameraController!: CameraController;

  private aiSystem!: AISystem;

  private combatSystem!: CombatSystem;

  private readonly units: Unit[] = [];

  private readonly props: Prop[] = [];

  private readonly markers: MarkerSprite[] = [];

  private readonly extractCells: GridPos[] = [];

  private readonly reinforcementCells: GridPos[] = [];

  private readonly noiseEvents: NoiseEvent[] = [];

  private readonly missionEvents: MissionEventSnapshot[] = [];

  private playerUnits: Unit[] = [];

  private selectedUnits: Unit[] = [];

  private objectiveTarget: Unit | null = null;

  private vipUnit: Unit | null = null;

  private sabotageProp: Prop | null = null;

  private commandMarker!: Phaser.GameObjects.Image;

  private dragGraphics!: Phaser.GameObjects.Graphics;

  private debugGraphics!: Phaser.GameObjects.Graphics;

  private dragStart: Phaser.Math.Vector2 | null = null;

  private snapshotElapsed = 0;

  private missionStartTime = 0;

  private hasTriggeredSabotageAlarm = false;

  private hasSpawnedCourierResponse = false;

  private hasSpawnedRescueResponse = false;

  private hasTriggeredSecondSabotageWave = false;

  private sabotageAlarmTime: number | null = null;

  private eventCounter = 0;

  private phaseLabel = "Insertion";

  private alertLevel: MissionAlertLevel = "low";

  private selectedIndex = 0;

  private focusFloor = 0;

  private missionBonusCredits = 0;

  private upperDeckAnnounced = false;

  private rooftopResponseSpawned = false;

  private spireUplinkSynced = false;

  private aegisRelayOverridden = false;

  private vergeUplinkPrimed = false;

  private readonly interactionOrders = new Map<string, string>();

  private vergePrimePromptShown = false;

  public constructor(config: MissionSceneConfig) {
    super({ key: "MissionScene" });
    this.configData = config;
  }

  public preload(): void {
    const mission = MISSIONS[this.configData.missionId];
    preloadGeneratedMissionArt(this);
    this.load.tilemapTiledJSON(mission.mapKey, `/maps/${mission.mapKey}.json`);
  }

  public create(): void {
    const mission = MISSIONS[this.configData.missionId];
    this.input.mouse?.disableContextMenu();
    ensureMissionTextures(this);

    const tiledMap = this.make.tilemap({ key: mission.mapKey });
    this.map = new IsoMap(this, IsoMap.parseFromTilemap(tiledMap));
    this.map.renderGround();

    this.director = new MissionDirector(this.configData.missionId, (result) =>
      this.handleMissionEnd(result)
    );
    this.cameraController = new CameraController(this);
    this.aiSystem = new AISystem();
    this.combatSystem = new CombatSystem(
      this,
      this.map,
      this.configData.audio,
      {
        onNoise: (cell) => this.registerNoise(cell),
        onUnitDown: (unit) => this.handleUnitDown(unit),
        onPropDestroyed: (prop) => this.handlePropDestroyed(prop)
      },
      this.configData.campaign.researchUnlocked.includes("breach-charge") ? 1.25 : 1,
      this.configData.campaign.settings.screenShake
    );

    this.createMissionEntities();
    this.createMissionMarkers();
    this.createEffects();
    this.createInput();
    this.createKeyboardShortcuts();
    this.initializeMissionState();

    const firstAlive = this.getDirectControlPlayers().filter((unit) => unit.alive);
    const fallbackAlive = this.playerUnits.filter((unit) => unit.alive);
    if (firstAlive.length) {
      this.selectUnits([firstAlive[0]]);
      this.centerCameraOn(this.getSquadCentroid());
    } else if (fallbackAlive.length) {
      this.centerCameraOn(this.getSquadCentroid());
    }

    const bounds = this.map.getWorldBounds();
    this.cameraController.setBounds(bounds);
    this.applyFloorFocus(true);
    this.cameras.main.setBackgroundColor("#071219");
    this.missionStartTime = this.time.now;
    this.refreshSnapshot(true);
    this.configData.onReady?.(this);
  }

  public update(_time: number, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    const now = this.time.now;

    this.noiseEvents.forEach((event) => {
      event.ttl -= deltaSeconds;
    });
    while (this.noiseEvents.length && this.noiseEvents[0].ttl <= 0) {
      this.noiseEvents.shift();
    }

    this.playerUnits.forEach((unit) => unit.autoOpenDoors(this.props));
    this.units.forEach((unit) => unit.update(deltaSeconds, this.map, now));
    this.applyFloorFocus();
    this.resolveInteractions();
    this.aiSystem.update(
      now,
      this.map,
      this.units,
      this.props,
      this.noiseEvents,
      this.isWalkableForUnit
    );
    this.maintainPlayerAttackOrders();
    this.combatSystem.update(this.units, this.props, now);
    this.cameraController.update(deltaSeconds, this.configData.campaign.settings.edgeScroll);
    this.updateMissionState(now);
    this.updateMarkers(now);

    if (this.configData.campaign.settings.showDebug) {
      this.drawDebug();
    } else {
      this.debugGraphics.clear();
    }

    this.resolveObjectives();
    this.snapshotElapsed += deltaMs;
    if (this.snapshotElapsed >= 140) {
      this.snapshotElapsed = 0;
      this.refreshSnapshot();
    }
  }

  public regroupSelected(): void {
    if (!this.selectedUnits.length) {
      return;
    }

    const centroid = this.selectedUnits.reduce(
      (accumulator, unit) => ({
        x: accumulator.x + unit.currentCell.x,
        y: accumulator.y + unit.currentCell.y
      }),
      { x: 0, y: 0 }
    );
    const centerCell = {
      x: Math.round(centroid.x / this.selectedUnits.length),
      y: Math.round(centroid.y / this.selectedUnits.length)
    };
    this.issueMoveCommand(centerCell);
  }

  public toggleHoldSelected(): void {
    if (!this.selectedUnits.length) {
      return;
    }

    const shouldHold = !this.selectedUnits.every((unit) => unit.holdPosition);
    this.selectedUnits.forEach((unit) => {
      unit.holdPosition = shouldHold;
      if (shouldHold) {
        unit.clearPath();
      }
    });
    this.configData.callbacks.onToast(shouldHold ? "Hold position active." : "Hold position released.");
    this.refreshSnapshot(true);
  }

  public useAbility(unitId?: string): boolean {
    const unit =
      (unitId && this.units.find((candidate) => candidate.id === unitId)) ??
      this.selectedUnits[0];

    if (!unit) {
      return false;
    }

    const success = unit.useAbility(this.time.now, this.playerUnits);
    if (success) {
      this.configData.audio.playUi(true);
      this.configData.callbacks.onToast(`${unit.label} activated ${unit.abilityId}.`);
      this.refreshSnapshot(true);
    }
    return success;
  }

  public useMedkit(unitId?: string): boolean {
    const unit =
      (unitId && this.units.find((candidate) => candidate.id === unitId)) ??
      this.selectedUnits[0];

    if (!unit) {
      return false;
    }

    const target =
      this.selectedUnits
        .filter((candidate) => candidate.alive)
        .sort(
          (a, b) =>
            a.currentHealth / a.maxHealth - b.currentHealth / b.maxHealth
        )[0] ?? unit;

    const inRange = unit.getCellDistanceTo(target.currentCell) <= 2.2 || unit.id === target.id;
    if (!inRange) {
      this.configData.callbacks.onToast("Move closer to use the medkit.");
      return false;
    }

    const success = unit.useMedkit(target);
    if (success) {
      this.configData.audio.playUi(true);
      this.configData.callbacks.onToast(`${unit.label} stabilized ${target.label}.`);
      this.refreshSnapshot(true);
    }
    return success;
  }

  public focusOnSquad(): void {
    this.centerCameraOn(this.getSquadCentroid());
  }

  public setDebugVisible(value: boolean): void {
    this.configData.campaign.settings.showDebug = value;
    this.refreshSnapshot(true);
  }

  public forceEnd(success: boolean): void {
    const casualties = this.playerUnits.filter((unit) => !unit.alive).map((unit) => unit.label);
    if (success) {
      this.director.resolveSuccess(casualties, MISSIONS[this.configData.missionId].reward);
      return;
    }

    this.director.resolveFailure(casualties);
  }

  public selectPlayerByIndex(index: number): void {
    const directPlayers = this.getDirectControlPlayers();
    const unit = directPlayers[index];
    if (!unit || !unit.alive) {
      return;
    }

    this.selectedIndex = index;
    this.selectUnits([unit]);
    this.centerCameraOn(unit.getWorldPosition());
  }

  public commandMoveSelected(cell: GridPos): void {
    this.issueMoveCommand(cell);
  }

  public getTestState(): Record<string, unknown> {
    const camera = this.cameras.main;
    const screenPoint = (unit: Unit) => {
      const world = unit.getWorldPosition();
      return {
        x: (world.x - camera.scrollX) * camera.zoom,
        y: (world.y - camera.scrollY) * camera.zoom
      };
    };

    return {
      missionState: this.director.getState(),
      objective: this.director.getObjectiveText(),
      phaseLabel: this.phaseLabel,
      alertLevel: this.alertLevel,
      selectedIds: this.selectedUnits.map((unit) => unit.id),
      players: this.playerUnits.map((unit) => ({
        id: unit.id,
        label: unit.label,
        controlMode: unit.controlMode,
        cell: unit.currentCell,
        screen: screenPoint(unit),
        hp: unit.currentHealth,
        maxHp: unit.maxHealth,
        alive: unit.alive
      })),
      enemies: this.units
        .filter((unit) => unit.side === "enemy")
        .map((unit) => ({
          id: unit.id,
          cell: unit.currentCell,
          screen: screenPoint(unit),
          hp: unit.currentHealth,
          maxHp: unit.maxHealth,
          alive: unit.alive
        })),
      objectiveCells: {
        extract: this.extractCells,
        target: this.objectiveTarget?.currentCell ?? null,
        vip: this.vipUnit?.currentCell ?? null,
        sabotage: this.sabotageProp?.cell ?? null
      }
    };
  }

  private createMissionEntities(): void {
    const objects = this.map.objects;
    const playerSpawns = objects
      .filter((object) => object.type === "spawn_player")
      .sort((a, b) => a.id - b.id);

    const deployedAgents = this.configData.campaign.agents.filter((agent) => agent.deployed);
    const strikeTeam = deployedAgents.length
      ? deployedAgents
      : this.configData.campaign.agents.slice(0, 1);

    this.playerUnits = strikeTeam.map((agent, index) =>
      this.createPlayerUnit(agent, getCellFromObject(playerSpawns[index] ?? playerSpawns[0]))
    );

    objects.forEach((object) => {
      const cell = getCellFromObject(object);

      if (object.type.startsWith("prop_")) {
        const kind = object.type.replace("prop_", "") as PropKind;
        this.props.push(
          new Prop(this, this.map, {
            id: `${object.type}-${object.id}`,
            kind,
            cell,
            objective: Boolean(object.properties.objective),
            interactive: Boolean(object.properties.interactive),
            interactionId: object.properties.interactionId
              ? String(object.properties.interactionId)
              : undefined,
            interactionLabel: object.properties.interactionLabel
              ? String(object.properties.interactionLabel)
              : undefined
          })
        );
      }

      if (object.type === "objective_terminal") {
        this.sabotageProp = new Prop(this, this.map, {
          id: `objective-terminal-${object.id}`,
          kind: "terminal",
          cell,
          objective: true,
          destructible: false,
          blocking: true,
          cover: true
        });
        this.props.push(this.sabotageProp);
      }

      if (object.type === "spawn_enemy") {
        const enemy = this.createEnemyUnit(object, cell);
        this.units.push(enemy);
        if (enemy.objectiveTarget) {
          this.objectiveTarget = enemy;
        }
      }

      if (object.type === "spawn_civilian") {
        this.units.push(
          new Unit(this, this.map, {
            id: `civ-${object.id}`,
            label: String(object.properties.label ?? "Civilian"),
            side: "civilian",
            role: "civilian",
            weaponId: null,
            cell,
            maxHealth: 42,
            armor: 0,
            accuracy: 0,
            moveSpeed: 170,
            vision: 4,
            textureKey: "unit-civilian",
            medkits: 0
          })
        );
      }

      if (object.type === "spawn_vip") {
        this.vipUnit = new Unit(this, this.map, {
          id: `vip-${object.id}`,
          label: String(object.properties.label ?? "Scientist"),
          side: "vip",
          role: "vip",
          weaponId: null,
          cell,
          maxHealth: 55,
          armor: 1,
          accuracy: 0,
          moveSpeed: 165,
          vision: 4,
          textureKey: "unit-vip",
          medkits: 0
        });
        this.units.push(this.vipUnit);
      }

      if (object.type === "marker_extract") {
        this.extractCells.push(cell);
      }

      if (object.type === "spawn_reinforcement") {
        this.reinforcementCells.push(cell);
      }
    });

    this.units.push(...this.playerUnits);
  }

  private createMissionMarkers(): void {
    if (this.objectiveTarget) {
      this.addMissionMarker(
        () => ({
          cell: this.objectiveTarget?.alive ? this.objectiveTarget.currentCell : null,
          visible: Boolean(this.objectiveTarget?.alive)
        }),
        0xff8f71
      );
    }
    if (this.vipUnit) {
      this.addMissionMarker(
        () => ({
          cell: this.vipUnit?.alive ? this.vipUnit.currentCell : null,
          visible: Boolean(this.vipUnit?.alive)
        }),
        0x7fffd1
      );
    }
    if (this.sabotageProp && !this.hasTriggeredSabotageAlarm) {
      this.addMissionMarker(
        () => ({
          cell: this.sabotageProp && !this.hasTriggeredSabotageAlarm ? this.sabotageProp.cell : null,
          visible: Boolean(this.sabotageProp) && !this.hasTriggeredSabotageAlarm
        }),
        0x72efff
      );
    }
    this.extractCells.forEach((cell) =>
      this.addMissionMarker(() => ({ cell, visible: true }), 0x9cff87)
    );
    this.props
      .filter((prop) => prop.interactive)
      .forEach((prop) =>
        this.addMissionMarker(
          () => ({
            cell: prop.canInteract() ? prop.cell : null,
            visible: prop.canInteract()
          }),
          0xd3a4ff
        )
      );
  }

  private addMissionMarker(
    resolve: () => { cell: GridPos | null; visible: boolean },
    tint = 0x72efff
  ): void {
    const marker = this.add.image(0, 0, "objective-marker");
    marker.setTint(tint);
    marker.setVisible(false);
    this.markers.push({ image: marker, resolve });
  }

  private createEffects(): void {
    this.commandMarker = this.add.image(0, 0, "command-marker").setVisible(false);
    this.commandMarker.setDepth(9999);
    this.dragGraphics = this.add.graphics();
    this.debugGraphics = this.add.graphics();

    if (this.configData.missionId !== "m02" && this.configData.campaign.settings.highFx) {
      this.add.particles(0, -20, "rain-streak", {
        x: { min: -200, max: this.scale.width + 200 },
        y: { min: -40, max: this.scale.height + 40 },
        speedX: { min: -40, max: -12 },
        speedY: { min: 260, max: 360 },
        lifespan: 900,
        quantity: 4,
        frequency: 55,
        scale: { start: 0.8, end: 0.65 },
        alpha: { start: 0.28, end: 0 }
      }).setScrollFactor(0);
    }
  }

  private initializeMissionState(): void {
    this.alertLevel = "low";
    this.phaseLabel =
      this.configData.missionId === "m01"
        ? "Street approach"
        : this.configData.missionId === "m02"
          ? "Silent breach"
          : "Insertion corridor";

    this.announce("Strike package inserted. Maintain low signature.", "info");
    if (this.configData.missionId === "m02") {
      this.announce("Locate Dr. Sera Iven before containment shutters cycle.", "info");
    }
    if (this.configData.missionId === "m03") {
      this.announce("Plant the cascade and get back to the street lane.", "info");
    }
  }

  private updateMissionState(now: number): void {
    if (this.director.getState() !== "active") {
      return;
    }

    const alertedEnemies = this.units.some(
      (unit) => unit.side === "enemy" && unit.alive && (unit.aggro || unit.currentTarget)
    );

    if (alertedEnemies && this.alertLevel === "low") {
      this.setAlertLevel("elevated");
      this.announce("Hostiles are alerted and sweeping the area.", "warning", true);
    }

    this.updateUpperDeckScript();

    switch (this.configData.missionId) {
      case "m01":
        this.updateEliminateScript();
        break;
      case "m02":
        this.updateRescueScript();
        break;
      case "m03":
        this.updateSabotageScript(now);
        break;
    }
  }

  private updateEliminateScript(): void {
    const enemyCasualties = this.units.filter(
      (unit) => unit.side === "enemy" && !unit.alive
    ).length;

    if (
      !this.hasSpawnedCourierResponse &&
      (
        enemyCasualties >= 1 ||
        Boolean(
          this.objectiveTarget &&
            this.objectiveTarget.currentHealth < this.objectiveTarget.maxHealth
        )
      )
    ) {
      this.hasSpawnedCourierResponse = true;
      this.setPhase("Courier burn");
      this.setAlertLevel("elevated");
      this.announce(
        "Courier panic burst detected. Plaza response units are cutting in from the boulevard.",
        "warning",
        true
      );
      this.spawnScriptedEnemies(
        [
          { x: 80, y: 64 },
          { x: 78, y: 58 }
        ],
        ["rifle", "smg"],
        "Rapid Response"
      );
    }

    if (
      this.objectiveTarget?.alive &&
      this.objectiveTarget.currentHealth < this.objectiveTarget.maxHealth * 0.55 &&
      this.alertLevel !== "lockdown"
    ) {
      this.setAlertLevel("lockdown");
      this.announce("Courier deadman alarm triggered. Local lanes are locking down.", "danger", true);
    }
  }

  private updateRescueScript(): void {
    if (!this.vipUnit?.escortTargetId || this.hasSpawnedRescueResponse) {
      return;
    }

    this.hasSpawnedRescueResponse = true;
    this.setPhase("Hot extract");
    this.setAlertLevel("lockdown");
    this.announce("Containment shutters are cycling. Intercept teams inbound.", "warning", true);
    this.spawnScriptedEnemies(
      [
        { x: 78, y: 46 },
        { x: 80, y: 48 }
      ],
      ["smg", "rifle"],
      "Containment Team"
    );
  }

  private updateSabotageScript(now: number): void {
    if (!this.hasTriggeredSabotageAlarm || this.sabotageAlarmTime === null) {
      return;
    }

    if (this.hasTriggeredSecondSabotageWave || now - this.sabotageAlarmTime < 8_000) {
      return;
    }

    this.hasTriggeredSecondSabotageWave = true;
    this.setAlertLevel("lockdown");
    this.announce("Secondary response wave breaching from the yard gate.", "danger", true);
    this.spawnScriptedEnemies(
      [
        { x: 34, y: 86 },
        { x: 38, y: 88 }
      ],
      ["smg", "rifle"],
      "Lockdown Team"
    );
  }

  private updateUpperDeckScript(): void {
    const upperDeckPlayers = this.playerUnits.filter(
      (unit) =>
        unit.alive && this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y) > 0
    );

    if (upperDeckPlayers.length && !this.upperDeckAnnounced) {
      this.upperDeckAnnounced = true;
      this.setPhase("Upper deck breach");
      this.announce("Upper deck breach confirmed. Expect rooftop overwatch.", "warning", true);
    }

    if (!upperDeckPlayers.length || this.rooftopResponseSpawned) {
      return;
    }

    this.rooftopResponseSpawned = true;
    switch (this.configData.missionId) {
      case "m01":
        this.spawnScriptedEnemies(
          [
            { x: 60, y: 44 },
            { x: 67, y: 48 }
          ],
          ["rifle", "smg"],
          "Skywatch",
          { rooftop: true }
        );
        break;
      case "m02":
        this.spawnScriptedEnemies(
          [
            { x: 58, y: 42 },
            { x: 68, y: 44 }
          ],
          ["smg", "rifle"],
          "Roof Hunter",
          { rooftop: true }
        );
        break;
      case "m03":
        this.spawnScriptedEnemies(
          [
            { x: 68, y: 40 },
            { x: 82, y: 44 }
          ],
          ["rifle", "smg"],
          "Catwalk Guard",
          { rooftop: true }
        );
        break;
    }
  }

  private updateMarkers(now: number): void {
    this.markers.forEach((marker, index) => {
      const state = marker.resolve();
      if (!state.visible || !state.cell) {
        marker.image.setVisible(false);
        return;
      }

      const world = this.map.gridToWorld(state.cell);
      marker.image.setVisible(true);
      marker.image.setPosition(world.x, world.y - 92 + Math.sin(now / 220 + index) * 5);
      marker.image.setDepth(world.y + 120);
    });
  }

  private activateInteraction(prop: Prop, unit: Unit): void {
    if (!prop.canInteract()) {
      return;
    }

    prop.markInteracted();
    this.interactionOrders.forEach((propId, unitId) => {
      if (propId === prop.id) {
        this.interactionOrders.delete(unitId);
      }
    });

    const interactionId = prop.interactionId ?? prop.id;
    switch (interactionId) {
      case "spire-uplink":
        this.spireUplinkSynced = true;
        this.missionBonusCredits += 60;
        this.setPhase("Courier trace synced");
        this.announce(
          `${unit.label} pinned the courier route from the rooftop uplink. Bonus intel secured.`,
          "success",
          true
        );
        this.setAlertLevel("elevated");
        break;
      case "aegis-relay":
        this.aegisRelayOverridden = true;
        this.missionBonusCredits += 70;
        this.addExtractionCell({ x: 62, y: 44 });
        this.setPhase("Relay overridden");
        this.announce(
          `${unit.label} rerouted extraction to the roof relay. VIP can now exfiltrate from the upper deck.`,
          "success",
          true
        );
        break;
      case "verge-uplink":
        this.vergeUplinkPrimed = true;
        this.setPhase("Cascade channel primed");
        this.announce(
          `${unit.label} primed the cascade uplink. Reactor terminal is ready for arming.`,
          "success",
          true
        );
        break;
    }

    this.refreshSnapshot(true);
  }

  private addExtractionCell(cell: GridPos): void {
    if (this.extractCells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y)) {
      return;
    }

    this.extractCells.push(cell);
    this.addMissionMarker(() => ({ cell, visible: true }), 0x9cff87);
  }

  private getMissionObjectiveText(): string {
    const baseObjective = this.director.getObjectiveText();
    switch (this.configData.missionId) {
      case "m01":
        return this.spireUplinkSynced
          ? `${baseObjective} Rooftop uplink intel secured.`
          : `${baseObjective} Optional: sync the rooftop uplink for bonus intel.`;
      case "m02":
        return this.aegisRelayOverridden
          ? `${baseObjective} Roof relay extraction is online.`
          : `${baseObjective} Optional: override the roof relay for upper-deck extraction.`;
      case "m03":
        return this.vergeUplinkPrimed
          ? baseObjective
          : "Prime the rooftop uplink, then sabotage the reactor terminal.";
      default:
        return baseObjective;
    }
  }

  private findInteractionCell(unit: Unit, prop: Prop): GridPos {
    return this.map.findNearestOpen(prop.cell, (x, y) => {
      if (!this.isWalkableForUnit(unit, x, y)) {
        return false;
      }

      return Phaser.Math.Distance.Between(x, y, prop.cell.x, prop.cell.y) <= 1.15;
    });
  }

  private setPhase(label: string): void {
    if (this.phaseLabel === label) {
      return;
    }

    this.phaseLabel = label;
    this.refreshSnapshot(true);
  }

  private setAlertLevel(level: MissionAlertLevel): void {
    if (this.alertLevel === level) {
      return;
    }

    this.alertLevel = level;
    this.refreshSnapshot(true);
  }

  private announce(text: string, tone: MissionEventTone, toast = false): void {
    this.eventCounter += 1;
    this.missionEvents.unshift({
      id: `${this.configData.missionId}-${this.eventCounter}`,
      text,
      tone
    });
    this.missionEvents.splice(6);

    if (toast) {
      this.configData.callbacks.onToast(text);
    }
    this.refreshSnapshot(true);
  }

  private spawnScriptedEnemies(
    cells: GridPos[],
    weapons: WeaponId[],
    labelPrefix: string,
    options?: { rooftop?: boolean }
  ): void {
    cells.forEach((cell, index) => {
      const weaponId = weapons[index % weapons.length];
      const textureKey =
        weaponId === "shotgun"
          ? "unit-enemy-shotgun"
          : weaponId === "smg"
            ? "unit-enemy-smg"
            : "unit-enemy-rifle";
      const spawnCell = this.map.findNearestOpen(cell, (x, y) =>
        this.isWalkableForUnit(
          {
            id: `spawn-probe-${index}`,
            alive: true,
            currentCell: cell
          } as Unit,
          x,
          y
        )
      );
      const unit = new Unit(this, this.map, {
        id: `${labelPrefix.toLowerCase().replace(/\s+/g, "-")}-${this.eventCounter}-${index}`,
        label: `${labelPrefix} ${index + 1}`,
        side: "enemy",
        role: "enemy",
        weaponId,
        cell: spawnCell,
        maxHealth: weaponId === "rifle" ? 70 : 64,
        armor: weaponId === "rifle" ? 2 : 1,
        accuracy: (weaponId === "rifle" ? 0.76 : 0.72) + (options?.rooftop ? 0.05 : 0),
        moveSpeed: 184,
        vision: 6.6 + (options?.rooftop ? 0.8 : 0),
        textureKey,
        medkits: 0,
        rangeBonus: options?.rooftop ? 0.75 : 0,
        fireRateMultiplier: options?.rooftop ? 1.06 : 1
      });
      unit.setAggro(true);
      this.units.push(unit);
    });

    this.refreshSnapshot(true);
  }

  private createInput(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const camera = this.cameras.main;
      const world = pointer.positionToCamera(camera) as Phaser.Math.Vector2;

      if (pointer.button === 0) {
        this.dragStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.dragGraphics.clear();
        return;
      }

      if (pointer.button === 2) {
        this.handleRightClick(world);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !pointer.isDown) {
        return;
      }

      this.dragGraphics.clear();
      this.dragGraphics.lineStyle(2, 0x7de1ff, 0.9);
      this.dragGraphics.fillStyle(0x59dfff, 0.1);
      const rect = new Phaser.Geom.Rectangle(
        Math.min(this.dragStart.x, pointer.x),
        Math.min(this.dragStart.y, pointer.y),
        Math.abs(pointer.x - this.dragStart.x),
        Math.abs(pointer.y - this.dragStart.y)
      );
      this.dragGraphics.fillRectShape(rect);
      this.dragGraphics.strokeRectShape(rect);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart) {
        return;
      }

      const dragDistance = Phaser.Math.Distance.Between(
        this.dragStart.x,
        this.dragStart.y,
        pointer.x,
        pointer.y
      );

      if (dragDistance < 8) {
        const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const clickedPlayer = this.getHoveredPlayerAtWorld(world.x, world.y);
        this.selectUnits(clickedPlayer ? [clickedPlayer] : []);
      } else {
        const rect = new Phaser.Geom.Rectangle(
          Math.min(this.dragStart.x, pointer.x),
          Math.min(this.dragStart.y, pointer.y),
          Math.abs(pointer.x - this.dragStart.x),
          Math.abs(pointer.y - this.dragStart.y)
        );
        const selected = this.playerUnits.filter((unit) => {
          if (!unit.alive) {
            return false;
          }
          if (unit.controlMode !== "manual") {
            return false;
          }
          const screen = this.worldToScreen(unit.getWorldPosition());
          return rect.contains(screen.x, screen.y);
        });
        this.selectUnits(selected);
      }

      this.dragStart = null;
      this.dragGraphics.clear();
    });
  }

  private createKeyboardShortcuts(): void {
    const keys = this.input.keyboard!.addKeys(
      "ONE,TWO,THREE,FOUR,G,H,SPACE,TAB,Q,F1"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    keys.ONE.on("down", () => this.selectPlayerByIndex(0));
    keys.TWO.on("down", () => this.selectPlayerByIndex(1));
    keys.THREE.on("down", () => this.selectPlayerByIndex(2));
    keys.FOUR.on("down", () => this.selectPlayerByIndex(3));
    keys.G.on("down", () => this.regroupSelected());
    keys.H.on("down", () => this.toggleHoldSelected());
    keys.SPACE.on("down", () => this.focusOnSquad());
    keys.TAB.on("down", () => {
      const directPlayers = this.getDirectControlPlayers();
      if (!directPlayers.length) {
        return;
      }
      this.selectedIndex = (this.selectedIndex + 1) % directPlayers.length;
      this.selectPlayerByIndex(this.selectedIndex);
    });
    keys.Q.on("down", () => this.useAbility());
    keys.F1.on("down", () => this.setDebugVisible(!this.configData.campaign.settings.showDebug));
  }

  private createPlayerUnit(agent: AgentDefinition, cell: GridPos): Unit {
    const hasResearch = new Set(this.configData.campaign.researchUnlocked);
    const hasCyber = new Set(this.configData.campaign.cyberUnlocked);
    const baseStats = {
      operator: { hp: 84, armor: 3, accuracy: 0.9, speed: 194, vision: 7.2 },
      breacher: { hp: 94, armor: 4, accuracy: 0.78, speed: 178, vision: 6.6 },
      infiltrator: { hp: 76, armor: 2, accuracy: 0.82, speed: 214, vision: 7.2 },
      support: { hp: 80, armor: 2, accuracy: 0.84, speed: 186, vision: 6.8 }
    }[agent.role];

    return new Unit(this, this.map, {
      id: agent.id,
      label: agent.callsign,
      side: "player",
      role: agent.role,
      weaponId: agent.weaponId,
      controlMode: agent.controlMode,
      abilityId: agent.abilityId,
      cell,
      maxHealth: baseStats.hp + (hasResearch.has("ballistic-weave") ? 8 : 0),
      armor: baseStats.armor + (hasCyber.has("dermal-mesh") ? 2 : 0),
      accuracy: baseStats.accuracy + (hasResearch.has("smartlink") ? 0.07 : 0),
      moveSpeed: baseStats.speed * (hasCyber.has("servo-fibers") ? 1.1 : 1),
      vision: baseStats.vision,
      textureKey: roleTexture(agent),
      medkits: 1 + (hasCyber.has("recovery-nodes") ? 1 : 0),
      rangeBonus: hasCyber.has("ocular-uplink") ? 0.5 : 0,
      pressureGainMultiplier: hasResearch.has("suppressor-routing") ? 0.82 : 1,
      accuracyPressureResistance: hasCyber.has("nerve-filter") ? 0.8 : 1,
      fireRateMultiplier: hasCyber.has("reflex-stack") ? 1.12 : 1,
      medkitPowerBonus:
        (hasResearch.has("med-gel") ? 10 : 0) + (hasCyber.has("recovery-nodes") ? 4 : 0),
      abilityCooldownMultiplier: hasResearch.has("overclock-bus") ? 0.8 : 1
    });
  }

  private createEnemyUnit(object: TiledObjectData, cell: GridPos): Unit {
    const weaponId = String(object.properties.weapon ?? "rifle") as WeaponId;
    const textureKey =
      weaponId === "shotgun"
        ? "unit-enemy-shotgun"
        : weaponId === "smg"
          ? "unit-enemy-smg"
          : "unit-enemy-rifle";
    const elite = Boolean(object.properties.elite);
    const rooftop = Boolean(object.properties.rooftop);

    return new Unit(this, this.map, {
      id: `enemy-${object.id}`,
      label: String(object.properties.label ?? (elite ? "Enforcer" : "Guard")),
      side: "enemy",
      role: "enemy",
      weaponId,
      cell,
      maxHealth: elite ? 82 : 68,
      armor: elite ? 3 : 1,
      accuracy: (elite ? 0.84 : 0.72) + (rooftop ? 0.05 : 0),
      moveSpeed: elite ? 188 : 176,
      vision: (elite ? 7 : 6) + (rooftop ? 0.8 : 0),
      textureKey,
      medkits: 0,
      patrol: getPatrolPath(object),
      objectiveTarget: Boolean(object.properties.objectiveTarget),
      rangeBonus: rooftop ? 0.75 : 0,
      fireRateMultiplier: rooftop ? 1.06 : 1
    });
  }

  private handleRightClick(world: Phaser.Math.Vector2): void {
    if (!this.selectedUnits.length) {
      return;
    }

    const cell = this.map.findNearestOpen(this.map.worldToGrid(world.x, world.y), (x, y) =>
      this.isWalkableForUnit(this.selectedUnits[0], x, y)
    );
    const enemy = this.getHoveredEnemy(world.x, world.y);
    const prop = this.getHoveredProp(world.x, world.y);

    if (enemy) {
      this.selectedUnits.forEach((unit) => this.issueAttackCommand(unit, enemy));
      this.configData.audio.playSelect();
      return;
    }

    if (prop?.canInteract()) {
      this.issueInteractionCommand(prop);
      this.configData.audio.playSelect();
      return;
    }

    if (prop && (prop.objective || prop.destructible)) {
      this.selectedUnits.forEach((unit) => this.issueAttackCommand(unit, prop));
      this.configData.audio.playSelect();
      return;
    }

    this.issueMoveCommand(cell);
    this.configData.audio.playMove();
  }

  private issueMoveCommand(targetCell: GridPos): void {
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    this.selectedUnits.forEach((unit, index) => {
      const offset = offsets[index % offsets.length];
      const desired = this.map.findNearestOpen(
        { x: targetCell.x + offset.x, y: targetCell.y + offset.y },
        (x, y) => this.isWalkableForUnit(unit, x, y)
      );
      const path = this.findUnitPath(unit, desired);
      unit.clearTarget();
      unit.setPath(path);
      unit.holdPosition = false;
    });

    const world = this.map.gridToWorld(targetCell);
    this.commandMarker.setPosition(world.x, world.y + 6).setVisible(true);
    this.commandMarker.alpha = 1;
    this.tweens.add({
      targets: this.commandMarker,
      alpha: 0,
      duration: 500,
      onComplete: () => this.commandMarker.setVisible(false)
    });
  }

  private issueAttackCommand(unit: Unit, target: Unit | Prop): void {
    unit.setTarget(target, true);
    this.interactionOrders.delete(unit.id);
    const targetCell = target instanceof Unit ? target.currentCell : target.cell;
    const range = (unit.getActiveWeapon()?.range ?? 3.5) + unit.getRangeBonus();
    if (unit.getCellDistanceTo(targetCell) > range * 0.82) {
      const approach = this.findApproachCellForPlayer(unit, targetCell, range);
      const path = this.findUnitPath(unit, approach);
      unit.setPath(path);
    } else {
      unit.clearPath();
    }
  }

  private issueInteractionCommand(prop: Prop): void {
    if (!this.selectedUnits.length || !prop.canInteract()) {
      return;
    }

    const offsets = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ];

    this.selectedUnits.forEach((unit, index) => {
      const desired =
        index === 0
          ? this.findInteractionCell(unit, prop)
          : this.map.findNearestOpen(
              {
                x: prop.cell.x + offsets[index % offsets.length].x,
                y: prop.cell.y + offsets[index % offsets.length].y
              },
              (x, y) => this.isWalkableForUnit(unit, x, y)
            );
      unit.clearTarget();
      unit.setPath(this.findUnitPath(unit, desired));
      unit.holdPosition = false;
      if (index === 0) {
        this.interactionOrders.set(unit.id, prop.id);
      } else {
        this.interactionOrders.delete(unit.id);
      }
    });

    if (this.selectedUnits[0].getCellDistanceTo(prop.cell) <= 1.15) {
      this.activateInteraction(prop, this.selectedUnits[0]);
      return;
    }

    this.configData.callbacks.onToast(
      prop.interactionLabel
        ? `Move into position to ${prop.interactionLabel.toLowerCase()}.`
        : "Move into position to interact."
    );
  }

  private resolveInteractions(): void {
    this.playerUnits.forEach((unit) => {
      if (!unit.alive) {
        this.interactionOrders.delete(unit.id);
        return;
      }

      const propId = this.interactionOrders.get(unit.id);
      if (!propId) {
        return;
      }

      const prop = this.props.find((candidate) => candidate.id === propId) ?? null;
      if (!prop || !prop.canInteract()) {
        this.interactionOrders.delete(unit.id);
        return;
      }

      if (unit.getCellDistanceTo(prop.cell) <= 1.15) {
        this.activateInteraction(prop, unit);
      }
    });
  }

  private resolveObjectives(): void {
    const casualties = this.playerUnits.filter((unit) => !unit.alive).map((unit) => unit.label);
    const alivePlayers = this.playerUnits.filter((unit) => unit.alive);

    if (!alivePlayers.length) {
      this.director.resolveFailure(casualties);
      return;
    }

    if (this.vipUnit && !this.vipUnit.alive) {
      this.director.resolveFailure(casualties);
      return;
    }

    if (this.objectiveTarget && !this.objectiveTarget.alive) {
      this.director.resolveSuccess(
        casualties,
        MISSIONS[this.configData.missionId].reward + this.missionBonusCredits
      );
      return;
    }

    if (this.vipUnit && !this.vipUnit.escortTargetId) {
      const rescuer = alivePlayers.find(
        (unit) => unit.getCellDistanceTo(this.vipUnit!.currentCell) <= 1.15
      );
      if (rescuer) {
        this.vipUnit.escortTargetId = rescuer.id;
        this.director.markVipRescued();
        this.setPhase("Escort active");
        this.setAlertLevel("elevated");
        this.announce("Scientist secured. Reach the extraction lift.", "success", true);
      }
    }

    if (
      this.vipUnit &&
      this.vipUnit.escortTargetId &&
      this.extractCells.some(
        (cell) =>
          Phaser.Math.Distance.Between(
            cell.x,
            cell.y,
            this.vipUnit!.currentCell.x,
            this.vipUnit!.currentCell.y
          ) <= 0.8
      )
    ) {
      this.director.resolveSuccess(
        casualties,
        MISSIONS[this.configData.missionId].reward + this.missionBonusCredits
      );
      return;
    }

    if (this.sabotageProp && !this.hasTriggeredSabotageAlarm) {
      if (!this.vergeUplinkPrimed) {
        const nearUplink = this.props.find(
          (prop) =>
            prop.interactionId === "verge-uplink" &&
            prop.canInteract() &&
            alivePlayers.some((unit) => unit.getCellDistanceTo(prop.cell) <= 1.15)
        );
        if (nearUplink && !this.vergePrimePromptShown) {
          this.vergePrimePromptShown = true;
          this.announce("Rooftop uplink is within reach. Prime it before arming the cascade.", "info");
        }
      }

      const nearObjective = alivePlayers.find(
        (unit) => unit.getCellDistanceTo(this.sabotageProp!.cell) <= 1.15
      );
      if (nearObjective && !this.vergeUplinkPrimed) {
        if (!this.vergePrimePromptShown) {
          this.configData.callbacks.onToast("Prime the rooftop uplink before arming the cascade.");
          this.vergePrimePromptShown = true;
        }
      }
      if (nearObjective && this.vergeUplinkPrimed) {
        this.hasTriggeredSabotageAlarm = true;
        this.sabotageAlarmTime = this.time.now;
        this.director.markSabotaged();
        this.setPhase("Cascade armed");
        this.setAlertLevel("lockdown");
        this.sabotageProp.image.setTint(0xff8b56);
        this.units
          .filter((unit) => unit.side === "enemy")
          .forEach((unit) => {
            unit.setAggro(true);
            unit.lastKnownEnemyCell = { ...nearObjective.currentCell };
          });
        this.spawnReinforcements();
        this.announce("Cascade armed. Exfiltrate immediately.", "danger", true);
      }
    }

    if (
      this.hasTriggeredSabotageAlarm &&
      alivePlayers.some((unit) =>
        this.extractCells.some(
          (cell) =>
            Phaser.Math.Distance.Between(
              cell.x,
              cell.y,
              unit.currentCell.x,
              unit.currentCell.y
            ) <= 0.8
        )
      )
    ) {
      this.director.resolveSuccess(
        casualties,
        MISSIONS[this.configData.missionId].reward + this.missionBonusCredits
      );
    }
  }

  private handleUnitDown(unit: Unit): void {
    if (unit.side === "player") {
      this.announce(`${unit.label} is down.`, "danger", true);
      this.selectUnits(this.selectedUnits.filter((candidate) => candidate.id !== unit.id));
      return;
    }

    if (unit.side === "enemy") {
      this.announce(`${unit.label} neutralized.`, "success", true);
      return;
    }

    if (unit.side === "civilian") {
      this.announce("Civilian lost in the crossfire.", "warning", true);
    }
  }

  private handlePropDestroyed(prop: Prop): void {
    if (prop.objective) {
      this.announce("Objective hardware compromised.", "warning", true);
      return;
    }

    if (prop.kind === "barrel") {
      this.announce("Fuel barrel detonated.", "warning");
    }
  }

  private registerNoise(cell: GridPos): void {
    this.noiseEvents.push({ cell, ttl: 2.5 });
  }

  private handleMissionEnd(result: MissionResult): void {
    this.phaseLabel = result.success ? "Operation secured" : "Operational collapse";
    this.alertLevel = result.success ? "low" : "lockdown";
    this.announce(
      result.success ? "Objective package secured." : "Strike package collapsed.",
      result.success ? "success" : "danger"
    );
    this.configData.audio.playMissionEnd(result.success);
    this.time.delayedCall(400, () => this.configData.callbacks.onMissionEnd(result));
  }

  private refreshSnapshot(force = false): void {
    if (!force && this.director.getState() !== "active" && this.snapshotElapsed < 20) {
      return;
    }

    const alivePlayers = this.playerUnits.filter((unit) => unit.alive);
    const directPlayers = alivePlayers.filter((unit) => unit.controlMode === "manual");
    const assistPlayers = alivePlayers.filter((unit) => unit.controlMode === "assist");
    const getMarker = (cell: GridPos) => ({
      ...cell,
      level: this.map.getElevationAt(cell.x, cell.y)
    });
    const objectiveCells = [
      ...this.extractCells,
      ...(this.objectiveTarget?.alive ? [this.objectiveTarget.currentCell] : []),
      ...(this.vipUnit?.alive ? [this.vipUnit.currentCell] : []),
      ...(this.sabotageProp && !this.hasTriggeredSabotageAlarm
        ? [this.sabotageProp.cell]
        : [])
    ];
    const maxFloor = Math.max(
      0,
      ...alivePlayers.map((unit) => this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y)),
      ...this.units
        .filter((unit) => unit.alive)
        .map((unit) => this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y)),
      ...objectiveCells.map((cell) => this.map.getElevationAt(cell.x, cell.y))
    );

    const snapshot: MissionSnapshot = {
      missionId: this.configData.missionId,
      missionName: MISSIONS[this.configData.missionId].name,
      objectiveText: this.getMissionObjectiveText(),
      phaseLabel: this.phaseLabel,
      alertLevel: this.alertLevel,
      focusFloor: this.focusFloor,
      statusText: `${this.selectedUnits.length} selected / ${alivePlayers.length} combat-effective / ${directPlayers.length} direct / ${assistPlayers.length} assist / deck ${this.focusFloor + 1}`,
      timerSeconds: Math.floor((this.time.now - this.missionStartTime) / 1000),
      fps: Math.round(this.game.loop.actualFps),
      missionState: this.director.getState(),
      debugVisible: this.configData.campaign.settings.showDebug,
      selectedIds: this.selectedUnits.map((unit) => unit.id),
      selectedUnits: this.selectedUnits.map((unit) => unit.getHudSnapshot()),
      squad: this.playerUnits.map((unit) => unit.getHudSnapshot()),
      events: [...this.missionEvents],
      minimap: {
        width: this.map.width,
        height: this.map.height,
        maxFloor,
        players: this.playerUnits.filter((unit) => unit.alive).map((unit) => getMarker(unit.currentCell)),
        enemies: this.units
          .filter((unit) => unit.side === "enemy" && unit.alive)
          .map((unit) => getMarker(unit.currentCell)),
        civilians: this.units
          .filter((unit) => unit.side === "civilian" && unit.alive)
          .map((unit) => getMarker(unit.currentCell)),
        objectives: objectiveCells.map(getMarker)
      }
    };

    this.configData.callbacks.onSnapshot(snapshot);
  }

  private selectUnits(units: Unit[]): void {
    this.selectedUnits.forEach((unit) => unit.setSelected(false));
    this.selectedUnits = units.filter(
      (unit) => unit.alive && unit.side === "player" && unit.controlMode === "manual"
    );
    this.selectedUnits.forEach((unit) => unit.setSelected(true));
    if (this.selectedUnits.length) {
      const directPlayers = this.getDirectControlPlayers();
      const nextIndex = directPlayers.findIndex((unit) => unit.id === this.selectedUnits[0].id);
      this.selectedIndex = nextIndex >= 0 ? nextIndex : this.selectedIndex;
    }
    this.applyFloorFocus(true);
    this.refreshSnapshot(true);
  }

  private getHoveredPlayerAtWorld(worldX: number, worldY: number): Unit | null {
    return (
      this.getDirectControlPlayers().find((unit) => {
        const world = unit.getWorldPosition();
        return (
          unit.alive &&
          Phaser.Math.Distance.Between(worldX, worldY, world.x, world.y - 42) <= 40
        );
      }) ?? null
    );
  }

  private getHoveredEnemy(worldX: number, worldY: number): Unit | null {
    return (
      this.units
        .filter((unit) => unit.side === "enemy" && unit.alive)
        .find(
          (unit) =>
            Phaser.Math.Distance.Between(
              worldX,
              worldY,
              unit.getWorldPosition().x,
              unit.getWorldPosition().y - 24
            ) <= 36
        ) ?? null
    );
  }

  private getHoveredProp(worldX: number, worldY: number): Prop | null {
    return (
      this.props.find(
        (prop) =>
          !prop.destroyed &&
          Phaser.Math.Distance.Between(worldX, worldY, prop.image.x, prop.image.y - 24) <=
            (prop.kind === "vehicle" ? 58 : 34)
      ) ?? null
    );
  }

  private maintainPlayerAttackOrders(): void {
    this.playerUnits.forEach((unit) => {
      if (
        !unit.alive ||
        unit.holdPosition ||
        !unit.currentTarget ||
        !unit.manualAttackOrder
      ) {
        return;
      }

      const targetCell =
        unit.currentTarget instanceof Unit
          ? unit.currentTarget.currentCell
          : unit.currentTarget.cell;
      const range = (unit.getActiveWeapon()?.range ?? 3.5) + unit.getRangeBonus();
      if (unit.getCellDistanceTo(targetCell) > range * 0.88 && !unit.movePath.length) {
        const approach = this.findApproachCellForPlayer(unit, targetCell, range);
        unit.setPath(this.findUnitPath(unit, approach));
      }
    });
  }

  private findApproachCellForPlayer(
    unit: Unit,
    targetCell: GridPos,
    range: number
  ): GridPos {
    const candidates: GridPos[] = [];
    for (let y = targetCell.y - 4; y <= targetCell.y + 4; y += 1) {
      for (let x = targetCell.x - 4; x <= targetCell.x + 4; x += 1) {
        if (!this.map.inBounds(x, y) || !this.isWalkableForUnit(unit, x, y)) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(x, y, targetCell.x, targetCell.y);
        if (distance <= range && distance >= Math.max(1.2, range - 1.4)) {
          candidates.push({ x, y });
        }
      }
    }

    return (
      candidates.sort(
        (a, b) =>
          Phaser.Math.Distance.Between(a.x, a.y, unit.currentCell.x, unit.currentCell.y) -
          Phaser.Math.Distance.Between(b.x, b.y, unit.currentCell.x, unit.currentCell.y)
      )[0] ?? targetCell
    );
  }

  private spawnReinforcements(): void {
    if (!this.reinforcementCells.length) {
      return;
    }

    this.reinforcementCells.forEach((cell, index) => {
      const unit = new Unit(this, this.map, {
        id: `reinforcement-${index}`,
        label: "Response Unit",
        side: "enemy",
        role: "enemy",
        weaponId: index % 2 === 0 ? "smg" : "rifle",
        cell,
        maxHealth: 68,
        armor: 1,
        accuracy: 0.74,
        moveSpeed: 182,
        vision: 6.5,
        textureKey: index % 2 === 0 ? "unit-enemy-smg" : "unit-enemy-rifle",
        medkits: 0
      });
      unit.setAggro(true);
      this.units.push(unit);
    });
  }

  private worldToScreen(world: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    return new Phaser.Math.Vector2(
      (world.x - camera.scrollX) * camera.zoom,
      (world.y - camera.scrollY) * camera.zoom
    );
  }

  private getSquadCentroid(): Phaser.Math.Vector2 {
    const alive = this.playerUnits.filter((unit) => unit.alive);
    if (!alive.length) {
      return this.map.gridToWorld({ x: 0, y: 0 });
    }
    const accumulator = alive.reduce(
      (total, unit) => {
        const world = unit.getWorldPosition();
        total.x += world.x;
        total.y += world.y;
        return total;
      },
      { x: 0, y: 0 }
    );

    return new Phaser.Math.Vector2(
      accumulator.x / alive.length,
      accumulator.y / alive.length
    );
  }

  private centerCameraOn(world: Phaser.Math.Vector2): void {
    this.cameraController.centerOn(
      world.x - this.scale.width / 2,
      world.y - this.scale.height / 2
    );
  }

  private applyFloorFocus(force = false): void {
    const candidates =
      this.selectedUnits.length
        ? this.selectedUnits
        : this.getDirectControlPlayers().filter((unit) => unit.alive).length
          ? this.getDirectControlPlayers().filter((unit) => unit.alive)
          : this.playerUnits.filter((unit) => unit.alive);

    const nextFloor = candidates.length
      ? Math.max(
          ...candidates.map((unit) =>
            this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y)
          )
        )
      : 0;

    if (!force && nextFloor === this.focusFloor) {
      const cutawayCells = candidates
        .filter(
          (unit) => this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y) === nextFloor
        )
        .map((unit) => unit.currentCell);
      this.map.setCutawayCells(cutawayCells);
      return;
    }

    this.focusFloor = nextFloor;
    this.map.setFloorFocus(nextFloor);
    this.map.setCutawayCells(
      candidates
        .filter(
          (unit) => this.map.getElevationAt(unit.currentCell.x, unit.currentCell.y) === nextFloor
        )
        .map((unit) => unit.currentCell)
    );
    this.props.forEach((prop) => prop.setFloorVisibility(nextFloor));
    this.cameraController.setFloorFocus(nextFloor);
  }

  private drawDebug(): void {
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(1, 0x7df1ff, 0.4);
    this.units.forEach((unit) => {
      if (!unit.alive) {
        return;
      }
      const world = unit.getWorldPosition();
      this.debugGraphics.strokeCircle(world.x, world.y - 28, 12);
      if (unit.movePath.length) {
        this.debugGraphics.lineStyle(1, 0x7df1ff, 0.3);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(world.x, world.y - 24);
        unit.movePath.forEach((cell) => {
          const point = this.map.gridToWorld(cell);
          this.debugGraphics.lineTo(point.x, point.y - 24);
        });
        this.debugGraphics.strokePath();
      }
    });
  }

  private isWalkableForUnit = (unit: Unit, x: number, y: number): boolean => {
    if (!this.map.inBounds(x, y) || !this.map.isPlayableCell(x, y)) {
      return false;
    }

    if (
      this.props.some(
        (prop) => prop.isBlocking && prop.cell.x === x && prop.cell.y === y
      )
    ) {
      return false;
    }

    if (
      this.units.some(
        (candidate) =>
          candidate.alive &&
          candidate.id !== unit.id &&
          candidate.currentCell.x === x &&
          candidate.currentCell.y === y
      )
    ) {
      return false;
    }

    return true;
  };

  private getDirectControlPlayers(): Unit[] {
    return this.playerUnits.filter((unit) => unit.controlMode === "manual");
  }

  private getAssistPlayers(): Unit[] {
    return this.playerUnits.filter((unit) => unit.controlMode === "assist");
  }

  private findUnitPath(unit: Unit, target: GridPos): GridPos[] {
    if (unit.currentCell.x === target.x && unit.currentCell.y === target.y) {
      return [];
    }

    return Pathfinding.findPathByNeighbors(unit.currentCell, target, (cell) =>
      this.map.getTraversalNeighbors(cell, (x, y) => this.isWalkableForUnit(unit, x, y))
    );
  }
}
