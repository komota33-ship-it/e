"""Actual damage, regeneration, revival and durable spent charges in checkpoints."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.lifeTest={ready:artReady,
 state(){return {mode,player,profile,runEffects,checkpoint,runDna,searching,crafting,reloadTime,hurtTime,floor,toast:$("toast").textContent,stats:equipmentStats(player)}},
 funds(){profile.dna=10000},
 clean(){enemies=[];transitionTime=0;clearInput();aim.active=false;player.x=500;player.y=GROUND;player.vy=0},
 start(){startGame();floor=50;generateLevel();this.clean()},
 step(seconds){for(let t=0;t<seconds-1e-8;t+=.01)update(Math.min(.01,seconds-t));render()},
 hit(amount,source='impact'){hurtTime=0;hurt(amount,source)},
 hp(value){player.hp=value;updateHud()},
 infection(value){player.infection=value;refreshInfection();updateHud()},
 gear(){for(const type of ['heavyhelmet','heavyarmor','armoredgloves','exoboots']){addInventoryItem(player.inventory,type);const item=player.inventory.find(i=>i.type===type);player.equipment[ITEMS[type].slot]=item.uid;}syncSupplies()},
 save(){saveCheckpoint()}, raw(){return JSON.parse(localStorage.getItem(SAVE_KEY))},
 legacy(){const s=this.raw();delete s.revivesUsed;localStorage.setItem(SAVE_KEY,JSON.stringify(s))},
 invalid(value){const s=this.raw();s.revivesUsed=value;localStorage.setItem(SAVE_KEY,JSON.stringify(s));return readCheckpoint()},
 room(){enterRoom(doors[0]);this.clean()},back(){leaveRoom();this.clean()},
 next(){floor=45;generateLevel();this.clean();saveCheckpoint()},
 baseline(){runEffects=perkEffects({perks:Object.fromEntries(Object.keys(profile.perks).map(k=>[k,0]))});player.hp=player.maxHp=100},
 busy(){player.x=crates[0].x;interact();equippedWeapon().loaded=1;syncSupplies();reload()},
 kill(){damageEnemy(makeEnemy('walker',800),9999)},
 storageFailure(){Storage.prototype.setItem=function(){throw Error('quota')}},
};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3008'))
    assert all(page.evaluate('lifeTest.ready'))
    def call(code):return page.evaluate('lifeTest.'+code)
    def state():return call('state()')
    def close(a,b):assert abs(a-b)<1e-7,(a,b)
    call('funds()');page.locator('#progress-toggle').click()
    assert page.locator('.perk-card').count()==23
    page.locator('#progress-branch').select_option('ВЫЖИВШИЙ');assert page.locator('.perk-card').count()==5
    for perk in ['health','regeneration','resilience','secondWind']:
        for _ in range(3):page.locator(f'[data-perk="{perk}"]').click()
        assert page.locator(f'[data-perk="{perk}"]').is_disabled()
    assert state()['profile']['dna']==5450 and state()['runEffects']['revivals']==0
    for name in ['ТАНК','ФЕНИКС']:assert name+' АКТИВЕН' in page.locator('#progress-synergy').inner_text()
    page.screenshot(path=str(ROOT/'dist/survival-perks-work.png'))
    page.reload();page.locator('#start').click();call('start()')
    assert state()['player']['hp']==260 and state()['stats']['limit']==42
    call('save()');page.reload();assert state()['checkpoint']['hp']==260
    page.locator('#continue').click();call('clean()')
    assert state()['player']['maxHp']==260
    call('hit(100)');close(state()['player']['hp'],225)
    call('hp(100)');call('step(2)');close(state()['player']['hp'],106)
    # Pauses and inventory never heal; normal gameplay resumes regeneration.
    page.keyboard.press('i');call('step(10)');close(state()['player']['hp'],106)
    page.keyboard.press('Escape');page.keyboard.press('Escape');call('step(10)');close(state()['player']['hp'],106)
    page.keyboard.press('Escape');call('hp(259)');call('step(2)');assert state()['player']['hp']==260
    call('gear()');call('hit(100)');close(state()['player']['hp'],256.5)
    call('infection(65)');call('hp(180)');call('step(2)');assert state()['player']['hp']==182
    assert state()['player']['infection']>65 # Regen does not cure the virus.
    # Revival cancels work/reload, preserves the existing checkpoint and gives grace.
    call('start()');call('save()');saved=call('raw()');call('kill()');dna=state()['profile']['dna']
    call('busy()');assert state()['searching'] and state()['reloadTime']>0
    ammo_before=state()['player']['reserve'];call('hit(999999)')
    assert state()['mode']=='playing' and state()['player']['hp']==130
    assert state()['player']['revivesUsed']==1 and not state()['searching'] and state()['reloadTime']==0
    assert state()['profile']['deaths']==0 and state()['profile']['dna']==dna
    assert state()['player']['reserve']==ammo_before
    changed=call('raw()');assert changed.pop('revivesUsed')==1;saved.pop('revivesUsed');assert changed==saved
    call('hit(999999)');assert state()['player']['revivesUsed']==1
    call('room()');call('hit(999999)');assert state()['player']['revivesUsed']==1;call('back()')
    # Reload restores the entry checkpoint with the already-spent charge.
    page.reload();page.locator('#continue').click();call('clean()')
    assert state()['player']['revivesUsed']==1 and '2 / 3' in page.locator('#revive-state').inner_text()
    call('hit(999999)');assert state()['player']['revivesUsed']==2
    call('step(2.1)');call('hit(999999)');assert state()['player']['revivesUsed']==3
    call('next()');assert state()['checkpoint']['revivesUsed']==3
    call('step(2.1)');call('hit(999999)');assert state()['mode']=='dead' and state()['profile']['deaths']==1
    page.locator('#continue').click();call('clean()');call('hit(999999)');assert state()['mode']=='dead' and state()['player']['revivesUsed']==3
    page.locator('#start').click();call('clean()');assert state()['player']['revivesUsed']==0
    # Infection revival consumes only one charge, awards no death DNA, and clears
    # the fatal state. The final exhausted infection death grants the bonus once.
    call('kill()');dna=state()['profile']['dna'];deaths=state()['profile']['deaths']
    call('infection(99.99)');call('step(.09)')
    assert state()['player']['revivesUsed']==1 and state()['player']['infection']==50
    close(state()['player']['hp'],117);assert state()['profile']['dna']==dna and state()['profile']['deaths']==deaths
    call('step(2.1)');call('infection(95)');call("hit(999999,'bite')")
    assert state()['player']['revivesUsed']==2 and state()['player']['hp']==117
    call('step(2.1)');call('hit(999999)');assert state()['player']['revivesUsed']==3
    call('infection(100)');assert state()['mode']=='dead' and state()['profile']['dna']==dna+2
    call('step(2)');assert state()['profile']['dna']==dna+2
    # Saves before this feature migrate to zero spent charges; invalid counters fail.
    page.locator('#start').click();call('legacy()');page.reload();page.locator('#continue').click()
    assert state()['player']['revivesUsed']==0
    for value in ['-1','4','1.5','"1"','null']:
        call('save()');assert call('invalid('+value+')') is None
    call('save()')
    # Storage failure remains playable, retains the spent charge in this session,
    # and reports that it could not persist the change.
    call('clean()');call('storageFailure()');call('hit(999999)')
    assert state()['mode']=='playing' and state()['checkpoint']['revivesUsed']==1
    assert 'не разрешил сохранить' in state()['toast']
    assert not errors,errors
    print('PASS: survival purchases/migration, 260-HP checkpoint, layered defense, regeneration/pause/cap, finite revivals/grace, checkpoint ledger/reload/rooms/floors, infection double-hit guard and final DNA, legacy/invalid saves, storage failure')
    browser.close()
