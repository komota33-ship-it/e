import assert from "node:assert/strict";
import {
  freshNoise,
  addNoise,
  stepNoise,
  noiseLevel,
  infectionStage,
  infectionMaxHp,
  applyInfection,
  stepInfection,
  containerProfile,
} from "../hazards.js";
import { craftItem, craftProblem, RECIPES } from "../crafting.js";
import {
  addInventoryItem,
  inventoryCount,
  validInventory,
} from "../inventory.js";
import { normalizeProgress, perkEffects, buyPerk } from "../progression.js";
let n = freshNoise();
addNoise(n, 60);
assert.equal(stepNoise(n, 0.01, 90), null);
addNoise(n, 40);
assert.equal(stepNoise(n, 0.01, 90), "warning");
assert.equal(n.pending, 3);
assert.equal(noiseLevel(n), 0);
assert.equal(stepNoise(n, 2.99, 90), null);
assert.equal(stepNoise(n, 0.02, 90), "wave");
assert.equal(n.waves, 1);
addNoise(n, 150);
assert.equal(stepNoise(n, 0.01, 90), null);
stepNoise(n, 5.01, 90);
assert.equal(noiseLevel(n), 0);
assert.equal(stepNoise(n, 25, 90), null);
n = freshNoise();
for (let i = 0; i < 500; i++) {
  addNoise(n, 0.02);
  stepNoise(n, 0.01, 90);
}
assert(noiseLevel(n) < 10.01);
assert(n.events.length <= 51);
stepNoise(n, 5.2, 90);
assert.equal(noiseLevel(n), 0);
const patient = { infection: 0 };
stepInfection(patient, 60);
assert.equal(patient.infection, 0);
applyInfection(patient, 10, 0.6);
assert.equal(patient.infection, 4);
stepInfection(patient, 10, 0.6);
assert(Math.abs(patient.infection - 4.48) < 1e-8);
for (const [v, stage, max] of [
  [0, 0, 120],
  [29.9, 0, 120],
  [30, 1, 108],
  [59.9, 1, 108],
  [60, 2, 84],
  [90, 3, 84],
  [100, 4, 84],
]) {
  assert.equal(infectionStage(v), stage);
  assert.equal(infectionMaxHp(120, v), max);
}
applyInfection(patient, 1000);
assert.equal(patient.infection, 100);
const profile = normalizeProgress({
  version: 1,
  dna: 3000,
  perks: { health: 2 },
});
assert.equal(profile.perks.immunity, 0);
for (const id of ["immunity", "silent", "engineer"])
  assert(buyPerk(profile, id));
const effects = perkEffects(profile);
assert.equal(effects.infectionResistance, 0.2);
assert.equal(effects.searchNoise, 0.7);
assert.equal(effects.craftTime, 0.8);
for (const [id, r] of Object.entries(RECIPES)) {
  if (r.repair) continue;
  const bag = [];
  for (const [type, qty] of Object.entries(r.ingredients))
    addInventoryItem(bag, type, qty);
  const p = { dna: 100 };
  assert.equal(craftProblem(bag, p, id), "");
  assert(craftItem(bag, p, id).ok);
  assert.equal(inventoryCount(bag, r.out), r.qty);
  assert.equal(p.dna, 100 - (r.dna || 0));
  assert(validInventory(bag));
}
const bag = [];
addInventoryItem(bag, "chemical", 5);
for (let i = 0; i < 29; i++) addInventoryItem(bag, "medkit");
const p = { dna: 100 };
const snapshot = JSON.stringify({ bag, p });
assert(!craftItem(bag, p, "antidote").ok);
assert.equal(JSON.stringify({ bag, p }), snapshot);
assert(!craftItem([], p, "missing").ok);
const short = [];
addInventoryItem(short, "chemical", 2);
assert(!craftItem(short, { dna: 49 }, "antidote").ok);
assert.equal(inventoryCount(short, "chemical"), 2);
assert.deepEqual(containerProfile({ label: "ВОЕННЫЙ ЯЩИК", type: "crate" }), {
  seconds: 4,
  noise: 25,
});
assert.deepEqual(containerProfile({ label: "СЕЙФ АРХИВА" }), {
  seconds: 5,
  noise: 20,
});
console.log(
  "PASS: five-second noise window, warning/cooldown/waves, infection stages/immunity, atomic supply and armor recipes, no resource or DNA loss on failure, migrated perks",
);
