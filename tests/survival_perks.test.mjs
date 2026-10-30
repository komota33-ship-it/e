import assert from "node:assert/strict";
import {
  normalizeProgress,
  perkEffects,
  buyPerk,
  synergyActive,
} from "../progression.js";
import {
  freshSurvival,
  stepRegeneration,
  reviveSurvival,
} from "../survival.js";
const profile = (perks = {}) => normalizeProgress({ version: 1, perks });
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const p = profile();
p.dna = 3500;
for (const id of ["regeneration", "resilience", "secondWind"]) {
  for (let rank = 1; rank <= 3; rank++) assert(buyPerk(p, id));
  const before = structuredClone(p);
  assert(!buyPerk(p, id));
  assert.deepEqual(p, before);
}
assert.equal(p.dna, 0);
const effects = perkEffects(p);
assert.equal(effects.regeneration, 3);
close(effects.incomingDamage, 0.7);
assert.equal(effects.revivals, 3);
assert.equal(effects.revivalHealth, 0.5);
assert.equal(effects.carryCapacity, 36);
for (const bad of [-1, 4, "3", null, NaN]) {
  const legacy = profile({
    regeneration: bad,
    resilience: bad,
    secondWind: bad,
  });
  assert.equal(perkEffects(legacy).regeneration, 0);
  assert.equal(perkEffects(legacy).revivals, 0);
  assert.equal(perkEffects(legacy).incomingDamage, 1);
}
for (let rank = 0; rank <= 3; rank++) {
  const e = perkEffects(
    profile({ resilience: rank, regeneration: rank, secondWind: rank }),
  );
  close(e.incomingDamage, 1 - 0.1 * rank);
  assert.equal(e.regeneration, rank);
  assert.equal(e.revivals, rank);
}
assert(!synergyActive(profile({ health: 3, resilience: 2 }), "tank"));
assert(!synergyActive(profile({ regeneration: 3, secondWind: 2 }), "phoenix"));
const tank = perkEffects(profile({ health: 3, resilience: 3 }));
assert.equal(tank.maxHp, 260);
close(tank.incomingDamage, 0.35);
close(100 * (1 - 0.9) * tank.incomingDamage, 3.5);
for (const hz of [30, 60, 144]) {
  const state = { hp: 10, maxHp: 100 };
  for (let i = 0; i < hz * 10; i++) stepRegeneration(state, 1 / hz, 3);
  close(state.hp, 40);
  stepRegeneration(state, 100, 3);
  assert.equal(state.hp, 100);
  state.hp = 0;
  stepRegeneration(state, 100, 3);
  assert.equal(state.hp, 0);
  state.hp = 50;
  stepRegeneration(state, -1, 3);
  assert.equal(state.hp, 50);
}
const state = { ...freshSurvival(), hp: 100, maxHp: 100, infection: 0 };
assert(!reviveSurvival(state, effects));
assert.equal(state.revivesUsed, 0);
for (let used = 1; used <= 3; used++) {
  state.hp = 0;
  assert(reviveSurvival(state, effects));
  assert.equal(state.hp, 50);
  assert.equal(state.revivesUsed, used);
  assert.equal(state.reviveGrace, 2);
  assert(!reviveSurvival(state, effects));
}
state.hp = 0;
const spent = structuredClone(state);
assert(!reviveSurvival(state, effects));
assert.deepEqual(state, spent);
const base = perkEffects(profile({ secondWind: 1 }));
const infected = { ...freshSurvival(), hp: 0, maxHp: 70, infection: 100 };
assert(reviveSurvival(infected, base));
assert.equal(infected.infection, 50);
assert.equal(infected.maxHp, 90);
assert.equal(infected.hp, 22.5);
const bitten = { ...freshSurvival(), hp: 0, maxHp: 70, infection: 80 };
assert(reviveSurvival(bitten, base));
assert.equal(bitten.infection, 80);
assert.equal(bitten.hp, 17.5);
const old = { hp: 0, maxHp: 100 };
assert(reviveSurvival(old, base));
assert.equal(old.revivesUsed, 1);
assert.equal(old.hp, 25);
console.log(
  "PASS: survival costs/migration/ranks, Tank/Phoenix thresholds, combined defense, frame-independent capped regeneration, finite revivals, infection recovery and legacy state",
);
