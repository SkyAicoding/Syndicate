import { expect, test, type Page } from "@playwright/test";

type MissionUnit = {
  id: string;
  weaponId?: string | null;
  weaponName?: string | null;
  ammoReserve?: number;
  cell: { x: number; y: number };
  screen: { x: number; y: number };
  selectScreen?: { x: number; y: number };
  hp: number;
  maxHp: number;
  alive: boolean;
  controlMode?: "manual" | "assist";
  brainState?: "idle" | "moving" | "combat" | "panic" | "escort";
  pathLength?: number;
};

type MissionState = {
  missionState: "active" | "success" | "failure";
  selectedIds: string[];
  players: MissionUnit[];
  enemies: MissionUnit[];
  interactives?: Array<{
    id: string;
    kind: string;
    cell: { x: number; y: number };
    screen: { x: number; y: number };
  }>;
  lastInput?: {
    mode: string;
    distance: number;
    commandIssued: boolean;
    action: string;
  };
};

const resetState = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/");
};

const startMission = async (
  page: Page,
  missionId: "m01" | "m02" | "m03"
): Promise<void> => {
  await page.evaluate((id) => window.__shardline?.startMission(id), missionId);
  await expect(page.getByTestId("mission-screen")).toBeVisible();
};

const getMissionState = async (page: Page): Promise<MissionState> =>
  page.evaluate(() => window.__shardline?.getMissionState() as MissionState);

const getMissionCanvasBox = async (
  page: Page
): Promise<{ x: number; y: number; width: number; height: number }> => {
  const box = await page.locator("[data-testid='mission-viewport'] canvas").boundingBox();
  expect(box).not.toBeNull();
  return box!;
};

const dragOnMission = async (
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
  button: "left" | "right" = "left"
): Promise<void> => {
  const box = await getMissionCanvasBox(page);
  await page.mouse.move(box.x + start.x, box.y + start.y);
  await page.mouse.down({ button });
  await page.mouse.move(box.x + end.x, box.y + end.y, { steps: 14 });
  await page.mouse.up({ button });
};

const clickOnMission = async (
  page: Page,
  point: { x: number; y: number },
  options?: { button?: "left" | "right"; clickCount?: number }
): Promise<void> => {
  const box = await getMissionCanvasBox(page);
  await page.mouse.click(box.x + point.x, box.y + point.y, {
    button: options?.button ?? "left",
    clickCount: options?.clickCount ?? 1
  });
};

const doubleClickOnMission = async (
  page: Page,
  point: { x: number; y: number },
  button: "left" | "right" = "left"
): Promise<void> => {
  const box = await getMissionCanvasBox(page);
  await page.mouse.click(box.x + point.x, box.y + point.y, { button });
  await page.waitForTimeout(120);
  await page.mouse.click(box.x + point.x, box.y + point.y, { button });
};

test("app boots to the main menu and opens world map and loadout", async ({
  page
}) => {
  await resetState(page);

  await expect(page.getByTestId("main-menu-screen")).toBeVisible();
  await page.getByTestId("new-campaign-button").click();
  await expect(page.getByTestId("world-map-screen")).toBeVisible();
  await page.getByTestId("open-loadout-button").click();
  await expect(page.getByTestId("launch-mission-button")).toBeVisible();
});

