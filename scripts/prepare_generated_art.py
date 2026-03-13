from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


@dataclass(frozen=True)
class AssetJob:
    source_name: str
    target_path: str
    size: tuple[int, int]
    mode: str = "contain"
    scale: float = 1.0
    align: tuple[float, float] = (0.5, 0.5)
    trim_alpha: bool = True
    trim_padding: int = 0


ASSET_JOBS: tuple[AssetJob, ...] = (
    AssetJob("tile-road", "phaser/tile-road.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("tile-sidewalk", "phaser/tile-sidewalk.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("tile-plaza", "phaser/tile-plaza.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("tile-lab", "phaser/tile-lab.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("tile-industrial", "phaser/tile-industrial.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("tile-hazard", "phaser/tile-hazard.png", (128, 64), mode="tile-cover", trim_padding=6),
    AssetJob("prop-barrier", "phaser/prop-barrier.png", (92, 88), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-crate", "phaser/prop-crate.png", (82, 82), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-terminal", "phaser/prop-terminal.png", (84, 118), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-door", "phaser/prop-door.png", (90, 132), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-glass", "phaser/prop-glass.png", (92, 132), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-vehicle", "phaser/prop-vehicle.png", (128, 100), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-neon", "phaser/prop-neon.png", (72, 132), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-barrel", "phaser/prop-barrel.png", (64, 92), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-hvac", "phaser/prop-hvac.png", (118, 108), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-skylight", "phaser/prop-skylight.png", (108, 72), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-uplink", "phaser/prop-uplink.png", (92, 138), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-stairwell", "phaser/prop-stairwell.png", (118, 142), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-billboard", "phaser/prop-billboard.png", (138, 176), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-facade-wall", "phaser/prop-facade-wall.png", (146, 188), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-facade-corner", "phaser/prop-facade-corner.png", (158, 206), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-checkpoint", "phaser/prop-checkpoint.png", (154, 134), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-streetlight", "phaser/prop-streetlight.png", (84, 196), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-fence", "phaser/prop-fence.png", (156, 118), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-pipe-bank", "phaser/prop-pipe-bank.png", (176, 122), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-support-tower", "phaser/prop-support-tower.png", (150, 214), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("prop-tank-cluster", "phaser/prop-tank-cluster.png", (188, 194), scale=0.98, align=(0.5, 1.0), trim_padding=6),
    AssetJob("unit-player-operator", "phaser/unit-player-operator.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-player-breacher", "phaser/unit-player-breacher.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-player-infiltrator", "phaser/unit-player-infiltrator.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-player-support", "phaser/unit-player-support.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-enemy-rifle", "phaser/unit-enemy-rifle.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-enemy-smg", "phaser/unit-enemy-smg.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-enemy-shotgun", "phaser/unit-enemy-shotgun.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-civilian", "phaser/unit-civilian.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("unit-vip", "phaser/unit-vip.png", (84, 112), scale=0.98, align=(0.5, 1.0), trim_padding=4),
    AssetJob("portrait-agent-1", "portraits/portrait-agent-1.png", (86, 86), "cover", trim_padding=0),
    AssetJob("portrait-agent-2", "portraits/portrait-agent-2.png", (86, 86), "cover", trim_padding=0),
    AssetJob("portrait-agent-3", "portraits/portrait-agent-3.png", (86, 86), "cover", trim_padding=0),
    AssetJob("portrait-agent-4", "portraits/portrait-agent-4.png", (86, 86), "cover", trim_padding=0),
    AssetJob("ui-panel-overlay", "ui/ui-panel-overlay.png", (1200, 420), "stretch", trim_padding=2),
    AssetJob("ui-card-overlay", "ui/ui-card-overlay.png", (720, 520), "stretch", trim_padding=2),
    AssetJob("ui-button-primary", "ui/ui-button-primary.png", (640, 160), "stretch", trim_padding=8),
    AssetJob("ui-button-secondary", "ui/ui-button-secondary.png", (640, 160), "stretch", trim_padding=8),
    AssetJob("ui-pill", "ui/ui-pill.png", (320, 120), "stretch", trim_padding=8),
    AssetJob("ui-minimap-frame", "ui/ui-minimap-frame.png", (512, 512), "stretch", trim_padding=2),
)


def load_source(source_dir: Path, source_name: str) -> Image.Image:
    candidates = (
        source_dir / f"{source_name}-web.png",
        source_dir / f"{source_name}.png",
    )

    for path in candidates:
        if path.exists():
            return Image.open(path).convert("RGBA")

    raise FileNotFoundError(f"Missing source image for {source_name}")


def trim_to_alpha(image: Image.Image, padding: int) -> Image.Image:
    bbox = image.getbbox()
    if bbox is None:
        return image.copy()

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def contain_on_canvas(
    image: Image.Image,
    size: tuple[int, int],
    scale: float,
    align: tuple[float, float],
    trim_alpha_enabled: bool,
    trim_padding: int,
) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    fitted = trim_to_alpha(image, trim_padding) if trim_alpha_enabled else image.copy()
    max_size = (
        max(1, int(size[0] * scale)),
        max(1, int(size[1] * scale)),
    )
    fitted.thumbnail(max_size, Image.Resampling.LANCZOS)
    offset = (
        max(0, round((size[0] - fitted.width) * align[0])),
        max(0, round((size[1] - fitted.height) * align[1])),
    )
    canvas.alpha_composite(fitted, offset)
    return canvas


def cover_to_size(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.35))


def cover_trimmed_to_size(
    image: Image.Image,
    size: tuple[int, int],
    align: tuple[float, float],
    trim_padding: int,
) -> Image.Image:
    source = trim_to_alpha(image, trim_padding)
    return ImageOps.fit(
        source,
        size,
        method=Image.Resampling.LANCZOS,
        centering=align,
    )


def stretch_to_size(
    image: Image.Image,
    size: tuple[int, int],
    trim_alpha_enabled: bool,
    trim_padding: int,
) -> Image.Image:
    source = trim_to_alpha(image, trim_padding) if trim_alpha_enabled else image.copy()
    return source.resize(size, Image.Resampling.LANCZOS)


def main() -> int:
    parser = argparse.ArgumentParser(description="Resize generated art into runtime slots.")
    parser.add_argument(
        "--source-dir",
        default="output/imagegen/pass1/source",
        help="Directory containing raw generated PNG assets.",
    )
    parser.add_argument(
        "--target-dir",
        default="public/generated",
        help="Directory to write prepared runtime assets into.",
    )
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="Return success even when some source images are missing.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    source_dir = (repo_root / args.source_dir).resolve()
    target_dir = (repo_root / args.target_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    prepared = 0
    missing: list[str] = []

    for job in ASSET_JOBS:
        try:
            source = load_source(source_dir, job.source_name)
        except FileNotFoundError:
            missing.append(job.source_name)
            continue

        output = (
            cover_to_size(source, job.size)
            if job.mode == "cover"
            else cover_trimmed_to_size(source, job.size, job.align, job.trim_padding)
            if job.mode == "tile-cover"
            else stretch_to_size(
                source,
                job.size,
                job.trim_alpha,
                job.trim_padding,
            )
            if job.mode == "stretch"
            else contain_on_canvas(
                source,
                job.size,
                job.scale,
                job.align,
                job.trim_alpha,
                job.trim_padding,
            )
        )
        destination = target_dir / job.target_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        output.save(destination)
        prepared += 1

    print(f"Prepared {prepared} assets into {target_dir}")
    if missing:
        print("Missing source images:")
        for name in missing:
            print(f"- {name}")

    return 0 if args.allow_missing or not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
