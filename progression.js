import { containerProfile } from "./hazards.js";
// Постоянный прогресс отделён от чекпоинта: смерть не отнимает ДНК и перки.
export const PROGRESS_KEY = "elevator-to-hell-progress-v1";
export const DNA_REWARDS = {
  walker: 5,
  runner: 8,
  brute: 20,
  screamer: 10,
  spitter: 12,
  armored: 25,
  boss: 250,
  matriarch: 100,
  alpha: 100,
  carapace: 100,
  chimera: 100,
  mama: 100,
  elena: 100,
};
export const PERKS = {
  health: {
    name: "Крепкое здоровье",
    branch: "ВЫЖИВШИЙ",
    costs: [150, 300, 600],
    values: [20, 40, 60],
    description: "+20 / 40 / 60 к максимальному здоровью.",
  },
  regeneration: {
    name: "Регенерация",
    branch: "ВЫЖИВШИЙ",
    costs: [150, 300, 600],
    values: [1, 2, 3],
    description: "Восстанавливает 1 / 2 / 3 HP в секунду во время игры.",
  },
  resilience: {
    name: "Стойкость",
    branch: "ВЫЖИВШИЙ",
    costs: [150, 300, 600],
    values: [10, 20, 30],
    description: "−10 / 20 / 30% входящего урона, дополнительно к броне.",
  },
  secondWind: {
    name: "Второе дыхание",
    branch: "ВЫЖИВШИЙ",
    costs: [200, 400, 800],
    values: [1, 2, 3],
    description:
      "1 / 2 / 3 возрождения за спуск с 25% HP. Чекпоинт не восполняет заряд.",
  },
  damage: {
    name: "Меткий глаз",
    branch: "БОЕЦ",
    costs: [100, 200, 400],
    values: [10, 20, 30],
    description: "+10 / 20 / 30% урона огнестрельного оружия.",
  },
  rapid: {
    name: "Быстрые руки",
    branch: "БОЕЦ",
    costs: [150, 300, 600],
    values: [15, 30, 45],
    description: "+15 / 30 / 45% скорострельности огнестрельного оружия.",
  },
  piercing: {
    name: "Тяжёлый калибр",
    branch: "БОЕЦ",
    costs: [200, 400, 800],
    values: [1, 2, 3],
    description: "Пуля пробивает ещё 1 / 2 / 3 противников по линии выстрела.",
  },
  critical: {
    name: "Критический удар",
    branch: "БОЕЦ",
    costs: [200, 400, 800],
    values: [10, 20, 30],
    description: "10 / 20 / 30% шанса двойного урона от выстрела или ножа.",
  },
  melee: {
    name: "Мастер ближнего боя",
    branch: "БОЕЦ",
    costs: [100, 200, 400],
    values: [25, 50, 100],
    description: "+25 / 50 / 100% урона ножа.",
  },
  attentive: {
    name: "Внимательный",
    branch: "МАРОДЁР",
    costs: [100, 200, 400],
    values: [1, 2, 3],
    description:
      "Осмотр до обыска: I — первый предмет; II — весь список; III — количество и состояние вещей. Подойдите к контейнеру.",
  },
  search: {
    name: "Быстрый обыск",
    branch: "МАРОДЁР",
    costs: [100, 200, 400],
    values: [20, 40, 60],
    description: "−20 / 40 / 60% времени обыска.",
  },
  loader: {
    name: "Грузчик",
    branch: "МАРОДЁР",
    costs: [150, 300, 600],
    values: [5, 10, 15],
    description: "+5 / 10 / 15 кг переносимого веса с любым рюкзаком.",
  },
  looter: {
    name: "Мародёр",
    branch: "МАРОДЁР",
    costs: [150, 300, 600],
    values: [1, 2, 3],
    description: "+1 / 2 / 3 единицы припасов в каждом контейнере.",
  },
  immunity: {
    name: "Иммунитет",
    branch: "ПСИХО",
    costs: [150, 300, 600],
    values: [20, 40, 60],
    description: "−20 / 40 / 60% заражения от укусов и его роста.",
  },
  morale: {
    name: "Мораль",
    branch: "ПСИХО",
    costs: [150, 300, 600],
    values: [10, 20, 30],
    description:
      "+10 / 20 / 30% получаемой ДНК. Дробная часть бонуса сохраняется между убийствами и спусками.",
  },
  luck: {
    name: "Удача",
    branch: "ПСИХО",
    costs: [200, 400, 800],
    values: [10, 20, 30],
    description:
      "+10 / 20 / 30% к шансу найти оружие, броню, рюкзаки и обвесы в контейнерах. Бонус относительный; крыша и медшкафы без изменений.",
  },
  silent: {
    name: "Тихий обыск",
    branch: "МАРОДЁР",
    costs: [100, 200, 400],
    values: [30, 60, 90],
    description: "−30 / 60 / 90% шума при обыске контейнеров.",
  },
  sapper: {
    name: "Сапёр",
    branch: "ТЕХНИК",
    costs: [150, 300, 600],
    values: [50, 75, 100],
    description:
      "−50 / 75 / 100% урона и шума ловушек. На третьем ранге обезвреживает их автоматически.",
  },
  engineer: {
    name: "Инженер",
    branch: "ТЕХНИК",
    costs: [150, 300, 600],
    values: [20, 40, 60],
    description: "−20 / 40 / 60% времени изготовления на верстаке.",
  },
  electrician: {
    name: "Электрик",
    branch: "ТЕХНИК",
    costs: [100, 200, 400],
    values: [50, 75, 100],
    description:
      "−50 / 75 / 100% урона электрошоковых ловушек. На третьем ранге — иммунитет к шоку. Шум ловушки сохраняется.",
  },
  respirator: {
    name: "Респиратор",
    branch: "ТЕХНИК",
    costs: [100, 200, 400],
    values: [50, 75, 100],
    description:
      "−50 / 75 / 100% урона газовых ловушек. На третьем ранге — иммунитет к газу. Не защищает от кислоты и заражения.",
  },
  speed: {
    name: "Лёгкие ноги",
    branch: "ВЫЖИВШИЙ",
    costs: [150, 300, 600],
    values: [10, 20, 30],
    description: "+10 / 20 / 30% скорости ходьбы и бега.",
  },
  connection: {
    name: "Связь с вирусом",
    branch: "ПСИХО",
    costs: [200, 400, 800],
    values: [10, 20, 30],
    description:
      "−10 / 20 / 30% скорости передвижения заражённых, включая рывки.",
  },
};
export const SYNERGIES = {
  invulnerable: {
    name: "Неуязвимый",
    requires: { resilience: 3, sapper: 3 },
    description: "иммунитет к ловушкам",
  },
  tank: {
    name: "Танк",
    requires: { health: 3, resilience: 3 },
    description: "ещё +100 HP и −50% входящего урона",
  },
  phoenix: {
    name: "Феникс",
    requires: { secondWind: 3, regeneration: 3 },
    description: "второе дыхание возвращает с 50% HP",
  },
  ghost: {
    name: "Призрак",
    requires: { speed: 3, silent: 3 },
    description: "−50% всего шума",
  },
  hamster: {
    name: "Хамстер",
    requires: { loader: 3, looter: 3 },
    description: "ещё +10 кг и +3 единицы припасов",
  },
  collector: {
    name: "Коллекционер",
    requires: { luck: 3, looter: 2 },
    description: "ещё +30% к шансу снаряжения и обвесов; вместе с Удачей +60%",
  },
  berserk: {
    name: "Берсерк",
    requires: { damage: 3, critical: 3 },
    description: "+50% урона оружия при HP ниже 30%",
  },
  butcher: {
    name: "Мясник",
    requires: { melee: 3, rapid: 2 },
    description: "+100% урона ножа",
  },
  assault: {
    name: "Штурмовик",
    requires: { damage: 2, piercing: 2 },
    description: "ещё +1 пробитие",
  },
  sniper: {
    name: "Снайпер",
    requires: { damage: 3, critical: 2 },
    description: "+50% урона выстрела в голову",
  },
};
export function synergyActive(profile, id) {
  return Object.entries(SYNERGIES[id].requires).every(
    ([perk, rank]) => (profile.perks[perk] || 0) >= rank,
  );
}
const safeInt = (v, max = 1e9) =>
  Number.isInteger(v) && v >= 0 && v <= max ? v : 0;
