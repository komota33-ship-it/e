import assert from "node:assert/strict";
import {
  normalizeProgress,
  perkEffects,
  buyPerk,
  readProgress,
  writeProgress,
} from "../progression.js";
import { BACKPACKS, containerLoot, ITEMS } from "../inventory.js";
import { equipmentStats } from "../equipment.js";
const profile = normalizeProgress({
  version: 1,
  dna: 2100,
  perks: { health: 2, speed: 1 },
});
assert.equal(profile.perks.loader, 0);
assert.equal(profile.perks.looter, 0);
for (let rank = 1; rank <= 3; rank++) {
  assert(buyPerk(profile, "loader"));
  assert.equal(perkEffects(profile).carryCapacity, 24 + 5 * rank);
  assert.equal(perkEffects(profile).lootBonus, 0);
}
for (let rank = 1; rank <= 3; rank++) {
  assert(buyPerk(profile, "looter"));
  assert.equal(perkEffects(profile).carryCapacity, 39 + (rank === 3 ? 10 : 0));
  assert.equal(perkEffects(profile).lootBonus, rank + (rank === 3 ? 3 : 0));
}
assert.equal(profile.dna, 0);
const before = structuredClone(profile);
assert(!buyPerk(profile, "loader"));
assert(!buyPerk(profile, "looter"));
assert.deepEqual(profile, before);
assert(!buyPerk(normalizeProgress(null), "loader"));
let saved;
const storage = {
  getItem: () => saved,
  setItem: (key, value) => {
    saved = value;
  },
};
assert(writeProgress(storage, profile));
assert.deepEqual(readProgress(storage), profile);
for (const value of [-1, 4, Infinity, "3", null]) {
  const p = normalizeProgress({
    version: 1,
    perks: { loader: value, looter: value },
  });
  assert.equal(perkEffects(p).carryCapacity, 18);
  assert.equal(perkEffects(p).lootBonus, 0);
}
for (const [backpack, def] of Object.entries(BACKPACKS)) {
  assert.equal(
    equipmentStats({
      inventory: [],
      backpack,
      carryCapacity: perkEffects(profile).carryCapacity,
    }).limit,
    41 + def.bonus,
  );
}
const quantity = (items) => items.reduce((n, i) => n + i.qty, 0);
// Every floor, container category and perk rank: exact additive unit count,
// original equipment metadata and draws preserved, repeatable independent rolls.
for (const floor of [51, ...Array.from({ length: 49 }, (_, i) => 50 - i), 0]) {
  for (const kind of ["medical", "workshop", "crate"]) {
    for (const id of [
      "roof-supply",
      "roof-medical",
      "cabinet",
      "desk",
      "safe",
    ]) {
      const args = [floor, "test-room", id, kind],
        base = containerLoot(...args);
      for (const bonus of [0, 1, 2, 3, 6]) {
        const boosted = containerLoot(...args, bonus);
        assert.deepEqual(boosted, containerLoot(...args, bonus));
        assert.equal(quantity(boosted), quantity(base) + bonus);
        for (const item of base) {
          const found = boosted.find((i) => i.type === item.type);
          assert(found.qty >= item.qty);
          const { qty, ...metadata } = item,
            { qty: nextQty, ...nextMetadata } = found;
          assert.deepEqual(nextMetadata, metadata);
        }
        assert(
          boosted.every(
            (i) => ITEMS[i.type] && Number.isInteger(i.qty) && i.qty > 0,
          ),
        );
        if (floor !== 51 && kind === "medical")
          assert(
            !boosted.some((i) =>
              ["weapon", "armor", "backpack"].includes(ITEMS[i.type].group),
            ),
          );
      }
      for (const bad of [NaN, Infinity, -1, 1.5, "3"])
        assert.deepEqual(containerLoot(...args, bad), base);
      assert.deepEqual(containerLoot(...args, 999), containerLoot(...args, 6));
    }
  }
}
console.log(
  "PASS: loader/looter purchases and migration, Hamster threshold, six pack capacities, deterministic additive loot on all floors and container types",
);

// Inspection is read-only and cannot reroll loot or disclose a hidden trap.
import { containerPreview } from '../inventory.js';
const inspected = {label:'ЯЩИК',opened:false,trap:{type:'mine',status:'hidden'},loot:[
  {type:'ammo',qty:24},{type:'armor',qty:1,durability:72},
  {type:'pistol',qty:1,loaded:18,attachments:{magazine:'extendedmag',rail:'laser'}}]};
const untouched = structuredClone(inspected);
assert.equal(containerPreview(inspected,0),'');
assert(!containerPreview(inspected,1).includes('Бронежилет'));
assert(containerPreview(inspected,1).includes('Ещё позиций: 2'));
assert(containerPreview(inspected,2).includes('Бронежилет'));
assert(!containerPreview(inspected,2).includes('72%'));
assert(containerPreview(inspected,3).includes('72%'));
assert(containerPreview(inspected,3).includes('18/18'));
assert(containerPreview(inspected,3).includes('Лазер'));
for(const rank of [1,2,3])assert(!containerPreview(inspected,rank).includes('МИНА'));
assert.deepEqual(inspected,untouched);
assert(containerPreview({label:'ЯЩИК',loot:[]},3).includes('Пусто'));
assert.equal(containerPreview(null,3),'');
assert.equal(perkEffects(normalizeProgress(null)).inspection,0);
console.log('PASS: inspection rank detail, modified weapons, hidden traps and read-only contents');
