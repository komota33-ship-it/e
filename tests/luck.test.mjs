import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {containerLoot, ITEMS} from '../inventory.js';
import {normalizeProgress, perkEffects, buyPerk, synergyActive} from '../progression.js';

const oldSamples=[];
for(const floor of [51,50,40,30,20,10,0])
  for(const kind of ['crate','medical','workshop'])
    for(let i=0;i<100;i++)oldSamples.push(containerLoot(floor,'test',`c${i}`,kind,3));
assert.equal(createHash('sha256').update(JSON.stringify(oldSamples)).digest('hex'),
  '5b7885767f18c6c70040737c70857d699cf22f7d07274c42b660099fb1803615',
  'Zero Luck must retain existing seeded loot byte-for-byte');
const p=normalizeProgress({version:1,dna:1850});
assert.equal(p.perks.luck,0);
const originalEffects=perkEffects(p);
for(let rank=1;rank<=3;rank++){
  assert(buyPerk(p,'luck'));
  assert.equal(perkEffects(p).rareLootBonus,rank*10);
  assert(!synergyActive(p,'collector'));
}
assert(!buyPerk(p,'luck'));
assert(buyPerk(p,'looter'));assert(!synergyActive(p,'collector'));
assert(buyPerk(p,'looter'));assert(synergyActive(p,'collector'));
assert.equal(perkEffects(p).rareLootBonus,60);
assert.equal(perkEffects(p).lootBonus,2);
assert.equal(p.dna,0);assert.equal(originalEffects.rareLootBonus,0);
for(let luck=0;luck<=3;luck++)for(let looter=0;looter<=3;looter++){
  const q=normalizeProgress({version:1,perks:{luck,looter}});
  assert.equal(synergyActive(q,'collector'),luck===3&&looter>=2);
}
for(const value of [-1,4,'3',null,Infinity])
  assert.equal(perkEffects(normalizeProgress({version:1,perks:{luck:value}})).rareLootBonus,0);

const groups=[['weapon','armor'],['backpack'],['attachment']];
const present=(loot,group)=>loot.some(i=>group.includes(ITEMS[i.type].group));
for(const floor of [50,40,20,0])for(const kind of ['crate','workshop']){
  const counts=Object.fromEntries([0,10,20,30,60].map(b=>[b,[0,0,0]]));
  const total=6000;
  for(let i=0;i<total;i++){
    const args=[floor,'luck-test',`c${i}`,kind,2];
    const base=containerLoot(...args);
    let previous=base;
    for(const boost of [0,10,20,30,60]){
      const loot=containerLoot(...args,boost);
      assert.deepEqual(loot.slice(0,base.length),base);
      for(const item of previous)assert(loot.some(other=>JSON.stringify(other)===JSON.stringify(item)));
      assert(loot.length<=base.length+3);
      groups.forEach((group,n)=>{counts[boost][n]+=+present(loot,group)});
      for(const item of loot.slice(base.length)){
        assert.equal(item.qty,1);
        if(ITEMS[item.type].group==='armor')assert(item.durability>=65&&item.durability<=100);
        if(item.type==='shotgun')assert.equal(item.loaded,0);
      }
      previous=loot;
    }
    if(i<20)assert.deepEqual(previous,containerLoot(...args,60));
  }
  const chances=[.24,.12,kind==='workshop'?.27:floor<=40?.12:0];
  for(const boost of [0,10,20,30,60])chances.forEach((chance,n)=>{
    const actual=counts[boost][n]/total,expected=chance*(1+boost/100);
    assert(Math.abs(actual-expected)<.025,`${floor}/${kind}, bonus ${boost}, category ${n}: ${actual}, expected ${expected}`);
  });
}
for(const floor of [51,50,40,20,0])for(const kind of ['crate','medical','workshop']){
  const args=[floor,'room','container',kind,6],base=containerLoot(...args);
  for(const bad of [-1,NaN,Infinity,'30',1.5])assert.deepEqual(containerLoot(...args,bad),base);
  assert.deepEqual(containerLoot(...args,999),containerLoot(...args,60));
  if(floor===51||kind==='medical')assert.deepEqual(containerLoot(...args,60),base);
}
console.log('PASS: Luck purchases/migration, Collector threshold, unchanged baseline, monotonic seeded finds, relative drop rates, valid gear and safe roof/medical loot');
