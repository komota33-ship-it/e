import assert from "node:assert/strict";
import {
  ITEMS,
  addInventoryItem,
  consumeInventory,
  inventoryCount,
  canPlaceItem,
  placeItem,
  sortInventory,
  combineInventory,
  validInventory,
  starterInventory,
  containerLoot,
} from "../inventory.js";
import { createFloorLayout, createRoomLayout } from "../level-layouts.js";
const bag = starterInventory();
assert(validInventory(bag));
const pistol = bag.find((i) => i.type === "pistol");
assert(!placeItem(bag, pistol, 5, 4));
assert(!placeItem(bag, pistol, 0, 0, true));
assert(placeItem(bag, pistol, 4, 3, true));
assert.equal(pistol.rotated, true);
assert(validInventory(bag));
assert.equal(addInventoryItem(bag, "ammo", 40), 0);
assert.equal(inventoryCount(bag, "ammo"), 76);
assert(bag.filter((i) => i.type === "ammo").every((i) => i.qty <= 60));
assert(consumeInventory(bag, "ammo", 70));
assert.equal(inventoryCount(bag, "ammo"), 6);
assert(!consumeInventory(bag, "ammo", 7));
assert.equal(inventoryCount(bag, "ammo"), 6);
assert(sortInventory(bag));
assert(validInventory(bag));
addInventoryItem(bag, "green");
addInventoryItem(bag, "red");
assert.equal(
  combineInventory(bag, bag.find((i) => i.type === "green").uid),
  "mixture",
);
assert.equal(inventoryCount(bag, "green"), 0);
assert.equal(inventoryCount(bag, "mixture"), 1);
addInventoryItem(bag, "powder");
addInventoryItem(bag, "metal");
assert.equal(
  combineInventory(bag, bag.find((i) => i.type === "powder").uid),
  "ammo",
);
assert.equal(inventoryCount(bag, "ammo"), 21);
const full = [];
for (let i = 0; i < 30; i++) assert.equal(addInventoryItem(full, "medkit"), 0);
const snapshot = JSON.stringify(full);
assert.equal(addInventoryItem(full, "shotgun"), 1);
assert.equal(JSON.stringify(full), snapshot);
assert(validInventory(full));
assert(!validInventory([{ ...full[0], qty: 999 }]));
assert(!validInventory([full[0], { ...full[1], x: full[0].x, y: full[0].y }]));
assert.deepEqual(
  containerLoot(42, "office", "desk", "ammo"),
  containerLoot(42, "office", "desk", "ammo"),
);
const signatures = new Set(),
  lootTypes = new Set();
let rooms = 0;
for (const n of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  const zone =
    n === 51
      ? "roof"
      : n === 0
        ? "bunker"
        : n >= 41
          ? "office"
          : n >= 31
            ? "laboratory"
            : n >= 21
              ? "apartment"
              : n >= 11
                ? "mall"
                : "parking";
  const layout = createFloorLayout(n, zone);
  assert(!signatures.has(layout.signature));
  signatures.add(layout.signature);
  assert(layout.lift);
  assert(layout.width > 900);
  for (const d of [...layout.doors, layout.lift, ...layout.containers]) {
    const [x, y, w, h] = d.rect;
    assert(
      x >= 0 && w > 0 && h > 0 && x + w <= layout.crop[2],
      `${n} / ${d.id}`,
    );
  }
  for (const c of layout.containers)
    for (const item of containerLoot(n, layout.id, c.id, c.kind)) {
      assert(ITEMS[item.type]);
      lootTypes.add(item.type);
    }
  for (const door of layout.doors) {
    const room = createRoomLayout(n, door);
    rooms++;
    assert(room.exit && room.containers.length);
    for (const c of room.containers)
      for (const item of containerLoot(n, room.id, c.id, c.kind))
        lootTypes.add(item.type);
  }
}
assert.equal(signatures.size, 51);
assert(lootTypes.size >= 14);
console.log(
  `PASS: spatial inventory, stacking, rotation, atomic recipes, full bag, save validation; ${signatures.size} unique layouts, ${rooms} rooms, ${lootTypes.size} loot types`,
);
