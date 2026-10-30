import assert from "node:assert/strict";
import { sceneDepth, projectFloorPainting } from "../depth.js";
import { createFloorLayout, createRoomLayout } from "../level-layouts.js";

const ground = 423;
let rooms = 0;
let previousPaintings = null;
let previousZone = null;
function check(layout) {
  const d = sceneDepth(layout, ground),
    scale = layout.width / layout.crop[2];
  assert(Number.isFinite(d.floorStretch) && d.floorStretch > 0);
  if (layout.zone === "roof") {
    assert.equal(d.rear, ground);
    assert.equal(d.floorStretch, 1);
  } else {
    assert.equal(ground - d.rear, 30, "Feet must stand in front of the wall");
    assert(
      Math.abs(d.projectY(layout.floorEnd ?? layout.crop[3]) - ground - 46) <
        1e-8,
    );
    // A source point on the wall keeps its physical scale; the floor joins it
    // continuously and extends beyond the actors instead of ending at the feet.
    assert(
      Math.abs(d.projectY(layout.ground - 100) - (d.rear - 100 * scale)) < 1e-8,
    );
    assert(Math.abs(d.projectY(layout.ground + 1e-6) - d.rear) < 1e-4);
    for (const door of [
      ...(layout.doors || []),
      ...[layout.exit, layout.lift].filter(Boolean),
    ]) {
      const [, y, , h] = door.rect;
      if (y + h <= layout.ground)
        assert(
          Math.abs(d.projectY(y + h) - d.projectY(y) - h * scale) < 1e-8,
          "Door height changed",
        );
    }
  }
  const calls = [],
    image = { width: layout.crop[2], height: layout.crop[3] };
  projectFloorPainting(
    {
      drawImage(...args) {
        calls.push(args);
      },
    },
    image,
    layout,
    ground,
  );
  assert.equal(calls.length, layout.zone === "roof" ? 1 : 2);
  if (calls.length === 2) {
    assert.equal(calls[0][4], calls[1][2], "Source floor seam has gap/overlap");
    assert.equal(
      calls[0][8],
      calls[1][6],
      "Painted floor seam has gap/overlap",
    );
    assert(
      Math.abs(calls[1][6] + calls[1][8] - d.floorHeight) <= 1,
      "Floor does not fill buffer",
    );
  }
  const painted = [],
    surfaces = { width: 1536, height: 1024 };
  projectFloorPainting(
    {
      drawImage(...args) {
        painted.push(args);
      },
      save() {},
      restore() {},
      fillRect() {},
      createLinearGradient() {
        return { addColorStop() {} };
      },
    },
    image,
    layout,
    ground,
    surfaces,
  );
  if (layout.zone !== "roof") {
    assert.equal(painted.length, 3);
    const [, plane, face] = painted;
    for (const draw of [plane, face]) {
      assert.equal(draw[0], surfaces);
      assert(draw[2] >= 0 && draw[2] + draw[4] <= surfaces.height);
      assert.equal(draw[7], image.width);
    }
    assert.equal(plane[6], layout.ground);
    assert.equal(plane[6] + plane[8], face[6], "Gap before slab face");
    assert(Math.abs(plane[8] * scale - 76) < 1e-8);
    assert(Math.abs(face[8] * scale - 23) < 1e-8);
    assert(Math.abs(face[6] + face[8] - d.height) <= 1);
  }
}
for (const floor of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  const zone =
    floor === 51
      ? "roof"
      : floor === 0
        ? "bunker"
        : floor >= 41
          ? "office"
          : floor >= 31
            ? "laboratory"
            : floor >= 21
              ? "apartment"
              : floor >= 11
                ? "mall"
                : "parking";
  const layout = createFloorLayout(floor, zone);
  check(layout);
  if (floor !== 51) {
    const paintings = layout.parts.filter((part) => part.panel).map((part) => part.index);
    assert.equal(paintings.length, 5, "each floor carries five distinct painted backgrounds");
    assert.equal(new Set(paintings).size, 5, "no scene repeats a painting within a floor");
    if (zone === previousZone)
      assert(paintings.every(index => !previousPaintings.includes(index)), "neighbouring floors use different painted backgrounds");
    previousPaintings = paintings;
    previousZone = zone;
    assert(layout.width >= 3000, "long corridors keep their physical door scale");
  }
  for (const door of layout.doors) {
    check(createRoomLayout(floor, door));
    rooms++;
  }
}
assert.equal(rooms, 173);
console.log(
  `PASS: floor lane, unchanged door scale, continuous painted floor and roof projection across 51 floors and ${rooms} rooms`,
);
