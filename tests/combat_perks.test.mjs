import assert from "node:assert/strict";
import {
  normalizeProgress,
  perkEffects,
  buyPerk,
  synergyActive,
} from "../progression.js";
import {
  traceShot,
  traceVolley,
  shotDamage,
  knifeDamage,
  criticalRoll,
  berserkFactor,
} from "../combat.js";
import { ITEMS } from "../inventory.js";
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const fresh = (perks = {}) => normalizeProgress({ version: 1, perks });
const profile = fresh(),
  player = { hp: 100, maxHp: 100 };
profile.dna = 10000;
for (const perk of ["rapid", "piercing", "critical", "melee"]) {
  for (let rank = 1; rank <= 3; rank++) {
    assert(buyPerk(profile, perk));
    assert.equal(profile.perks[perk], rank);
  }
  const before = structuredClone(profile);
  assert(!buyPerk(profile, perk));
  assert.deepEqual(profile, before);
}
assert.equal(profile.dna, 5450);
for (let rank = 0; rank <= 3; rank++) {
  const effects = perkEffects(
    fresh({ rapid: rank, piercing: rank, critical: rank, melee: rank }),
  );
  close(effects.fireRate, 1 + 0.15 * rank);
  assert.equal(effects.penetration, rank);
  close(effects.criticalChance, 0.1 * rank);
  close(effects.meleeDamage, [1, 1.25, 1.5, 4][rank]); // rank 3 activates Butcher
}
const baseline = perkEffects(fresh());
assert.equal(shotDamage(10, baseline, player, { relative: 0.5 }), 10);
assert.equal(shotDamage(10, baseline, player, { relative: 0.8 }), 20);
assert.equal(shotDamage(10, baseline, player, { relative: 0.2 }), 5);
close(shotDamage(10, baseline, player, { relative: 0.5, frontArmor: true }), 3);
assert.equal(knifeDamage(baseline, player), 15);
let rolls = 0;
assert(
  !criticalRoll(baseline, () => {
    rolls++;
    return 0;
  }),
);
assert.equal(rolls, 0);
const critical = perkEffects(fresh({ critical: 3 }));
assert(criticalRoll(critical, () => 0.299));
assert(!criticalRoll(critical, () => 0.301));
const max = perkEffects(
  fresh({ damage: 3, rapid: 3, piercing: 3, critical: 3, melee: 3 }),
);
assert.equal(max.penetration, 4);
assert.equal(max.headshotDamage, 1.5);
assert(max.berserk);
assert(!synergyActive(fresh({ damage: 2, critical: 3 }), "berserk"));
assert(!synergyActive(fresh({ damage: 3, critical: 1 }), "sniper"));
assert(synergyActive(fresh({ damage: 3, critical: 2 }), "sniper"));
assert(!synergyActive(fresh({ melee: 3, rapid: 1 }), "butcher"));
assert(!synergyActive(fresh({ damage: 1, piercing: 3 }), "assault"));
for (const hp of [0, 30, 100])
  assert.equal(berserkFactor(max, { hp, maxHp: 100 }), 1);
