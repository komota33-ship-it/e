import assert from "node:assert/strict";
import {
  QUICK_DEFAULTS,
  normalizeQuickSlots,
  assignQuickSlot,
} from "../quickslots.js";

const bag = [
  { type: "medkit", qty: 2 },
  { type: "grenade", qty: 1 },
  { type: "bandage", qty: 3 },
  { type: "knife", qty: 1 },
];
assert.deepEqual(normalizeQuickSlots(undefined), QUICK_DEFAULTS);
assert.deepEqual(normalizeQuickSlots(["medkit", "bad", null, "knife"]), [
  "medkit",
  null,
  null,
  "knife",
]);
assert.deepEqual(assignQuickSlot(QUICK_DEFAULTS, 0, "bandage", bag), [
  "bandage",
  "medkit",
  "flashlight",
  "knife",
]);
assert.deepEqual(assignQuickSlot(QUICK_DEFAULTS, 0, "medkit", bag), [
  "medkit",
  "grenade",
  "flashlight",
  "knife",
]);
assert.deepEqual(assignQuickSlot(QUICK_DEFAULTS, 3, "flashlight", bag), [
  "grenade",
  "medkit",
  "knife",
  "flashlight",
]);
assert.equal(assignQuickSlot(QUICK_DEFAULTS, 4, "medkit", bag), null);
assert.equal(assignQuickSlot(QUICK_DEFAULTS, 0, "pistol", bag), null);
assert.equal(assignQuickSlot(QUICK_DEFAULTS, 0, "water", bag), null);
assert.deepEqual(assignQuickSlot(QUICK_DEFAULTS, 0, null, bag), [
  null,
  "medkit",
  "flashlight",
  "knife",
]);
console.log(
  "PASS: four editable quick slots validate inventory and keep assignments unique",
);
