"""Actual UI and combat integration for infection, crafting and sound-triggered waves."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.hazardTest={ready:artReady,
 state(){return {mode,player,profile,runDna,runEffects,crafting,searching,floorNoise,enemies,checkpoint,crates}},
 step(seconds){for(let t=0;t<seconds-1e-8;t+=.01)update(Math.min(.01,seconds-t));render()},
 clean(n=50){floor=n;generateLevel();enemies=[];transitionTime=0;mode='playing';clearInput();player.infection=0;refreshInfection();player.hp=player.maxHp;player.x=500;camera=cameraTarget();aim.active=false;},
 infection(n){player.infection=n;refreshInfection();updateHud();render()},
 hit(kind){hurtTime=0;hurt(5,kind);updateHud()},
 add(type,n=1){addInventoryItem(player.inventory,type,n);syncSupplies()},
 bench(){const c=crates.find(c=>c.type==='desk'||c.kind==='workshop');player.x=c.x;camera=cameraTarget();render();return c.id},
 supplies(){player.inventory=[];player.weaponId=null;addInventoryItem(player.inventory,'cloth',8);addInventoryItem(player.inventory,'chemical',5);addInventoryItem(player.inventory,'powder',5);addInventoryItem(player.inventory,'metal',5);profile.dna=150;syncSupplies()},
 money(n){profile.dna=n},
 save(){saveCheckpoint()},
 perks(){profile.perks.immunity=3;profile.perks.silent=3;profile.perks.engineer=3;runEffects=perkEffects(profile)},
 sound(n){emitNoise(n)},
 shot(){shotTime=0;fire()},
 wave(){spawnNoiseWave()},
 kills(){damageEnemy(makeEnemy('walker',850),9999)},
 search(){const c=crates.find(c=>containerProfile(c).noise>0);player.x=c.x;interact();return {noise:containerProfile(c).noise,duration:searching.duration}},
 pause(){pause()},
 room(){player.x=doors[0].x;enterRoom(doors[0]);transitionTime=0},
 away(){player.x=exitObject().x<WORLD/2?WORLD-60:60;camera=cameraTarget()},
 clear(){enemies=[];corpses=[];projectiles=[];stains=[];hurtTime=0;},
 restart(){startGame()},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE);assert all(page.evaluate('hazardTest.ready'))
 page.locator('#start').click()
 def call(code):return page.evaluate('hazardTest.'+code)
 def state():return call('state()')
 def step(n):page.evaluate('hazardTest.step',n)
 def qty(t):return sum(i['qty'] for i in state()['player']['inventory'] if i['type']==t)
 def use(t):
  item=next(i for i in state()['player']['inventory'] if i['type']==t)
  page.keyboard.press('i');page.locator(f'[data-uid="{item["uid"]}"]').click();page.locator('#item-use').click();page.keyboard.press('Escape')
 call('clean()');call("hit('impact')");assert state()['player']['infection']==0
 call("hit('bite')");assert state()['player']['infection']==10
 page.keyboard.press('q');call("hit('bite')");assert state()['player']['infection']==10
 step(.4);call('infection(60)');assert state()['player']['maxHp']==70 and state()['player']['hp']<=70
 use('medkit');assert state()['player']['infection']==40 and state()['player']['maxHp']==90 and state()['player']['hp']==90
 call("add('antidote')");use('antidote');assert state()['player']['infection']==0 and state()['player']['maxHp']==100 and state()['player']['hp']==90
 call("add('antidote')");use('antidote');assert qty('antidote')==1
 call('infection(65)');call('save()');page.reload();page.locator('#continue').click();assert state()['player']['infection']==65 and state()['player']['maxHp']==70
 call('clear()');before=state()['player']['infection'];page.keyboard.press('i');step(10);assert state()['player']['infection']==before;page.keyboard.press('Escape')
 call('clean()');call('supplies()');call('bench()');page.keyboard.press('i');page.locator('.craft-panel summary').click();assert page.locator('[data-recipe="antidote"]').is_enabled()
 page.screenshot(path=str(ROOT/'dist/crafting-v0.9.png'))
 page.locator('[data-recipe="antidote"]').click();assert state()['mode']=='playing' and state()['crafting'];assert qty('chemical')==5 and state()['profile']['dna']==150
 step(1);page.keyboard.down('d');step(.1);page.keyboard.up('d');assert state()['crafting'] is None and qty('chemical')==5 and state()['profile']['dna']==150
 call('bench()');page.keyboard.press('i');page.locator('[data-recipe="antidote"]').click();step(.5);call("hit('impact')");assert state()['crafting'] is None and qty('chemical')==5
 call('bench()');page.keyboard.press('i');page.locator('[data-recipe="antidote"]').click();step(3.1);assert qty('antidote')==1 and qty('chemical')==3 and state()['profile']['dna']==100
 # Insufficient currency disables the transaction, and an empty workbench cannot manufacture supplies.
 call('money(49)');page.keyboard.press('i');assert page.locator('[data-recipe="antidote"]').is_disabled();page.keyboard.press('Escape')
 call('perks()');call('infection(0)');call("hit('bite')");assert abs(state()['player']['infection']-4)<.001
 call('bench()');page.keyboard.press('i');page.locator('[data-recipe="medkit"]').click();assert abs(state()['crafting']['duration']-1.2)<.001;step(1.21);assert qty('medkit')==1
 # Quiet search emits the reduced TOTAL noise over the shortened/normal search interval.
 call('clean()');info=call('search()');step(info['duration']+.01);assert state()['mode']=='inventory';assert abs(sum(e['amount'] for e in state()['floorNoise']['events'])-info['noise']*.1*.9)<.01
 page.keyboard.press('Escape');call('clean()');call('restart()');call('clean()')
 # Survivor backpack reduces noise: six shots = 108, above the office threshold 90.
 for _ in range(6):call('shot()');step(.24)
 assert state()['floorNoise']['pending']>0 and len(state()['enemies'])==0
 page.screenshot(path=str(ROOT/'dist/noise-v0.9.png'))
 page.keyboard.press('i');pending=state()['floorNoise']['pending'];step(6);assert state()['floorNoise']['pending']==pending;page.keyboard.press('Escape')
 call('room()');call('clear()');step(pending+.05);assert not state()['enemies'] and state()['floorNoise']['pending']>0
 call('away()');step(1.1);assert len(state()['enemies'])==2 and state()['floorNoise']['cooldown']>0, {k:state()[k] for k in ['enemies','floorNoise','player']}
 call('clear()');call('sound(500)');step(.1);assert state()['floorNoise']['pending']==0
 call('clean(40)');call('wave()');assert len(state()['enemies'])==4 and abs(state()['enemies'][0]['hp']-32.5)<.001
 # Infection death awards +50% of this attempt once, survives reload, and a new run is clean.
 call('clean()');call('kills()');call('kills()');dna=state()['profile']['dna'];deaths=state()['profile']['deaths'];call('infection(99.99)');step(.3)
 assert state()['mode']=='dead' and state()['profile']['dna']==dna+5 and state()['profile']['deaths']==deaths+1
 step(2);assert state()['profile']['dna']==dna+5
 page.reload();assert state()['profile']['dna']==dna+5;page.locator('#start').click();assert state()['player']['infection']==0
 assert not errors,errors
 print('PASS: bites/dodge/medkit/antidote, infection checkpoint and death bonus, paused clocks, crafting UI/time/cancellation/costs, three perks, real shooting warning/wave/cooldown across rooms')
 b.close()
