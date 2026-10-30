"""Equipment UI, damage, repair cancellation, mass penalties and save migration."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.gearTest={ready:artReady,
 setup(){startGame();floor=50;generateLevel();enemies=[];transitionTime=0;player.x=500;camera=cameraTarget();
 for(const type of ['heavyhelmet','heavyarmor','tacticalgloves','boots','metal','cloth'])addInventoryItem(player.inventory,type,type==='metal'||type==='cloth'?3:1);syncSupplies();updateHud();render()},
 state(){return {mode,player,stats:equipmentStats(player),crafting,reloadTime,checkpoint,floorNoise,shake}},
 step(seconds){for(let t=0;t<seconds-1e-8;t+=.01)update(Math.min(.01,seconds-t));render()},
 bench(){player.x=crates.find(c=>c.type==='desk'||c.kind==='workshop').x;camera=cameraTarget();render()},
 hit(reset=true){if(reset)hurtTime=0;hurt(10);render()},
 condition(type,value){player.inventory.find(i=>i.type===type).durability=value},
 bag(){openInventory(crates.find(c=>c.portable))},save(){saveCheckpoint()},
 limit(n){player.carryCapacity=n},
 overload(){startGame();floor=50;generateLevel();enemies=[];transitionTime=0;player.x=500;player.carryCapacity=10;addInventoryItem(player.inventory,'heavyarmor');equippedWeapon().loaded=6;syncSupplies();updateHud()},
 legacy(){startGame();floor=50;generateLevel();addInventoryItem(player.inventory,'armor');const item=player.inventory.find(i=>i.type==='armor');useInventoryItem(item.uid);saveCheckpoint();const data=JSON.parse(localStorage.getItem(SAVE_KEY));delete data.equipment;delete data.inventory.find(i=>i.type==='armor').durability;localStorage.setItem(SAVE_KEY,JSON.stringify(data))}
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3004'));assert all(page.evaluate('gearTest.ready'))
 def call(code):return page.evaluate('gearTest.'+code)
 def state():return call('state()')
 def item(t):return next(i for i in state()['player']['inventory'] if i['type']==t)
 def select(t):page.locator(f'#inventory-grid [data-uid="{item(t)["uid"]}"]').click()
 def close(a,b):assert abs(a-b)<1e-6,(a,b)
 call('setup()');call('bench()');page.keyboard.press('i')
 assert page.locator('.equipment-slot').count()==4
 for t in ['heavyhelmet','heavyarmor','tacticalgloves','boots']:
  select(t);page.locator('#item-use').click()
 assert all(state()['player']['equipment'].values());close(state()['stats']['defense'],.9)
 assert 'ПЕРЕГРУЗ' in page.locator('#inventory-load').inner_text()
 select('heavyarmor');page.screenshot(path=str(ROOT/'dist/equipment-work.png'))
 page.locator('.equipment-slot[data-slot="torso"]').click();assert state()['player']['equipment']['torso'] is None
 close(state()['stats']['defense'],.8);select('heavyarmor');page.locator('#item-use').click()
 page.keyboard.press('Escape');call("condition('heavyarmor',1)");call('hit()');close(state()['player']['hp'],99)
 assert item('heavyarmor')['durability']==0;close(state()['stats']['defense'],.8)
 durability=[i.get('durability') for i in state()['player']['inventory']];call('hit(false)');assert durability==[i.get('durability') for i in state()['player']['inventory']]
 call('hit()');close(state()['player']['hp'],97)
 call('bench()');page.keyboard.press('i');select('heavyarmor');page.locator('#item-repair').click()
 assert state()['mode']=='playing' and state()['crafting']['targetUid']==item('heavyarmor')['uid']
 assert item('metal')['qty']==3 and item('cloth')['qty']==3
 call('step(1)');page.keyboard.down('d');call('step(.1)');page.keyboard.up('d');assert state()['crafting'] is None
 assert item('metal')['qty']==3 and item('heavyarmor')['durability']==0
 call('bench()');page.keyboard.press('i');select('heavyarmor');page.locator('#item-repair').click();call('step(3.1)')
 assert item('heavyarmor')['durability']==100 and item('metal')['qty']==2 and item('cloth')['qty']==2
 assert state()['player']['equipment']['torso']==item('heavyarmor')['uid']
 # A fully repaired item cannot consume more resources.
 page.keyboard.press('i');select('heavyarmor');assert page.locator('#item-repair').is_disabled()
 # Craft menu is scrollable and all twelve output recipes are present.
 page.locator('.craft-panel summary').click();assert page.locator('.craft-recipe').count()==15
 page.screenshot(path=str(ROOT/'dist/armor-crafting-work.png'))
 page.keyboard.press('Escape');call("condition('heavyarmor',42)");page.keyboard.press('i');select('heavyarmor');page.locator('#item-drop').click()
 assert state()['player']['equipment']['torso'] is None
 page.keyboard.press('Escape');call('bag()');page.locator('#loot-all').click();assert item('heavyarmor')['durability']==42
 select('heavyarmor');page.locator('#item-use').click();page.keyboard.press('Escape');call('save()')
 page.reload();page.locator('#continue').click();assert item('heavyarmor')['durability']==42
 assert all(state()['player']['equipment'].values());assert state()['stats']['overloaded']
 # Real movement and action costs while overloaded; carried armor is unequipped.
 call('overload()');x=state()['player']['x'];page.keyboard.down('d');call('step(.5)');page.keyboard.up('d');close(state()['player']['x']-x,145*.85*.5)
 x=state()['player']['x'];page.keyboard.down('Shift');page.keyboard.down('d');call('step(1)');page.keyboard.up('d');page.keyboard.up('Shift')
 close(state()['player']['x']-x,145*.85*1.5);close(state()['player']['stamina'],87.5)
 page.keyboard.press('r');close(state()['reloadTime'],1.2/.9)
 page.keyboard.press('v');close(state()['player']['stamina'],68.75)
 page.keyboard.press('q');close(state()['player']['stamina'],37.5)
 # Removing mass clears overload immediately; no stale speed or stamina penalties.
 call('step(.4)');page.keyboard.press('i');select('heavyarmor');page.locator('#item-drop').click();assert not state()['stats']['overloaded'];close(state()['stats']['speed'],1)
 page.keyboard.press('Escape')
 call('legacy()');page.reload();page.locator('#continue').click()
 assert state()['player']['equipment']['torso']==item('armor')['uid'];close(state()['stats']['defense'],.25)
 assert not errors,errors
 b.close();print('PASS: four-slot UI, armor cap/breakage/invulnerability, targeted repair and cancellation, 15 recipes, drop/recover durability, checkpoint and legacy migration, overload walk/sprint/reload/knife/dodge')
