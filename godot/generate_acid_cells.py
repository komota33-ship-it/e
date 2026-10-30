"""Export visible bounds for the 4x3 acid animation atlas.

Godot reads the generated metadata and does not need Pillow at runtime.
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / "assets" / "acid.png"
OUTPUT = ROOT / "godot" / "acid_cells.json"


def main() -> None:
    image = Image.open(ATLAS).convert("RGBA")
    width, height = image.size
    cells = []
    for index in range(12):
        left = (index % 4) * width // 4
        top = (index // 4) * height // 3
        right = ((index % 4) + 1) * width // 4
        bottom = ((index // 4) + 1) * height // 3
        alpha = image.getchannel("A").crop((left, top, right, bottom))
        visible = alpha.point(lambda value: 255 if value > 40 else 0).getbbox()
        if visible is None:
            raise ValueError(f"Acid frame {index} is empty")
        cells.append([left + visible[0], top + visible[1], visible[2] - visible[0], visible[3] - visible[1]])
    OUTPUT.write_text(json.dumps(cells, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(cells)} acid frames to {OUTPUT}")


if __name__ == "__main__":
    main()
