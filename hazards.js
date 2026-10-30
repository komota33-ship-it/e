// Gameplay clocks only: pauses and offline time never advance these systems.
export const INFECTION_PER_BITE = 10;
export const INFECTION_RATE = 0.12;
export function infectionStage(value) {
  return value >= 100
    ? 4
    : value >= 90
      ? 3
      : value >= 60
        ? 2
        : value >= 30
          ? 1
          : 0;
}
export function infectionMaxHp(base, value) {
  return Math.round(base * (value >= 60 ? 0.7 : value >= 30 ? 0.9 : 1));
}
export function applyInfection(player, amount, resistance = 0) {
  player.infection = Math.min(
    100,
    Math.max(0, (player.infection || 0) + amount * (1 - resistance)),
  );
}
export function stepInfection(player, dt, resistance = 0) {
  if (player.infection > 0)
    applyInfection(player, dt * INFECTION_RATE, resistance);
  return infectionStage(player.infection || 0);
}
export function freshNoise() {
  return { time: 0, events: [], cooldown: 0, pending: 0, waves: 0 };
}
export function noiseThreshold(zone) {
  return (
    {
      roof: 100,
      office: 90,
      laboratory: 80,
      apartment: 70,
      mall: 100,
      parking: 65,
      bunker: 90,
    }[zone] || 90
  );
}
export function noiseLevel(noise) {
  return noise.events.reduce((sum, e) => sum + e.amount, 0);
}
export function addNoise(noise, amount) {
  if (!(amount > 0)) return;
  const last = noise.events.at(-1);
  // At most fifty movement samples for the five-second sound window.
  if (last && noise.time - last.time < 0.1) last.amount += amount;
  else noise.events.push({ time: noise.time, amount });
}
export function stepNoise(noise, dt, threshold) {
  noise.time += dt;
  noise.events = noise.events.filter((e) => noise.time - e.time <= 5);
  noise.cooldown = Math.max(0, noise.cooldown - dt);
  if (noise.pending > 0) {
    noise.pending = Math.max(0, noise.pending - dt);
    if (!noise.pending) {
      noise.waves++;
      return "wave";
    }
  }
  if (!noise.cooldown && !noise.pending && noiseLevel(noise) > threshold) {
    noise.pending = 3;
    noise.cooldown = 25;
    noise.events = [];
    return "warning";
  }
  return null;
}
// The same definition drives both the search timer and its noise.
export function containerProfile(c) {
  const label = (c.label || "").toUpperCase();
  if (c.portable) return { seconds: 0, noise: 0 };
  if (label.includes("ВОЕН") || label.includes("ОРУЖЕЙН"))
    return { seconds: 4, noise: 25 };
  if (label.includes("СЕЙФ")) return { seconds: 5, noise: 20 };
  if (label.includes("СУНДУК")) return { seconds: 3, noise: 15 };
  if (label.includes("ХОЛОДИЛЬНИК")) return { seconds: 2, noise: 0 };
  if (label.includes("АВТОМАТ")) return { seconds: 3, noise: 30 };
  if (label.includes("МУСОР")) return { seconds: 1, noise: 5 };
  if (c.kind === "medical") return { seconds: 2, noise: 0 };
  if (c.type === "desk") return { seconds: 1.5, noise: 0 };
  if (c.type === "crate") return { seconds: 2, noise: 10 };
  return { seconds: 1, noise: 0 };
}

// Container traps are seeded separately from loot and travel with their room.
export const TRAPS = {
  shock: {
    name: "ЭЛЕКТРОШОК",
    damage: 18,
    noise: 8,
    radius: 90,
    color: "#a3cad1",
  },
  gas: { name: "ГАЗ", damage: 4, noise: 5, radius: 110, color: "#97a65b" },
  alarm: { name: "СИРЕНА", damage: 0, noise: 110, radius: 0, color: "#d49b63" },
  mine: { name: "МИНА", damage: 40, noise: 60, radius: 130, color: "#dca66e" },
};
// Personal resistance changes damage only; the device still emits sound and gas.
export function trapDamageFactor(type, effects) {
  const resistance =
    type === "shock"
      ? effects.shockResistance || 0
      : type === "gas"
        ? effects.gasResistance || 0
        : 0;
  return (effects.trapFactor ?? 1) * (1 - resistance);
}
export function trapChance(floor) {
  return floor >= 50
    ? 0
    : floor >= 41
      ? 0.1
      : floor >= 31
        ? 0.2
        : floor >= 21
          ? 0.25
          : floor >= 11
            ? 0.3
            : 0.4;
}
export function createContainerTrap(floor, scene, container) {
  if (container.portable || !trapChance(floor)) return null;
  let seed = 2166136261;
  for (const c of `${floor}:${scene}:${container.id}:trap`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  if (random() >= trapChance(floor)) return null;
  return {
    type: Object.keys(TRAPS)[Math.floor(random() * 4)],
    status: "hidden",
    remaining: 0,
    gasRemaining: 0,
    gasClock: 0,
  };
}
// Independent seed keeps loot and trap rolls unchanged when an ambush is added.
export function createContainerAmbush(floor, scene, container) {
  if (floor >= 50 || container.portable) return null;
  let seed = 2166136261;
  for (const c of `${floor}:${scene}:${container.id}:ambush`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296 < 0.05 ? { status: "hidden" } : null;
}
export function armContainerAmbush(ambush) {
  if (!ambush || ambush.status !== "hidden") return false;
  ambush.status = "pending";
  return true;
}
export function armContainerTrap(trap, immune = false) {
  if (!trap || trap.status !== "hidden") return false;
  trap.status = immune ? "disarmed" : "warning";
  trap.remaining = immune ? 0 : 0.5;
  return !immune;
}
export function disarmContainerTrap(trap) {
  if (!trap || trap.status !== "warning" || trap.remaining <= 0) return false;
  trap.status = "disarmed";
  trap.remaining = 0;
  return true;
}
export function stepContainerTrap(trap, dt) {
  const event = { triggered: false, gasTicks: 0 };
  if (!trap) return event;
  let activeDt = Math.max(0, dt);
  if (trap.status === "warning") {
    trap.remaining -= activeDt;
    if (trap.remaining > 1e-9) return event;
    activeDt = Math.max(0, -trap.remaining);
    trap.remaining = 0;
    trap.status = "spent";
    event.triggered = true;
    if (trap.type === "gas") trap.gasRemaining = 5;
  }
  if (trap.status === "spent" && trap.gasRemaining > 0) {
    const elapsed = Math.min(activeDt, trap.gasRemaining);
    trap.gasRemaining = Math.max(0, trap.gasRemaining - elapsed);
    trap.gasClock += elapsed;
    event.gasTicks = Math.floor(trap.gasClock + 1e-9);
    trap.gasClock = Math.max(0, trap.gasClock - event.gasTicks);
  }
  return event;
}
