// Spatial inventory. Items are the source of truth for ammunition and supplies.
export const INVENTORY_COLUMNS = 6;
export const INVENTORY_ROWS = 5;
export const BACKPACKS = {
  pack_waist: {
    name: "Поясная сумка",
    columns: 3,
    rows: 2,
    bonus: 0,
    weaponSlots: 1,
    noise: 1,
    speed: 1,
    icon: 0,
  },
  pack_school: {
    name: "Школьный рюкзак",
    columns: 4,
    rows: 3,
    bonus: 2,
    weaponSlots: 1,
    noise: 1,
    speed: 1,
    icon: 1,
  },
  pack_tactical: {
    name: "Тактический рюкзак",
    columns: 5,
    rows: 4,
    bonus: 5,
    weaponSlots: 2,
    noise: 1,
    speed: 1,
    icon: 2,
  },
  pack_survivor: {
    name: "Рюкзак Выжившего",
    columns: 6,
    rows: 5,
    bonus: 8,
    weaponSlots: 1,
    noise: 0.9,
    speed: 1,
    icon: 3,
  },
  pack_military: {
    name: "Военный рюкзак",
    columns: 7,
    rows: 5,
    bonus: 12,
    weaponSlots: 3,
    noise: 1,
    speed: 1,
    icon: 4,
  },
  pack_cargo: {
    name: "Карго-ранец",
    columns: 8,
    rows: 6,
    bonus: 20,
    weaponSlots: 1,
    noise: 1,
    speed: 0.8,
    icon: 5,
  },
};
export const DEFAULT_BACKPACK = "pack_survivor";
export function backpackFor(state) {
  return Object.hasOwn(BACKPACKS, state.backpack)
    ? BACKPACKS[state.backpack]
    : BACKPACKS[DEFAULT_BACKPACK];
}
export const ITEMS = {
  pistol: {
    name: "Пистолет 9 мм",
    w: 2,
    h: 1,
    stack: 1,
    icon: 0,
    group: "weapon",
    ammo: "ammo",
    capacity: 12,
    damage: 10,
    delay: 0.23,
    description: "Надёжный служебный пистолет. Базовый магазин на 12 патронов.",
  },
  shotgun: {
    name: "Помповый дробовик",
    w: 3,
    h: 1,
    stack: 1,
    icon: 1,
    group: "weapon",
    ammo: "shells",
    capacity: 6,
    damage: 10,
    pellets: 6,
    spread: Math.PI / 15,
    delay: 1 / 1.2,
    description:
      "6 дробин по 10 урона, 1,2 выстрела/с. Разброс и потеря урона на расстоянии. Один патрон 12 калибра за залп.",
  },
  smg: {
    name: "ПП МП5",
    w: 3, h: 1, stack: 1, group: "weapon", icon: 0,
    sheet: "weapon_icons", sheetColumns: 2, ammo: "ammo", capacity: 30,
    damage: 8, delay: 0.1, noise: 18, category: "smg", weight: 3,
    description: "Компактный пистолет-пулемёт. Быстрая очередь патронами 9 мм.",
  },
  assault: {
    name: "Автомат M4",
    w: 4, h: 1, stack: 1, group: "weapon", icon: 1,
    sheet: "weapon_icons", sheetColumns: 2, ammo: "rifle_ammo", capacity: 30,
    damage: 12, delay: 0.125, noise: 24, category: "assault", weight: 5,
    description: "Автомат 5,56 мм. Надёжен на средней дистанции.",
  },
  rifle: {
    name: "Винтовка СВД",
    w: 4, h: 1, stack: 1, group: "weapon", icon: 2,
    sheet: "weapon_icons", sheetColumns: 2, ammo: "sniper_ammo", capacity: 10,
    damage: 60, delay: 1.25, penetration: 1, range: 1100,
    noise: 46, category: "rifle", weight: 7,
    description: "Снайперская винтовка 7,62 мм. Пробивает двух заражённых.",
  },
  railgun: {
    name: "Рейлган",
    w: 4, h: 2, stack: 1, group: "weapon", icon: 3,
    sheet: "weapon_icons", sheetColumns: 2, ammo: "energy_cell", capacity: 5,
    damage: 150, delay: 1.7, penetration: 3, range: 1200,
    noise: 55, category: "heavy", weight: 12,
    description: "Тяжёлое экспериментальное оружие. Заряд пробивает целую линию заражённых.",
  },
  ammo: {
    name: "Патроны 9 мм",
    w: 1,
    h: 1,
    stack: 60,
    icon: 2,
    description: "Боеприпасы для пистолета. До 60 в одной пачке.",
  },
  shells: {
    name: "Патроны 12 калибра",
    w: 1,
    h: 1,
    stack: 20,
    icon: 3,
    description: "Боеприпасы для дробовика. До 20 в одной пачке.",
  },
  rifle_ammo: {
    name: "Патроны 5,56 мм", w: 1, h: 1, stack: 60, icon: 1,
    sheet: "ammo_variants", sheetColumns: 2, weight: 0.016,
    description: "Боеприпасы для автомата.",
  },
  sniper_ammo: {
    name: "Патроны 7,62 мм", w: 1, h: 1, stack: 30, icon: 2,
    sheet: "ammo_variants", sheetColumns: 2, weight: 0.024,
    description: "Боеприпасы для снайперской винтовки.",
  },
  energy_cell: {
    name: "Энергоблок", w: 1, h: 1, stack: 10, icon: 3,
    sheet: "ammo_variants", sheetColumns: 2, weight: 0.2,
    description: "Экспериментальные заряды для рейлгана.",
  },
  bandage: {
    name: "Бинт",
    w: 1,
    h: 1,
    stack: 3,
    icon: 4,
    heal: 20,
    description: "Восстанавливает 20 здоровья.",
  },
  medkit: {
    name: "Аптечка",
    w: 1,
    h: 1,
    stack: 1,
    icon: 5,
    heal: 55,
    description: "Восстанавливает 55 здоровья.",
  },
  green: {
    name: "Зелёная трава",
    w: 1,
    h: 1,
    stack: 1,
    icon: 6,
    heal: 25,
    description:
      "Восстанавливает 25 здоровья. Смешайте с красной травой для полного лечения.",
  },
  red: {
    name: "Красная трава",
    w: 1,
    h: 1,
    stack: 1,
    icon: 7,
    description: "Усиливает зелёную траву. Отдельно не используется.",
  },
  mixture: {
    name: "Смесь трав",
    w: 1,
    h: 1,
    stack: 1,
    icon: 6,
    heal: 100,
    description:
      "Смесь зелёной и красной травы. Полностью восстанавливает здоровье.",
  },
  grenade: {
    name: "Осколочная граната",
    w: 1,
    h: 1,
    stack: 3,
    icon: 8,
    description: "G — бросить. Взрыв опасен и для курьера.",
  },
  powder: {
    name: "Порох",
    w: 1,
    h: 1,
    stack: 5,
    icon: 9,
    description: "Порох + металлолом = 15 патронов 9 мм.",
  },
  metal: {
    name: "Металлолом",
    w: 1,
    h: 1,
    stack: 5,
    icon: 10,
    description: "Смешайте с порохом для изготовления патронов.",
  },
  armor: {
    name: "Бронежилет",
    w: 2,
    h: 2,
    stack: 1,
    icon: 11,
    group: "armor",
    description:
      "Снижает входящий урон на 25%. Надетая броня остаётся в рюкзаке.",
  },
  battery: {
    name: "Батарейки",
    w: 1,
    h: 1,
    stack: 4,
    icon: 12,
    description: "Полностью заряжают фонарик.",
  },
  water: {
    name: "Вода",
    w: 1,
    h: 1,
    stack: 2,
    icon: 13,
    heal: 10,
    description: "Восстанавливает 10 здоровья.",
  },
  food: {
    name: "Консервы",
    w: 1,
    h: 1,
    stack: 2,
    icon: 14,
    heal: 15,
    description: "Восстанавливают 15 здоровья.",
  },
  knife: {
    name: "Боевой нож",
    w: 1,
    h: 2,
    stack: 1,
    icon: -1,
    description: "V — удар ножом. Не требует боеприпасов.",
  },
  cloth: {
    name: "Ткань",
    w: 1,
    h: 1,
    stack: 8,
    icon: 0,
    sheet: "medical_items",
    description:
      "Для бинтов и аптечек. Найдите рабочий стол или технический ящик и откройте раздел изготовления в рюкзаке.",
  },
  chemical: {
    name: "Химикаты",
    w: 1,
    h: 1,
    stack: 5,
    icon: 1,
    sheet: "medical_items",
    description:
      "Реагенты для аптечки и антидота. Антидот: 2 химиката + 50 ДНК.",
  },
  antidote: {
    name: "Антидот «Некрос-7»",
    w: 1,
    h: 1,
    stack: 2,
    icon: 2,
    sheet: "medical_items",
    description:
      "Полностью снимает заражение. Возвращает обычный предел здоровья, но не лечит раны.",
  },
};
// Concept armour values: defense is a fraction, mass is per item in kg.
const armorSpec = [
  ["cap", "Кепка", "head", 0, 0.05, 0.5, {}],
  ["builderhelmet", "Каска строителя", "head", 1, 0.15, 2, { view: -0.05 }],
  ["militaryhelmet", "Военная каска", "head", 2, 0.3, 3, { view: -0.1 }],
  [
    "heavyhelmet",
    "Тяжёлый шлем",
    "head",
    3,
    0.5,
    5,
    { view: -0.2, speed: -0.1 },
  ],
  ["leather", "Кожанка", "torso", 4, 0.1, 2, {}],
  ["armor", "Бронежилет", "torso", 5, 0.25, 4, { speed: -0.05 }],
  ["kevlar", "Кевлар", "torso", 6, 0.4, 6, { speed: -0.1 }],
  ["heavyarmor", "Тяжёлая броня", "torso", 7, 0.6, 10, { speed: -0.25 }],
  ["gloves", "Рабочие перчатки", "hands", 8, 0.05, 0.5, {}],
  [
    "tacticalgloves",
    "Тактические перчатки",
    "hands",
    9,
    0.15,
    1,
    { reload: 0.1 },
  ],
  ["armoredgloves", "Бронеперчатки", "hands", 10, 0.25, 2, { melee: 0.05 }],
  ["sneakers", "Кроссовки", "feet", 12, 0.05, 1, { speed: 0.05 }],
  ["boots", "Берцы", "feet", 13, 0.15, 2, { stability: 0.1 }],
  [
    "exoboots",
    "Экзо-ботинки",
    "feet",
    14,
    0.25,
    4,
    { speed: 0.2, noise: -0.1 },
  ],
];
for (const [id, name, slot, icon, defense, weight, modifiers] of armorSpec) {
  const bonuses = Object.entries(modifiers).map(
    ([k, v]) =>
      `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}% ${{ view: "обзор", speed: "скорость", reload: "скорость перезарядки", melee: "урон ножа", stability: "устойчивость камеры", noise: "шум" }[k]}`,
  );
  ITEMS[id] = {
    name,
    slot,
    icon,
    defense,
    weight,
    modifiers,
    group: "armor",
    w: slot === "hands" ? 1 : 2,
    h: slot === "torso" ? 2 : 1,
    stack: 1,
    sheet: "armor_items",
    sheetColumns: 4,
    description: `Защита ${Math.round(defense * 100)}%. ${bonuses.join(" · ")}${bonuses.length ? ". " : ""}Износ 1–3 п.п. за удар. При 0% защита и положительные бонусы не действуют. Надетое снаряжение занимает место в рюкзаке.`,
  };
}
for (const [id, name, icon, weight] of [
  ["electronics", "Электроника", 11, 0.3],
  ["glue", "Клей", 15, 0.2],
])
  ITEMS[id] = {
    name,
    icon,
    weight,
    w: 1,
    h: 1,
    stack: 5,
    sheet: "armor_items",
    sheetColumns: 4,
    description: "Материал для изготовления брони на рабочем столе.",
  };
