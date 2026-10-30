"""Container ambushes: actual search, safe reaction time, persistent room state."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.ambushTest={ready:artReady,
 state(){return {mode,player,crates,enemies,searching,profile,toast:$("toast").textContent}},
 clean(){enemies=[];transitionTime=0;clearInput();aim.active=false},
 start(){startGame();floor=49;generateLevel();this.clean()},
 stand(){player.x=crates[0].x;player.y=GROUND;player.vy=0;camera=cameraTarget()},
 box(type=null){for(const c of crates){c.trap=null;c.ambush=null}const c=crates[0];c.opened=false;c.ambush={status:'hidden'};c.trap=type?{type,status:'hidden',remaining:0,gasRemaining:0,gasClock:0}:null;this.stand();return c.loot},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 room(){enterRoom(doors[0]);transitionTime=0},back(){leaveRoom();transitionTime=0},
 full(){enemies=Array.from({length:40},()=>{const e=makeEnemy('walker',WORLD-100);e.speed=0;e.cooldown=999;return e})},
 free(){enemies.pop()},kill(){for(const e of enemies)damageEnemy(e,99999)},
 sapper(){runEffects.trapFactor=0},
 preview(){return containerPreview(crates[0],3)},
 drop(){dropInventoryItem(player.inventory[0].uid);return crates.find(c=>c.portable)},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3012'))
 def call(code):return page.evaluate('ambushTest.'+code)
 def state():return call('state()')
 def search():
  page.keyboard.press('e');duration=state()['searching']['remaining'];call(f'step({duration+.01})')
 assert all(call('ready'));page.locator('#start').click()
 assert all(c.get('ambush') is None for c in state()['crates'])
 call('start()');loot=call('box()');preview=call('preview()')
 page.keyboard.press('e');call('step(.2)');page.keyboard.down('d');call('step(.2)');page.keyboard.up('d')
 assert state()['searching'] is None and state()['crates'][0]['ambush']['status']=='hidden' and not state()['enemies']
 assert call('preview()')==preview and state()['crates'][0]['loot']==loot
 call('stand()');search()
 assert state()['mode']=='playing' and len(state()['enemies'])==1 and state()['player']['hp']==100
 assert state()['crates'][0]['ambush']['status']=='spent' and state()['crates'][0]['loot']==loot
 assert 'ЗАСАДА' in state()['toast'] and state()['enemies'][0]['emergeTime']>0
 page.screenshot(path=str(ROOT/'dist/ambush-work.png'))
 # Pausing stops the emergence/attack timer. Reopening never duplicates the enemy.
 page.keyboard.press('i');enemy=state()['enemies'];call('step(3)');assert state()['enemies']==enemy
 page.keyboard.press('Escape');call('step(.9)');assert state()['player']['hp']==100
 call('step(2)');assert state()['player']['hp']<100
 call('kill()');kills=state()['profile']['kills'];dna=state()['profile']['dna']
 call('stand()');page.keyboard.press('e');assert state()['mode']=='inventory'
 page.keyboard.press('Escape');call('step(.1)');page.keyboard.press('e');page.keyboard.press('Escape')
 assert state()['profile']['kills']==kills and state()['profile']['dna']==dna
 assert all(e['life']<=0 for e in state()['enemies'])
 # The same live ambusher, loot and spent flag survive leaving/re-entering a room.
 call('start()');call('room()');call('clean()');loot=call('box()');search();enemy=state()['enemies']
 call('back()');call('step(.4)');call('room()')
 assert state()['enemies']==enemy and state()['crates'][0]['loot']==loot
 assert state()['crates'][0]['ambush']['status']=='spent'
 # Trap warning has priority; defusal pauses the newly spawned enemy with the loot UI.
 call('start()');call("box('mine')");search()
 assert state()['crates'][0]['trap']['status']=='warning' and len(state()['enemies'])==1
 assert 'ОБЕЗВРЕДИТЬ' in page.locator('#prompt').inner_text()
 page.keyboard.press('e');assert state()['mode']=='inventory' and state()['crates'][0]['trap']['status']=='disarmed'
 assert len(state()['enemies'])==1
 page.keyboard.press('Escape')
 # Sapper disarms the device, not the hidden zombie.
 call('start()');call('sapper()');call("box('mine')");search()
 assert state()['mode']=='playing' and state()['crates'][0]['trap']['status']=='disarmed' and len(state()['enemies'])==1
 # At the enemy cap the ambush waits, then releases exactly once when a slot opens.
 call('start()');call('box()');call('full()');search()
 assert len(state()['enemies'])==40 and state()['crates'][0]['ambush']['status']=='pending'
 call('free()');call('step(.01)')
 assert len(state()['enemies'])==40 and state()['crates'][0]['ambush']['status']=='spent'
 call('step(.1)');assert len(state()['enemies'])==40
 assert call('drop()').get('ambush') is None
 assert not errors,errors
 print('PASS: search/cancellation, unchanged loot/preview, one ambusher and reward, reaction delay, paused timers, room persistence, trap priority, Sapper and enemy cap')
 b.close()
