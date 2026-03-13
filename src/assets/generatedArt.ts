import Phaser from "phaser";

export const USE_GENERATED_ART = import.meta.env.VITE_USE_GENERATED_ART === "1";

export const GENERATED_MISSION_ART: Record<string, string> = {
  "tile-road": "/generated/phaser/tile-road.png",
  "tile-sidewalk": "/generated/phaser/tile-sidewalk.png",
  "tile-plaza": "/generated/phaser/tile-plaza.png",
  "tile-lab": "/generated/phaser/tile-lab.png",
  "tile-industrial": "/generated/phaser/tile-industrial.png",
  "tile-hazard": "/generated/phaser/tile-hazard.png",
  "prop-barrier": "/generated/phaser/prop-barrier.png",
  "prop-crate": "/generated/phaser/prop-crate.png",
  "prop-terminal": "/generated/phaser/prop-terminal.png",
  "prop-door": "/generated/phaser/prop-door.png",
  "prop-glass": "/generated/phaser/prop-glass.png",
  "prop-vehicle": "/generated/phaser/prop-vehicle.png",
  "prop-neon": "/generated/phaser/prop-neon.png",
  "prop-barrel": "/generated/phaser/prop-barrel.png",
  "prop-hvac": "/generated/phaser/prop-hvac.png",
  "prop-skylight": "/generated/phaser/prop-skylight.png",
  "prop-uplink": "/generated/phaser/prop-uplink.png",
  "prop-stairwell": "/generated/phaser/prop-stairwell.png",
  "prop-billboard": "/generated/phaser/prop-billboard.png",
  "prop-facade-wall": "/generated/phaser/prop-facade-wall.png",
  "prop-facade-corner": "/generated/phaser/prop-facade-corner.png",
  "prop-checkpoint": "/generated/phaser/prop-checkpoint.png",
  "prop-streetlight": "/generated/phaser/prop-streetlight.png",
  "prop-fence": "/generated/phaser/prop-fence.png",
  "prop-pipe-bank": "/generated/phaser/prop-pipe-bank.png",
  "prop-support-tower": "/generated/phaser/prop-support-tower.png",
  "prop-tank-cluster": "/generated/phaser/prop-tank-cluster.png",
  "unit-player-operator": "/generated/phaser/unit-player-operator.png",
  "unit-player-breacher": "/generated/phaser/unit-player-breacher.png",
  "unit-player-infiltrator": "/generated/phaser/unit-player-infiltrator.png",
  "unit-player-support": "/generated/phaser/unit-player-support.png",
  "unit-enemy-rifle": "/generated/phaser/unit-enemy-rifle.png",
  "unit-enemy-smg": "/generated/phaser/unit-enemy-smg.png",
  "unit-enemy-shotgun": "/generated/phaser/unit-enemy-shotgun.png",
  "unit-civilian": "/generated/phaser/unit-civilian.png",
  "unit-vip": "/generated/phaser/unit-vip.png"
};

const GENERATED_PORTRAITS: Record<string, string> = {
  "agent-1": "/generated/portraits/portrait-agent-1.png",
  "agent-2": "/generated/portraits/portrait-agent-2.png",
  "agent-3": "/generated/portraits/portrait-agent-3.png",
  "agent-4": "/generated/portraits/portrait-agent-4.png"
};

export const preloadGeneratedMissionArt = (scene: Phaser.Scene): void => {
  if (!USE_GENERATED_ART) {
    return;
  }

  Object.entries(GENERATED_MISSION_ART).forEach(([key, path]) => {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, path);
    }
  });
};

export const getGeneratedPortraitUrl = (agentId: string): string | null => {
  if (!USE_GENERATED_ART) {
    return null;
  }

  return GENERATED_PORTRAITS[agentId] ?? null;
};