const itemWeights = {
  pistol: 1.5,
  shotgun: 5,
  ammo: 0.012,
  shells: 0.04,
  bandage: 0.1,
  medkit: 0.8,
  green: 0.1,
  red: 0.1,
  mixture: 0.2,
  grenade: 0.4,
  powder: 0.3,
  metal: 0.5,
  battery: 0.15,
  water: 1,
  food: 0.5,
  knife: 0.4,
  cloth: 0.2,
  chemical: 0.4,
  antidote: 0.2,
};
for (const [id, weight] of Object.entries(itemWeights))
  ITEMS[id].weight = weight;
for (const [type, pack] of Object.entries(BACKPACKS))
  ITEMS[type] = {
    name: pack.name,
    w: 2,
    h: 2,
    stack: 1,
    weight: 0,
    group: "backpack",
    sheet: "backpacks",
    sheetColumns: 3,
    sheetRows: 2,
    icon: pack.icon,
    description: `${pack.columns}×${pack.rows} ячеек. +${pack.bonus} кг к лимиту. Быстрое оружие: ${pack.weaponSlots} слот(а).${pack.noise < 1 ? " −10% шума." : ""}${pack.speed < 1 ? " −20% скорости." : ""} При замене старый рюкзак сохраняется. В контейнере можно обменять рюкзаки без свободного места в сетке.`,
  };
