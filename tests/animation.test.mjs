import assert from "node:assert/strict";
import {
  animationFrame,
  advanceGait,
  runnerFlightLift,
  attackAnimationFrame,
} from "../animation.js";
import {
  BRUTE_BURST_DELAY,
  ATTACK_PROFILES,
  beginEnemyAttack,
  stepEnemyAttack,
  activeAttackSeconds,
} from "../combat.js";

for (const type of [
  "walker",
  "runner",
  "brute",
  "armored",
  "spitter",
  "screamer",
  "boss",
  "matriarch",
  "alpha",
  "carapace",
  "chimera",
  "mama",
  "elena",
]) {
  const kind =
    type === "spitter" || type === "chimera"
      ? "spit"
      : type === "screamer"
        ? "scream"
        : type === "boss"
          ? "volley"
          : type === "matriarch"
            ? "summon"
            : type === "alpha"
              ? "scream"
              : type === "carapace"
                ? "heavy"
                : type === "brute" || type === "armored"
                  ? "heavy"
                  : "melee";
  const a = { ...ATTACK_PROFILES[kind], time: 0 };
  const at = (t) => {
    a.time = t;
    return animationFrame({ attack: a }, type);
  };
  assert.equal(at(a.windup + a.active / 2), 6);
  const recoveryStart = a.windup + a.active;
  assert.equal(at(recoveryStart + 0.01), 7);
  if (type !== "boss") assert.equal(at(recoveryStart + a.recovery * 0.99), 4);
  if (["walker", "runner", "brute", "armored"].includes(type))
    assert.equal(at(recoveryStart + a.recovery * 0.6), 5);
  if (["spitter", "screamer", "alpha", "chimera"].includes(type))
    assert.equal(at(recoveryStart + a.recovery * 0.6), 7);
  assert.equal(animationFrame({ deathAge: 100, attack: a }, type), 11);
  for (const hz of [30, 60, 144]) {
    const actor = { x: 0, y: 423, dir: 1 };
    beginEnemyAttack(actor, kind);
    let hits = 0;
    for (let i = 0; i < hz * 3; i++) hits += +stepEnemyAttack(actor, 1 / hz);
    assert.equal(hits, 1);
    assert.equal(actor.attack, null);
    assert.equal(actor.state, "idle");
  }
}
for (const type of [
  "walker",
  "runner",
  "spitter",
  "brute",
  "screamer",
  "armored",
  "boss",
  "chimera",
  "mama",
  "elena",
])
  for (const direction of [-1, 1]) {
    const seen = new Set(),
      actor = { moveBlend: 1 };
    for (let i = 0; i < 8; i++) {
      actor.phase = (direction * (i + 0.2) * Math.PI) / 4;
      const frame = animationFrame(actor, type, { walkFrameCount: 8 });
      assert(frame >= 0 && frame < 8);
      seen.add(frame);
    }
    assert.equal(seen.size, 8);
  }
const walking = { moveBlend: 1, phase: 0 };
assert.equal(animationFrame({ moveBlend: 0 }, "mama"), 0);
assert.equal(animationFrame({ moveBlend: 0 }, "elena"), 0);
advanceGait(walking, 60, "walker");
assert(Math.abs(walking.phase - 2 * Math.PI) < 1e-10);
assert.equal(animationFrame(walking, "walker", { walkFrameCount: 8 }), 0);
const stopped = { phase: Math.PI, moveBlend: 0 };
assert.equal(animationFrame(stopped, "walker", { walkFrameCount: 8 }), 4);
assert.equal(animationFrame({ moveBlend: 1, phase: Math.PI }, "runner"), 2);
console.log(
  "PASS: attack recovery returns to rest, ranged recovery never replays emission, single impact across frame rates, eight-frame walking and final corpse pose",
);

// Run cycle is distance-driven; stopping cannot advance the legs.
const run = { moveBlend: 1, phase: 0 };
advanceGait(run, 100, "runner");
assert(Math.abs(run.phase - 2 * Math.PI) < 1e-10);
const phase = run.phase;
advanceGait(run, 0, "runner");
assert.equal(run.phase, phase);
for (const contact of [-2, -1, 0, 1, 2])
  assert.equal(runnerFlightLift(contact * Math.PI), 0);