assert.equal(berserkFactor(max, { hp: 29.99, maxHp: 100 }), 1.5);
assert.equal(berserkFactor(max, { hp: 21, maxHp: 70 }), 1);
assert.equal(berserkFactor(max, { hp: 20.9, maxHp: 70 }), 1.5);
close(
  shotDamage(
    10,
    max,
    { hp: 29, maxHp: 100 },
    { relative: 0.8, critical: true },
  ),
  117,
);
close(
  shotDamage(
    10,
    max,
    { hp: 29, maxHp: 100 },
    { relative: 0.8, critical: true, frontArmor: true, falloff: 0.5 },
  ),
  17.55,
);
close(knifeDamage(max, { hp: 29, maxHp: 100 }, 1.05, true), 189);
// Spatial trace: order independent of enemy array, dead/off-ray/behind ignored.
const enemy = (x, extra = {}) => ({ x, y: 125, size: 1, life: 100, ...extra });
const enemies = [
  enemy(600),
  enemy(400),
  enemy(-100),
  enemy(200),
  enemy(300, { life: 0 }),
  enemy(350, { y: 400 }),
  enemy(1000),
];
assert.deepEqual(
  traceShot(enemies, 0, 50, 1, 0).map((h) => h.enemy.x),
  [200],
);
assert.deepEqual(
  traceShot(enemies, 0, 50, 1, 0, 4).map((h) => h.enemy.x),
  [200, 400, 600],
);
assert.deepEqual(
  traceShot(enemies, 700, 50, -1, 0, 1).map((h) => h.enemy.x),
  [600, 400],
);
assert.equal(traceShot(enemies, 0, 50, 0, -1, 4).length, 0);
const vertical = traceShot([enemy(200)], 200, -100, 0, 1, 0)[0];
assert.equal(vertical.distance, 100);
assert.equal(vertical.x, 200);
assert.equal(vertical.y, 0);
const diagonal = traceShot(
  [enemy(200)],
  0,
  -100,
  Math.SQRT1_2,
  Math.SQRT1_2,
  0,
)[0];
assert(diagonal);
close(diagonal.x, 174);
close(diagonal.y, 74);
assert.deepEqual(traceShot([enemy(800)], 0, 50, 1, 0, 4), []);
const touched = traceShot([enemy(10)], 0, 50, 1, 0)[0];
assert.equal(touched.distance, 0);
console.log(
  "PASS: combat perk costs/migration/ranks, four synergy thresholds, critical rolls, health threshold and damage stacking, nearest-first ray tracing in both directions and vertically",
);
// Six fixed pellet directions rotate with the aim, with no scaling of the body.
assert.equal(ITEMS.shotgun.damage, 10);
for (const angle of [0, Math.PI, Math.PI / 2, -Math.PI / 2, 0.7]) {
  const rays = traceVolley([], 0, 0, angle, ITEMS.shotgun);
  assert.equal(rays.length, 6);
  for (let i = 0; i < 6; i++) {
    close(Math.hypot(rays[i].dx, rays[i].dy), 1);
    close(rays[i].dx, Math.cos(angle + ((i / 5 - 0.5) * Math.PI) / 15));
    close(rays[i].dy, Math.sin(angle + ((i / 5 - 0.5) * Math.PI) / 15));
    assert.equal(rays[i].range, 760);
    assert.deepEqual(rays[i].hits, []);
  }
  const pistol = traceVolley([], 0, 0, angle, ITEMS.pistol);
  assert.equal(pistol.length, 1);
  close(pistol[0].dx, Math.cos(angle));
  close(pistol[0].dy, Math.sin(angle));
}
const near = enemy(100),
  far = enemy(200);
for (const penetration of [0, 1]) {
  const rays = traceVolley([far, near], 0, 60, 0, ITEMS.shotgun, penetration);
  assert(rays.every((r) => r.hits[0].enemy === near));
  assert(rays.every((r) => r.hits.length === 2));
  assert(rays.every((r) => r.hits[1].enemy === far));
  if (!penetration) assert(rays.every((r) => r.range === r.hits[1].distance));
  near.life = 0;
  assert(
    rays.every((r) => r.hits[0].enemy === near),
    "Volley geometry stays frozen after a lethal pellet",
  );
  near.life = 100;
}
assert(traceVolley([far, near], 0, 60, 0, ITEMS.pistol)[0].hits.length === 1);
// Targets off the centre line are hit by opposite edges of the fan.
const pair = [-0.1, 0.1].map((slope) =>
  enemy(400, { size: 0.12, y: 60 + slope * 400 + 7.5 }),
);
assert.equal(traceShot(pair, 0, 60, 1, 0).length, 0);
const spreadHits = traceVolley(pair, 0, 60, 0, ITEMS.shotgun).flatMap(
  (r) => r.hits,
);
assert.equal(new Set(spreadHits.map((h) => h.enemy)).size, 2);
assert.equal(spreadHits.length, 2);
const onAxis = enemy(150);
assert.equal(
  traceVolley([onAxis], 0, 60, 0, ITEMS.shotgun).filter((r) => r.hits.length)
    .length,
  6,
);
const distant = enemy(700);
assert(
  traceVolley([distant], 0, 60, 0, ITEMS.shotgun).filter((r) => r.hits.length)
    .length < 6,
);
console.log(
  "PASS: six pellet fan, pistol single ray, all aim directions, per-pellet penetration, frozen blockers and spread hitting distinct targets",
);
