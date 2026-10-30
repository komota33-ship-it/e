"""Real search -> trap warning -> keyboard defuse/failure, rooms and combat."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.trapTest={ready:artReady,
 state(){return {mode,floor,player,profile,runEffects,crates,searching,floorNoise,enemies,checkpoint,toast:$("toast").textContent}},
 funds(){profile.dna=1050},
 start(){startGame();floor=40;generateLevel();this.clean()},
 clean(){enemies=[];transitionTime=0;aim.active=false;clearInput();player.y=GROUND;player.vy=0},
 box(type){const c=crates[0];for(const other of crates)other.trap=null;c.opened=false;c.trap={type,status:'hidden',remaining:0,gasRemaining:0,gasClock:0};player.x=c.x;camera=cameraTarget();render();return c.loot},
 step(seconds){for(let t=0;t<seconds-1e-8;t+=.01)update(Math.min(.01,seconds-t));render()},
 effects(rank=0){runEffects.trapFactor=[1,.5,.25,0][rank]},
 stand(){player.x=crates[0].x;player.y=GROUND;camera=cameraTarget()},
 away(){player.x=crates[0].x+250;camera=cameraTarget()},
 empty(){player.inventory=[];player.weaponId=null;player.weaponSlots=[];player.equipment={};syncSupplies()},
 room(){enterRoom(doors[0]);this.clean()},back(){leaveRoom();this.clean()},
 hp(n){player.hp=n},revivals(){runEffects.revivals=1},
 heldSearch(){const duration=searchDuration(crates[0],runEffects.searchTime);return duration},
 drop(){dropInventoryItem(player.inventory[0].uid);return crates.find(c=>c.portable)},
};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3009'))
    assert all(page.evaluate('trapTest.ready'))
    def call(code):return page.evaluate('trapTest.'+code)
    def state():return call('state()')
    def close(a,b):assert abs(a-b)<1e-7,(a,b)
    def search():
        page.keyboard.press('e');duration=state()['searching']['duration'];call(f'step({duration+.01})')
    page.locator('#start').click();assert all(c.get('trap') is None for c in state()['crates'])
    # Real completion reveals, then a new E press defuses; ordinary held input cannot.
    call('start()');loot=call("box('mine')");page.keyboard.down('e');call('step(5.01)');page.keyboard.up('e')
    assert state()['crates'][0]['trap']['status']=='spent' and state()['player']['hp']==60
    # Use a fresh search for a precise defusal window.
    call('start()');loot=call("box('mine')");search()
    assert state()['mode']=='playing' and state()['crates'][0]['trap']['status']=='warning'
    assert 'ОБЕЗВРЕДИТЬ' in page.locator('#prompt').inner_text()
    page.screenshot(path=str(ROOT/'dist/trap-warning-work.png'))
    page.keyboard.press('e');assert state()['mode']=='inventory'
    assert state()['crates'][0]['trap']['status']=='disarmed' and state()['player']['hp']==100
    assert state()['crates'][0]['loot']==loot
    call('empty()');page.locator('#loot-all').click();page.keyboard.press('Escape')
    page.keyboard.press('e');assert page.locator('#loot-all').is_disabled();page.keyboard.press('Escape')
    # Exactly one detonation and unchanged loot; each kind has its own consequence.
    for kind,damage in [('shock',18),('mine',40),('gas',4),('alarm',0)]:
        call('start()');loot=call("box('"+kind+"')");search();call('step(.51)')
        assert state()['crates'][0]['trap']['status']=='spent';close(state()['player']['hp'],100-damage)
        assert state()['crates'][0]['loot']==loot
        if kind=='gas':
            assert 'ОТОЙДИТЕ' in page.locator('#prompt').inner_text()
            call('step(2)');close(state()['player']['hp'],88)
            page.screenshot(path=str(ROOT/'dist/trap-gas-work.png'))
            call('away()');call('step(4)');close(state()['player']['hp'],88)
            call('stand()');call('step(2)');close(state()['player']['hp'],88)
        elif kind=='alarm':
            call('step(.02)');assert state()['floorNoise']['pending']>0
            call('away()');call('step(3.1)');assert len(state()['enemies'])==4
        else:
            call('step(2)');close(state()['player']['hp'],100-damage)
        page.keyboard.press('e') if kind!='alarm' else None
        if state()['mode']=='inventory':page.keyboard.press('Escape')
    # Timing freezes during pause/own inventory and away rooms, then resumes.
    call('start()');call('room()');call("box('gas')");search();remaining=state()['crates'][0]['trap']['remaining']
    page.keyboard.press('i');call('step(2)');close(state()['crates'][0]['trap']['remaining'],remaining)
    page.keyboard.press('Escape');page.keyboard.press('Escape');call('step(2)');close(state()['crates'][0]['trap']['remaining'],remaining)
    page.keyboard.press('Escape');call('back()');call('step(2)');call('room()')
    close(state()['crates'][0]['trap']['remaining'],remaining);call('stand()');page.keyboard.press('e')
    assert state()['crates'][0]['trap']['status']=='disarmed';page.keyboard.press('Escape')
    call('back()');call('room()');assert state()['crates'][0]['trap']['status']=='disarmed'
    # Moving away avoids the blast, but the container remains spent, never rerolled.
    call('start()');call("box('mine')");search();call('away()');call('step(.6)')
    assert state()['player']['hp']==100;call('stand()');page.keyboard.press('e');assert state()['mode']=='inventory';page.keyboard.press('Escape')
    # A correctly timed real dodge avoids the instant blast without disarming it.
    call('start()');call("box('mine')");search();call('step(.24)');page.keyboard.press('q');call('step(.26)')
    assert state()['player']['hp']==100 and state()['crates'][0]['trap']['status']=='spent'
    # Cancelled searching never reveals or resolves the trap.
    call('start()');loot=call("box('mine')");page.keyboard.press('e');call('step(.2)')
    page.keyboard.down('d');call('step(.2)');page.keyboard.up('d')
    assert state()['searching'] is None and state()['crates'][0]['trap']['status']=='hidden' and state()['crates'][0]['loot']==loot
    # Sapper scaling and automatic disarm at rank 3.
    for rank,damage in [(1,20),(2,10),(3,0)]:
        call('start()');call(f'effects({rank})');call("box('mine')");search()
        if rank==3:assert state()['mode']=='inventory' and state()['crates'][0]['trap']['status']=='disarmed';page.keyboard.press('Escape')
        else:call('step(.6)')
        close(state()['player']['hp'],100-damage)
    # Fatal trigger respects final death/revival and cannot reset the opened trap.
    call('start()');call("box('mine')");call('hp(10)');search();call('step(.51)')
    assert state()['mode']=='dead' and state()['crates'][0]['trap']['status']=='spent'
    call('start()');call('revivals()');call("box('mine')");call('hp(10)');search();call('step(.51)')
    assert state()['mode']=='playing' and state()['player']['revivesUsed']==1 and state()['crates'][0]['trap']['status']=='spent'
    # Dropped player bags are always safe; no trap can be farmed through dropping.
    assert call('drop()').get('trap') is None
    # Purchase through actual UI and reload the profile.
    call('start()');call('hp(1)');call("box('mine')");search();call('step(.6)');call('funds()')
    page.locator('#progress-toggle').click();assert page.locator('.perk-card').count()==23
    page.locator('#progress-branch').select_option('ТЕХНИК');assert page.locator('.perk-card').count()==4
    for _ in range(3):page.locator('[data-perk="sapper"]').click()
    assert state()['profile']['dna']==0 and state()['runEffects']['trapFactor']==1
    page.reload();page.locator('#start').click();assert state()['runEffects']['trapFactor']==0
    assert not errors,errors
    print('PASS: real warning/defuse, four one-time hazards and intact loot, gas radius/expiry, alarm wave, paused/room clocks, dodge distance, Sapper scaling/purchases, death/revival and safe dropped bags')
    browser.close()
