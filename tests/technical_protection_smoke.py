"""Selective trap protection in actual combat, UI, purchases and saves."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.protectionTest = {
  ready: artReady,
  state(){return {mode,profile,runEffects,player,crates,hurtTime,searching,floorNoise,noise:noiseLevel(floorNoise)}},
  funds(){profile.dna=1400},
  clean(){enemies=[];transitionTime=0;clearInput();aim.active=false;hurtTime=0},
  start(){startGame();floor=49;generateLevel();this.clean()},
  rank(n,sapper=0){runEffects.shockResistance=runEffects.gasResistance=[0,.5,.75,1][n];runEffects.trapFactor=[1,.5,.25,0][sapper]},
  box(type,hidden=false){
    for(const c of crates)c.trap=null;
    const c=crates[0];c.opened=!hidden;
    c.trap={type,status:hidden?'hidden':'warning',remaining:hidden?0:.5,gasRemaining:0,gasClock:0};
    player.x=c.x;player.y=GROUND;player.vy=0;camera=cameraTarget();render();return c.loot;
  },
  step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
  armor(){addInventoryItem(player.inventory,'armor');const item=player.inventory.find(i=>i.type==='armor');player.equipment.torso=item.uid;syncSupplies()},
  acid(){projectiles.push({kind:'acid',x:player.x,y:player.y-65,vx:0,vy:0,timer:1,damage:12,trail:0});this.step(.01)},
  bite(){hurtTime=0;hurt(10,'bite')},
  save(){floor=50;generateLevel();this.clean();saveCheckpoint()},
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(os.environ.get('GAME_URL', 'http://127.0.0.1:3012'))
    def call(code): return page.evaluate('protectionTest.' + code)
    def state(): return call('state()')
    def close(a,b): assert abs(a-b)<1e-7, (a,b)
    assert all(call('ready'))
    call('funds()'); page.locator('#progress-toggle').click()
    assert page.locator('.perk-card').count() == 23
    page.locator('#progress-branch').select_option('ТЕХНИК')
    assert page.locator('.perk-card').count() == 4
    for perk in ['electrician','respirator']:
        for _ in range(3): page.locator(f'[data-perk="{perk}"]').click()
        assert page.locator(f'[data-perk="{perk}"]').is_disabled()
    assert state()['profile']['dna'] == 0
    assert state()['runEffects']['shockResistance'] == state()['runEffects']['gasResistance'] == 0
    page.reload(); page.locator('#start').click(); call('clean()')
    assert state()['runEffects']['shockResistance'] == state()['runEffects']['gasResistance'] == 1
    # All ranks reduce only damage; gas still lasts five seconds and emits noise.
    for rank, factor in [(0,1),(1,.5),(2,.25),(3,0)]:
        for kind, damage, noise in [('shock',18,8),('gas',4,5)]:
            call('start()'); call(f'rank({rank})'); loot=call(f"box('{kind}')")
            call('step(.51)'); s=state()
            close(s['player']['hp'], 100-damage*factor); close(s['noise'],noise)
            assert s['crates'][0]['trap']['status']=='spent' and s['crates'][0]['loot']==loot
            if factor==0: assert s['hurtTime']==0
            if kind=='gas':
                assert ('ИММУНИТЕТ К ГАЗУ' in page.locator('#prompt').inner_text()) == (rank==3)
                if rank==3: page.screenshot(path=str(ROOT/'dist/respirator-work.png'))
                call('step(5)'); close(state()['player']['hp'], 100-24*factor)
                assert state()['crates'][0]['trap']['gasRemaining']==0
    # Immunity does not auto-disarm: actual search warns, then manual E still works.
    for kind in ['shock','gas']:
        call('start()'); call(f"box('{kind}',true)")
        page.keyboard.press('e'); duration=state()['searching']['duration']; call(f'step({duration+.01})')
        assert state()['mode']=='playing' and state()['crates'][0]['trap']['status']=='warning'
        assert 'ИММУНИТЕТ' in page.locator('#prompt').inner_text()
        page.keyboard.press('e')
        assert state()['mode']=='inventory' and state()['crates'][0]['trap']['status']=='disarmed'
        page.keyboard.press('Escape')
    # Immune hits do not wear armor or grant invulnerability against the next attack.
    call('start()'); call('armor()'); call("box('gas')"); gear=state()['player']['inventory']
    call('step(5.51)'); assert state()['player']['hp']==100 and state()['player']['inventory']==gear
    call('start()'); call("box('shock')"); call('step(.51)'); call('acid()')
    assert state()['player']['hp']==88
    call('bite()'); assert state()['player']['hp']==78 and state()['player']['infection']==10
    call('start()'); call("box('mine')"); call('step(.51)'); assert state()['player']['hp']==60
    call('start()'); call("box('alarm')"); call('step(.51)'); assert state()['floorNoise']['pending']>0
    # General Sapper damage/noise reduction still multiplies partial personal protection.
    call('start()'); call('rank(1,1)'); call("box('shock')"); call('step(.51)')
    close(state()['player']['hp'],95.5); close(state()['noise'],4)
    call('start()'); call('save()'); page.reload(); page.locator('#continue').click(); call('clean()')
    assert state()['runEffects']['shockResistance']==state()['runEffects']['gasResistance']==1
    call("box('gas')"); call('step(5.51)'); assert state()['player']['hp']==100
    assert not errors, errors
    print('PASS: protection purchases/snapshot/reload, all ranks, gas pulses/noise/expiry, real defusal, no armor wear or hit grace, acid/bites/mines still hurt, Sapper stacking and checkpoint resume')
    browser.close()
