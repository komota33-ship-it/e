"""Floor 5 miniboss: art, summon limit, blocked lift, unique reward and descent."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.matriarchTest={ready:artReady,run(){
 startGame();floor=5;generateLevel();transitionTime=0;
 const boss=enemies.find(e=>e.type==='matriarch');
 if(!boss||boss.hp!==300)throw Error('Floor 5 miniboss missing');
 const artSheet=(spriteAnimator ||= createSpriteAnimator(ctx,art)).framesFor('matriarch');
 if(!artSheet||artSheet.frames.length!==12)throw Error('Matriarch art missing');
 const lift=liftObject();player.x=lift.x;interact();
 if(floor!==5)throw Error('Lift opens before boss defeat');
 enemies=[boss];player.x=boss.x-240;camera=cameraTarget();render();
 const before=canvas.toDataURL('image/png');
 boss.dir=-1;boss.targetX=player.x;boss.targetY=player.y;
 for(let round=0;round<4;round++){
  beginEnemyAttack(boss,'summon');boss.attack.time=boss.attack.windup-.01;
  if(!stepEnemyAttack(boss,.02))throw Error('Summon has no impact');
  resolveEnemyImpact(boss,boss.attack);
 }
 const children=enemies.filter(e=>e.summonedBy==='matriarch');
 if(children.length!==8)throw Error('Summon limit broken: '+children.length);
 enemies=[boss];render();const calling=canvas.toDataURL('image/png');enemies=[boss,...children];
 const dna=profile.dna;damageEnemy(boss,9999);
 if(profile.dna-dna!==200||runDna<200)throw Error('Boss rewards incorrect');
 const bag=crates.find(c=>c.id==='matriarch-cache');
 if(!bag||bag.loot.length!==3)throw Error('Supply bag missing');
 damageEnemy(boss,9999);
 if(profile.dna-dna!==200||crates.filter(c=>c.id==='matriarch-cache').length!==1)throw Error('Duplicate reward');
 enemies=[];updateDeaths(.85,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==4)throw Error('Lift remains blocked');
 return {before,calling,fallen,hp:boss.hp,children:children.length,dna:profile.dna-dna};
}};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1366,'height':768});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE);assert all(page.evaluate('matriarchTest.ready'))
    result=page.evaluate('matriarchTest.run()')
    for kind,name in [('before','matriarch-work.png'),('calling','matriarch-summon-work.png'),('fallen','matriarch-death-work.png')]:
        (ROOT/'dist'/name).write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors,errors
    print('PASS: floor 5 miniboss art, summon cap, locked lift, one-time DNA/supplies and descent',result)
    browser.close()
