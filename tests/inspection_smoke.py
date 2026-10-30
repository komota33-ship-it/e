"""Purchased inspection, no free loot, trap priority, range and room persistence."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.inspectTest={ready:artReady,
 state(){return {mode,player,profile,runEffects,crates,searching}},funds(){profile.dna=700},
 clean(){enemies=[];transitionTime=0;clearInput();aim.active=false},
 stand(){player.x=crates[0].x;player.y=GROUND;camera=cameraTarget();render()},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 rank(n){runEffects.inspection=n;render()},away(){player.x=35;render()},
 box(){crates[0].loot=[{type:'ammo',qty:24},{type:'armor',qty:1,durability:72},{type:'pistol',qty:1,loaded:18,attachments:{magazine:'extendedmag',rail:'laser'}}];crates[0].trap={type:'mine',status:'hidden',remaining:0,gasRemaining:0,gasClock:0};this.stand()},
 floor(){floor=50;generateLevel();this.clean()},room(){enterRoom(doors[0]);this.clean()},back(){leaveRoom();this.clean()},
 empty(){player.inventory=[];player.weaponId=null;player.weaponSlots=[];syncSupplies()},
 long(){crates[0].loot=Array.from({length:48},()=>({type:'armor',qty:1,durability:72}));this.stand()},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3012'))
 assert all(page.evaluate('inspectTest.ready'))
 def call(code):return page.evaluate('inspectTest.'+code)
 def state():return call('state()')
 def preview():return page.locator('#loot-preview-content').inner_text()
 call('funds()');page.locator('#progress-toggle').click();assert page.locator('.perk-card').count()==23
 page.locator('#progress-branch').select_option('МАРОДЁР');assert page.locator('.perk-card').count()==5
 for _ in range(3):page.locator('[data-perk="attentive"]').click()
 assert page.locator('[data-perk="attentive"]').is_disabled() and state()['profile']['dna']==0
 assert state()['runEffects']['inspection']==0
 page.reload();page.locator('#start').click();call('clean()');call('box()')
 assert state()['runEffects']['inspection']==3 and '72%' in preview() and '18/18' in preview()
 before=state();call('step(1)');assert state()['crates']==before['crates'] and state()['player']['inventory']==before['player']['inventory']
 assert state()['mode']=='playing' and not state()['crates'][0]['opened']
 for rank in [1,2,3]:
  call(f'rank({rank})');text=preview()
  assert ('Бронежилет' in text)==(rank>=2)
  assert ('72%' in text)==(rank==3)
 call('rank(0)');assert not page.locator('#loot-preview').is_visible()
 call('rank(3)');call('away()');assert not page.locator('#loot-preview').is_visible()
 call('stand()');page.screenshot(path=str(ROOT/'dist/inspection-work.png'))
 page.keyboard.press('i');call('step(0)');assert not page.locator('#loot-preview').is_visible();page.keyboard.press('Escape')
 page.keyboard.press('e');call('step(.2)');assert not page.locator('#loot-preview').is_visible()
 duration=state()['searching']['remaining'];call(f'step({duration+.01})')
 assert state()['crates'][0]['trap']['status']=='warning' and not page.locator('#loot-preview').is_visible()
 page.keyboard.press('e');assert state()['mode']=='inventory';call('empty()');page.locator('#loot-all').click();page.keyboard.press('Escape');call('step(0)')
 assert 'Пусто' in preview() and state()['crates'][0]['trap']['status']=='disarmed'
 assert 'открыть' in page.locator('#loot-preview-action').inner_text()
 call('floor()');call('room()');call('stand()');contents=state()['crates'];text=preview()
 call('back()');call('room()');call('stand()');assert state()['crates']==contents and preview()==text
 call('long()')
 assert page.locator('#loot-preview-content').evaluate('e=>e.scrollHeight>e.clientHeight && e.clientHeight<=180')
 page.locator('#loot-preview-content').hover();page.mouse.wheel(0,400)
 page.wait_for_function('document.querySelector("#loot-preview-content").scrollTop>0')
 call('away()');call('stand()')
 assert page.locator('#loot-preview-content').evaluate('e=>e.scrollTop')==0
 assert not errors,errors
 print('PASS: inspection purchases/reload, three ranks, no free pickup/reroll, range/paused/search visibility, trap priority, emptied loot and room revisit')
 b.close()
