"""Combat phase, whole-frame proportions, corpse persistence, weather and restart checks."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.animationTest={ready:artReady,run(){
  const check=(condition,message)=>{if(!condition)throw Error(message)};
  startGame();enemies=[];player.x=500;hurtTime=0;
  function actor(type,x=460){return Object.assign(makeEnemy(type,x),{dir:1,cooldown:0,dashCooldown:0})}
  function tick(e,seconds){for(let t=0;t<seconds;t+=.01)updateEnemy(e,.01)}
  const e=actor('walker');beginEnemyAttack(e,'melee');tick(e,.2);
  check(player.hp===100,'Windup dealt damage');tick(e,.15);
  check(player.hp===95,'Contact should deal 5 once');hurtTime=0;tick(e,.4);
  check(player.hp===95,'Attack dealt damage twice');
  player.hp=100;hurtTime=0;const dodge=actor('walker');beginEnemyAttack(dodge,'melee');
  tick(dodge,.15);player.x=700;tick(dodge,.3);check(player.hp===100,'Moving out of reach must dodge');
  const interrupted=actor('walker');beginEnemyAttack(interrupted,'melee');damageEnemy(interrupted,1);
  check(!interrupted.attack,'Hit should interrupt windup');damageEnemy(interrupted,100);tick(interrupted,1);
  check(player.hp===100,'Dead enemy attacked');
  enemies=[];const scream=actor('screamer');enemies.push(scream);beginEnemyAttack(scream,'scream');tick(scream,.7);
  check(enemies.length===6,'Scream must summon exactly five');tick(scream,.5);check(enemies.length===6,'Scream repeated');
  projectiles=[];const spit=actor('spitter',400);beginEnemyAttack(spit,'spit');tick(spit,.4);
  check(projectiles.length===0,'Acid emitted before attack');tick(spit,.2);
  check(projectiles.length===1&&projectiles[0].damage===12,'Spit should emit one 12-damage projectile');
  const runner=actor('runner',400);beginEnemyAttack(runner,'dash');tick(runner,.2);
  check(runner.x===400,'Dash moved before windup');tick(runner,.2);
  check(runner.x>420&&runner.dashCooldown>2.5,'Dash timing/cooldown invalid');
  enemies=[];corpses=[];player.x=500;player.hp=100;hurtTime=0;
  const brute=actor('brute');damageEnemy(brute,1000);updateDeaths(.5);
  check(player.hp===100,'Brute exploded too early');updateDeaths(.2);
  check(player.hp===80&&corpses[0].exploded,'Brute delayed blast missing');hurtTime=0;updateDeaths(1);
  check(player.hp===80,'Brute exploded twice');
  check(particles.some(p=>p.organic&&p.explosion),'Organic burst effect missing');
  check(particles.filter(p=>p.chunk).length===12,'Flying fragments missing');
  check(stains.some(s=>s.kind==='blood')&&stains.some(s=>s.kind==='slime'),'Burst pools missing');
  let corpseDraws=0,burstDraws=0;const drawBefore=ctx.drawImage;
  ctx.drawImage=function(image,...args){if([art.motion_brute,art.walk_brute,art.melee_brute,art.death_brute].includes(image))corpseDraws++;if(image===art.brute_burst)burstDraws++;return drawBefore.call(this,image,...args)};
  try {render()} finally {ctx.drawImage=drawBefore}
  check(corpseDraws===0&&burstDraws===1,'Exploded body persisted or burst sprite not rendered');
  const animator=createSpriteAnimator(ctx,art),types=['player',...Object.keys(enemyTypes)],report=[];
  for(const type of types){
    const sheet=animator.framesFor(type);check(sheet&&sheet.frames.length===12,'Missing poses '+type);
    if(['player','walker','runner','spitter','brute','screamer','armored','boss'].includes(type)){
      check(sheet.walkFrames.length===8,'Missing eight-frame walk '+type);
      const heights=sheet.walkFrames.map(f=>f.visibleHeight);
      check(Math.max(...heights)/Math.min(...heights)<1.12,'Walk silhouette height jumps '+type);
      check(sheet.walkFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1),'Walk frame clips a limb '+type);
      check(sheet.walkFrames.every(f=>f.floor>0&&f.floor<=f.height),'Invalid foot registration '+type);
    }
    const heights=sheet.frames.slice(0,4).map(f=>f.visibleHeight);
    check(Math.max(...heights)/Math.min(...heights)<1.12,'Walk scale changed '+type);
    check(sheet.frames[11].visibleHeight<heights[0]*.5,'Corpse should lie down '+type);
    const scales=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===art['motion_'+type]||image===art['death_'+type]||image===art['walk_'+type]||(type==='player'&&image===art.hero_torso))scales.push([args[6]/args[2],args[7]/args[3],image===art['death_'+type]?'death':image===art['walk_'+type]?'walk':image===art.hero_torso?'torso':'body']);return draw.call(this,image,...args)};
    try{for(let i=0;i<8;i++)animator.draw({moveBlend:1,phase:i*Math.PI/4+.01},{type,x:100,y:200,dir:1});
      for(let i=0;i<4;i++)animator.draw({deathAge:i*.4},{type,x:100,y:200,dir:1});
    }finally{ctx.drawImage=draw}
    check(scales.length===12,'Missing body render '+type);
    check(scales.every(([x,y])=>Math.abs(x-y)<1e-8),'Body stretched '+type);
    for(const kind of ['body','walk','torso','death']){const same=scales.filter(s=>s[2]===kind);check(same.every(s=>Math.abs(s[0]-same[0][0])<1e-8),'Body scale changes between poses '+type)}
    report.push({type,height:Math.round(heights[0]*sheet.scale),death:Math.round(sheet.deathFrames ? sheet.deathFrames.at(-1).visibleHeight*sheet.deathScale : sheet.frames[11].visibleHeight*sheet.scale)});
  }
  for(const dir of [-1,1]){
    const calls=[],draw=ctx.drawImage,e=actor('spitter');e.moveBlend=1;
    ctx.drawImage=function(image,...args){calls.push({image,args});return draw.call(this,image,...args)};
    try{
      for(let i=0;i<8;i++){e.phase=(i+.2)*Math.PI/4;animator.draw(e,{type:'spitter',x:400,y:GROUND,dir})}
      e.moveBlend=0;animator.draw(e,{type:'spitter',x:400,y:GROUND,dir});
      e.moveBlend=1;beginEnemyAttack(e,'spit');e.attack.time=.52;
      animator.draw(e,{type:'spitter',x:400,y:GROUND,dir});
      e.attack=null;animator.draw(e,{type:'spitter',x:400,y:GROUND,dir});
      e.deathAge=.4;animator.draw(e,{type:'spitter',x:400,y:GROUND,dir});
    }finally{ctx.drawImage=draw}
    check(calls.length===12,'Unexpected Spitter draw count');
    check(calls.slice(0,8).every(c=>c.image===art.walk_spitter),'Spitter walk not used');
    check(new Set(calls.slice(0,8).map(c=>c.args[0]+','+c.args[1])).size===8,'Spitter repeats walk pose');
    check(calls[8].image===art.motion_spitter&&calls[9].image===art.spit_spitter&&calls[10].image===art.walk_spitter&&calls[11].image===art.death_spitter,'Spitter movement/idle/spit/death priority');
  }
  const dashSheet=animator.framesFor('runner'),dashImage=art.dash_runner;
  check(dashSheet.dashFrames?.length===8,'Missing Runner dash poses');
  check(dashSheet.dashFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1&&f.bounds.y0>0&&f.bounds.y1<f.height-1),'Dash clips a limb');
  for(const dir of [-1,1]){
    const calls=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===dashImage)calls.push(args);return draw.call(this,image,...args)};
    try {for(const time of [.04,.13,.23,.30,.46,.58,.73,.88]){
      const e=actor('runner');beginEnemyAttack(e,'dash');e.attack.time=time;
      animator.draw(e,{type:'runner',x:400,y:GROUND,dir});
    }}finally{ctx.drawImage=draw}
    check(calls.length===8&&new Set(calls.map(a=>a[0]+','+a[1])).size===8,'Dash phase skipped or repeated');
    calls.forEach((a,i)=>{
      const f=dashSheet.dashFrames[i],s=dashSheet.dashScale;
      check(Math.abs(a[6]/a[2]-s)<1e-8&&Math.abs(a[7]/a[3]-s)<1e-8,'Dash stretches body');
      check(Math.abs(a[5]+f.floor*s)<1e-8,'Dash soles leave ground');
    });
  }
  // Simulate real asynchronous loading after the menu has cached a base sheet.
  for(const type of ['walker','runner','spitter','brute','screamer','armored','boss']){
    const delayedArt={['motion_'+type]:art['motion_'+type]},late=createSpriteAnimator(ctx,delayedArt);
    let cached=late.framesFor(type);
    check(!cached.walkFrames&&!cached.deathFrames&&!cached.meleeFrames,'Late-asset fixture invalid');
    for(const layer of ['walk','death','dash','melee','spit','scream']){
      const image=art[layer+'_'+type];if(!image)continue;
      delayedArt[layer+'_'+type]=image;
      const next=late.framesFor(type);
      check(next!==cached&&next[layer+'Frames']?.length===8,'Late atlas was ignored '+layer+' '+type);
      check(late.framesFor(type)===next,'Unchanged assets rebuild cache');cached=next;
    }
  }
  for(const [type,kind,windup,times] of [
    ['walker','melee',.3,[.04,.15,.25,.32,.4,.48,.64,.8]],
    ['armored','melee',.3,[.04,.15,.25,.32,.4,.48,.64,.8]],
    ['runner','runner',.17,[.02,.08,.15,.19,.26,.32,.43,.54]],
    ['brute','heavy',.5,[.05,.25,.45,.54,.63,.75,1,1.25]],
    ['boss','heavy',.5,[.05,.25,.45,.54,.63,.75,1,1.25]],
  ]) {
  const meleeSheet=animator.framesFor(type),meleeImage=art['melee_'+type];
  check(meleeSheet.meleeFrames?.length===8,'Missing eight-frame melee');
  check(meleeSheet.meleeFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1&&f.bounds.y0>0&&f.bounds.y1<f.height-1),'Melee clips limb');
  for(const dir of [-1,1]){
    const calls=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===meleeImage)calls.push(args);return draw.call(this,image,...args)};
    try{
      for(const time of times){
        const e=actor(type);beginEnemyAttack(e,kind);e.attack.time=time;
        animator.draw(e,{type,x:400,y:GROUND,dir});
      }
      const dead=actor(type);beginEnemyAttack(dead,kind);dead.deathAge=.2;
      animator.draw(dead,{type,x:400,y:GROUND,dir});
    }finally{ctx.drawImage=draw}
    check(calls.length===8&&new Set(calls.map(a=>a[0]+','+a[1])).size===8,'Wrong melee frames or attack overrides death');
    const s=meleeSheet.meleeScale,first=meleeSheet.meleeFrames[0];
    const toe=(first.footRight-first.anchor)*s;
    calls.forEach((a,i)=>{
      const f=meleeSheet.meleeFrames[i];
      check(Math.abs(a[6]/a[2]-s)<1e-8&&Math.abs(a[7]/a[3]-s)<1e-8,'Melee stretches body');
      check(Math.abs(a[5]+f.floor*s)<1e-8,'Melee foot leaves ground');
      check(Math.abs(a[4]+f.footRight*s-toe)<1e-8,'Melee planted toe slides');
    });
  }
  for(const hz of [30,60,144])for(const dir of [-1,1]){
    player.x=600+dir*35;player.infection=0;player.maxHp=100;player.hp=100;hurtTime=0;
    const e=actor(type,600);e.dir=dir;beginEnemyAttack(e,kind);
    while(e.attack){const time=e.attack.time;hurtTime=0;updateEnemy(e,1/hz);
      if(time+1/hz<windup)check(player.hp===100,'Melee damaged during windup');
    }
    check(e.x===600&&player.hp===100-e.damage&&player.infection===10,'Melee movement, repeated hit or infection');
  }
  for(const behavior of ['dodge','interrupt']){
    player.x=635;player.infection=0;player.maxHp=100;player.hp=100;hurtTime=0;
    const e=actor(type,600);beginEnemyAttack(e,kind);tick(e,.08);
    if(behavior==='dodge')player.x=800;else damageEnemy(e,1);
    tick(e,windup+.15);check(player.hp===100,'Melee should miss after '+behavior);
  }
  }
  // Boss melee must not replace the separate ranged action or its death poses.
  {
    const e=actor('boss',600),calls=[],draw=ctx.drawImage;e.moveBlend=1;
    ctx.drawImage=function(image,...args){calls.push(image);return draw.call(this,image,...args)};
    try{
      beginEnemyAttack(e,'volley');e.attack.time=.8;animator.draw(e,{type:'boss',x:600,y:GROUND});
      beginEnemyAttack(e,'heavy');e.attack.time=.6;animator.draw(e,{type:'boss',x:600,y:GROUND});
      e.deathAge=.3;animator.draw(e,{type:'boss',x:600,y:GROUND});delete e.deathAge;
      e.attack=null;animator.draw(e,{type:'boss',x:600,y:GROUND});
      e.moveBlend=0;animator.draw(e,{type:'boss',x:600,y:GROUND});
    }finally{ctx.drawImage=draw}
    check(calls.length===5&&calls[0]===art.volley_boss&&calls[1]===art.melee_boss&&calls[2]===art.death_boss&&calls[3]===art.walk_boss&&calls[4]===art.motion_boss,'Boss volley/melee/death/walk/idle priority');
  }
  for(const dir of [-1,1]){
    const travel=[];player.x=600+dir*400;
    for(const health of [1,.49]){
      const e=actor('boss',600);e.dir=dir;e.life=e.hp*health;e.cooldown=999;
      rememberTarget(e,player.x,player.y,'sight');const phase=e.phase;tick(e,.5);
      const distance=(e.x-600)*dir;travel.push(distance);
      check(distance>0&&Math.abs(e.phase-phase-distance/62*Math.PI*2)<1e-8,'Boss gait ignores distance or facing');
    }
    check(Math.abs(travel[1]/travel[0]-2.2)<1e-8,'Boss low-health movement changed');
  }
  projectiles=[];const volleyBoss=actor('boss',600);beginEnemyAttack(volleyBoss,'volley');
  tick(volleyBoss,.6);check(projectiles.length===0,'Boss volley emits during windup');
  tick(volleyBoss,.2);check(projectiles.length===3,'Boss volley lost three projectiles');
  tick(volleyBoss,.8);check(projectiles.length===3,'Boss volley repeated during recovery');
  for(const hz of [20,30,60,144])for(const dir of [-1,1]){
    player.x=600+dir*60;player.infection=0;player.maxHp=100;player.hp=100;hurtTime=0;
    const e=actor('runner',600);e.dir=dir;beginEnemyAttack(e,'dash');
    while(e.attack){hurtTime=0;updateEnemy(e,1/hz)}
    check(Math.abs(e.x-(600+dir*83.7))<1e-7,'Dash range depends on FPS');
    check(player.hp===100-e.damage,'Dash should hit exactly once '+JSON.stringify({hz,dir,hp:player.hp,damage:e.damage,infection:player.infection}));
  }
  const spitSheet=animator.framesFor('spitter');
  check(spitSheet.spitFrames?.length===8,'Missing eight-frame spit');
  check(spitSheet.spitFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1&&f.bounds.y0>0&&f.bounds.y1<f.height-1),'Spit clips body');
  for(const dir of [-1,1]){
    const calls=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===art.spit_spitter)calls.push(args);return draw.call(this,image,...args)};
    try {for(const time of [.05,.25,.45,.52,.61,.69,.85,1.1]){
      const e=actor('spitter');beginEnemyAttack(e,'spit');e.attack.time=time;
      animator.draw(e,{type:'spitter',x:400,y:GROUND,dir});
    }}finally{ctx.drawImage=draw}
    check(calls.length===8&&new Set(calls.map(a=>a[0]+','+a[1])).size===8,'Spit skips phase');
    const s=spitSheet.spitScale,first=spitSheet.spitFrames[0],toe=(first.footRight-first.anchor)*s;
    calls.forEach((a,i)=>{
      const f=spitSheet.spitFrames[i];
      check(Math.abs(a[6]/a[2]-s)<1e-8&&Math.abs(a[7]/a[3]-s)<1e-8,'Spit stretches body');
      check(Math.abs(a[5]+f.floor*s)<1e-8&&Math.abs(a[4]+f.footRight*s-toe)<1e-8,'Spit foot slides');
    });
    // Check gameplay emission against the lip on the actual drawn active pose.
    for(const hz of [30,60,144]){
      const e=actor('spitter',600);e.dir=dir;e.targetX=600+dir*250;e.targetY=GROUND;
      projectiles=[];beginEnemyAttack(e,'spit');player.x=600-dir*300;
      while(e.attack){const time=e.attack.time;updateEnemy(e,1/hz);if(time+1/hz<.5)check(!projectiles.length,'Early spit');}
      check(projectiles.length===1&&projectiles[0].damage===12,'Spit repeats or changes damage');
      const a=calls[3],x=600+dir*e.size*(a[4]+(1489-a[0])*s),y=e.y+e.size*(a[5]+(206-a[1])*s),p=projectiles[0];
      check(Math.abs(p.x-x)<1e-6&&Math.abs(p.y-y)<1e-6,'Acid did not start at rendered mouth');
      check(p.vx*dir===235,'Acid reversed direction');
      const flight=Math.max(.3,Math.abs((600+dir*250)-x)/235);
      check(Math.abs(p.vy-((GROUND-65-y)/flight-32.5*flight))<1e-6,'Spit retargeted moved player');
    }
  }
  for(const lethal of [false,true]){
    projectiles=[];const e=actor('spitter');beginEnemyAttack(e,'spit');tick(e,.2);
    damageEnemy(e,lethal?1000:1);tick(e,.6);
    check(projectiles.length===0,'Interrupted/dead spitter emitted acid');
  }
  const oldSpit=createSpriteAnimator(ctx,{motion_spitter:art.motion_spitter});
  check(oldSpit.spitMouthFor({}).x===20&&oldSpit.spitMouthFor({}).y===-107,'Missing-atlas fallback changed');
  // Exercise every new fall pose in both directions, through the real renderer.
  for(const type of ['player','walker','runner','spitter','brute','screamer','armored','boss']) {
  const fall=animator.framesFor(type);
  check(fall.deathFrames?.length===8,'Missing detailed fall '+type);
  check(fall.deathFrames.every(f=>f.bounds.x0>0&&f.bounds.x1<f.width-1&&f.bounds.y0>0&&f.bounds.y1<f.height-1),'Death crop clips body');
  check(fall.deathFrames[7].visibleHeight<fall.deathFrames[0].visibleHeight*(type==='brute'?.5:.35),'Final corpse is not prone');
  check(Math.abs(fall.deathFrames[0].visibleHeight*fall.deathScale-124)<.01,'Death changes standing height');
  for(const dir of [-1,1]){
    const calls=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===art['death_'+type])calls.push(args);return draw.call(this,image,...args)};
    try {for(let i=0;i<8;i++)animator.draw({deathAge:(i+.1)*(type==='brute'?BRUTE_BURST_DELAY:type==='boss'?1.2:.9)/8,moveBlend:1},{type,x:400,y:GROUND,dir});
      animator.draw({deathAge:100},{type,x:400,y:GROUND,dir});
    }finally{ctx.drawImage=draw}
    check(calls.length===9,'Fall drew from wrong sheet');
    check(new Set(calls.slice(0,8).map(a=>a[0]+','+a[1])).size===8,'Death skipped or repeated frames');
    check(JSON.stringify(calls[7])===JSON.stringify(calls[8]),'Final corpse pose drifts');
    for(let i=0;i<8;i++){
      const a=calls[i],f=fall.deathFrames[i],s=fall.deathScale;
      check(Math.abs(a[6]/a[2]-s)<1e-8&&Math.abs(a[7]/a[3]-s)<1e-8,'Death stretches body');
      check(Math.abs(a[5]+f.floor*s)<1e-8,'Death leaves floor');
      const origin=f.sx-a[4]/s-(i%4)*art['death_'+type].width/4;
      check(Math.abs(origin-(fall.deathFrames[0].sx+fall.deathFrames[0].hip))<1e-8,'Gutter moves corpse origin');
    }
  }
  }
  enemies=[];corpses=[];const victim=actor('walker');enemies.push(victim);
  const dnaBefore=runDna,killsBefore=kills;
  damageEnemy(victim,1000);damageEnemy(victim,1000);updateDeaths(2);
  check(corpses.length===1&&kills===killsBefore+1&&runDna===dnaBefore+5,'Death duplicates corpse/reward');
  const dead=corpses[0];updateEnemy(victim,1);
  check(!victim.attack&&dead.deathAge>=2,'Dead Walker resumes attack');
  // A lethal hit interrupts every stage of a Runner action without further movement or damage.
  for(const kind of ['run','dash','runner'])for(const stage of ['windup','active','recovery']){
    enemies=[];corpses=[];player.x=500;player.hp=100;hurtTime=0;
    const victim=actor('runner',460);enemies.push(victim);victim.moveBlend=1;
    if(kind!=='run'){
      beginEnemyAttack(victim,kind);
      const a=victim.attack;
      a.time=stage==='windup'?a.windup*.5:stage==='active'?a.windup+a.active*.5:a.windup+a.active+a.recovery*.5;
    }
    const x=victim.x,dna=runDna,count=kills;
    damageEnemy(victim,1000);damageEnemy(victim,1000);
    tick(victim,1);updateDeaths(1);
    check(victim.x===x&&player.hp===100,'Dead Runner continued dash or attack');
    check(corpses.length===1&&corpses[0].attack===null&&corpses[0].state==='death','Runner retained live attack in corpse');
    check(kills===count+1&&runDna===dna+8,'Runner death duplicates DNA');
    const snapshot=captureScene();corpses=[];restoreScene(snapshot);
    check(corpses.length===1&&corpses[0].deathAge===1,'Room restore restarts fall');
  }
  for(const dir of [-1,1])for(const [time,expected] of [[.2,0],[.53,1],[.8,1]]){
    enemies=[];corpses=[];projectiles=[];stains=[];particles=[];
    const e=actor('spitter',600);e.dir=dir;e.targetX=600+dir*250;e.targetY=GROUND;enemies.push(e);
    beginEnemyAttack(e,'spit');tick(e,time);
    check(projectiles.length===expected,'Spitter death setup has wrong projectile count');
    const missiles=[...projectiles],dna=runDna,count=kills;
    damageEnemy(e,1000);damageEnemy(e,1000);tick(e,2);updateDeaths(.6);
    check(corpses.length===1&&corpses[0].attack===null&&kills===count+1&&runDna===dna+12,'Spitter death repeats corpse/reward');
    check(projectiles.length===expected&&projectiles.every((p,i)=>p===missiles[i]),'Death emits another acid shot or deletes a flying shot');
    check(particles.some(p=>p.fluid==='slime'),'Spitter lacks slime particles');
    check(stains.length===1&&stains[0].kind==='slime'&&stains[0].active===0,'Spitter death lacks cosmetic slime stain');
    const stain=JSON.stringify(stains);updateDeaths(2);
    check(JSON.stringify(stains)===stain,'Death adds repeat slime stain');
    const scene=captureScene();corpses=[];restoreScene(scene);
    check(corpses.length===1&&corpses[0].deathAge===2.6,'Returning to room restarts Spitter death');
  }
  // A fatal hit stops the shield strike at every stage, including after contact.
  for(const dir of [-1,1])for(const time of [-1,.15,.35,.6]){
    enemies=[];corpses=[];particles=[];stains=[];player.x=600+dir*35;player.hp=100;hurtTime=0;
    const e=actor('armored',600);e.dir=dir;e.moveBlend=1;enemies.push(e);
    if(time>=0){beginEnemyAttack(e,'melee');tick(e,time)}
    const hp=player.hp,x=e.x,dna=runDna,count=kills;
    damageEnemy(e,1000);damageEnemy(e,1000);hurtTime=0;tick(e,2);updateDeaths(.6);
    check(player.hp===hp&&e.x===x,'Dead Armored continues shield strike or walking');
    check(corpses.length===1&&corpses[0].dir===dir&&corpses[0].attack===null,'Armored corpse retains attack or turns');
    check(kills===count+1&&runDna===dna+25,'Armored death duplicates reward');
    check(stains.length===1&&stains[0].kind==='blood','Armored death lacks blood stain');
    const blood=JSON.stringify(stains),scene=captureScene();corpses=[];stains=[];restoreScene(scene);
    check(corpses.length===1&&corpses[0].deathAge===.6&&JSON.stringify(stains)===blood,'Room restore restarts Armored fall');
    updateDeaths(1.4);const settled=captureScene();corpses=[];restoreScene(settled);
    check(corpses[0].deathAge===2&&JSON.stringify(stains)===blood,'Armored corpse moves or repeats blood after return');
  }
  for(const dir of [-1,1])for(const stage of ['windup','active','recovery']){
    enemies=[];corpses=[];particles=[];stains=[];player.x=500;player.hp=100;hurtTime=0;
    const e=actor('brute',460);e.dir=dir;beginEnemyAttack(e,'heavy');
    const a=e.attack;a.time=stage==='windup'?.2:stage==='active'?.6:1;
    const dna=runDna,count=kills;
    damageEnemy(e,1000);damageEnemy(e,1000);tick(e,.5);updateDeaths(.64);
    check(player.hp===100&&corpses.length===1&&!corpses[0].exploded,'Dead Brute hits or explodes early');
    check(kills===count+1&&runDna===dna+20,'Brute death duplicates reward');
    updateDeaths(.02);check(player.hp===80&&corpses[0].exploded,'Brute lost delayed explosion');
    const burst=particles.find(p=>p.organic&&p.explosion),fall=animator.framesFor('brute'),pose=fall.deathFrames[7];
    check(burst.y>e.y-45&&burst.y<e.y-20,'Explosion floats above prone Brute');
    const localX=(burst.x-e.x)/dir/e.size/fall.deathScale+pose.anchor;
    const localY=(burst.y-e.y)/e.size/fall.deathScale+pose.floor;
    check(localX>pose.bounds.x0&&localX<pose.bounds.x1&&localY>pose.bounds.y0&&localY<pose.bounds.y1,'Explosion detached from corpse');
    check(particles.filter(p=>p.chunk).length===12&&particles.filter(p=>p.chunk).every(p=>p.x===burst.x&&p.y===burst.y),'Fragments have different origin');
    const calls=[],draw=ctx.drawImage;
    ctx.drawImage=function(image,...args){if(image===art.brute_burst)calls.push(args);return draw.call(this,image,...args)};
    try{render()}finally{ctx.drawImage=draw}
    check(calls.length===1,'Burst missing from real renderer');
    const b=calls[0];
    check(Math.abs(b[4]+192*b[6]/b[2]-(burst.x-camera))<.01&&Math.abs(b[5]+375*b[7]/b[3]-burst.y)<.01,'Rendered core misses belly');

    hurtTime=0;updateDeaths(1);check(player.hp===80&&particles.filter(p=>p.organic&&p.explosion).length===1,'Brute explosion repeats');
  }
  const pane=document.createElement('canvas');pane.width=160;pane.height=120;const pc=pane.getContext('2d');
  drawWindowWeather(pc,[{x:30,y:20,w:70,h:60}],3,0);
  const pixels=pc.getImageData(0,0,160,120).data;let inside=0;
  for(let y=0;y<120;y++)for(let x=0;x<160;x++)if(pixels[(y*160+x)*4+3]){
    check(x>=30&&x<100&&y>=20&&y<80,'Rain leaked outside glass');inside++;
  }
  check(inside>0,'No weather drawn');
  hurtTime=0;hurt(1000);update(.5);check(player.deathAge>0,'Player death not advancing');
  generateLevel();check(player.deathAge===undefined,'Restart retained death pose');
  return report;
}};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE)
 assert all(page.evaluate('animationTest.ready'))
 print(page.evaluate('animationTest.run()'))
 assert not errors,errors
 print('PASS: windup/contact/dodge/interruption, scream, eight-frame Spitter walk and pose transitions, eight spit poses, rendered-mouth emission and fixed target, dash, delayed blast after interrupted heavy strike, uniform whole-body scale, eight dash poses and exact travel across frame rates, late-loaded atlases refresh cache, Walker/Runner/Brute/Armored/Boss melee planted foot, dodge, interruption and single impact, eight-frame falls for all six ordinary enemies, grounded belly burst in both directions, lethal interruption of run/dash/melee, single corpse/reward, Spitter slime and surviving projectiles, settled corpses, window clipping, death reset')
 b.close()
