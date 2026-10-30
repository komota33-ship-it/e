import assert from "node:assert/strict";
import {
  freshAwareness,
  canSeePlayer,
  rememberTarget,
  hearSound,
  stepAwareness,
} from "../awareness.js";
import {
  normalizeProgress,
  perkEffects,
  buyPerk,
  readProgress,
  writeProgress,
} from "../progression.js";
const actor = (x = 500) => ({
  type: "walker",
  x,
  y: 423,
  dir: -1,
  size: 1,
  speed: 31,
  life: 20,
  ...freshAwareness(x),
});
let e = actor(),
  p = { x: 250, y: 423 };
assert(canSeePlayer(e, p, { dark: false }));
assert(!canSeePlayer(e, p, { dark: true, flashlight: false }));
assert(canSeePlayer(e, p, { dark: true, flashlight: true }));
e.dir = 1;
assert(!canSeePlayer(e, p, { dark: false }));
p.x = 480;
assert(canSeePlayer(e, p, { dark: true }));
e = actor();
p.x = 250;
stepAwareness(e, p, 0.1, { dark: false });
assert.equal(e.brain, "chase");
assert.equal(e.targetX, 250);
assert(e.seesPlayer);
p.x = 1000;
stepAwareness(e, p, 0.1, { dark: true });
assert.equal(e.brain, "investigate");
assert.equal(e.targetX, 250);
assert(!e.seesPlayer);
e.x = 250;
stepAwareness(e, p, 0.1, { dark: true });
assert.equal(e.brain, "search");
for (let i = 0; i < 32; i++) stepAwareness(e, p, 0.1, { dark: true });
assert.equal(e.brain, "patrol");
assert(!e.alert);
e = actor();
assert(hearSound(e, 200, 20));
assert.equal(e.targetX, 200);
assert.equal(e.brain, "investigate");
assert(!hearSound(e, 0, 1));
assert.equal(e.targetX, 200);
const sleeper = actor(1000);
stepAwareness(sleeper, { x: 0, y: 423 }, 7, { dark: true });
assert.equal(sleeper.brain, "patrol");
const dead = actor();
dead.life = 0;
const snap = JSON.stringify(dead);
assert(!hearSound(dead, dead.x, 60));
rememberTarget(dead, 0, 423);
stepAwareness(dead, p, 10, {});
assert.equal(JSON.stringify(dead), snap);
const boss = { ...actor(), type: "boss" };
assert(
  canSeePlayer(boss, { x: 30, y: 423 }, { dark: true, flashlight: false }),
);
const profile = normalizeProgress({
  version: 1,
  dna: 10000,
  perks: { silent: 3, health: 1 },
});
assert.equal(profile.perks.speed, 0);
assert.equal(perkEffects(profile).noiseFactor, 1);
for (let i = 0; i < 3; i++) assert(buyPerk(profile, "speed"));
assert.equal(perkEffects(profile).moveSpeed, 1.3);
assert.equal(perkEffects(profile).noiseFactor, 0.5);
for (let i = 0; i < 3; i++) assert(buyPerk(profile, "connection"));
assert.equal(perkEffects(profile).enemySpeed, 0.7);
const storage = {
  value: null,
  setItem(k, v) {
    this.value = v;
  },
  getItem() {
    return this.value;
  },
};
writeProgress(storage, profile);
assert.deepEqual(readProgress(storage), profile);
console.log(
  "PASS: directional vision, darkness/flashlight/contact, sound location, frozen last observation, search timeout/patrol, dead actors, boss senses, migrated perks and Ghost synergy",
);
