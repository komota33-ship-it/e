"""Combat branch purchases, real fire/knife pipeline, penetration and cooldowns."""
import os
from pathlib import Path
from math import hypot
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
const savedRandom=Math.random;
window.fightTest={ready:artReady,
 state(){return {mode,profile,runEffects,player,enemies,shotTime,reloadTime,runDna,corpses,labels:particles.filter(p=>p.label).map(p=>p.label),tracers:particles.filter(p=>p.tracer),tracer:particles.filter(p=>p.tracer).at(-1)}},
 funds(){profile.dna=10000},
 effects(perks){runEffects=perkEffects({perks:Object.fromEntries(Object.keys(profile.perks).map(k=>[k,perks[k]||0]))})},
 setup(){startGame();floor=50;generateLevel();enemies=[];transitionTime=0;player.x=350;player.dir=1;player.y=GROUND;player.vy=0;aim.active=false;camera=cameraTarget();clearInput();updateHud()},
 targets(count=6,type='walker',life=1000,relative=.55){
 const y=weaponOrigin().y+125*relative;
 enemies=Array.from({length:count},(_,i)=>{const e=makeEnemy(type,player.x+170+i*90);Object.assign(e,{size:1,y,life,hp:life,dir:-1,brain:'sleep',sleepLeft:999});return e});
 enemies.reverse();return enemies.map(e=>e.x);
 },
 knifeTarget(){enemies=[makeEnemy('walker',player.x+50)];enemies[0].life=enemies[0].hp=1000},
 crit(value){Math.random=()=>value?0:.99},restoreRandom(){Math.random=savedRandom},
 fire(){fire();render()},health(hp,max=100){player.hp=hp;player.maxHp=max;updateHud()},
 body(){for(const e of enemies)e.y=weaponOrigin().y+125*.55},
 expired(){shotTime=0},rear(){for(const e of enemies)e.dir=1},
 step(dt){update(dt);render()},
 weapons(){player.backpack='pack_military';addInventoryItem(player.inventory,'shotgun',1,{loaded:6},backpackFor(player));player.weaponSlots=[player.weaponId,player.inventory.find(i=>i.type==='shotgun').uid,null];syncSupplies()},
 shotgun(){useInventoryItem(player.inventory.find(i=>i.type==='shotgun').uid)},
 spreadTargets(){const origin=weaponOrigin(),sx=origin.x+PLAYER_WEAPON.muzzle;enemies=[-.1,.1].map(slope=>{const e=makeEnemy('walker',sx+400);Object.assign(e,{size:.12,y:origin.y+slope*400+7.5,life:1000,hp:1000});return e})},
 blast(){projectiles=[{kind:'grenade',x:enemies[0].x,y:GROUND-35,vx:0,vy:0,timer:0}];update(.001)},
 muzzle(){return {...weaponOrigin(),camera,viewW}},
};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda route:route.fulfill(content_type='text/javascript',body=source))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3007'))
    assert all(page.evaluate('fightTest.ready'))
    def call(code):return page.evaluate('fightTest.'+code)
    def state():return call('state()')
    def close(a,b):assert abs(a-b)<1e-7,(a,b)
    def damage():return [e['hp']-e['life'] for e in sorted(state()['enemies'],key=lambda e:e['x'])]
    def effects(code):call('effects('+code+')')
    call('funds()');page.locator('#progress-toggle').click()
    assert page.locator('.perk-card').count()==23
    page.locator('#progress-branch').select_option('БОЕЦ');assert page.locator('.perk-card').count()==5
    for perk in ['damage','rapid','piercing','critical','melee']:
        for _ in range(3):page.locator(f'[data-perk="{perk}"]').click()
        assert page.locator(f'[data-perk="{perk}"]').is_disabled()
    assert state()['profile']['dna']==4750
    assert state()['runEffects']['penetration']==0
    text=page.locator('#progress-synergy').inner_text()
    for label in ['БЕРСЕРК','МЯСНИК','ШТУРМОВИК','СНАЙПЕР']:assert label+' АКТИВЕН' in text
    page.locator('#progress-synergy summary').click()
    assert 'ХАМСТЕР' in page.locator('#progress-synergy').inner_text()
    page.screenshot(path=str(ROOT/'dist/combat-perks-work.png'))
    page.reload();assert state()['profile']['perks']['critical']==3
    page.locator('#start').click();call('setup()');call('crit(false)')
    assert state()['runEffects']['penetration']==4
    call('targets()');call('fire()');assert damage()==[13]*5+[0]
    assert state()['player']['ammo']==11
    close(state()['shotTime'],.23/1.45)
    before=state();call('fire()');assert state()['player']['ammo']==11 and state()['enemies']==before['enemies']
    # Quick-switch cannot cancel the shot delay. Reload cannot also fire.
    call('weapons()');page.keyboard.press('2');close(state()['shotTime'],before['shotTime'])
    call('fire()');assert state()['player']['ammo']==6
    page.keyboard.press('1');call('expired()');page.keyboard.press('r');assert state()['reloadTime']>0
    call('fire()');assert state()['player']['ammo']==11
    # Default still hits only the nearest living target; extra ranks add targets.
    for rank in range(4):
        call('setup()');effects('{piercing:'+str(rank)+'}');call('targets()');call('fire()')
        assert damage()==[10]*(1+rank)+[0]*(5-rank)
    # One shared critical roll per bullet; headshot/synergy/armor stack predictably.
    call('setup()');call('targets(1,"walker",1000,.85)');call('health(29)');call('crit(true)');call('fire()')
    close(damage()[0],117);assert 'КРИТ · В ГОЛОВУ' in state()['labels']
    assert page.locator('#combat-state').is_visible()
    call('health(30)');assert not page.locator('#combat-state').is_visible()
    call('setup()');call('targets(1,"armored",1000,.55)');call('crit(false)');call('fire()');close(damage()[0],3.9)
    call('setup()');call('targets(1,"armored",1000,.55)');call('rear()');call('fire()');close(damage()[0],13)
    call('setup()');call('targets(1,"walker",1000,.2)');call('fire()');close(damage()[0],6.5);assert state()['enemies'][0]['slow']
    # Actual mouse aim and trigger enter the same penetration pipeline.
    call('setup()');call('targets(3)');m=call('muzzle()');box=page.locator('#game').bounding_box()
    page.mouse.move(box['x']+(m['x']-m['camera']+600)/m['viewW']*box['width'],box['y']+m['y']/540*box['height'])
    page.mouse.down();call('step(.001)');page.mouse.up();assert damage()==[13]*3
    # Shotgun falloff is measured separately for each pierced enemy.
    call('setup()');call('weapons()');call('shotgun()');effects('{piercing:1}');call('targets(2)');m=call('muzzle()');call('fire()')
    # Muzzle distance matches runtime arm geometry; infer it from the tracer origin.
    sx=state()['tracer']['x']
    assert len(state()['tracers'])==6
    directions=[(t['end']-t['x'])/hypot(t['end']-t['x'],t['endY']-t['y']) for t in state()['tracers']]
    for e in state()['enemies']:
        close(e['hp']-e['life'],sum(10*max(.3,1-(e['x']-26-sx)/dx/700) for dx in directions))
    assert state()['player']['ammo']==5 and len([d for d in damage() if d>0])==2
    close(state()['shotTime'],1/1.2)
    # All pellets share a pre-damage snapshot: a lethal front body still blocks the rear.
    call('setup()');call('weapons()');call('shotgun()');effects('{}');call('targets(2,"walker",1)')
    dna=state()['profile']['dna'];call('fire()')
    assert len(state()['corpses'])==1 and state()['profile']['dna']==dna+5
    assert sorted(state()['enemies'],key=lambda e:e['x'])[1]['life']==1
    assert state()['player']['ammo']==5
    # Two off-axis targets are hit by one shell, even without penetration.
    call('setup()');call('weapons()');call('shotgun()');effects('{}');call('spreadTargets()');call('fire()')
    assert all(d>0 for d in damage()) and state()['player']['ammo']==5
    # One shared critical result and one floating label per victim, not per pellet.
    call('setup()');call('weapons()');call('shotgun()');effects('{}');call('targets(1)');call('fire()');ordinary=damage()[0]
    call('setup()');call('weapons()');call('shotgun()');effects('{critical:3}');call('crit(true)');call('targets(1)');call('fire()')
    close(damage()[0],ordinary*2);assert state()['labels'].count('КРИТ')==1
    call('crit(false)')
    # Knife uses melee/Butcher/Berserk/crit but retains its stamina cost and cooldown.
    call('setup()');call('knifeTarget()');call('health(29)');call('crit(true)');page.keyboard.press('v')
    close(damage()[0],180);assert state()['player']['stamina']==85 and state()['shotTime']==.5
    page.keyboard.press('v');close(damage()[0],180);assert state()['player']['stamina']==85
    call('setup()');call('knifeTarget()');call('crit(false)');page.keyboard.press('v');close(damage()[0],60)
    # Grenade damage gets Berserk once, without a critical roll or gun multipliers.
    call('setup()');call('targets(1)');call('health(29)');call('blast()');close(damage()[0],270)
    # Penetrating a lethal group produces exactly one corpse/reward per victim.
    call('setup()');call('targets(5,"walker",10)');dna=state()['profile']['dna'];call('fire()')
    assert state()['profile']['dna']==dna+25 and len(state()['corpses'])==5
    call('expired()');call('fire()');assert state()['profile']['dna']==dna+25
    call('restoreRandom()');assert not errors,errors
    print('PASS: combat purchases/persistence, next-run snapshot, nearest-first penetration, one ammo/cooldown, quick-switch/reload guards, mouse aim, crit/head/armor/legs, shotgun falloff, knife cost, Berserk grenade and unique death rewards')
    browser.close()