export function normalizeProgress(value) {
  const v = value?.version === 1 ? value : {};
  return {
    version: 1,
    dna: safeInt(v.dna),
    dnaRemainder: safeInt(v.dnaRemainder, 99),
    earned: safeInt(v.earned),
    kills: safeInt(v.kills),
    deaths: safeInt(v.deaths),
    wins: safeInt(v.wins),
    bestDepth: safeInt(v.bestDepth, 50),
    perks: Object.fromEntries(
      Object.keys(PERKS).map((k) => [k, safeInt(v.perks?.[k], 3)]),
    ),
  };
}
export function readProgress(storage) {
  try {
    return normalizeProgress(JSON.parse(storage.getItem(PROGRESS_KEY)));
  } catch {
    return normalizeProgress(null);
  }
}
export function writeProgress(storage, profile) {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function awardKill(profile, type, bonusPercent = 0) {
  const base = DNA_REWARDS[type] || 0;
  if (!base) return 0;
  // Integer hundredths avoid losing small rewards to rounding. Use the run's
  // snapshot, so buying a perk during a run cannot change its rewards.
  const bonus = [0, 10, 20, 30].includes(bonusPercent) ? bonusPercent : 0;
  const hundredths = base * (100 + bonus) + (profile.dnaRemainder || 0);
  const amount = Math.floor(hundredths / 100);
  profile.dnaRemainder = hundredths % 100;
  profile.dna = Math.min(1e9, profile.dna + amount);
  profile.earned = Math.min(1e9, profile.earned + amount);
  profile.kills = Math.min(1e9, profile.kills + 1);
  return amount;
}
export function buyPerk(profile, id) {
  const def = PERKS[id],
    level = profile.perks[id];
  if (!def || !Number.isInteger(level) || level >= 3) return false;
  const cost = def.costs[level];
  if (profile.dna < cost) return false;
  profile.dna -= cost;
  profile.perks[id]++;
  return true;
}
export function perkEffects(profile) {
  const loader = profile.perks.loader || 0,
    looter = profile.perks.looter || 0,
    hamster = synergyActive(profile, "hamster");
  return {
    // Until branch XP exists, Survivor level is the sum of purchased ranks.
    carryCapacity:
      18 +
      2 *
        ["health", "speed", "regeneration", "resilience", "secondWind"].reduce(
          (sum, id) => sum + (profile.perks[id] || 0),
          0,
        ) +
      5 * loader +
      (hamster ? 10 : 0),
    lootBonus: looter + (hamster ? 3 : 0),
    rareLootBonus:
      10 * (profile.perks.luck || 0) +
      (synergyActive(profile, "collector") ? 30 : 0),
    inspection: profile.perks.attentive || 0,
    dnaBonus: 10 * (profile.perks.morale || 0),
    maxHp:
      100 +
      20 * profile.perks.health +
      (synergyActive(profile, "tank") ? 100 : 0),
    regeneration: profile.perks.regeneration || 0,
    incomingDamage:
      (1 - 0.1 * (profile.perks.resilience || 0)) *
      (synergyActive(profile, "tank") ? 0.5 : 1),
    revivals: profile.perks.secondWind || 0,
    revivalHealth: synergyActive(profile, "phoenix") ? 0.5 : 0.25,
    gunDamage: 1 + 0.1 * profile.perks.damage,
    fireRate: 1 + 0.15 * (profile.perks.rapid || 0),
    penetration:
      (profile.perks.piercing || 0) +
      (synergyActive(profile, "assault") ? 1 : 0),
    criticalChance: 0.1 * (profile.perks.critical || 0),
    meleeDamage:
      (1 + [0, 0.25, 0.5, 1][profile.perks.melee || 0]) *
      (synergyActive(profile, "butcher") ? 2 : 1),
    headshotDamage: synergyActive(profile, "sniper") ? 1.5 : 1,
    berserk: synergyActive(profile, "berserk"),
    searchTime: 1 - 0.2 * profile.perks.search,
    infectionResistance: 0.2 * (profile.perks.immunity || 0),
    searchNoise: 1 - 0.3 * (profile.perks.silent || 0),
    craftTime: 1 - 0.2 * (profile.perks.engineer || 0),
    trapFactor: [1, 0.5, 0.25, 0][profile.perks.sapper || 0],
    shockResistance: [0, 0.5, 0.75, 1][profile.perks.electrician || 0],
    gasResistance: [0, 0.5, 0.75, 1][profile.perks.respirator || 0],
    moveSpeed: 1 + 0.1 * (profile.perks.speed || 0),
    enemySpeed: 1 - 0.1 * (profile.perks.connection || 0),
    noiseFactor: synergyActive(profile, "ghost") ? 0.5 : 1,
  };
}
export function searchDuration(container, multiplier = 1) {
  const seconds =
    container.searchSeconds ?? containerProfile(container).seconds;
  return seconds * multiplier;
}
export function recordDepth(profile, floor) {
  profile.bestDepth = Math.max(
    profile.bestDepth,
    floor === 0 ? 50 : 51 - floor,
  );
}
