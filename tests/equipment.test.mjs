import assert from "node:assert/strict";
import {
  ITEMS,
  addInventoryItem,
  validInventory,
  starterInventory,
  inventoryCount,
  containerLoot,
} from "../inventory.js";
import {
  equipmentFor,
  equipmentStats,
  validEquipment,
  wearEquipment,
  itemWeight,
} from "../equipment.js";
import { craftItem, craftProblem } from "../crafting.js";
import { perkEffects, normalizeProgress } from "../progression.js";
import {
  freshSurvival,
  startDodge,
  stepSurvival,
  spendStamina,
} from "../survival.js";
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const bag = [];
addInventoryItem(bag, "armor");
const vest = bag[0];
assert.equal(vest.durability, 100);
delete vest.durability;
const legacy = { inventory: bag, armorId: vest.uid };
assert.equal(equipmentFor(legacy).torso, vest.uid);
close(equipmentStats(legacy).defense, 0.25);
assert(validInventory(bag));
assert(validEquipment(bag, undefined));
assert(!validEquipment(bag, null));
assert(!validEquipment(bag, { head: vest.uid }));
assert(!validEquipment(bag, { torso: "missing" }));
assert(!validEquipment(bag, { toString: null }));
for (const value of [-1, 101, NaN, Infinity, "60"]) {
  vest.durability = value;
  assert(!validInventory(bag));
}
vest.durability = 2;
wearEquipment(legacy, () => 0);
assert.equal(vest.durability, 1);
assert.deepEqual(
  wearEquipment(legacy, () => 0.99),
  ["Бронежилет"],
);
close(equipmentStats(legacy).defense, 0);
close(equipmentStats(legacy).speed, 0.95); // broken mass/penalties remain
assert.deepEqual(wearEquipment(legacy), []);
const full = { inventory: [], equipment: {}, carryCapacity: 100 };
for (const type of ["heavyhelmet", "heavyarmor", "armoredgloves", "exoboots"]) {
  assert.equal(addInventoryItem(full.inventory, type), 0);
  const item = full.inventory.at(-1);
  full.equipment[ITEMS[type].slot] = item.uid;
}
const stats = equipmentStats(full);
close(stats.defense, 0.9);
close(stats.weight, 21);
close(stats.speed, 0.85);
close(stats.noise, 0.81);
close(stats.view, 0.8);
close(stats.melee, 1.05);
full.carryCapacity = 21;
assert(!equipmentStats(full).overloaded);
full.carryCapacity = 20.99;
const heavy = equipmentStats(full);
assert(heavy.overloaded);
close(heavy.speed, 0.85 * 0.85);
close(heavy.staminaCost, 1.25);
close(heavy.reload, 0.9);
const stamina = freshSurvival();
stepSurvival(stamina, 1, { sprint: true, costMultiplier: heavy.staminaCost });
close(stamina.stamina, 87.5);
assert(startDodge(stamina, 1, heavy.staminaCost));
close(stamina.stamina, 56.25);
assert(spendStamina(stamina, 15 * heavy.staminaCost));
close(stamina.stamina, 37.5);
const starting = starterInventory();
assert(starting.every((i) => Number.isFinite(itemWeight(i))));
assert(equipmentStats({ inventory: starting }).weight < 18);
const pistol = starting.find((i) => i.type === "pistol");
close(itemWeight(pistol), 1.5 + 12 * 0.012);
const weightBefore = equipmentStats({ inventory: starting }).weight;
pistol.loaded--;
starting.find((i) => i.type === "ammo").qty++;
close(equipmentStats({ inventory: starting }).weight, weightBefore);
const ranks = normalizeProgress({
  version: 1,
  perks: { health: 2, speed: 1, damage: 3 },
});
assert.equal(perkEffects(ranks).carryCapacity, 24);
// Targeted repair is atomic, retains uid/equipment, handles broken gear and full bags.
addInventoryItem(bag, "metal");
addInventoryItem(bag, "cloth");
const profile = { dna: 88 };
let before = JSON.stringify({ bag, profile });
assert(craftProblem(bag, profile, "repair", "missing"));
assert(!craftItem(bag, profile, "repair", "missing").ok);
assert.equal(JSON.stringify({ bag, profile }), before);
for (let i = 0; i < 24; i++) addInventoryItem(bag, "medkit");
assert(craftItem(bag, profile, "repair", vest.uid).ok);
assert.equal(bag.find((i) => i.uid === vest.uid).durability, 100);
assert.equal(profile.dna, 88);
assert.equal(inventoryCount(bag, "cloth"), 0);
assert.equal(inventoryCount(bag, "metal"), 0);
assert(validInventory(bag));
before = JSON.stringify(bag);
assert(!craftItem(bag, profile, "repair", vest.uid).ok);
assert.equal(JSON.stringify(bag), before);
const insufficient = [];
addInventoryItem(insufficient, "boots", 1, { durability: 0 });
addInventoryItem(insufficient, "cloth");
before = JSON.stringify(insufficient);
assert(!craftItem(insufficient, profile, "repair", insufficient[0].uid).ok);
assert.equal(JSON.stringify(insufficient), before);
const lootTypes = new Set();
for (let floor = 50; floor >= 0; floor--)
  for (let id = 0; id < 120; id++)
    for (const item of containerLoot(
      floor,
      "corridor",
      String(id),
      "workshop",
    )) {
      lootTypes.add(item.type);
      if (ITEMS[item.type].group === "armor")
        assert(item.durability >= 65 && item.durability <= 100);
    }
assert(
  Object.entries(ITEMS)
    .filter(([, d]) => d.group === "armor")
    .every(([type]) => lootTypes.has(type)),
);
assert(lootTypes.has("electronics") && lootTypes.has("glue"));
console.log(
  "PASS: four armor slots, legacy validation, defense cap, wear/breakage, weight/loaded rounds, overload costs, Survivor capacity, atomic targeted repairs and all armor loot tiers",
);
