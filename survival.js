import { infectionMaxHp } from "./hazards.js";
// Выносливость и рывок не зависят от частоты кадров.
export const DODGE_DURATION = 0.3,
  DODGE_DISTANCE = 96,
  DODGE_COOLDOWN = 1.5;
export function freshSurvival() {
  return {
    stamina: 100,
    dodgeTime: 0,
    dodgeCooldown: 0,
    dodgeDir: 1,
    exhausted: false,
    revivesUsed: 0,
    reviveGrace: 0,
  };
}
export function stepRegeneration(state, dt, rate) {
  if (state.hp > 0)
    state.hp = Math.min(state.maxHp, state.hp + Math.max(0, dt) * rate);
}
export function reviveSurvival(state, effects) {
  const used = state.revivesUsed ?? 0;
  if (state.hp > 0 || used >= effects.revivals) return false;
  state.revivesUsed = used + 1;
  if (state.infection >= 100) state.infection = 50;
  state.maxHp = infectionMaxHp(effects.maxHp, state.infection || 0);
  state.hp = Math.max(1, state.maxHp * effects.revivalHealth);
  state.reviveGrace = 2;
  state.deathAge = 0;
  state.dodgeTime = 0;
  state.meleeTime = 0;
  return true;
}
export function spendStamina(state, cost) {
  if (state.stamina < cost) return false;
  state.stamina = Math.max(0, state.stamina - cost);
  if (state.stamina === 0) state.exhausted = true;
  return true;
}
export function startDodge(state, direction, costMultiplier = 1) {
  if (
    state.dodgeTime > 0 ||
    state.dodgeCooldown > 0 ||
    !spendStamina(state, 25 * costMultiplier)
  )
    return false;
  state.dodgeTime = DODGE_DURATION;
  state.dodgeCooldown = DODGE_COOLDOWN;
  state.dodgeDir = direction < 0 ? -1 : 1;
  return true;
}
export function stepSurvival(
  state,
  dt,
  { combat = false, sprint = false, busy = false, costMultiplier = 1 } = {},
) {
  const dashTime = Math.min(dt, state.dodgeTime || 0);
  state.dodgeTime = Math.max(0, (state.dodgeTime || 0) - dt);
  state.dodgeCooldown = Math.max(0, (state.dodgeCooldown || 0) - dt);
  if (state.stamina >= 20) state.exhausted = false;
  const running =
    sprint && !state.exhausted && state.stamina > 0 && dashTime === 0 && !busy;
  if (running) {
    state.stamina = Math.max(0, state.stamina - dt * 10 * costMultiplier);
    if (state.stamina === 0) state.exhausted = true;
  } else if (!busy && dashTime === 0)
    state.stamina = Math.min(100, state.stamina + dt * (combat ? 5 : 15));
  return {
    running,
    dashDistance:
      ((dashTime * DODGE_DISTANCE) / DODGE_DURATION) * (state.dodgeDir || 1),
    dodging: dashTime > 0,
  };
}
