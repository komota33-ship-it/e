import assert from 'node:assert/strict';
import {normalizeProgress,readProgress,writeProgress,awardKill,buyPerk,perkEffects,recordDepth,searchDuration,PROGRESS_KEY,DNA_REWARDS} from '../progression.js';
import {freshSurvival,startDodge,stepSurvival,spendStamina} from '../survival.js';
const p=normalizeProgress(null),store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
assert.equal(awardKill(p,'walker'),5);assert.equal(awardKill(p,'boss'),250);assert.equal(p.dna,255);assert.equal(p.kills,2);
assert(buyPerk(p,'health'));assert.equal(p.dna,105);assert.equal(perkEffects(p).maxHp,120);
assert(!buyPerk(p,'health'));assert(buyPerk(p,'damage'));assert.equal(p.dna,5);assert.equal(perkEffects(p).gunDamage,1.1);
const before=structuredClone(p);assert(!buyPerk(p,'unknown'));assert.deepEqual(p,before);
p.dna=5000;for(let i=0;i<3;i++)assert(buyPerk(p,'search'));assert(!buyPerk(p,'search'));assert(Math.abs(searchDuration({type:'crate'},perkEffects(p).searchTime)-.8)<1e-8);
assert.equal(searchDuration({label:'СЕЙФ'}),5);assert.equal(searchDuration({type:'desk'}),1.5);assert.equal(searchDuration({kind:'medical'}),2);
recordDepth(p,50);recordDepth(p,25);recordDepth(p,40);assert.equal(p.bestDepth,26);recordDepth(p,0);assert.equal(p.bestDepth,50);
p.deaths=3;assert(writeProgress(storage,p));assert.deepEqual(readProgress(storage),p);
store.set(PROGRESS_KEY,'{broken');assert.deepEqual(readProgress(storage),normalizeProgress(null));
const bad=normalizeProgress({version:1,dna:-9,kills:NaN,perks:{health:999,search:'2',damage:2}});assert.equal(bad.dna,0);assert.equal(bad.perks.health,0);assert.equal(bad.perks.search,0);assert.equal(bad.perks.damage,2);
assert(!writeProgress({setItem(){throw Error('quota')}},p));
let state=freshSurvival();assert(startDodge(state,-1));assert.equal(state.stamina,75);assert(!startDodge(state,1));
let moved=0;for(let i=0;i<30;i++)moved+=stepSurvival(state,.01).dashDistance;assert(Math.abs(moved+96)<1e-8);assert(state.dodgeCooldown>1.19);assert.equal(state.stamina,75);
state=freshSurvival();for(let i=0;i<100;i++)stepSurvival(state,.1,{sprint:true});assert(state.stamina<.001);assert(state.exhausted);
assert(!stepSurvival(state,.1,{sprint:true}).running);assert(state.stamina>0);
state=freshSurvival();state.stamina=40;stepSurvival(state,1,{combat:false});assert.equal(state.stamina,55);stepSurvival(state,1,{combat:true});assert.equal(state.stamina,60);
state.stamina=24;assert(!startDodge(state,1));assert.equal(state.stamina,24);assert(spendStamina(state,15));assert.equal(state.stamina,9);assert(!spendStamina(state,15));
console.log('PASS: DNA prices/rewards, persistent perks, invalid saves, search timing, depth, stamina, exact dash distance and cooldown');

// Percent rewards use integer hundredths and survive profile persistence.
for (const rank of [0, 1, 2, 3]) {
  let profile = normalizeProgress(null);
  profile.perks.morale = rank;
  const effects = perkEffects(profile);
  let totalBase = 0;
  for (let round = 0; round < 20; round++) {
    for (const [type, base] of Object.entries(DNA_REWARDS)) {
      totalBase += base;
      awardKill(profile, type, effects.dnaBonus);
      const exact = totalBase * (100 + rank * 10);
      assert.equal(profile.dna, Math.floor(exact / 100));
      assert.equal(profile.earned, profile.dna);
      assert.equal(profile.dnaRemainder, exact % 100);
      writeProgress(storage, profile);
      profile = readProgress(storage);
    }
  }
}
const morale = normalizeProgress(null);
morale.dna = 1050;
const oldEffects = perkEffects(morale);
for (let rank = 1; rank <= 3; rank++) {
  assert(buyPerk(morale, 'morale'));
  assert.equal(perkEffects(morale).dnaBonus, rank * 10);
}
assert.equal(morale.dna, 0);
assert(!buyPerk(morale, 'morale'));
assert.equal(awardKill(morale, 'walker', oldEffects.dnaBonus), 5);
assert.equal(awardKill(morale, 'walker', 30), 6);
assert.equal(morale.dnaRemainder, 50);
const beforeUnknown = structuredClone(morale);
assert.equal(awardKill(morale, 'unknown', 30), 0);
assert.deepEqual(morale, beforeUnknown);
assert.equal(awardKill(morale, 'walker', 30), 7);
assert.equal(morale.dnaRemainder, 0);
for (const value of [-1, 100, .5, '50', null, Infinity])
  assert.equal(normalizeProgress({version:1,dnaRemainder:value}).dnaRemainder, 0);
assert.equal(normalizeProgress({version:1,dnaRemainder:99}).dnaRemainder, 99);
assert.equal(perkEffects(normalizeProgress({version:1,perks:{health:2}})).dnaBonus, 0);
console.log('PASS: Morale ranks/prices, every enemy reward, exact fractional carry across saves, snapshot, unknown kills and legacy/invalid remainder');
