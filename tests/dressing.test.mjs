import assert from "node:assert/strict";
import { createFloorLayout, createRoomLayout } from "../level-layouts.js";
import { FOREGROUND_VARIANTS, planForeground } from "../dressing.js";

const sector = (n) =>
  n === 51
    ? "roof"
    : n === 0
      ? "bunker"
      : n >= 41
        ? "office"
        : n >= 31
          ? "laboratory"
          : n >= 21
            ? "apartment"
            : n >= 11
              ? "mall"
              : "parking";
const frontUsed = new Set();
let rooms = 0;
assert.equal(FOREGROUND_VARIANTS, 70);
for (const floor of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  const layout = createFloorLayout(floor, sector(floor));
  const front = planForeground(layout, floor);
  assert(
    front.length >= (floor === 51 ? 5 : 7),
    `Sparse foreground on ${floor}`,
  );
  assert(
    front.some((p) => p.layer === "back") &&
      front.some((p) => p.layer === "front"),
    `Props occupy one depth plane on ${floor}`,
  );
  for (const p of front) frontUsed.add(`${p.zone}:${p.index}`);
  for (const door of layout.doors) {
    const room = createRoomLayout(floor, door);
    const roomProps = planForeground(room, floor);
    assert(roomProps.length >= 2, `Bare room ${room.id}`);
    assert(
      roomProps.some((p) => p.layer === "back") &&
        roomProps.some((p) => p.layer === "front"),
      `Room props occupy one depth plane in ${room.id}`,
    );
    rooms++;
  }
}
assert(
  frontUsed.size >= 50,
  `Only ${frontUsed.size} curated foreground variants`,
);
assert(!frontUsed.has("office:6"), "Loose ceiling tile must stay off the set");
assert(frontUsed.has("roof:0"));
assert(frontUsed.has("bunker:9"));
assert.equal(rooms, 173);
console.log(
  `PASS: ${frontUsed.size} scaled foreground props, roof/bunker and ${rooms} dressed rooms`,
);