export const ATTACHMENTS = {
  suppressor: {
    slot: "muzzle",
    name: "Глушитель",
    weight: 0.2,
    icon: 0,
    sourceRect: [0, 0, 0.56, 0.47],
    description: "−80% шума выстрела. Подходит для пистолета и дробовика.",
  },
  laser: {
    slot: "rail",
    name: "Лазер",
    weight: 0.15,
    icon: 1,
    sourceRect: [0.58, 0, 0.42, 0.47],
    description:
      "+15 процентных пунктов к шансу крита выстрела. Видимая линия прицела.",
  },
  extendedmag: {
    slot: "magazine",
    name: "Расширенный магазин",
    weight: 0.25,
    icon: 2,
    sourceRect: [0, 0.47, 0.5, 0.53],
    description:
      "+50% вместимости магазина. Не создаёт патроны. При снятии избыток возвращается в рюкзак.",
  },
};
for (const [id, def] of Object.entries(ATTACHMENTS))
  ITEMS[id] = {
    ...def,
    group: "attachment",
    w: 1,
    h: 1,
    stack: 1,
    sheet: "attachments",
  };
ITEMS.spring = {
  name: "Пружина",
  w: 1,
  h: 1,
  stack: 5,
  weight: 0.1,
  icon: 3,
  sheet: "attachments",
  sourceRect: [0.5, 0.5, 0.5, 0.5],
  description:
    "Материал для расширенного магазина. Найдите в технических контейнерах.",
};
export function weaponStats(weapon) {
  const def = ITEMS[weapon?.type],
    mods = weapon?.attachments || {};
  return {
    capacity: Math.floor(
      (def?.capacity || 0) * (mods.magazine === "extendedmag" ? 1.5 : 1),
    ),
    noise: mods.muzzle === "suppressor" ? 0.2 : 1,
    criticalBonus: mods.rail === "laser" ? 0.15 : 0,
  };
}
export function validAttachments(item) {
  if (item.attachments === undefined) return true;
  if (
    ITEMS[item.type]?.group !== "weapon" ||
    !item.attachments ||
    typeof item.attachments !== "object" ||
    Array.isArray(item.attachments)
  )
    return false;
  return Object.entries(item.attachments).every(
    ([slot, type]) =>
      Object.hasOwn(ATTACHMENTS, type) && ATTACHMENTS[type].slot === slot,
  );
}
export function inventorySize(item, rotated = item.rotated) {
  const d = ITEMS[item.type];
  return rotated ? [d.h, d.w] : [d.w, d.h];
}
export function canPlaceItem(
  items,
  item,
  x,
  y,
  rotated = item.rotated,
  grid = BACKPACKS[DEFAULT_BACKPACK],
) {
  const [w, h] = inventorySize(item, rotated);
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x + w > grid.columns ||
    y + h > grid.rows
  )
    return false;
  return !items.some((other) => {
    if (other.uid === item.uid) return false;
    const [ow, oh] = inventorySize(other);
    return (
      x < other.x + ow && x + w > other.x && y < other.y + oh && y + h > other.y
    );
  });
}
export function placeItem(
  items,
  item,
  x,
  y,
  rotated = item.rotated,
  grid = BACKPACKS[DEFAULT_BACKPACK],
) {
  if (!canPlaceItem(items, item, x, y, rotated, grid)) return false;
  Object.assign(item, { x, y, rotated: !!rotated });
  return true;
}
export function inventoryCount(items, type) {
  return items.reduce((n, i) => n + (i.type === type ? i.qty : 0), 0);
}
let nextItemId = 1;
export function addInventoryItem(
  items,
  type,
  quantity = 1,
  extra = {},
  grid = BACKPACKS[DEFAULT_BACKPACK],
) {
  if (!ITEMS[type] || !Number.isInteger(quantity) || quantity <= 0)
    return quantity;
  const max = ITEMS[type].stack;
  for (const item of items) {
    if (item.type !== type || item.qty >= max) continue;
    const n = Math.min(max - item.qty, quantity);
    item.qty += n;
    quantity -= n;
  }
  while (quantity > 0) {
    let uid;
    do {
      uid = `item-${nextItemId++}`;
    } while (items.some((i) => i.uid === uid));
    const item = {
      ...structuredClone(extra),
      uid,
      type,
      qty: Math.min(max, quantity),
      x: 0,
      y: 0,
      rotated: false,
    };
    let found = false;
    for (const rotated of [false, true]) {
      for (let y = 0; y < grid.rows && !found; y++)
        for (let x = 0; x < grid.columns && !found; x++)
          if (placeItem(items, item, x, y, rotated, grid)) found = true;
      if (found) break;
    }
    if (!found) break;
    if (ITEMS[type].group === "weapon" && !Number.isFinite(item.loaded))
      item.loaded = 0;
    if (ITEMS[type].group === "armor" && item.durability === undefined)
      item.durability = 100;
    items.push(item);
    quantity -= item.qty;
  }
  return quantity;
}
export function consumeInventory(items, type, quantity = 1) {
  if (inventoryCount(items, type) < quantity) return false;
  for (let i = items.length - 1; i >= 0 && quantity > 0; i--) {
    const item = items[i];
    if (item.type !== type) continue;
    const n = Math.min(quantity, item.qty);
    item.qty -= n;
    quantity -= n;
    if (!item.qty) items.splice(i, 1);
  }
  return true;
}
export function sortInventory(items, grid = BACKPACKS[DEFAULT_BACKPACK]) {
  const copy = structuredClone(items).sort(
    (a, b) =>
      ITEMS[b.type].w * ITEMS[b.type].h - ITEMS[a.type].w * ITEMS[a.type].h,
  );
  const placed = [];
  for (const item of copy) {
    let done = false;
    for (const rotation of [false, true]) {
      for (let y = 0; y < grid.rows && !done; y++)
        for (let x = 0; x < grid.columns && !done; x++)
          if (placeItem(placed, item, x, y, rotation, grid)) done = true;
      if (done) break;
    }
    if (!done) return false;
    placed.push(item);
  }
  items.splice(0, items.length, ...placed);
  return true;
}
export function combineInventory(
  items,
  uid,
  grid = BACKPACKS[DEFAULT_BACKPACK],
) {
  const selected = items.find((i) => i.uid === uid);
  if (!selected) return false;
  const recipes = [
    { a: "green", b: "red", out: "mixture", qty: 1 },
    { a: "powder", b: "metal", out: "ammo", qty: 15 },
  ];
  const recipe = recipes.find(
    (r) =>
      (r.a === selected.type || r.b === selected.type) &&
      inventoryCount(items, r.a) > 0 &&
      inventoryCount(items, r.b) > 0,
  );
  if (!recipe) return false;
  // Atomic transaction: no ingredients disappear if the result cannot fit.
  const copy = structuredClone(items);
  consumeInventory(copy, recipe.a);
  consumeInventory(copy, recipe.b);
  if (addInventoryItem(copy, recipe.out, recipe.qty, {}, grid)) return false;
  items.splice(0, items.length, ...copy);
  return recipe.out;
}
export function validInventory(items, grid = BACKPACKS[DEFAULT_BACKPACK]) {
  if (!Array.isArray(items) || items.length > grid.columns * grid.rows)
    return false;
  const ids = new Set();
  return items.every((i) => {
    if (
      !ITEMS[i.type] ||
      typeof i.uid !== "string" ||
      ids.has(i.uid) ||
      !Number.isInteger(i.qty) ||
      i.qty < 1 ||
      i.qty > ITEMS[i.type].stack
    )
      return false;
    ids.add(i.uid);
    if (!validAttachments(i)) return false;
    if (
      ITEMS[i.type].group === "weapon" &&
      (!Number.isInteger(i.loaded) ||
        i.loaded < 0 ||
        i.loaded > weaponStats(i).capacity)
    )
      return false;
    if (
      ITEMS[i.type].group === "armor" &&
      i.durability !== undefined &&
      (!Number.isFinite(i.durability) || i.durability < 0 || i.durability > 100)
    )
      return false;
    return canPlaceItem(items, i, i.x, i.y, !!i.rotated, grid);
  });
}
export function starterInventory() {
  const items = [];
  for (const [t, n, extra] of [
    ["pistol", 1, { loaded: 12 }],
    ["knife", 1, {}],
    ["ammo", 36, {}],
    ["medkit", 1, {}],
    ["bandage", 2, {}],
    ["grenade", 1, {}],
  ])
    addInventoryItem(items, t, n, extra);
  return items;
}
function lootRandom(text) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    return (n >>> 0) / 4294967296;
  };
}
function supplyPool(kind) {
  return kind === "medical"
    ? [
        "medkit",
        "bandage",
        "green",
        "red",
        "water",
        "chemical",
        "antidote",
        "cloth",
      ]
    : kind === "workshop"
      ? [
          "powder",
          "metal",
          "battery",
          "shells",
          "cloth",
          "chemical",
          "electronics",
          "glue",
        ]
      : [
          "ammo",
          "ammo",
          "shells",
          "grenade",
          "food",
          "water",
          "powder",
          "metal",
          "bandage",
          "cloth",
        ];
}
function armorLootTier(floor) {
  return floor >= 41
    ? ["cap", "leather", "gloves", "sneakers", "builderhelmet"]
    : floor >= 21
      ? ["armor", "builderhelmet", "militaryhelmet", "tacticalgloves", "boots"]
      : ["kevlar", "heavyarmor", "heavyhelmet", "armoredgloves", "boots", "exoboots"];
}
function backpackLootTier(floor) {
  return floor >= 31
    ? ["pack_waist", "pack_school", "pack_tactical", "pack_survivor"]
    : ["pack_tactical", "pack_survivor", "pack_military", "pack_cargo"];
}
function rollEquipmentLoot(floor, rand) {
  const tier = armorLootTier(floor);
  const type = rand() < 0.25 ? "shotgun" : tier[Math.floor(rand() * tier.length)];
  return {
    type, qty: 1,
    ...(type === "shotgun" ? { loaded: 0 } : { durability: 65 + Math.floor(rand() * 36) }),
  };
}
function baseContainerLoot(floor, scene, id, kind) {
  const rand = lootRandom(`${floor}:${scene}:${id}`);
  if (floor === 51)
    return id === "roof-supply"
      ? [
          { type: "ammo", qty: 24 },
          { type: "bandage", qty: 1 },
        ]
      : id === "roof-medical"
        ? [
            { type: "medkit", qty: 1 },
            { type: "green", qty: 1 },
          ]
        : [
            { type: "shotgun", qty: 1, loaded: 3 },
            { type: "shells", qty: 8 },
          ];
  const pool = supplyPool(kind);
  const loot = [];
  for (let i = 0, n = 2 + Math.floor(rand() * 2); i < n; i++) {
    const type = pool[Math.floor(rand() * pool.length)],
      qty =
        type === "ammo"
          ? 12 + Math.floor(rand() * 2) * 6
          : type === "shells"
            ? 4
            : type === "cloth"
              ? 2
              : 1;
    const stack = loot.find((x) => x.type === type);
    if (stack) stack.qty += qty;
    else loot.push({ type, qty });
  }
  if (kind !== "medical" && rand() < 0.24) {
    loot.push(rollEquipmentLoot(floor, rand));
  }
  if (kind !== "medical" && rand() < 0.12) {
    const packs = backpackLootTier(floor);
    loot.push({ type: packs[Math.floor(rand() * packs.length)], qty: 1 });
  }
  const modRandom = lootRandom(`${floor}:${scene}:${id}:attachments`);
  if (
    kind === "workshop"
      ? modRandom() < 0.45
      : kind !== "medical" && floor <= 40 && modRandom() < 0.12
  ) {
    const extras =
      kind === "workshop"
        ? ["spring", "spring", "suppressor", "laser", "extendedmag"]
        : ["suppressor", "laser", "extendedmag"];
    loot.push({
      type: extras[Math.floor(modRandom() * extras.length)],
      qty: 1,
    });
  }
  return loot;
}

