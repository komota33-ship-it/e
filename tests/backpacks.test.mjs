import assert from "node:assert/strict";
import {
  BACKPACKS,
  ITEMS,
  backpackFor,
  starterInventory,
  addInventoryItem,
  validInventory,
  canPlaceItem,
  sortInventory,
  combineInventory,
} from "../inventory.js";
import {
  swapBackpack,
  weaponSlotsFor,
  assignWeaponSlot,
  validWeaponSlots,
} from "../backpacks.js";
import { equipmentStats } from "../equipment.js";
import { craftItem } from "../crafting.js";
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (const [type, grid] of Object.entries(BACKPACKS)) {
  const items = [];
  assert.equal(
    addInventoryItem(items, "medkit", grid.columns * grid.rows, {}, grid),
    0,
  );
  assert(validInventory(items, grid));
  assert.equal(items.length, grid.columns * grid.rows);
  assert.equal(addInventoryItem(items, "medkit", 1, {}, grid), 1);
  assert(sortInventory(items, grid));
  assert(validInventory(items, grid));
  const last = items.at(-1);
  assert(!canPlaceItem(items, last, grid.columns, 0, false, grid));
  assert(!canPlaceItem(items, last, 0, grid.rows, false, grid));
  const stats = equipmentStats({
    inventory: [],
    backpack: type,
    carryCapacity: 22,
  });
  near(stats.limit, 14 + grid.bonus);
  near(stats.noise, grid.noise);
  near(stats.speed, grid.speed);
  assert.equal(
    weaponSlotsFor({ inventory: [], backpack: type }).length,
    grid.weaponSlots,
  );
}
const state = {
  inventory: starterInventory(),
  backpack: "pack_survivor",
  carryCapacity: 18,
};
state.weaponId = state.inventory[0].uid;
addInventoryItem(state.inventory, "armor", 1, { durability: 37 });
const vest = state.inventory.at(-1);
state.equipment = { torso: vest.uid };
addInventoryItem(state.inventory, "pack_cargo");
const spare = state.inventory.at(-1);
const contents = JSON.stringify(
  state.inventory.filter((i) => i.uid !== spare.uid),
);
assert(swapBackpack(state, { uid: spare.uid }).ok);
assert.equal(state.backpack, "pack_cargo");
assert.equal(
  state.inventory.find((i) => i.uid === spare.uid).type,
  "pack_survivor",
);
assert.equal(
  JSON.stringify(state.inventory.filter((i) => i.uid !== spare.uid)),
  contents,
);
assert.equal(state.equipment.torso, vest.uid);
assert(swapBackpack(state, { uid: spare.uid }).ok);
assert.equal(state.backpack, "pack_survivor");
// Exchange in a container works even with a completely full current backpack.
const full = { inventory: [], backpack: "pack_survivor", weaponId: null };
addInventoryItem(full.inventory, "medkit", 30);
const box = { loot: [{ type: "pack_cargo", qty: 1 }] };
const ids = full.inventory.map((i) => i.uid).sort();
assert(swapBackpack(full, { container: box, index: 0 }).ok);
assert.equal(box.loot[0].type, "pack_survivor");
assert.deepEqual(full.inventory.map((i) => i.uid).sort(), ids);
assert.equal(
  addInventoryItem(full.inventory, "medkit", 18, {}, backpackFor(full)),
  0,
);
assert(validInventory(full.inventory, backpackFor(full)));
assert(!validInventory(full.inventory));
const snapshot = JSON.stringify({ full, box });
assert(!swapBackpack(full, { container: box, index: 0 }).ok);
assert.equal(JSON.stringify({ full, box }), snapshot);
assert(!swapBackpack(full, { uid: "missing" }).ok);
// Smaller packs automatically repack and preserve IDs, ammo and durability.
const small = { inventory: [], backpack: "pack_cargo", weaponId: null };
for (const [t, extra] of [
  ["pistol", { loaded: 7 }],
  ["knife", {}],
  ["bandage", {}],
  ["ammo", {}],
])
  addInventoryItem(small.inventory, t, 1, extra, backpackFor(small));
small.inventory[0].x = 6;
small.inventory[0].y = 5; // wide-grid coordinate cannot survive unchanged
const smallBox = { loot: [{ type: "pack_waist", qty: 1 }] };
assert(swapBackpack(small, { container: smallBox, index: 0 }).ok);
assert(validInventory(small.inventory, backpackFor(small)));
assert.equal(small.inventory[0].loaded, 7);
assert.equal(smallBox.loot[0].type, "pack_cargo");
// Crafting and combinations can use cells beyond the original 6x5 grid.
const wide = [],
  grid = BACKPACKS.pack_cargo;
