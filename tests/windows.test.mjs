import assert from "node:assert/strict";
import { drawDistantWindows } from "../depth.js";
import { createFloorLayout, createRoomLayout } from "../level-layouts.js";

const art = { city_panorama: { width: 2172, height: 724 } };
const windows = [
  { x: 160, y: 100, w: 100, h: 125 },
  { x: 490, y: 110, w: 110, h: 120 },
  { x: 900, y: 95, w: 95, h: 130 },
];
function paint(camera, panes = windows, sceneId = "floor-50") {
  const draws = [];
  const ctx = {
    canvas: { width: 1100 },
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillRect() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    drawImage(...args) {
      draws.push(args);
    },
  };
  drawDistantWindows(ctx, art, panes, camera, 0, 1800, sceneId);
  return draws;
}
const before = paint(0),
  after = paint(50);
assert.equal(before.length, 1, "The skyline must be shared by all windows");
assert.equal(after.length, 1);
assert.equal(before[0][0], art.city_panorama);
assert.equal(
  after[0][1] - before[0][1],
  -50,
  "Camera travel must keep the city continuous",
);
const officeDoor = createFloorLayout(50, "office").doors.find(
  (door) => door.kind === "office",
);
const office = createRoomLayout(50, officeDoor);
assert.equal(office.windows.length, 1, "Office must have one unbroken window");
const [x, y, w, h] = office.windows[0];
const room = paint(0, [{ x, y, w, h }], office.id);
assert.equal(
  room.length,
  0,
  "Room's painted city must not be covered by a rectangle",
);
const apartmentDoor = createFloorLayout(30, "apartment").doors.find(
  (door) => door.kind === "apartment",
);
const apartment = createRoomLayout(30, apartmentDoor);
assert.equal(
  apartment.windows.length,
  1,
  "Apartment must have one unbroken window",
);
console.log(
  "PASS: corridor windows share one panorama; rooms keep their painted single-pane views",
);
