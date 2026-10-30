import assert from 'node:assert/strict';
import {ITEMS, ATTACHMENTS, addInventoryItem, validInventory, weaponStats, inventoryCount, sortInventory, containerLoot} from '../inventory.js';
import {installAttachment,removeAttachment} from '../attachments.js';
import {itemWeight,equipmentStats} from '../equipment.js';
import {swapBackpack} from '../backpacks.js';
import {craftItem} from '../crafting.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const make=(type='pistol')=>{const s={inventory:[],backpack:'pack_survivor'};addInventoryItem(s.inventory,type,1,{loaded:ITEMS[type].capacity});s.weaponId=s.inventory[0].uid;s.weaponSlots=[s.weaponId];return s;};
for(const type of ['pistol','shotgun']) {
 const s=make(type),id=s.weaponId;
 for(const mod of Object.keys(ATTACHMENTS)) {
  addInventoryItem(s.inventory,mod);const weight=equipmentStats(s).weight;
  assert(installAttachment(s,s.inventory.at(-1).uid,id).ok);
  close(equipmentStats(s).weight,weight);assert.equal(s.weaponId,id);assert.equal(s.inventory[0].uid,id);
 }
 assert(validInventory(s.inventory));assert.equal(weaponStats(s.inventory[0]).capacity,type==='pistol'?18:9);
 assert.equal(weaponStats(s.inventory[0]).noise,.2);assert.equal(weaponStats(s.inventory[0]).criticalBonus,.15);
 addInventoryItem(s.inventory,'suppressor');const before=structuredClone(s);
 assert(!installAttachment(s,s.inventory.at(-1).uid,id).ok);assert.deepEqual(s,before);
 s.inventory[0].loaded=weaponStats(s.inventory[0]).capacity;
 const ammo=ITEMS[type].ammo,total=s.inventory[0].loaded,weight=equipmentStats(s).weight;
 assert(removeAttachment(s,id,'magazine').ok);
 assert.equal(s.inventory[0].loaded+inventoryCount(s.inventory,ammo),total);
 assert.equal(s.inventory[0].loaded,ITEMS[type].capacity);close(equipmentStats(s).weight,weight);
 assert(removeAttachment(s,id,'muzzle').ok);assert(removeAttachment(s,id,'rail').ok);
 assert(validInventory(s.inventory));assert.equal(weaponStats(s.inventory[0]).criticalBonus,0);
 assert(!removeAttachment(s,id,'muzzle').ok);
}
// Full bag: rollback even if part of the excess ammo fits before the mod fails.
const full=make();full.inventory[0].attachments={magazine:'extendedmag'};full.inventory[0].loaded=18;
addInventoryItem(full.inventory,'ammo',59);addInventoryItem(full.inventory,'medkit',27);
assert.equal(full.inventory.length,29);assert(validInventory(full.inventory));
let before=structuredClone(full);assert(!removeAttachment(full,full.weaponId,'magazine').ok);assert.deepEqual(full,before);
full.inventory.pop();before=structuredClone(full); // one empty cell: ammo can fit but the mod cannot
assert(!removeAttachment(full,full.weaponId,'magazine').ok);assert.deepEqual(full,before);
full.inventory.pop();assert(removeAttachment(full,full.weaponId,'magazine').ok);
assert.equal(inventoryCount(full.inventory,'ammo'),65);assert.equal(full.inventory[0].loaded,12);assert.equal(inventoryCount(full.inventory,'extendedmag'),1);
// Save validation rejects malformed slots and inflated loaded capacity; old saves work.
const s=make(),weapon=s.inventory[0];assert(validInventory(s.inventory));
for(const attachments of [null,[],{muzzle:'laser'},{magazine:'unknown'},JSON.parse('{"__proto__":"laser"}')]) {
 weapon.attachments=attachments;assert(!validInventory(s.inventory));
}
weapon.attachments={magazine:'extendedmag'};weapon.loaded=18;assert(validInventory(s.inventory));weapon.loaded=19;assert(!validInventory(s.inventory));
weapon.loaded=18;delete weapon.attachments;assert(!validInventory(s.inventory));weapon.loaded=12;assert(validInventory(s.inventory));
// Copies never share installed-mod maps, and repacking preserves them.
const extra={loaded:18,attachments:{magazine:'extendedmag',rail:'laser'}};
const bag=[];addInventoryItem(bag,'pistol',2,extra);delete bag[0].attachments.rail;assert.equal(bag[1].attachments.rail,'laser');assert.equal(extra.attachments.rail,'laser');
assert(sortInventory(bag));assert(validInventory(bag));
const pack={inventory:bag,backpack:'pack_survivor',weaponId:bag[1].uid,weaponSlots:[bag[1].uid]};
assert(swapBackpack(pack,{container:{loot:[{type:'pack_cargo',qty:1}]},index:0}).ok);
assert.equal(pack.inventory.find(i=>i.uid===pack.weaponId).attachments.rail,'laser');
// Recipes use exactly the concept ingredients and give one unattached part.
for(const [out,ingredients] of Object.entries({suppressor:{metal:2,cloth:1},laser:{metal:1,electronics:1},extendedmag:{metal:2,spring:1}})) {
 const items=[];for(const [type,qty] of Object.entries(ingredients))addInventoryItem(items,type,qty);
 assert(craftItem(items,{dna:0},out).ok);assert.equal(items.length,1);assert.equal(items[0].type,out);assert.equal(items[0].qty,1);
 const before=structuredClone(items);assert(!craftItem(items,{dna:0},out).ok);assert.deepEqual(items,before);
}
const drops=new Set();for(let i=0;i<500;i++)for(const item of containerLoot(40,'workshop',String(i),'workshop'))drops.add(item.type);
for(const type of [...Object.keys(ATTACHMENTS),'spring'])assert(drops.has(type));
console.log('PASS: three attachments on both guns, dynamic capacities, mass/ammo conservation, full-bag rollback, old/invalid saves, independent metadata, repacking, exact recipes and loot');
