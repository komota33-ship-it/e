"""Real renderer and gameplay checks for the Screamer's walk and call."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.screamerTest={ready:artReady,run(){
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 startGame();
 const animator=createSpriteAnimator(ctx,art),sheet=animator.framesFor('screamer');
 check(sheet.screamFrames.length===8&&sheet.walkFrames.length===8,'Missing eight-frame strips');
 check(sheet.screamFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1&&f.bounds.y0>0&&f.bounds.y1<f.height-1),'Scream clips a limb');
 const times=[.05,.3,.6,.7,.9,1.05,1.3,1.6];
 for(const dir of [-1,1]){
  const e=Object.assign(makeEnemy('screamer',600),{dir,moveBlend:1}),calls=[],draw=ctx.drawImage;
  beginEnemyAttack(e,'scream');
  ctx.drawImage=function(image,...args){calls.push({image,args});return draw.call(this,image,...args)};
  try{
   for(const time of times){e.attack.time=time;animator.draw(e,{type:'screamer',x:600,y:GROUND,dir})}
   e.deathAge=.3;animator.draw(e,{type:'screamer',x:600,y:GROUND,dir});delete e.deathAge;
   e.attack=null;animator.draw(e,{type:'screamer',x:600,y:GROUND,dir});
   e.moveBlend=0;animator.draw(e,{type:'screamer',x:600,y:GROUND,dir});
  }finally{ctx.drawImage=draw}
  check(calls.length===11&&calls.slice(0,8).every(c=>c.image===art.scream_screamer),'Scream lost draw priority');
  check(new Set(calls.slice(0,8).map(c=>c.args[0]+','+c.args[1])).size===8,'Skipped scream pose');
  check(calls[8].image===art.death_screamer&&calls[9].image===art.walk_screamer&&calls[10].image===art.motion_screamer,'Death/walk/idle transitions broken');
  const s=sheet.screamScale,first=sheet.screamFrames[0],toe=(first.footRight-first.anchor)*s;
  calls.slice(0,8).forEach(({args:a},i)=>{
   const f=sheet.screamFrames[i];
   check(Math.abs(a[6]/a[2]-s)<1e-8&&Math.abs(a[7]/a[3]-s)<1e-8,'Scream stretches body');
   check(Math.abs(a[5]+f.floor*s)<1e-8&&Math.abs(a[4]+f.footRight*s-toe)<1e-8,'Scream slides planted foot');
  });
 }
 function reset(dir=1){
  enemies=[];particles=[];corpses=[];stains=[];player.x=600+dir*35;player.hp=100;player.infection=0;hurtTime=0;
  const e=Object.assign(makeEnemy('screamer',600),{dir,cooldown:999});enemies.push(e);beginEnemyAttack(e,'scream');return e;
 }
 for(const hz of [30,60,144])for(const dir of [-1,1]){
  const e=reset(dir);
  while(e.attack){
   const time=e.attack.time;updateEnemy(e,1/hz);
   if(time+1/hz<.65)check(enemies.length===1&&!particles.some(p=>p.ring),'Call occurred during inhale');
  }
  const rings=particles.filter(p=>p.ring);
  check(enemies.length===6&&rings.length===1,'Call did not summon exactly five once');
  check(player.hp===100&&player.infection===0&&e.x===600,'Scream deals contact damage or moves feet');
  check(e.cooldown>6,'Call lost cooldown');
  check(enemies.slice(1).every(z=>z.targetX===e.x),'Summoned enemies lost sound target');
  const f=sheet.screamFrames[3],r=rings[0];
  const px=(r.x-e.x)/dir/e.size/sheet.screamScale+f.anchor+f.sx;
  const py=(r.y-e.y)/e.size/sheet.screamScale+f.floor+f.sy;
  check(px>1408&&px<1438&&py>78&&py<127,'Wave does not originate inside open mouth');
 }
 // A hit during inhale cancels the call, with no deferred summons.
 let e=reset();updateEnemy(e,.3);damageEnemy(e,1);
 check(!e.attack,'Hit failed to interrupt inhale');
 for(let i=0;i<100;i++)updateEnemy(e,.01);
 check(enemies.length===1&&!particles.some(p=>p.ring),'Interrupted call summons later');
 // Death before impact cancels it; death after impact preserves only that call.
 for(const dir of [-1,1])for(const time of [-1,.3,.8,1.3]){
  e=reset(dir);
  if(time<0){e.attack=null;e.moveBlend=1;e.phase=2}else updateEnemy(e,time);
  const expected=time<.65?1:6,dna=runDna,count=kills,x=e.x;
  damageEnemy(e,1000);damageEnemy(e,1000);
  for(let i=0;i<200;i++)updateEnemy(e,.01);
  updateDeaths(.6);
  check(e.x===x&&corpses[0].dir===dir,'Dead Screamer moves or turns');
  check(stains.length===1&&stains[0].kind==='blood','Missing corpse blood stain');
  const blood=JSON.stringify(stains),scene=captureScene();corpses=[];stains=[];restoreScene(scene);
  check(corpses.length===1&&corpses[0].deathAge===.6&&JSON.stringify(stains)===blood,'Room return restarts fall or loses blood');
  updateDeaths(1.4);
  check(JSON.stringify(stains)===blood,'Corpse repeats blood stain');
  const settled=captureScene();corpses=[];restoreScene(settled);
  check(corpses[0].deathAge===2,'Settled corpse resumes falling');
  check(enemies.length===expected&&particles.filter(p=>p.ring).length===(time<.65?0:1),'Dead Screamer summons again');
  check(corpses.length===1&&corpses[0].attack===null&&kills===count+1&&runDna===dna+10,'Death duplicates corpse/reward');
 }
 // Keep the existing encounter cap, including simultaneous callers.
 e=reset();while(enemies.length<38)enemies.push(makeEnemy('walker',100));
 updateEnemy(e,.7);check(enemies.length===40,'Call exceeds encounter cap');
 const second=makeEnemy('screamer',700);beginEnemyAttack(second,'scream');updateEnemy(second,.7);
 check(enemies.length===40,'Second call exceeds cap');
 const fallback=createSpriteAnimator(ctx,{motion_screamer:art.motion_screamer}).screamMouthFor();
 check(fallback.x===12&&fallback.y===-110,'Missing-atlas fallback broken');
 return 'PASS: eight scream poses, planted feet and constant scale, death/walk/idle priority; mouth wave in both directions; five summons once at 30/60/144 fps, no contact damage, hit/death interruption, single DNA reward, blood stain and mid-fall/settled room restore, encounter cap';
}};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/game.js', lambda route: route.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('screamerTest.ready'))
    print(page.evaluate('screamerTest.run()'))
    assert not errors, errors
    browser.close()
