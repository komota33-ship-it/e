// Perception remembers observations, never the unseen player's live position.
export function freshAwareness(x, patrolling = false) {
  return {
    brain: patrolling ? "patrol" : "sleep",
    homeX: x,
    targetX: x,
    targetY: 423,
    memory: 0,
    searchLeft: 0,
    scanTime: 0,
    patrolDir: -1,
    sleepLeft: 2 + (Math.abs(Math.floor(x)) % 4),
    seesPlayer: false,
  };
}
export function canSeePlayer(
  enemy,
  player,
  { dark = false, flashlight = false } = {},
) {
  const dx = player.x - enemy.x;
  const distance = Math.hypot(dx, (player.y - enemy.y) * 0.7);
  if (enemy.type === "boss") return distance < 550;
  if (distance < 42 * enemy.size) return true;
  const front = dx * enemy.dir >= 0;
  const range = dark ? (flashlight ? 330 : 125) : 430;
  return distance < (front ? range : dark ? (flashlight ? 100 : 45) : 90);
}
export function rememberTarget(enemy, x, y, reason = "sound") {
  if (enemy.life <= 0) return;
  enemy.targetX = x;
  enemy.targetY = y;
  enemy.memory = Math.max(
    5,
    Math.min(
      50,
      Math.abs(x - enemy.x) / Math.max(10, (enemy.speed || 30) * 0.45) + 3,
    ),
  );
  enemy.searchLeft = 3;
  enemy.scanTime = 0;
  enemy.brain = reason === "sight" ? "chase" : "investigate";
  enemy.alert = true;
}
export function hearSound(enemy, x, amount) {
  if (enemy.life <= 0 || amount <= 0) return false;
  const radius = Math.min(1200, 30 + amount * 20);
  if (Math.abs(enemy.x - x) > radius) return false;
  rememberTarget(enemy, x, enemy.y, "sound");
  return true;
}
export function stepAwareness(enemy, player, dt, lighting) {
  if (enemy.life <= 0) return;
  enemy.seesPlayer = canSeePlayer(enemy, player, lighting);
  if (enemy.seesPlayer) {
    rememberTarget(enemy, player.x, player.y, "sight");
    return;
  }
  if (enemy.brain === "chase") enemy.brain = "investigate";
  if (enemy.brain === "investigate") {
    enemy.memory = Math.max(0, enemy.memory - dt);
    if (Math.abs(enemy.x - enemy.targetX) < 12 || enemy.memory === 0) {
      enemy.brain = "search";
      enemy.searchLeft = 3;
      enemy.scanTime = 0;
    }
  } else if (enemy.brain === "search") {
    enemy.searchLeft -= dt;
    enemy.scanTime += dt;
    if (enemy.scanTime >= 0.8) {
      enemy.scanTime -= 0.8;
      enemy.dir *= -1;
    }
    if (enemy.searchLeft <= 0) {
      enemy.brain = "patrol";
      enemy.alert = false;
      enemy.memory = 0;
    }
  } else if (enemy.brain === "sleep") {
    enemy.sleepLeft -= dt;
    if (enemy.sleepLeft <= 0) enemy.brain = "patrol";
  }
  if (enemy.brain === "patrol") {
    const target = enemy.homeX + enemy.patrolDir * 65;
    if (Math.abs(enemy.x - target) < 5) enemy.patrolDir *= -1;
    enemy.targetX = enemy.homeX + enemy.patrolDir * 65;
    enemy.targetY = enemy.y;
    enemy.alert = false;
  }
}
