"""Real controls: DNA -> death -> laboratory -> persistent perks; sprint and dodge."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.progressTest={ready:artReady,
 state(){return {profile,runDna,mode,player,searching,runEffects}},
 step(seconds){for(let t=0;t<seconds;t+=.01)update(.01);render()},
 setup(){enemies=[];transitionTime=0;player.x=500;player.y=GROUND;player.vy=0;player.stamina=100;player.dodgeTime=0;player.dodgeCooldown=0;player.exhausted=false;hurtTime=shotTime=0;aim.active=false;clearInput()},
 kill(type,count){for(let i=0;i<count;i++){const e=makeEnemy(type,800);damageEnemy(e,9999);damageEnemy(e,9999)}updateHud()},
 die(){hurtTime=0;player.dodgeTime=0;hurt(9999)},hit(){hurtTime=0;hurt(50)},stamina(n){player.stamina=n},
 shot(){enemies=[makeEnemy('walker',player.x+200)];aim.active=false;player.dir=1;shotTime=0;fire();return enemies[0].life},
 heal(){player.hp=115;return useInventoryItem(player.inventory.find(i=>i.type==='medkit').uid)},
 search(){player.x=crates[0].x;interact();return searching.duration}
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE);assert all(page.evaluate('progressTest.ready'))
 def state():return page.evaluate('progressTest.state()')
 def step(n):page.evaluate('progressTest.step',n)
 page.locator('#progress-toggle').click();assert page.locator('[data-perk="damage"]').is_disabled();page.keyboard.press('Escape');assert state()['mode']=='intro'
 page.locator('#start').click();page.evaluate('progressTest.setup()');assert page.locator('#progress-toggle').is_disabled()
 page.evaluate("progressTest.kill('walker',20)");assert state()['profile']['dna']==100 and state()['profile']['kills']==20
 page.evaluate('progressTest.die()');assert state()['profile']['deaths']==1
 page.locator('#progress-toggle').click();page.locator('[data-perk="damage"]').click();assert state()['profile']['dna']==0;assert state()['profile']['perks']['damage']==1
 page.keyboard.press('Escape');page.locator('#start').click();page.evaluate('progressTest.setup()');assert abs(page.evaluate('progressTest.shot()')-9)<.001
 page.evaluate("progressTest.kill('brute',8)");page.evaluate('progressTest.die()');page.locator('#progress-toggle').click();page.locator('[data-perk="health"]').click();assert state()['profile']['dna']==10
 page.screenshot(path=str(ROOT/'dist/laboratory-v0.8.png'))
 page.reload();assert all(page.evaluate('progressTest.ready'));assert state()['profile']['dna']==10 and state()['profile']['perks']['health']==1
 page.locator('#start').click();page.evaluate('progressTest.setup()');assert state()['player']['hp']==120 and state()['player']['maxHp']==120
 page.evaluate('progressTest.heal()');assert state()['player']['hp']==120;page.keyboard.press('i');assert '/ 120' in page.locator('#inventory-health').inner_text();page.keyboard.press('Escape')
 page.evaluate("progressTest.kill('brute',5)");page.evaluate('progressTest.die()');page.locator('#progress-toggle').click();page.locator('[data-perk="search"]').click();page.keyboard.press('Escape');page.locator('#start').click();page.evaluate('progressTest.setup()')
 assert abs(page.evaluate('progressTest.search()')-1.6)<.001;page.keyboard.down('d');step(.1);page.keyboard.up('d');assert state()['searching'] is None
 page.evaluate('progressTest.setup()');x=state()['player']['x'];page.keyboard.down('Shift');page.keyboard.down('d');step(.5);page.keyboard.up('d');page.keyboard.up('Shift');assert abs(state()['player']['x']-x-108.75)<1;assert abs(state()['player']['stamina']-95)<.1
 page.evaluate('progressTest.setup()');x=state()['player']['x'];page.keyboard.press('q');assert state()['player']['stamina']==75;page.evaluate('progressTest.hit()');assert state()['player']['hp']==120
 step(.3);assert abs(state()['player']['x']-x-96)<.001;page.evaluate('progressTest.hit()');assert state()['player']['hp']==70
 stamina=state()['player']['stamina'];page.keyboard.press('q');assert state()['player']['stamina']==stamina
 page.evaluate('progressTest.setup()');page.evaluate('progressTest.stamina(24)');page.keyboard.press('q');assert state()['player']['dodgeTime']==0 and state()['player']['stamina']==24
 page.evaluate('progressTest.stamina(14)');page.keyboard.press('v');assert state()['player']['stamina']==14
 page.evaluate('progressTest.stamina(15)');page.keyboard.press('v');assert state()['player']['stamina']==0
 assert not errors,errors;print('PASS: one DNA reward per kill, persistent purchases/reload/death, actual damage/health/search bonuses, sprint drain, dash distance/invulnerability/cooldown, knife cost')
 b.close()