test("settings, loadout changes, and continue flow persist across reload", async ({
  page
}) => {
  const expectedWeaponOrder = [
    "Colt",
    "Uiz",
    "Breach-12",
    "Assault Rifle"
  ];

  await resetState(page);

  await page.getByRole("button", { name: /^Settings$/ }).click();
  await page.locator('[data-setting="showDebug"]').check();
  await page.locator('[data-setting="edgeScroll"]').uncheck();
  await page.getByRole("button", { name: /^Back$/ }).click();
  await expect(page.getByTestId("main-menu-screen")).toBeVisible();

  await page.getByTestId("new-campaign-button").click();
  await page.getByTestId("open-loadout-button").click();

  await expect(
    page.locator('[data-agent-weapon-select="agent-1"] option')
  ).toHaveText(expectedWeaponOrder);

  await page.locator('[data-agent-weapon-select="agent-1"]').selectOption("uiz");
  await expect(
    page.locator('[data-agent-weapon-select="agent-1"] option')
  ).toHaveText(expectedWeaponOrder);
  await page.locator('[data-agent-weapon-select="agent-1"]').selectOption("assault-rifle");
  await expect(
    page.locator('[data-agent-weapon-select="agent-1"] option')
  ).toHaveText(expectedWeaponOrder);
  await page.locator('[data-agent-control-select="agent-3"]').selectOption("assist");
  await page.locator('[data-agent-deploy-select="agent-4"]').selectOption("bench");

  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-1")
            ?.weaponId
      )
    )
    .toBe("assault-rifle");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-3")
            ?.controlMode
      )
    )
    .toBe("assist");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-4")
            ?.deployed
      )
    )
    .toBe(false);

  await page.reload();
  await expect(page.getByTestId("continue-button")).toBeEnabled();
  await page.getByRole("button", { name: /^Settings$/ }).click();
  await expect(page.locator('[data-setting="showDebug"]')).toBeChecked();
  await expect(page.locator('[data-setting="edgeScroll"]')).not.toBeChecked();
  await page.getByRole("button", { name: /^Back$/ }).click();

  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("world-map-screen")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-1")
            ?.weaponId
      )
    )
    .toBe("assault-rifle");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-3")
            ?.controlMode
      )
    )
    .toBe("assist");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-4")
            ?.deployed
      )
    )
    .toBe(false);

  await page.getByTestId("open-loadout-button").click();
  await page.getByTestId("launch-mission-button").click();
  await expect(page.getByTestId("mission-screen")).toBeVisible();
  await expect
    .poll(async () => Boolean((await getMissionState(page)).missionState))
    .toBe(true);
  await expect
    .poll(async () => (await getMissionState(page)).players.length)
    .toBe(3);
  await expect
    .poll(async () =>
      (await getMissionState(page)).players.filter((unit) => unit.controlMode === "assist").length
    )
    .toBe(1);
});

