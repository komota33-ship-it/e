"""Measure the visible bounds of generated 2x2 apocalypse prop sheets.

This only reads image alpha; the generated artwork is left intact.
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent


def cutouts(path: Path) -> list[list[int]]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    mask = image.getchannel("A").point(lambda alpha: 255 if alpha > 48 else 0)
    result = []
    for index in range(4):
        column, row = index % 2, index // 2
        left, right = column * width // 2, (column + 1) * width // 2
        top, bottom = row * height // 2, (row + 1) * height // 2
        bounds = mask.crop((left, top, right, bottom)).getbbox()
        if bounds is None:
            raise ValueError(f"Empty generated prop: {path} cell {index}")
        result.append([left + bounds[0], top + bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1]])
    return result


def main() -> None:
    result = {path.stem.removeprefix("apocalypse_"): cutouts(path)
              for path in sorted((ROOT / "assets").glob("apocalypse_*.png"))}
    if len(result) != 14:
        raise ValueError(f"Expected fourteen generated environment sheets; found {len(result)}")
    destination = ROOT / "godot" / "apocalypse_cells.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Measured {sum(map(len, result.values()))} generated environment props")


if __name__ == "__main__":
    main()
