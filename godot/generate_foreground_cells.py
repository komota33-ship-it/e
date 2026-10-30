"""Record visible cutouts from the generated foreground atlases.

Only alpha bounds are exported; image pixels remain untouched. Regenerate with
    python3 godot/generate_foreground_cells.py
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
TRIM = {"office": {5: 700, 7: 720, 9: 650}, "roof": {8: 680}}


def cells(path: Path) -> list[list[int]]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    zone = path.stem.removeprefix("foreground_")
    alpha = image.getchannel("A").point(lambda value: 255 if value > 40 else 0)
    bounds = []
    for index in range(10):
        col, row = index % 5, index // 5
        left, right = col * width // 5, (col + 1) * width // 5
        top, bottom = row * height // 2, (row + 1) * height // 2
        scan_top = max(top, TRIM.get(zone, {}).get(index, top))
        visible = alpha.crop((left, scan_top, right, bottom)).getbbox()
        if visible:
            bounds.append([left + visible[0], scan_top + visible[1], visible[2] - visible[0], visible[3] - visible[1]])
        else:
            bounds.append([left, top, right - left, bottom - top])
    return bounds


def main() -> None:
    result = {
        path.stem.removeprefix("foreground_"): cells(path)
        for path in sorted((ROOT / "assets").glob("foreground_*.png"))
    }
    destination = ROOT / "godot" / "foreground_cells.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote cutouts for {len(result)} foreground atlases to {destination}")


if __name__ == "__main__":
    main()
