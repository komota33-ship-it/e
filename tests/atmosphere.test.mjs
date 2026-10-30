import assert from "node:assert/strict";
import { fixtureState } from "../atmosphere.js";
import { createFloorLayout } from "../level-layouts.js";

assert.deepEqual(fixtureState(51, 0, 0, 0, "roof"), {
  damaged: false,
  intensity: 1,
  spark: false,
});
let damagedFloors = 0;
for (let floor = 50; floor >= 0; floor--) {
  if (floor === 1) continue;
  const zone =
    floor >= 41
      ? "office"
      : floor >= 31
        ? "laboratory"
        : floor >= 21
          ? "apartment"
          : floor >= 11
            ? "mall"
            : floor >= 2
              ? "parking"
              : "bunker";
  const layout = createFloorLayout(floor, zone);
  const states = layout.lights.map((_, index) =>
    fixtureState(floor, index, 1, layout.tone, zone),
  );
  if (states.some((state) => state.damaged)) damagedFloors++;
  for (const state of states) {
    assert(state.intensity > 0 && state.intensity <= 1);
    assert.equal(state.spark && state.damaged, state.spark);
  }
}
assert(damagedFloors >= 35, `Only ${damagedFloors} floors have damaged lights`);
const spark = fixtureState(50, 0, 7.6 - 50 * 0.71, 0, "office");
assert(spark.spark && spark.intensity < 0.2);
assert(!fixtureState(50, 0, 7.9 - 50 * 0.71, 0, "office").spark);
console.log(
  `PASS: ${damagedFloors} floors have deterministic, restrained fixture faults`,
);
