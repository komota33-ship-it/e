export const BRUTE_BURST_DELAY = 0.65;
// Урон наносится в активной фазе, а не при одном лишь сближении с игроком.
export const ATTACK_PROFILES = {
  melee: { windup: 0.3, active: 0.13, recovery: 0.43, cooldown: 1.05 },
  runner: { windup: 0.17, active: 0.12, recovery: 0.28, cooldown: 0.8 },
  heavy: { windup: 0.5, active: 0.18, recovery: 0.65, cooldown: 1.65 },
  dash: { windup: 0.26, active: 0.27, recovery: 0.4, cooldown: 1 },
  spit: { windup: 0.5, active: 0.14, recovery: 0.55, cooldown: 2.8 },
  scream: { windup: 0.65, active: 0.35, recovery: 0.65, cooldown: 8 },
  volley: { windup: 0.7, active: 0.2, recovery: 0.7, cooldown: 3 },
  summon: { windup: 0.8, active: 0.18, recovery: 0.75, cooldown: 7 },
};
export function beginEnemyAttack(enemy, kind) {
  const profile = ATTACK_PROFILES[kind];
  enemy.attack = {
    ...profile,
    kind,
    time: 0,
    dir: enemy.dir,
    targetX: enemy.targetX ?? enemy.x,
    targetY: enemy.targetY ?? enemy.y,
    impactFired: false,
    hitDone: false,
  };
  enemy.state = "windup";
  enemy.cooldown = profile.cooldown;
  if (kind === "dash") enemy.dashCooldown = 3;
}
export function stepEnemyAttack(enemy, dt) {
  const a = enemy.attack;
  if (!a) return false;
  a.time += dt;
  enemy.state =
    a.time < a.windup
      ? "windup"
      : a.time < a.windup + a.active
        ? "strike"
        : "recover";
  const impact = !a.impactFired && a.time >= a.windup;
  if (impact) a.impactFired = true;
  if (a.time >= a.windup + a.active + a.recovery) {
    enemy.attack = null;
    enemy.state = "idle";
  }
  return impact;
}

// Called after stepping the attack: count only the part of this update that
// overlaps the active interval, including partial first and last frames.
export function activeAttackSeconds(attack, dt) {
  return Math.max(
    0,
    Math.min(attack.time, attack.windup + attack.active) -
      Math.max(attack.time - dt, attack.windup),
  );
}

function rayBox(sx, sy, dx, dy, box) {
  let near = 0,
    far = 760;
  for (const [origin, dir, min, max] of [
    [sx, dx, box.x, box.x + box.w],
    [sy, dy, box.y, box.y + box.h],
  ]) {
    if (Math.abs(dir) < 0.00001) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let t1 = (min - origin) / dir,
      t2 = (max - origin) / dir;
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) return null;
  }
  return near;
}

// Snapshot all intersections before damage/death effects mutate the scene.
export function traceShot(enemies, sx, sy, dx, dy, penetration = 0) {
  return enemies
    .filter((enemy) => enemy.life > 0)
    .map((enemy) => {
      const height = 125 * enemy.size;
      const distance = rayBox(sx, sy, dx, dy, {
        x: enemy.x - 26 * enemy.size,
        y: enemy.y - height,
        w: 52 * enemy.size,
        h: height,
      });
      return { enemy, distance, x: sx + dx * distance, y: sy + dy * distance };
    })
    .filter((hit) => hit.distance !== null && hit.distance < 760)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 1 + penetration);
}
// Trace the entire volley before applying damage: killing the front enemy with
// one pellet must not let later pellets ignore its body in the same shot.
export function traceVolley(enemies, sx, sy, angle, gun, penetration = 0) {
  const count = gun.pellets || 1;
  // A shotgun pellet passes through the first infected by default; the
  // Piercing perk adds further targets. Pistol rounds keep their old limit.
  const hitLimit = 1 + penetration + (count > 1 ? 1 : 0);
  return Array.from({ length: count }, (_, index) => {
    const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * gun.spread;
    const dx = Math.cos(angle + offset),
      dy = Math.sin(angle + offset);
    const hits = traceShot(enemies, sx, sy, dx, dy, hitLimit - 1);
    return {
      dx,
      dy,
      hits,
      range: hits.length === hitLimit ? hits.at(-1).distance : 760,
    };
  });
}
export function berserkFactor(effects, player) {
  return effects.berserk && player.hp > 0 && player.hp < player.maxHp * 0.3
    ? 1.5
    : 1;
}
export function criticalRoll(effects, random = Math.random) {
  return effects.criticalChance > 0 && random() < effects.criticalChance;
}
export function shotDamage(
  base,
  effects,
  player,
  { relative, frontArmor = false, falloff = 1, critical = false },
) {
  const location =
    relative > 0.77 ? 2 * effects.headshotDamage : relative < 0.3 ? 0.5 : 1;
  return (
    base *
    effects.gunDamage *
    location *
    (frontArmor ? 0.3 : 1) *
    falloff *
    (critical ? 2 : 1) *
    berserkFactor(effects, player)
  );
}
export function knifeDamage(
  effects,
  player,
  equipmentBonus = 1,
  critical = false,
) {
  return (
    15 *
    effects.meleeDamage *
    equipmentBonus *
    (critical ? 2 : 1) *
    berserkFactor(effects, player)
  );
}
