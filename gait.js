// Compact heel-to-toe walk. Full-strength stance feet stay fixed in world
// space; swing velocity matches stance at both ends, avoiding a mechanical snap.
export const HERO_STRIDE = 50;
export const HERO_LEG_LENGTH = 32;
export const HERO_STANCE = 0.56;
const gaitClamp = (n) => Math.max(0, Math.min(1, n));
export function solveLeg(hip, target) {
  const dx = target.x - hip.x,
    dy = target.y - hip.y;
  const raw = Math.hypot(dx, dy);
  const distance = Math.min(
    HERO_LEG_LENGTH * 2 - 0.0001,
    Math.max(0.0001, raw),
  );
  const ux = raw > 0.0001 ? dx / raw : 0;
  const uy = raw > 0.0001 ? dy / raw : 1;
  const ankle = { x: hip.x + ux * distance, y: hip.y + uy * distance };
  const bend = Math.sqrt(HERO_LEG_LENGTH ** 2 - (distance / 2) ** 2);
  return {
    hip,
    ankle,
    knee: {
      x: hip.x + (ux * distance) / 2 + uy * bend,
      y: hip.y + (uy * distance) / 2 - ux * bend,
    },
  };
}
export function heroLegPose(actor) {
  const phase = ((((actor.phase || 0) / (Math.PI * 2)) % 1) + 1) % 1;
  const strength = gaitClamp(actor.moveBlend || 0);
  const bob = Math.cos(phase * Math.PI * 4) * 0.35 * strength;
  const hip = { x: 0, y: -69 + bob };
  const foot = (q, far) => {
    q = (q + 1) % 1;
    const planted = q < HERO_STANCE;
    const t = gaitClamp((q - HERO_STANCE) / (1 - HERO_STANCE));
    const arc = Math.sin(t * Math.PI) ** 2;
    const lift = planted ? 0 : arc * 4.5 * strength;
    const reach = (HERO_STRIDE * HERO_STANCE) / 2;
    // Cubic Hermite: heel leaves and meets the floor with the same horizontal
    // velocity as the planted foot, instead of stopping at each turnaround.
    const smooth = t * t * (3 - 2 * t);
    const tangent = -HERO_STRIDE * (1 - HERO_STANCE);
    const swing =
      -reach + 2 * reach * smooth + tangent * (2 * t * t * t - 3 * t * t + t);
    const walkingX = planted ? reach - HERO_STRIDE * q : swing;
    const restX = far ? -12 : 12;
    const x = restX + (walkingX - restX) * strength;
    return {
      ...solveLeg(hip, { x, y: -7 - lift }),
      lift,
      planted: strength < 0.001 || planted,
      angle: planted ? 0 : -0.22 * Math.sin(t * Math.PI * 2) * arc * strength,
    };
  };
  return { near: foot(phase, false), far: foot(phase + 0.5, true), bob };
}
// Facing is decided from the body centre, never the moving weapon shoulder.
// Retain facing in a small centre band so vertical aim tolerates mouse noise.
export function heroAimFacing(current, targetX, bodyX) {
  const dx = targetX - bodyX;
  return dx > 9 ? 1 : dx < -9 ? -1 : current;
}
