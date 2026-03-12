import { expect, test, type Page } from "@playwright/test";

type MissionUnit = {
  id: string;
  cell: { x: number; y: number };
  screen: { x: number; y: number };
  hp: number;
  maxHp: number;
  alive: boolean;
  controlMode?: "manual" | "assist";
};

type MissionState = {
  missionState: "active" | "success" | "failure";
  selectedIds: string[];
  players: MissionUnit[];
  enemies: MissionUnit[];
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
  await resetState(page);

  await page.getByRole("button", { name: /^Settings$/ }).click();
  await page.locator('[data-setting="showDebug"]').check();
  await page.locator('[data-setting="edgeScroll"]').uncheck();
  await page.getByRole("button", { name: /^Back$/ }).click();
  await expect(page.getByTestId("main-menu-screen")).toBeVisible();

  await page.getByTestId("new-campaign-button").click();
  await page.getByTestId("open-loadout-button").click();
  await page.locator('[data-agent-weapon="agent-1:smg"]').click();
  await page.locator('[data-agent-control="agent-3:assist"]').click();
  await page.locator('[data-agent-deploy="agent-4:deploy"]').click();

  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__shardline?.getState().agents.find((agent) => agent.id === "agent-1")
            ?.weaponId
      )
    )
    .toBe("smg");
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
    .toBe("smg");
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

  await page.keyboard.press("3");

  await expect
    .poll(async () => (await getMissionState(page)).selectedIds.join(","))
    .toBe("agent-3");

  await page.evaluate(() => window.__shardline?.moveSelectedAgent(36, 74));

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const unit = state.players.find((candidate) => candidate.id === "agent-3");
      if (!unit) {
        return false;
      }

      return (
        Math.abs(unit.cell.x - 36) <= 1 &&
        Math.abs(unit.cell.y - 74) <= 1 &&
        !(unit.cell.x === shade?.cell.x && unit.cell.y === shade?.cell.y)
      );
    }, { timeout: 9000 })
    .toBe(true);

  await page.evaluate(() => {
    window.__shardline?.selectMissionAgent(0);
    window.__shardline?.moveSelectedAgent(46, 72);
    window.__shardline?.selectMissionAgent(1);
    window.__shardline?.moveSelectedAgent(48, 74);
  });

  await expect
    .poll(async () => {
      const state = await getMissionState(page);
      const playerDamaged = state.players.some((unit) => unit.hp < unit.maxHp);
      const enemyDamaged = state.enemies.some(
        (unit) => unit.hp < unit.maxHp || !unit.alive
      );
      return playerDamaged || enemyDamaged;
    }, { timeout: 12000 })
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
