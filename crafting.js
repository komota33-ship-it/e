import {
  ITEMS,
  inventoryCount,
  consumeInventory,
  addInventoryItem,
} from "./inventory.js";
export const RECIPES = {
  bandage: {
    name: "Бинт",
    ingredients: { cloth: 2 },
    out: "bandage",
    qty: 1,
    seconds: 2,
  },
  medkit: {
    name: "Аптечка",
    ingredients: { cloth: 3, chemical: 1 },
    out: "medkit",
    qty: 1,
    seconds: 3,
  },
  antidote: {
    name: "Антидот",
    ingredients: { chemical: 2 },
    dna: 50,
    out: "antidote",
    qty: 1,
    seconds: 3,
  },
  ammo: {
    name: "Патроны 9 мм ×15",
    ingredients: { powder: 1, metal: 1 },
    out: "ammo",
    qty: 15,
    seconds: 2,
  },
  shells: {
    name: "Патроны 12 калибра ×10",
    ingredients: { powder: 2, metal: 2 },
    out: "shells",
    qty: 10,
    seconds: 3,
  },
  rifle_ammo: {
    name: "Патроны 5,56 мм ×15",
    ingredients: { powder: 2, metal: 2 },
    out: "rifle_ammo", qty: 15, seconds: 3,
  },
  sniper_ammo: {
    name: "Патроны 7,62 мм ×8",
    ingredients: { powder: 2, metal: 3 },
    out: "sniper_ammo", qty: 8, seconds: 4,
  },
  energy_cell: {
    name: "Энергоблок ×2",
    ingredients: { chemical: 2, electronics: 2, metal: 1 },
    out: "energy_cell", qty: 2, seconds: 5,
  },
  grenade: {
    name: "Граната",
    ingredients: { powder: 2, metal: 1 },
    out: "grenade",
    qty: 1,
    seconds: 4,
  },
};
for (const [id, ingredients] of Object.entries({
  suppressor: { metal: 2, cloth: 1 },
  laser: { metal: 1, electronics: 1 },
  extendedmag: { metal: 2, spring: 1 },
  leather: { cloth: 5, metal: 1 },
  armor: { metal: 3, cloth: 2, glue: 1 },
  kevlar: { metal: 5, cloth: 3, chemical: 2 },
  heavyarmor: { metal: 8, cloth: 5, electronics: 2 },
  builderhelmet: { metal: 2, cloth: 1 },
  militaryhelmet: { metal: 4, cloth: 2, electronics: 1 },
}))
  RECIPES[id] = {
    name: ITEMS[id].name,
    ingredients,
    out: id,
    qty: 1,
    seconds: 5,
  };
RECIPES.repair = {
  name: "Ремонт брони",
  ingredients: { metal: 1, cloth: 1 },
  seconds: 3,
  repair: true,
};
function prepareCraft(items, profile, id, targetUid, grid) {
  const recipe = RECIPES[id];
  if (!recipe) return { error: "Неизвестный рецепт." };
  if (profile.dna < (recipe.dna || 0)) return { error: "Недостаточно ДНК." };
  for (const [type, qty] of Object.entries(recipe.ingredients))
    if (inventoryCount(items, type) < qty)
      return { error: `Не хватает: ${ITEMS[type].name}.` };
  if (recipe.repair) {
    const target = items.find(
      (i) => i.uid === targetUid && ITEMS[i.type].group === "armor",
    );
    if (!target) return { error: "Выберите броню для ремонта." };
    if ((target.durability ?? 100) >= 100)
      return { error: "Снаряжение не повреждено." };
  }
  const copy = structuredClone(items);
  for (const [type, qty] of Object.entries(recipe.ingredients))
    consumeInventory(copy, type, qty);
  if (recipe.repair) copy.find((i) => i.uid === targetUid).durability = 100;
  else if (addInventoryItem(copy, recipe.out, recipe.qty, {}, grid))
    return { error: "Освободите место для результата." };
  return { copy, recipe };
}
export function craftProblem(items, profile, id, targetUid, grid) {
  return prepareCraft(items, profile, id, targetUid, grid).error || "";
}
export function craftItem(items, profile, id, targetUid, grid) {
  const { error, copy, recipe } = prepareCraft(
    items,
    profile,
    id,
    targetUid,
    grid,
  );
  if (error) return { ok: false, message: error };
  items.splice(0, items.length, ...copy);
  profile.dna -= recipe.dna || 0;
  return {
    ok: true,
    message: recipe.repair
      ? "Снаряжение восстановлено до 100%."
      : `Изготовлено: ${recipe.name}.`,
  };
}