for (let i = -200; i <= 200; i++) {
  const phase = (i * Math.PI) / 100,
    lift = runnerFlightLift(phase);
  assert(lift >= 0 && lift <= 4);
  assert(Math.abs(lift - runnerFlightLift(phase + Math.PI)) < 1e-10);
  assert(Math.abs(lift - runnerFlightLift(phase + 0.0001)) < 0.003);
}
assert(runnerFlightLift(Math.PI * 0.825) > 3.99);

// Extended death strips advance once and hold the final pose at every frame rate.
for (const type of [
  "walker",
  "runner",
  "spitter",
  "brute",
  "screamer",
  "armored",
  "boss",
])
  for (const hz of [30, 60, 144]) {
    const seen = new Set();
    let last = 8;
    for (
      let tick = 0;
      tick < hz * (type === "brute" ? BRUTE_BURST_DELAY : 3);
      tick++
    ) {
      const frame = animationFrame(
        { deathAge: tick / hz, moveBlend: 1, attack: { time: 0 } },
        type,
        { deathFrameCount: 8 },
      );
      assert(frame >= last && frame <= 15);
      seen.add(frame);
      last = frame;
    }
    assert.equal(seen.size, 8);
    assert.equal(last, 15);
  }
assert.equal(
  animationFrame({ deathAge: -0.01 }, "walker", { deathFrameCount: 8 }),
  8,
);
assert.equal(animationFrame({ deathAge: 100 }, "runner"), 11);

const dash = { ...ATTACK_PROFILES.dash, time: 0 };
for (const [time, expected] of [
  [0, 0],
  [0.13, 1],
  [0.25, 2],
  [0.26, 3],
  [0.4, 4],
  [0.53, 5],
  [0.7, 6],
  [0.92, 7],
  [10, 7],
]) {
  dash.time = time;
  assert.equal(attackAnimationFrame(dash), expected);
}
for (const hz of [20, 30, 60, 144]) {
  const actor = { x: 0, dir: 1 };
  beginEnemyAttack(actor, "dash");
  let seconds = 0;
  while (actor.attack) {
    const a = actor.attack;
    stepEnemyAttack(actor, 1 / hz);
    seconds += activeAttackSeconds(a, 1 / hz);
  }
  assert(Math.abs(seconds - 0.27) < 1e-10);
  assert(Math.abs(seconds * 310 - 83.7) < 1e-8);
}
assert.equal(activeAttackSeconds({ ...dash, time: 0.2 }, 0.1), 0);
assert(
  Math.abs(activeAttackSeconds({ ...dash, time: 0.6 }, 0.6) - 0.27) < 1e-10,
);

for (const kind of ["melee", "runner", "dash", "spit", "heavy", "scream"])
  for (const hz of [30, 60, 144]) {
    const e = { dir: 1 };
    beginEnemyAttack(e, kind);
    const seen = new Set();
    let impacts = 0;
    while (e.attack) {
      const a = e.attack,
        index = attackAnimationFrame(a);
      seen.add(index);
      assert(
        a.time < a.windup
          ? index < 3
          : a.time < a.windup + a.active
            ? index >= 3 && index <= 4
            : index >= 5 && index <= 7,
      );
      impacts += +stepEnemyAttack(e, 1 / hz);
    }
    assert.equal(impacts, 1);
    assert.equal(seen.size, 8);
  }

const shuffling = { moveBlend: 1, phase: 0 };
advanceGait(shuffling, 58, "spitter");
assert(Math.abs(shuffling.phase - 2 * Math.PI) < 1e-10);
const still = shuffling.phase;
advanceGait(shuffling, 0, "spitter");
assert.equal(shuffling.phase, still);
assert.equal(
  animationFrame({ ...shuffling, moveBlend: 0 }, "spitter", {
    walkFrameCount: 8,
  }),
  4,
);

const lumbering = { moveBlend: 1, phase: 0 };
advanceGait(lumbering, 44, "brute");
assert(Math.abs(lumbering.phase - 2 * Math.PI) < 1e-10);
assert.equal(
  animationFrame({ ...lumbering, moveBlend: 0 }, "brute", {
    walkFrameCount: 8,
  }),
  4,
);

const calling = { phase: 0 };
advanceGait(calling, 64, "screamer");
assert(Math.abs(calling.phase - Math.PI * 2) < 1e-10);

const armoredWalk = { phase: 0 };
advanceGait(armoredWalk, 48, "armored");
assert(Math.abs(armoredWalk.phase - Math.PI * 2) < 1e-10);

const bossWalk = { phase: 0 };
advanceGait(bossWalk, 62, "boss");
assert(Math.abs(bossWalk.phase - Math.PI * 2) < 1e-10);
