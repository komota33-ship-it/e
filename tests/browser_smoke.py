"""End-to-end v0.6: roof, spatial loot UI, equipment, combat and every floor/room."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.testGame={ready:artReady,
 step(seconds){for(let t=0;t<seconds;t+=.02)update(.02);render()},
 state(){return {floor,mode,scene,WORLD,camera,viewW,player,checkpoint,crates,doors,enemies,projectiles,stains,particles:particles.map(p=>({acidSplash:p.acidSplash})),layout:sceneLayout(),lift:scene==='corridor'?liftObject():null,exit:scene==='corridor'?null:exitObject(),searching,art:Object.keys(art)}},
 player(v){Object.assign(player,v);syncSupplies()},floor(n){floor=n;generateLevel();transitionTime=0;aim.active=false;mode='playing';inventoryUI.close()},
 enemies(list){enemies=list.map(e=>Object.assign(makeEnemy(e.type,e.x),e))},
 fill(){player.inventory=[];player.weaponId=null;for(let i=0;i<30;i++)addInventoryItem(player.inventory,'medkit');syncSupplies()},
 restore(){player.inventory=starterInventory();player.weaponId=player.inventory.find(i=>i.type==='pistol').uid;syncSupplies()},
 damageEnemy,addInventoryItem,saveCheckpoint,
 spit(){const e=makeEnemy('spitter',player.x+180);e.dir=-1;launchAcid(e);render()},
 lethal(){hurtTime=0;hurt(1000)},resetInput(){clearInput()}
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE);assert all(page.evaluate('testGame.ready'))
 page.locator('#start').click()
 def state():return page.evaluate('testGame.state()')
 def step(n):page.evaluate('testGame.step',n)
 def player(v):page.evaluate('testGame.player',v)
 def empty():page.evaluate('testGame.enemies([])')
 def setup(n):page.evaluate('testGame.floor',n);empty();step(.02)
 def close():page.keyboard.press('Escape');assert state()['mode']=='playing'
 def action(x):
  player({'x':x,'y':423});page.keyboard.press('e');searched=bool(state()['searching'])
  if searched:
   step(.02)
   assert page.locator('#search-progress').is_visible()
   assert int(page.locator('#search-progress').get_attribute('aria-valuenow'))>=0
  step((state()['searching']['remaining']+.1) if state()['searching'] else .65)
  warning=next((c for c in state()['crates'] if (c.get('trap') or {}).get('status')=='warning' and abs(c['x']-state()['player']['x'])<c['range']),None)
  if warning and state()['mode']=='playing':
   page.keyboard.press('e')
   assert next(c for c in state()['crates'] if c['id']==warning['id'])['trap']['status']=='disarmed'
  ambush=next((c for c in state()['crates'] if c['opened'] and (c.get('ambush') or {}).get('status')=='spent' and abs(c['x']-state()['player']['x'])<c['range']),None)
  if searched and ambush and state()['mode']=='playing':page.keyboard.press('e')

 def get_item(kind):return next(i for i in state()['player']['inventory'] if i['type']==kind)
 assert state()['floor']==51 and state()['layout']['zone']=='roof' and len(state()['art'])==79
 empty();step(.02);x=state()['player']['x'];page.keyboard.down('d');step(.5);page.keyboard.up('d');assert 71<state()['player']['x']-x<74
 for key in ['Space','w','ArrowUp']:
  page.keyboard.press(key);step(.2);assert state()['player']['y']==423
 action(next(c['x'] for c in state()['crates'] if c['id']=='roof-supply'));assert state()['mode']=='inventory';assert state()['player']['reserve']==36
 frozen=state()['player']['x'];step(1);assert state()['player']['x']==frozen
 page.locator('#loot-all').click();assert state()['player']['reserve']==60;close()
 action(next(c['x'] for c in state()['crates'] if c['id']=='roof-supply'));assert not next(c for c in state()['crates'] if c['id']=='roof-supply')['loot'];close()
 action(next(c['x'] for c in state()['crates'] if c['id']=='roof-tools'));page.locator('#loot-all').click();assert get_item('shotgun')['loaded']==3
 shotgun=get_item('shotgun');page.locator(f'[data-uid="{shotgun["uid"]}"]').click();page.locator('#item-use').click();assert state()['player']['weaponId']==shotgun['uid'];close()
 page.keyboard.press('r');step(2);assert state()['player']['ammo']==6 and state()['player']['reserve']==5
 page.keyboard.press('i');shotgun=get_item('shotgun');page.locator(f'[data-uid="{shotgun["uid"]}"]').click()
 # Click an empty bottom-row cell, then rotate in a free vertical space.
 page.locator('.inventory-cell[aria-label="Ячейка 4, 3"]').click();page.keyboard.press('r');assert get_item('shotgun')['rotated'];assert get_item('shotgun')['x']==3
 # A real drag/drop moves a rotated three-cell weapon to an empty column.
 page.locator(f'[data-uid="{shotgun["uid"]}"]').drag_to(page.locator('.inventory-cell[aria-label="Ячейка 6, 3"]'));assert get_item('shotgun')['x']==5
 # Drop and recover an item without losing its loaded ammunition.
 pistol=get_item('pistol');page.locator(f'[data-uid="{pistol["uid"]}"]').click();page.locator('#item-drop').click();assert not any(i['type']=='pistol' for i in state()['player']['inventory']);close()
 bag=next(c for c in state()['crates'] if c.get('portable'));action(bag['x']);page.locator('#loot-all').click();assert get_item('pistol');close()
 # No loot is lost when the bag is full.
 page.evaluate('testGame.fill()');medical=next(c for c in state()['crates'] if c['id']=='roof-medical');action(medical['x']);before=next(c for c in state()['crates'] if c['id']=='roof-medical')['loot'];page.locator('#loot-all').click();assert next(c for c in state()['crates'] if c['id']=='roof-medical')['loot']==before;close();page.evaluate('testGame.restore()')
 page.screenshot(path='/tmp/elevator-checks/v6-roof-play.png')
 # Roof exits directly; no key item or room visit is required.
 action(state()['lift']['x']);assert state()['floor']==50 and state()['checkpoint']['floor']==50
 step(.8);empty();first=state()['crates'][0];player({'x':first['x']});page.keyboard.press('e');step(.2);assert state()['searching'];page.keyboard.down('d');step(.1);page.keyboard.up('d');assert not state()['searching'] and not state()['crates'][0]['opened']
 page.keyboard.press('i');page.locator('#inventory-sort').click();page.screenshot(path='/tmp/elevator-checks/v6-inventory-play.png');close()
 print('PASS: playable roof, horizontal-only movement, loot selection, stacking, full inventory, equipment/reload, rotation, dropping/recovery, search cancellation, unlocked descent',flush=True)
 # Actual mouse aim and equipment damage.
 setup(50);player({'x':140,'hp':100});page.evaluate("testGame.enemies([{type:'walker',x:400}])")
 def aim(x,y):
  box=page.locator('#game').bounding_box();s=state();page.mouse.move(box['x']+(x-s['camera'])/s['viewW']*box['width'],box['y']+y/540*box['height'])
 aim(400,310);page.mouse.down();step(.03);page.mouse.up();step(.25);assert not state()['enemies']
 page.evaluate('testGame.spit()');assert state()['projectiles'][0]['damage']==12;step(.1);page.screenshot(path='/tmp/elevator-checks/v6-acid.png');step(1.5);assert state()['stains'] and state()['player']['hp']<100
 page.evaluate('testGame.saveCheckpoint()');saved=state()['checkpoint'];page.reload();page.evaluate('testGame.ready');page.locator('#continue').click();assert state()['player']['inventory']==saved['inventory'] and state()['floor']==50
 page.evaluate('testGame.lethal()');step(.5);assert state()['mode']=='dead';page.locator('#continue').click();assert 'deathAge' not in state()['player']
 print('PASS: mouse headshot, acid flight/impact/puddle, inventory checkpoint restore, player death/restart',flush=True)
 # Every route is traversable and room state survives returning from either side.
 visited=[];rooms=0;signatures=set()
 for n in [51,*range(50,1,-1),0]:
  setup(n);s=state();signatures.add(s['layout']['signature']);visited.append(n)
  for door in s['doors']:
   action(door['x']);assert state()['scene']==door['id'];empty();room=state();assert 0<room['player']['x']<room['WORLD'];crate=room['crates'][0];action(crate['x']);assert state()['mode']=='inventory';remaining=state()['crates'][0]['loot'];close();action(state()['exit']['x']);assert state()['scene']=='corridor';action(door['x']);assert state()['crates'][0]['opened'] and state()['crates'][0]['loot']==remaining;action(state()['exit']['x']);rooms+=1
  empty();action(state()['lift']['x'])
  if n==0:
   assert state()['mode']=='endingChoice'
   page.locator('[data-ending="evacuation"]').click()
   assert state()['mode']=='won'
  else:
   assert state()['floor']==(0 if n==2 else n-1)
  if n%10==0:print('Checked floor',n,flush=True)
 assert len(visited)==51 and len(signatures)==51 and rooms==173
 assert not errors,errors
 print(f'PASS: all {len(visited)} levels, {rooms} room entrances/revisits, mirrored entrances, unique floor layouts and unrestricted lifts')
 b.close()
