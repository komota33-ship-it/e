"""Actual Luck purchases, seeded floor/room generation and lossless looting."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.luckTest={ready:artReady,chosen:0,
 state(){return {mode,profile,runEffects,crates,player,searching,floor,scene}},
 funds(){profile.dna=1850},
 clean(){enemies=[];transitionTime=0;clearInput();aim.active=false},
 base(c){return containerLoot(floor,sceneLayout().id,c.id,c.kind,runEffects.lootBonus)},
 bases(){return crates.map(c=>this.base(c))},
 find(room=false){
   for(floor=50;floor>=2;floor--){generateLevel();this.clean();
     if(!room){this.chosen=crates.findIndex(c=>c.loot.length>this.base(c).length);if(this.chosen>=0)return true;}
     else for(const d of doors){enterRoom(d);this.clean();this.chosen=crates.findIndex(c=>c.loot.length>this.base(c).length);if(this.chosen>=0)return true;leaveRoom();this.clean();}
   }return false;
 },
 stand(){const c=crates[this.chosen];player.x=c.x;player.y=GROUND;player.vy=0;camera=cameraTarget()},
 selected(){return crates[this.chosen]},
 safe(){const c=crates[this.chosen];c.trap=null;c.ambush=null},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 bag(full=false){player.backpack='pack_cargo';player.inventory=[];player.weaponId=null;player.weaponSlots=[];player.equipment={};if(full)addInventoryItem(player.inventory,'medkit',48,{},backpackFor(player));syncSupplies()},
 revisit(){const id=scene;leaveRoom();enterRoom(doors.find(d=>d.id===id));this.clean()},
 save(){floor=50;generateLevel();this.clean();saveCheckpoint()},
 drop(){const item=player.inventory[0];const copy=structuredClone(item);dropInventoryItem(item.uid);return {copy,bag:crates.find(c=>c.portable)}},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3012'))
 def call(code):return page.evaluate('luckTest.'+code)
 def state():return call('state()')
 def search():
  call('stand()');page.keyboard.press('e')
  if state()['searching']:call(f"step({state()['searching']['remaining']+.01})")
  assert state()['mode']=='inventory'
 assert all(call('ready'));call('funds()');page.locator('#progress-toggle').click()
 assert page.locator('.perk-card').count()==23
 page.locator('#progress-branch').select_option('ПСИХО');assert page.locator('.perk-card').count()==4
 for _ in range(3):page.locator('[data-perk="luck"]').click()
 assert 'КОЛЛЕКЦИОНЕР АКТИВЕН' not in page.locator('#progress-synergy').inner_text()
 page.locator('#progress-branch').select_option('МАРОДЁР')
 for _ in range(2):page.locator('[data-perk="looter"]').click()
 assert 'КОЛЛЕКЦИОНЕР АКТИВЕН' in page.locator('#progress-synergy').inner_text()
 assert state()['profile']['dna']==0 and state()['runEffects']['rareLootBonus']==0
 page.screenshot(path=str(ROOT/'dist/luck-work.png'))
 page.reload();page.locator('#start').click();call('clean()')
 assert state()['runEffects']['rareLootBonus']==60 and state()['runEffects']['lootBonus']==2
 assert [c['loot'] for c in state()['crates']]==call('bases()') # Fixed roof rewards.
 for room in [False,True]:
  assert call('find('+str(room).lower()+')')
  original=call('selected()')['loot'];call('safe()');call('stand()')
  page.keyboard.press('e');call('step(.2)');page.keyboard.down('d');call('step(.2)');page.keyboard.up('d')
  assert state()['searching'] is None and call('selected()')['loot']==original
  call('bag(true)');search();page.locator('#loot-all').click()
  assert call('selected()')['loot']==original and len(state()['player']['inventory'])==48
  page.keyboard.press('Escape');call('bag()');search();page.locator('#loot-all').click()
  assert call('selected()')['loot']==[]
  for item in original:
   found=[i for i in state()['player']['inventory'] if i['type']==item['type']]
   assert sum(i['qty'] for i in found)==sum(i['qty'] for i in original if i['type']==item['type'])
   if 'durability' in item:assert any(i.get('durability')==item['durability'] for i in found)
  page.keyboard.press('Escape')
  if room:call('revisit()');assert call('selected()')['loot']==[]
  search();assert page.locator('#loot-all').is_disabled();page.keyboard.press('Escape')
 inventory=state()['player']['inventory'];call('save()');page.reload();page.locator('#continue').click();call('clean()')
 assert state()['player']['inventory']==inventory and state()['runEffects']['rareLootBonus']==60
 dropped=call('drop()');assert len(dropped['bag']['loot'])==1
 assert dropped['bag']['loot'][0]['type']==dropped['copy']['type'] and dropped['bag']['loot'][0]['qty']==dropped['copy']['qty']
 assert not errors,errors
 print('PASS: Luck purchases/reload, Collector threshold/snapshot, unchanged roof, bonus floor/room finds, cancelled search, full bag, gear metadata, empty revisit, checkpoint and dropped bag')
 b.close()
