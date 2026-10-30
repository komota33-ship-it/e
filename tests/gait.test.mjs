import assert from "node:assert/strict";
import {
  heroLegPose,
  HERO_STRIDE,
  HERO_LEG_LENGTH,
  HERO_STANCE,
  heroAimFacing,
  solveLeg,
} from "../gait.js";
import {
  createFloorLayout,
  createRoomLayout,
  DOOR_HEIGHT,
} from "../level-layouts.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
for (let i = 0; i < 1000; i++) {
  const p = heroLegPose({ phase: (i * Math.PI * 2) / 1000, moveBlend: 1 });
  for (const leg of [p.near, p.far]) {
    assert(
      Math.abs(distance(leg.hip, leg.knee) - HERO_LEG_LENGTH) < 1e-8,
      "Thigh stretched",
    );
    assert(
      Math.abs(distance(leg.knee, leg.ankle) - HERO_LEG_LENGTH) < 1e-8,
      "Shin stretched",
    );
    assert(leg.knee.x >= (leg.hip.x + leg.ankle.x) / 2, "Knee bent backwards");
    assert(
      leg.lift >= 0 && leg.lift <= 8.001,
      "Foot raised like a high-knee march",
    );
    assert(leg.ankle.y <= -7, "Foot penetrated the ground");
  }
  assert(p.near.planted || p.far.planted, "Walking needs a planted foot");
}
for (const direction of [-1, 1])
  for (const movement of [-1, 1]) {
    // Reverse playback when backing up keeps planted feet fixed too.
    const phase = 0.2 * Math.PI * 2,
      dx = movement * 2;
    const a = heroLegPose({ phase, moveBlend: 1 }).near;
    const b = heroLegPose({
      phase: phase + ((dx * direction) / HERO_STRIDE) * Math.PI * 2,
      moveBlend: 1,
    }).near;
    assert(a.planted && b.planted);
    assert(
      Math.abs(direction * a.ankle.x - (dx + direction * b.ankle.x)) < 1e-8,
      "Planted foot slid",
    );
  }
// No hard pose switch when starting or stopping around the old 0.12 threshold.
for (let phase = 0; phase < Math.PI * 2; phase += 0.05) {
  const a = heroLegPose({ phase, moveBlend: 0.1199 });
  const b = heroLegPose({ phase, moveBlend: 0.1201 });
  for (const side of ["near", "far"]) {
    assert(
      distance(a[side].ankle, b[side].ankle) < 0.02,
      "Stop/start snaps the foot",
    );
    assert(
      distance(a[side].knee, b[side].knee) < 0.02,
      "Stop/start snaps the knee",
    );
  }
}
// Position and velocity are continuous at lift-off and landing.
for (const boundary of [0, HERO_STANCE]) {
  const h = 0.00001;
  const at = (q) =>
    heroLegPose({ phase: q * Math.PI * 2, moveBlend: 1 }).near.ankle;
  const a = at(boundary - h),
    b = at(boundary),
    c = at(boundary + h);
  assert(distance(a, c) < 0.01, "Foot teleported across contact");
  for (const axis of ["x", "y"])
    assert(
      Math.abs((b[axis] - a[axis]) / h - (c[axis] - b[axis]) / h) < 0.2,
      "Foot velocity snaps at contact",
    );
}
for (const target of [
  { x: 0, y: 0 },
  { x: 1000, y: 1000 },
]) {
  const leg = solveLeg({ x: 0, y: 0 }, target);
  assert(Math.abs(distance(leg.hip, leg.knee) - HERO_LEG_LENGTH) < 1e-8);
  assert(Math.abs(distance(leg.knee, leg.ankle) - HERO_LEG_LENGTH) < 1e-8);
}
for (const initial of [-1, 1]) {
  let dir = initial;
  for (let i = 0; i < 600; i++) {
    dir = heroAimFacing(dir, 500 + Math.sin(i) * 8, 500);
    assert.equal(dir, initial, "Vertical aim jitter flips the body");
  }
  assert.equal(heroAimFacing(dir, 520, 500), 1);
  assert.equal(heroAimFacing(dir, 480, 500), -1);
}
const landmarks = new Set();
for (const n of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  const zone =
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
  const l = createFloorLayout(n, zone),
    scale = l.width / l.crop[2];
  for (const door of l.doors.length ? l.doors : [l.lift])
    assert(
      Math.abs(door.rect[3] * scale - DOOR_HEIGHT) < 3,
      `Oversized door at ${n}`,
    );
  for (const door of l.doors) {
    const room = createRoomLayout(n, door);
    assert(
      Math.abs((room.exit.rect[3] * room.width) / room.crop[2] - DOOR_HEIGHT) <
        1,
      "Room scale differs from corridor",
    );
  }
  if (n !== 51) {
    const part = l.parts.find((p) => p.panel),
      id = `${part.art}:${part.index}`;
    assert(!landmarks.has(id), "Repeated landmark");
    landmarks.add(id);
    assert(
      Math.abs(part.width / part.source[2] - part.height / part.source[3]) <
        1e-8,
      "Landmark artwork stretched",
    );
    const loot = l.containers.find((c) => c.id === `landmark-${n}`);
    assert(
      loot &&
        loot.rect[0] >= part.x &&
        loot.rect[0] + loot.rect[2] <= part.x + part.width,
    );
  }
}
assert.equal(landmarks.size, 50);
console.log(
  "PASS: fixed leg lengths, forward knees, ground contact, planted feet in both directions; consistent door scale and 50 distinct painted landmarks",
);
