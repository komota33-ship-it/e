"""Check world-space death placement and record one off-centre boss with camera travel."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text() + '''
window.corpsePreview={ready:artReady,
 check(){
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  startGame();floor=0;generateLevel();transitionTime=0;shake=0;
  const draw=ctx.drawImage;let seen=[];
  ctx.drawImage=function(image,...args){
   if(image===art.death_boss){const m=ctx.getTransform();seen.push({x:m.e/renderScale,y:m.f/renderScale,args})}
   return draw.call(this,image,...args);
  };
  try{
   for(const dir of [-1,1])for(const x of [180,700,1250]){
    enemies=[];corpses=[];particles=[];stains=[];
    const e=makeEnemy('boss',x);e.dir=dir;enemies.push(e);damageEnemy(e,9999);
    const c=corpses[0];
    for(const age of [.01,.46,1.3]){
     c.deathAge=age;const bounds=[];
     for(const offset of [0,250,600]){
      camera=offset;seen=[];render();
      check(seen.length===1,'Boss corpse not rendered once');
      const call=seen[0];
      // Canvas transform storage rounds fractional display scales; allow 0.001 pixel.
      check(Math.abs(call.x-(x-offset))<.001&&Math.abs(call.y-GROUND)<.001,'Corpse placement '+JSON.stringify({call,x,offset,GROUND,renderScale,shake}));
      check(c.x===x&&c.y===GROUND&&c.dir===dir,'Corpse world coordinates changed');
      bounds.push(call.args);
     }
     check(bounds.every(a=>JSON.stringify(a)===JSON.stringify(bounds[0])),'Camera changes corpse pose or local placement');
    }
    const snapshot=captureScene();corpses=[];restoreScene(snapshot);
    check(corpses.length===1&&corpses[0].x===x&&corpses[0].deathAge===1.3,'Room return relocates or revives corpse');
   }
   for(const kind of ['walk','heavy','volley'])for(const time of [.2,.8,1.1]){
    enemies=[];corpses=[];particles=[];stains=[];projectiles=[];
    const e=makeEnemy('boss',900);e.dir=-1;e.cooldown=999;enemies.push(e);
    if(kind==='walk'){e.moveBlend=1}else{beginEnemyAttack(e,kind);e.attack.time=time}
    const dna=runDna,count=kills;damageEnemy(e,9999);damageEnemy(e,9999);
    updateEnemy(e,2);updateDeaths(.6);
    check(corpses.length===1&&corpses[0].attack===null&&corpses[0].x===900,'Boss death retains action or moves');
    check(kills===count+1&&runDna===dna+250&&projectiles.length===0,'Dead boss repeats reward or fires');
    const blood=JSON.stringify(stains);updateDeaths(2);
    check(stains.length===1&&stains[0].kind==='blood'&&JSON.stringify(stains)===blood,'Boss corpse repeats blood');
   }
  }finally{ctx.drawImage=draw}
  return 'PASS: boss death at three world positions, both directions and three camera offsets; fixed pose, floor contact, room restore, lethal walk/melee/volley interruption and single reward';
 },
 start(){
  startGame();floor=0;generateLevel();transitionTime=0;
  player.x=200;camera=cameraTarget();enemies=[makeEnemy('boss',900)];
  enemies[0].dir=-1;enemies[0].cooldown=999;
  spriteAnimator ||= createSpriteAnimator(ctx,art);spriteAnimator.framesFor('boss');
 },
 kill(){damageEnemy(enemies[0],9999)},
 state(){return {x:corpses[0]?.x,y:corpses[0]?.y,camera,age:corpses[0]?.deathAge}},
 record(){
  const chunks=[];window.corpseRecorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm'});
  corpseRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  corpseRecorder.onstop=()=>{const r=new FileReader();r.onload=()=>window.corpseVideo=r.result;r.readAsDataURL(new Blob(chunks,{type:'video/webm'}))};
  corpseRecorder.start();
 },stop(){corpseRecorder.stop()},png(){return canvas.toDataURL('image/png')}
};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/game.js', lambda route: route.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('corpsePreview.ready'))
    print(page.evaluate('corpsePreview.check()'), flush=True)
    page.evaluate('corpsePreview.start();corpsePreview.record()')
    page.wait_for_timeout(500)
    page.evaluate('corpsePreview.kill()')
    page.wait_for_function('corpsePreview.state().age >= 1.3')
    before = page.evaluate('corpsePreview.state()')
    (ROOT / 'dist/boss-death-position.png').write_bytes(
        base64.b64decode(page.evaluate('corpsePreview.png()').split(',')[1]))
    page.keyboard.down('d')
    page.keyboard.down('Shift')
    page.wait_for_timeout(3500)
    page.keyboard.up('Shift')
    page.keyboard.up('d')
    page.wait_for_timeout(500)
    after = page.evaluate('corpsePreview.state()')
    assert after['x'] == before['x'] and after['y'] == before['y'], (before, after)
    assert after['camera'] > before['camera'] + 100, (before, after)
    page.evaluate('corpsePreview.stop()')
    page.wait_for_function('window.corpseVideo')
    (ROOT / 'dist/boss-death-position.webm').write_bytes(
        base64.b64decode(page.evaluate('corpseVideo').split(',')[1]))
    assert not errors, errors
    print('PASS: recorded off-centre death and camera travel; corpse world position unchanged', before, after)
    browser.close()