test("mission supports selection, movement, and combat without crashing", async ({
  page
}) => {
  await resetState(page);
  await startMission(page, "m01");

  const stateBefore = await getMissionState(page);
  const shade = stateBefore.players.find((unit) => unit.id === "agent-3");

  expect(shade).toBeTruthy();

  await page.evaluate(
    ({ x, y }) => window.__shardline?.focusMissionCell(x, y),
    { x: 42, y: 86 }
  );
  await page.waitForTimeout(250);

  const armoryState = await getMissionState(page);
  const armory = armoryState.interactives?.find((prop) => prop.kind === "armory-locker");
  const vantaBeforeArmory = armoryState.players.find((unit) => unit.id === "agent-1");

  expect(armory).toBeTruthy();
  expect(vantaBeforeArmory?.weaponId).toBe("assault-rifle");

  await page.evaluate((propId) => window.__shardline?.interactMissionProp(propId), armory!.id);

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      return state.players.find((unit) => unit.id === "agent-1")?.weaponId;
    }, { timeout: 7000 })
    .toBe("battle-rifle");

  const crateState = await getMissionState(page);
  const crate = crateState.interactives?.find(
    (prop) => prop.kind === "crate" && prop.cell.y >= 80
  );
  const vantaAmmoBeforeCrate = crateState.players.find((unit) => unit.id === "agent-1")?.ammoReserve ?? 0;

  expect(crate).toBeTruthy();

  await page.evaluate((propId) => window.__shardline?.interactMissionProp(propId), crate!.id);

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      return (state.players.find((unit) => unit.id === "agent-1")?.ammoReserve ?? 0) > vantaAmmoBeforeCrate;
    }, { timeout: 7000 })
    .toBe(true);

  await dragOnMission(
    page,
    { x: 80, y: 120 },
    { x: 280, y: 120 }
  );

  await expect
    .poll(async () => (await getMissionState(page)).selectedIds.join(","))
    .toBe(stateBefore.selectedIds.join(","));

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const unit = state.players.find((candidate) => candidate.id === "agent-3");
      if (!unit) {
        return false;
      }

      return (
        state.lastInput?.action === "camera-pan" &&
        unit.cell.x === shade?.cell.x &&
        unit.cell.y === shade?.cell.y
      );
    }, { timeout: 4000 })
    .toBe(true);

  const pannedState = await getMissionState(page);
  const manualPlayers = pannedState.players.filter(
    (unit) => unit.alive && unit.controlMode !== "assist"
  );
  const focusUnit =
    pannedState.players.find((unit) => unit.id === pannedState.selectedIds[0]) ??
    pannedState.players[0];

  expect(focusUnit).toBeTruthy();

  await page.evaluate(
    ({ x, y }) => window.__shardline?.focusMissionCell(x, y),
    { x: focusUnit!.cell.x, y: focusUnit!.cell.y }
  );
  await page.waitForTimeout(250);

  const regroupedState = await getMissionState(page);
  const regroupedFocusUnit =
    regroupedState.players.find((unit) => unit.id === focusUnit!.id) ?? regroupedState.players[0];

  await doubleClickOnMission(page, {
    x: regroupedFocusUnit!.selectScreen?.x ?? regroupedFocusUnit!.screen.x,
    y: regroupedFocusUnit!.selectScreen?.y ?? regroupedFocusUnit!.screen.y - 34
  });

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      return (
        state.lastInput?.action === "select-all" &&
        state.selectedIds.length === manualPlayers.length
      );
    })
    .toBe(true);

  const selectedState = await getMissionState(page);
  const selectedIds = [...selectedState.selectedIds];
  const startCells = new Map(
    selectedState.players.map((unit) => [unit.id, { ...unit.cell }])
  );

  await page.evaluate(
    ({ x, y }) => window.__shardline?.focusMissionCell(x, y),
    { x: 34, y: 76 }
  );
  await page.waitForTimeout(250);
  const missionCanvas = await getMissionCanvasBox(page);

  let moveIssued = false;
  for (let attempt = 0; attempt < 3 && !moveIssued; attempt += 1) {
    await clickOnMission(page, {
      x: missionCanvas.width / 2,
      y: missionCanvas.height / 2
    });
    await page.waitForTimeout(180);

    const postClick = await getMissionState(page);
    moveIssued = Boolean(
      postClick.lastInput?.action === "move" && postClick.lastInput.commandIssued
    );
  }

  expect(moveIssued).toBe(true);

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const movedCount = selectedIds.reduce((total, id) => {
        const unit = state.players.find((candidate) => candidate.id === id);
        const startCell = startCells.get(id);
        if (!unit || !startCell) {
          return total;
        }

        const hasMoved =
          unit.cell.x !== startCell.x ||
          unit.cell.y !== startCell.y;
        const hasOrder =
          unit.brainState === "moving" ||
          (unit.pathLength ?? 0) > 0;
        return total + (hasMoved || hasOrder ? 1 : 0);
      }, 0);

      return movedCount >= Math.min(2, selectedIds.length);
    }, { timeout: 9000 })
    .toBe(true);

  const moveState = await getMissionState(page);
  const vantaBeforeLaneCross = moveState.players.find((unit) => unit.id === "agent-1");

  expect(vantaBeforeLaneCross).toBeTruthy();

  await page.evaluate(() => {
    window.__shardline?.selectMissionAgent(0);
    window.__shardline?.moveSelectedAgent(72, 74);
  });

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const vanta = state.players.find((unit) => unit.id === "agent-1");
      if (!vanta || !vantaBeforeLaneCross) {
        return false;
      }

      return (
        (vanta.pathLength ?? 0) > 0 ||
        vanta.cell.x !== vantaBeforeLaneCross.cell.x ||
        vanta.cell.y !== vantaBeforeLaneCross.cell.y
      );
    }, { timeout: 4000 })
    .toBe(true);

  const focusEnemy =
    moveState.enemies.find((unit) => unit.cell.x === 43 && unit.cell.y === 74) ??
    moveState.enemies[0];

  expect(focusEnemy).toBeTruthy();

  await page.evaluate(
    ({ x, y }) => window.__shardline?.focusMissionCell(x, y),
    focusEnemy!.cell
  );
  await page.waitForTimeout(250);

  const attackState = await getMissionState(page);
  const visibleEnemy = attackState.enemies.find(
    (unit) =>
      unit.screen.x >= 40 &&
      unit.screen.x <= 1160 &&
      unit.screen.y >= 40 &&
      unit.screen.y <= 760
  );

  expect(visibleEnemy).toBeTruthy();

  await page.evaluate(
    ({ x, y }) => window.__shardline?.moveSelectedAgent(x, y),
    visibleEnemy!.cell
  );

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const selectedCombatants = state.players.filter((unit) => selectedIds.includes(unit.id));
      return selectedCombatants.some(
        (unit) => unit.brainState === "moving" || (unit.pathLength ?? 0) > 0
      );
    }, { timeout: 6000 })
    .toBe(true);

  let attackIssued = false;
  for (let attempt = 0; attempt < 3 && !attackIssued; attempt += 1) {
    const state = await getMissionState(page);
    const enemyTarget = state.enemies.find(
      (unit) =>
        unit.screen.x >= 40 &&
        unit.screen.x <= 1160 &&
        unit.screen.y >= 40 &&
        unit.screen.y <= 760
    );

    expect(enemyTarget).toBeTruthy();

    await clickOnMission(page, {
      x: enemyTarget!.screen.x,
      y: enemyTarget!.screen.y - 24
    });
    await page.waitForTimeout(180);

    const postClick = await getMissionState(page);
    attackIssued = Boolean(
      postClick.lastInput?.action === "attack" && postClick.lastInput.commandIssued
    );
  }

  expect(attackIssued).toBe(true);

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const selectedCombatants = state.players.filter((unit) => selectedIds.includes(unit.id));
      const attacking = selectedCombatants.some(
        (unit) => unit.brainState === "combat" || (unit.pathLength ?? 0) > 0
      );
      const enemyDamaged = state.enemies.some(
        (unit) => unit.hp < unit.maxHp || !unit.alive
      );
      return attacking || enemyDamaged;
    }, { timeout: 9000 })
    .toBe(true);

  const vantaBeforeDiagonalMove = await getMissionState(page).then(
    (state) => state.players.find((unit) => unit.id === "agent-1")!
  );

  await page.evaluate(() => {
    window.__shardline?.selectMissionAgent(0);
    window.__shardline?.moveSelectedAgent(46, 72);
    window.__shardline?.selectMissionAgent(1);
    window.__shardline?.moveSelectedAgent(48, 74);
  });

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const vanta = state.players.find((unit) => unit.id === "agent-1");
      if (!vanta) {
        return false;
      }

      return (
        Math.abs(vanta.screen.x - vantaBeforeDiagonalMove.screen.x) >= 28 &&
        Math.abs(vanta.screen.y - vantaBeforeDiagonalMove.screen.y) >= 10
      );
    }, { timeout: 4000 })
    .toBe(true);

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const playerDamaged = state.players.some((unit) => unit.hp < unit.maxHp);
      const enemyDamaged = state.enemies.some(
        (unit) => unit.hp < unit.maxHp || !unit.alive
      );
      return playerDamaged || enemyDamaged;
    }, { timeout: 18000 })
    .toBeTruthy();
});

test("missions can resolve, unlock progression, and recover through retry or abort", async ({
  page
}) => {
  await resetState(page);
  await startMission(page, "m01");

  await page.evaluate(() => window.__shardline?.forceMissionEnd(true));
  await expect(page.getByTestId("mission-result-screen")).toBeVisible();
  await expect(page.getByText(/complete/i)).toBeVisible();
  await page.getByRole("button", { name: /return to region map/i }).click();
  await expect(page.getByTestId("world-map-screen")).toBeVisible();
  await expect(page.getByTestId("mission-card-m02")).toBeEnabled();

  await page.reload();
  await expect(page.getByTestId("continue-button")).toBeEnabled();
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("mission-card-m02")).toBeEnabled();

  await startMission(page, "m02");
  await page.evaluate(() => window.__shardline?.forceMissionEnd(false));
  await expect(page.getByTestId("mission-result-screen")).toBeVisible();
  await expect(page.getByText(/failed/i)).toBeVisible();
  await page.getByRole("button", { name: /retry operation/i }).click();
  await expect(page.getByTestId("mission-screen")).toBeVisible();
  await page.getByRole("button", { name: /abort to map/i }).click();
  await expect(page.getByTestId("world-map-screen")).toBeVisible();
});
