"""Perception integration: live flashlight, frozen targets, sound, patrol, perks."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.aiTest={ready:artReady,
 state(){return {mode,player,enemies,profile,runEffects,floorNoise,flash,projectiles}},
 step(seconds){for(let t=0;t<seconds-1e-8;t+=.01)update(Math.min(.01,seconds-t));render()},
 setup(n=10,type='walker'){floor=n;generateLevel();mode='playing';transitionTime=0;player.x=450;player.y=GROUND;player.vy=0;player.infection=0;refreshInfection();player.hp=player.maxHp;player.battery=100;player.stamina=100;flash=false;aim.active=false;enemies=[makeEnemy(type,700)];enemies[0].dir=-1;enemies[0].brain='sleep';enemies[0].sleepLeft=999;enemies[0].cooldown=0;clearInput();camera=cameraTarget();updateHud();render()},
 player(x){player.x=x},enemy(v){Object.assign(enemies[0],v)},
 shot(){aim.active=true;aim.angle=-Math.PI/2;shotTime=0;fire();aim.active=false},
 allPerks(){profile.perks.speed=3;profile.perks.silent=3;profile.perks.connection=3;startGame()},
 start(){startGame()},funds(){profile.dna=10000;persistProgress();updateHud()},
 arrive(){enemies[0].x=enemies[0].targetX},
 dash(){const e=enemies[0];e.dir=-1;rememberTarget(e,450,GROUND,'sight');beginEnemyAttack(e,'dash');e.attack.time=.26;const x=e.x;updateEnemy(e,.1);return x-e.x},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE);assert all(page.evaluate('aiTest.ready'))
 def call(code):return page.evaluate('aiTest.'+code)
 def state():return call('state()')
 def step(n):page.evaluate('aiTest.step',n)
 call('funds()');page.locator('#progress-toggle').click();assert page.locator('.perk-card').count()==23
 page.locator('#progress-branch').select_option('ПСИХО');assert page.locator('.perk-card').count()==4
 page.locator('[data-perk="connection"]').click();assert state()['profile']['perks']['connection']==1
 page.locator('#progress-branch').select_option('ВЫЖИВШИЙ');page.locator('[data-perk="speed"]').click();assert state()['profile']['perks']['speed']==1
 page.keyboard.press('Escape');page.reload();assert state()['profile']['perks']['speed']==1;page.locator('#start').click();call('setup()');step(.1)
 assert not state()['enemies'][0]['seesPlayer'] and 'В ТЕНИ' in page.locator('#stealth-label').inner_text()
 page.keyboard.press('l');step(.1);assert state()['enemies'][0]['seesPlayer'] and state()['enemies'][0]['brain']=='chase'
 known=state()['enemies'][0]['targetX'];page.keyboard.press('l');call('player(100)');step(.3);assert state()['enemies'][0]['targetX']==known and state()['enemies'][0]['brain']=='investigate'
 call('arrive()');step(.1);assert state()['enemies'][0]['brain']=='search';step(3.2);assert state()['enemies'][0]['brain']=='patrol' and not state()['enemies'][0]['alert'];assert state()['enemies'][0]['moveBlend']>0
 call('setup()');call('shot()');assert sum(e['amount'] for e in state()['floorNoise']['events'])==18;assert state()['enemies'][0]['targetX']==450 and state()['enemies'][0]['brain']=='investigate'
 call('player(100)');step(.2);assert state()['enemies'][0]['targetX']==450
 call("setup(10,'spitter')");call('shot()');call('player(100)');step(2);assert not state()['projectiles'], 'Unseen player attracted precision acid fire'
 call("setup(50,'spitter')");step(.01);assert state()['enemies'][0]['attack']['targetX']==450
 call('player(50)');step(.56);assert len(state()['projectiles'])==1 and state()['projectiles'][0]['vy']>0, 'Spit retargeted the unseen player during windup'
 call('setup()');call('enemy({brain:"patrol",sleepLeft:0})');call('player(50)');x=state()['enemies'][0]['x'];step(1);assert state()['enemies'][0]['x']<x and state()['enemies'][0]['state']=='walk'
 # Ghost requires both level-three perks and halves the real shot and hearing radius.
 call('allPerks()');call('setup()');call('shot()');assert sum(e['amount'] for e in state()['floorNoise']['events'])==9;assert not state()['enemies'][0]['alert']
 x=state()['player']['x'];page.keyboard.down('d');step(.5);page.keyboard.up('d');assert abs(state()['player']['x']-x-94.25)<.1
 call('setup(50)');x=state()['enemies'][0]['x'];step(.5);assert abs(x-state()['enemies'][0]['x']-10.85)<.1
 call("setup(50,'runner')");assert abs(call('dash()')-21.7)<.001
 call('setup()');call('enemy({brain:"sleep",sleepLeft:999})');page.keyboard.press('l');step(.1);page.keyboard.press('Escape');before=state()['enemies'][0];step(5);assert state()['enemies'][0]==before
 assert not errors,errors
 print('PASS: twenty-three perk cards/filter/persistence, actual flashlight/darkness, lost target/search/patrol, sound position, no blind acid tracking, Ghost hearing/noise, player speed and enemy dash slowdown, paused AI')
 b.close()
