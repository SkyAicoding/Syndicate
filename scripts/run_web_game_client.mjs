import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
const clientPath = path.join(
  codexHome,
  "skills",
  "develop-web-game",
  "scripts",
  "web_game_playwright_client.js"
);

if (!fs.existsSync(clientPath)) {
  console.error(`Playwright client not found at: ${clientPath}`);
  console.error("Set CODEX_HOME or install the develop-web-game skill first.");
  process.exit(1);
}

const envOptions = [
  ["--url", process.env.npm_config_url],
  ["--iterations", process.env.npm_config_iterations],
  ["--pause-ms", process.env.npm_config_pause_ms],
  ["--headless", process.env.npm_config_headless],
  ["--screenshot-dir", process.env.npm_config_screenshot_dir],
  ["--actions-file", process.env.npm_config_actions_file],
  ["--actions-json", process.env.npm_config_actions_json],
  ["--click", process.env.npm_config_click],
  ["--click-selector", process.env.npm_config_click_selector]
];

const rawArgs = process.argv.slice(2);
const hasNamedArgs = rawArgs.some((arg) => arg.startsWith("--"));
const forwardedArgs = hasNamedArgs ? [...rawArgs] : [];

if (!hasNamedArgs && rawArgs.length > 0) {
  const [url, click, iterations, pauseMs, screenshotDir] = rawArgs;

  if (url) {
    forwardedArgs.push("--url", url);
  }
  if (click) {
    forwardedArgs.push("--click", click);
  }
  if (iterations) {
    forwardedArgs.push("--iterations", iterations);
  }
  if (pauseMs) {
    forwardedArgs.push("--pause-ms", pauseMs);
  }
  if (screenshotDir) {
    forwardedArgs.push("--screenshot-dir", screenshotDir);
  }
}

if (!hasNamedArgs && rawArgs.length === 0) {
  envOptions.forEach(([flag, value]) => {
    if (!value || forwardedArgs.includes(flag)) {
      return;
    }

    forwardedArgs.push(flag, value);
  });
}

const child = spawn(process.execPath, [clientPath, ...forwardedArgs], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
