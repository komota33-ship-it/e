"""Record the visible bottom of each sprite frame for stable ground contact.

This is an offline asset-metadata step. Godot reads the generated JSON and does
not need Python or Pillow at runtime. Regenerate with:
    python3 godot/generate_sprite_anchors.py
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "godot" / "sprite_anchors.json"
DEATH_OUTPUT = ROOT / "godot" / "sprite_death_layouts.json"
PREFIXES = ("walk_", "death_", "melee_", "spit_", "scream_", "volley_", "surrender_", "motion_")


def frame_bottoms(path: Path) -> list[int]:
    image = Image.open(path).convert("RGBA")
    rows = 3 if path.stem.startswith("motion_") else 2
    frame_width = image.width / 4
    frame_height = image.height / rows
    bottoms = []
    for frame in range(4 * rows):
        column, row = frame % 4, frame // 4
        cell = image.crop(
            (
                round(column * frame_width),
                round(row * frame_height),
                round((column + 1) * frame_width),
                round((row + 1) * frame_height),
            )
        )
        # Glows and barely visible pixels should not hold the sprite above the floor.
        alpha = cell.getchannel("A").point(lambda value: 255 if value > 96 else 0)
        bounds = alpha.getbbox()
        bottoms.append(bounds[3] if bounds else round(frame_height))
    return bottoms


def death_layout(path: Path) -> dict:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A").point(lambda value: 255 if value > 96 else 0)
    gaps = []
    gap_start = None
    for y in range(round(height * 0.35), round(height * 0.78)):
        occupied = alpha.crop((0, y, width, y + 1)).getbbox() is not None
        if not occupied and gap_start is None:
            gap_start = y
        elif occupied and gap_start is not None:
            gaps.append((gap_start, y))
            gap_start = None
    if gap_start is not None:
        gaps.append((gap_start, round(height * 0.78)))
    split = round(sum(max(gaps, key=lambda gap: gap[1] - gap[0])) / 2) if gaps else height // 2
    bottoms = []
    for frame in range(8):
        column, row = frame % 4, frame // 4
        top, bottom = (0, split) if row == 0 else (split, height)
        cell = alpha.crop((round(column * width / 4), top, round((column + 1) * width / 4), bottom))
        bounds = cell.getbbox()
        bottoms.append(bounds[3] if bounds else bottom - top)
    return {"split": split, "bottoms": bottoms}


def main() -> None:
    anchors = {
        path.stem: frame_bottoms(path)
        for path in sorted(ASSETS.glob("*.png"))
        if path.stem.startswith(PREFIXES)
    }
    OUTPUT.write_text(json.dumps(anchors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    deaths = {path.stem: death_layout(path) for path in sorted(ASSETS.glob("death_*.png"))}
    DEATH_OUTPUT.write_text(json.dumps(deaths, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(anchors)} sprite sheets to {OUTPUT} and {len(deaths)} death layouts to {DEATH_OUTPUT}")


if __name__ == "__main__":
    main()