// Perks add units with a separate seed: normal loot and gear rolls stay intact.
// Called only when a room is created; reopening uses the existing loot array.
export function containerLoot(floor, scene, id, kind, bonus = 0, rareBonus = 0) {
  const loot = baseContainerLoot(floor, scene, id, kind);
  const count = Number.isInteger(bonus) ? Math.max(0, Math.min(6, bonus)) : 0;
  const rand = lootRandom(`${floor}:${scene}:${id}:bonus`);
  const pool = supplyPool(kind);
  for (let i = 0; i < count; i++) {
    const type = pool[Math.floor(rand() * pool.length)];
    const stack = loot.find((item) => item.type === type);
    if (stack) stack.qty++;
    else loot.push({ type, qty: 1 });
  }
  // Top up missed rare rolls without consuming the base RNG or replacing items.
  // Conditional chance q = p*b/(1-p) gives overall p + (1-p)*q = p*(1+b).
  // Each category has its own seed so increasing Luck cannot remove earlier finds.
  const boost = Number.isInteger(rareBonus) ? Math.max(0, Math.min(60, rareBonus)) / 100 : 0;
  if (boost && floor !== 51 && kind !== "medical") {
    const extra = (category, chance, groups, make) => {
      if (loot.some(item => groups.includes(ITEMS[item.type].group))) return;
      const random = lootRandom(`${floor}:${scene}:${id}:luck:${category}`);
      if (random() < chance * boost / (1 - chance)) loot.push(make(random));
    };
    extra("equipment", 0.24, ["weapon", "armor"], random => rollEquipmentLoot(floor, random));
    extra("backpack", 0.12, ["backpack"], random => {
      const packs = backpackLootTier(floor);
      return { type: packs[Math.floor(random() * packs.length)], qty: 1 };
    });
    // Workshop's 45% extras include two spring entries and three attachments.
    const modChance = kind === "workshop" ? 0.45 * 3 / 5 : floor <= 40 ? 0.12 : 0;
    extra("attachment", modChance, ["attachment"], random => ({
      type: ["suppressor", "laser", "extendedmag"][Math.floor(random() * 3)], qty: 1,
    }));
  }
  return loot;
}

// Read existing contents only: inspecting never rolls loot or opens the container.
export function containerPreview(container, rank) {
  if (!container || !Number.isInteger(rank) || rank < 1 || rank > 3) return "";
  const loot = container.loot;
  if (!loot.length) return `${container.label}\nПусто`;
  const visible = rank === 1 ? loot.slice(0, 1) : loot;
  const lines = visible.map(item => {
    const def = ITEMS[item.type];
    let label = def.name;
    if (rank === 3) {
      label += ` ×${item.qty}`;
      if (def.group === "armor") label += ` · прочность ${Math.ceil(item.durability ?? 100)}%`;
      if (def.group === "weapon") {
        label += ` · патроны ${item.loaded || 0}/${weaponStats(item).capacity}`;
        const mods = Object.values(item.attachments || {}).map(type => ITEMS[type].name);
        if (mods.length) label += ` · ${mods.join(", ")}`;
      }
    }
    return label;
  });
  if (rank === 1 && loot.length > 1) lines.push(`Ещё позиций: ${loot.length - 1}`);
  return `${container.label}\n${lines.join(" · ")}`;
}
