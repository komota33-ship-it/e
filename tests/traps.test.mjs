import assert from "node:assert/strict";
import {
  TRAPS,
  trapChance,
  createContainerTrap,
  armContainerTrap,
  disarmContainerTrap,
  stepContainerTrap,
  trapDamageFactor,
  createContainerAmbush,
  armContainerAmbush,
} from "../hazards.js";
import {
  normalizeProgress,
  perkEffects,
  buyPerk,
  synergyActive,
} from "../progression.js";
import { containerLoot } from "../inventory.js";
const fresh = (type) => ({
  type,
  status: "hidden",
  remaining: 0,
  gasRemaining: 0,
  gasClock: 0,
});
assert.equal(trapChance(51), 0);
assert.equal(trapChance(50), 0);
for (const floor of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  const counts = Object.fromEntries(Object.keys(TRAPS).map((k) => [k, 0]));
  for (let i = 0; i < 2000; i++) {
    const c = { id: "box-" + i, kind: "crate" },
      before = structuredClone(c),
      loot = containerLoot(floor, "room", c.id, c.kind);
    const a = createContainerTrap(floor, "room", c);
    assert.deepEqual(a, createContainerTrap(floor, "room", c));
    assert.deepEqual(c, before);
    assert.deepEqual(containerLoot(floor, "room", c.id, c.kind), loot);
    if (a) {
      assert(a.type in TRAPS);
      assert.equal(a.status, "hidden");
      counts[a.type]++;
    }
    assert.equal(
      createContainerTrap(floor, "room", { ...c, portable: true }),
      null,
    );
  }
  const chance = Object.values(counts).reduce((a, b) => a + b, 0) / 2000;
  assert(Math.abs(chance - trapChance(floor)) < 0.04, `${floor}: ${chance}`);
  if (floor < 50) assert(Object.values(counts).every((n) => n > 0));
}
for (const type of Object.keys(TRAPS)) {
  let t = fresh(type);
  assert(!disarmContainerTrap(t));
  assert(armContainerTrap(t));
  assert(!armContainerTrap(t));
  assert.equal(t.remaining, 0.5);
  assert(disarmContainerTrap(t));
  assert(!disarmContainerTrap(t));
  assert.deepEqual(stepContainerTrap(t, 10), { triggered: false, gasTicks: 0 });
  t = fresh(type);
  assert(!armContainerTrap(t, true));
  assert.equal(t.status, "disarmed");
  assert(!stepContainerTrap(t, 10).triggered);
  for (const hz of [30, 60, 144]) {
    t = fresh(type);
    armContainerTrap(t);
    let fires = 0,
      ticks = 0;
    for (let i = 0; i < hz * 7; i++) {
      const event = stepContainerTrap(t, 1 / hz);
      fires += +event.triggered;
      ticks += event.gasTicks;
    }
    assert.equal(fires, 1);
    assert.equal(ticks, type === "gas" ? 5 : 0);
    assert.equal(t.status, "spent");
    assert.equal(t.gasRemaining, 0);
    assert(!armContainerTrap(t));
    assert(!disarmContainerTrap(t));
  }
}
let t = fresh("mine");
armContainerTrap(t);
stepContainerTrap(t, 0.499);
assert(disarmContainerTrap(t));
t = fresh("mine");
armContainerTrap(t);
assert(stepContainerTrap(t, 0.5).triggered);
assert(!disarmContainerTrap(t));
t = fresh("gas");
armContainerTrap(t);
assert.deepEqual(stepContainerTrap(t, 5.5), { triggered: true, gasTicks: 5 });
const p = normalizeProgress({ version: 1, dna: 1050 });
assert.equal(p.perks.sapper, 0);
for (let rank = 1; rank <= 3; rank++) {
  assert(buyPerk(p, "sapper"));
  assert.equal(perkEffects(p).trapFactor, [1, 0.5, 0.25, 0][rank]);
}
assert.equal(p.dna, 0);
assert(!buyPerk(p, "sapper"));
assert(!synergyActive(p, "invulnerable"));
p.perks.resilience = 3;
assert(synergyActive(p, "invulnerable"));
for (const perk of ["electrician", "respirator"]) {
  const profile = normalizeProgress({ version: 1, dna: 700 });
  assert.equal(profile.perks[perk], 0);
  for (let rank = 1; rank <= 3; rank++) {
    assert(buyPerk(profile, perk));
    const effects = perkEffects(profile);
    const protectedType = perk === "electrician" ? "shock" : "gas";
    for (let sapper = 0; sapper <= 3; sapper++) {
      effects.trapFactor = [1, 0.5, 0.25, 0][sapper];
      for (const type of Object.keys(TRAPS)) {
        const resistance = type === protectedType ? [0, 0.5, 0.75, 1][rank] : 0;
        assert.equal(trapDamageFactor(type, effects), effects.trapFactor * (1 - resistance));
      }
    }
  }
  assert.equal(profile.dna, 0);
  assert(!buyPerk(profile, perk));
  assert.equal(profile.perks[perk], 3);
}
assert.equal(trapDamageFactor("shock", {}), 1);
assert.equal(trapDamageFactor("gas", {}), 1);
const legacy = perkEffects(normalizeProgress({ version: 1, perks: { sapper: 1 } }));
assert.equal(legacy.shockResistance, 0);
assert.equal(legacy.gasResistance, 0);
assert.equal(trapDamageFactor("shock", legacy), 0.5);
assert.equal(trapDamageFactor("gas", legacy), 0.5);
console.log(
  "PASS: deterministic traps/loot independence on all floors, safe tutorial/bags, probability/type distribution, exact defusal deadline, one-shot state, gas clock across frame rates, Sapper ranks/synergy",
);
console.log("PASS: Electrician/Respirator ranks, prices, separate damage types, Sapper multiplication and legacy migration");
for (const floor of [51, ...Array.from({length:49}, (_,i)=>50-i), 0]) {
  let count = 0;
  for (let i=0; i<2000; i++) {
    const container = {id:`ambush-${i}`,kind:'crate'};
    const trap = createContainerTrap(floor, 'room', container);
    const ambush = createContainerAmbush(floor, 'room', container);
    assert.deepEqual(ambush, createContainerAmbush(floor, 'room', container));
    assert.deepEqual(trap, createContainerTrap(floor, 'room', container));
    assert.equal(createContainerAmbush(floor, 'room', {...container,portable:true}), null);
    if (ambush) {
      count++;
      assert.equal(ambush.status,'hidden');
      assert(armContainerAmbush(ambush));
      assert.equal(ambush.status,'pending');
      assert(!armContainerAmbush(ambush));
      ambush.status='spent';
      assert(!armContainerAmbush(ambush));
    }
  }
  if (floor>=50) assert.equal(count,0);
  else assert(Math.abs(count/2000-.05)<.025, `Ambush frequency on floor ${floor}: ${count}`);
}
assert(!armContainerAmbush(null));
console.log('PASS: seeded 5% ambushes across tower, safe tutorial/portable bags, independent traps and one-way activation');