addInventoryItem(wide, "medkit", 44, {}, grid);
addInventoryItem(wide, "cloth", 2, {}, grid);
assert(craftItem(wide, { dna: 0 }, "bandage", undefined, grid).ok);
assert(validInventory(wide, grid));
assert(wide.some((i) => i.y === 5));
const herbs = [];
addInventoryItem(herbs, "medkit", 40, {}, grid);
addInventoryItem(herbs, "green", 1, {}, grid);
addInventoryItem(herbs, "red", 1, {}, grid);
assert.equal(combineInventory(herbs, herbs.at(-1).uid, grid), "mixture");
assert(validInventory(herbs, grid));
// Enough free area does not guarantee the produced armor fits. Refuse atomically.
const cramped = [
  ["medkit", 1, 0, 0],
  ["medkit", 1, 1, 1],
  ["metal", 5, 1, 0],
  ["metal", 3, 2, 0],
  ["cloth", 5, 0, 1],
  ["electronics", 2, 2, 1],
].map(([type, qty, x, y], i) => ({
  uid: "c" + i,
  type,
  qty,
  x,
  y,
  rotated: false,
}));
assert(validInventory(cramped, BACKPACKS.pack_waist));
const before = JSON.stringify(cramped);
assert(
  !craftItem(
    cramped,
    { dna: 10 },
    "heavyarmor",
    undefined,
    BACKPACKS.pack_waist,
  ).ok,
);
assert.equal(JSON.stringify(cramped), before);
// Tactical/military slots hold references, never separate or duplicate weapons.
const weapons = { inventory: [], backpack: "pack_military" };
for (const [type, loaded] of [
  ["pistol", 9],
  ["shotgun", 3],
  ["pistol", 6],
])
  addInventoryItem(
    weapons.inventory,
    type,
    1,
    { loaded },
    backpackFor(weapons),
  );
weapons.inventory.forEach((i, index) =>
  assert(assignWeaponSlot(weapons, index, i.uid)),
);
assert(validWeaponSlots(weapons));
assert.equal(new Set(weapons.weaponSlots).size, 3);
const oldIds = weapons.inventory.map((i) => i.uid);
assert(assignWeaponSlot(weapons, 0, oldIds[2]));
assert.equal(weaponSlotsFor(weapons)[2], null);
assert(!assignWeaponSlot(weapons, 3, oldIds[0]));
assert(!assignWeaponSlot(weapons, 0, "missing"));
weapons.weaponSlots = [oldIds[0], oldIds[0]];
assert(!validWeaponSlots(weapons));
weapons.weaponSlots = [oldIds[0], oldIds[1], oldIds[2]];
weapons.weaponId = oldIds[2];
assert(
  swapBackpack(weapons, {
    container: { loot: [{ type: "pack_survivor", qty: 1 }] },
    index: 0,
  }).ok,
);
assert.deepEqual(weapons.weaponSlots, [oldIds[2]]);
assert.deepEqual(
  oldIds.map((uid) => weapons.inventory.find((i) => i.uid === uid).loaded),
  [9, 3, 6],
);
// Repeated varied exchanges conserve every item instance and its metadata.
let seed = 71231;
const rand = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const packs = Object.keys(BACKPACKS),
  types = [
    "pistol",
    "shotgun",
    "medkit",
    "ammo",
    "armor",
    "knife",
    "heavyhelmet",
    "cloth",
  ];
for (let trial = 0; trial < 100; trial++) {
  const actor = { inventory: [], backpack: "pack_cargo" };
  for (let i = 0; i < 18; i++) {
    const type = types[Math.floor(rand() * types.length)];
    addInventoryItem(
      actor.inventory,
      type,
      1,
      ITEMS[type].group === "armor" ? { durability: 23 } : {},
      backpackFor(actor),
    );
  }
  const compare = () =>
    JSON.stringify(
      actor.inventory
        .map(({ x, y, rotated, ...rest }) => rest)
        .sort((a, b) => a.uid.localeCompare(b.uid)),
    );
  const cargo = compare(),
    chest = {
      loot: [{ type: packs[Math.floor(rand() * packs.length)], qty: 1 }],
    };
  const original = JSON.stringify({ actor, chest });
  const result = swapBackpack(actor, { container: chest, index: 0 });
  assert.equal(compare(), cargo);
  if (result.ok) assert(validInventory(actor.inventory, backpackFor(actor)));
  else assert.equal(JSON.stringify({ actor, chest }), original);
}
console.log(
  "PASS: six grid sizes, weight/noise/speed effects, full-bag exchange, atomic shrinking/repacking, extended crafting/combinations, quick weapon references, and 100 lossless randomized swaps",
);
