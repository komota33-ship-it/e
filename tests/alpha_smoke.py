"""Floor 10 Alpha Screamer: art, scream origin/horde, rewards and lift gate."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.alphaTest={ready:artReady,run(){
 startGame();floor=10;generateLevel();transitionTime=0;
 const boss=enemies.find(e=>e.type==='alpha');
 if(!boss||boss.hp!==250)throw Error('Floor 10 Alpha missing');
 const anim=(spriteAnimator ||= createSpriteAnimator(ctx,art)),sheet=anim.framesFor('alpha');
 if(!sheet||sheet.frames.length!==12)throw Error('Alpha art missing');
 const f=sheet.frames[6],mouth=anim.alphaScreamMouthFor();
 const expected={x:(1001-f.sx-f.hip)*sheet.scale,y:(400-f.sy-f.floor)*sheet.scale};
 if(Math.abs(mouth.x-expected.x)>.001||Math.abs(mouth.y-expected.y)>.001)throw Error('Scream misses mouth');
 const lift=liftObject();player.x=lift.x;interact();if(floor!==10)throw Error('Lift opens early');
 enemies=[boss];player.x=boss.x-230;camera=cameraTarget();render();
 const before=canvas.toDataURL('image/png');
 boss.dir=-1;boss.targetX=player.x;boss.targetY=player.y;
 beginEnemyAttack(boss,'scream');boss.attack.time=boss.attack.windup-.01;
 if(!stepEnemyAttack(boss,.02))throw Error('Scream has no impact');
 resolveEnemyImpact(boss,boss.attack);
 const children=enemies.filter(e=>e!==boss);
 if(children.length!==5||!particles.some(p=>p.ring))throw Error('Scream did not call horde');
 if(children.some(e=>e.hp!==(e.type==='walker'?44:22)||e.emergeTime!==.35))throw Error('Horde not scaled/emerging');
 particles.find(p=>p.ring).life=.55;
 enemies=[boss];render();const screaming=canvas.toDataURL('image/png');
 const dna=profile.dna;damageEnemy(boss,9999);
 if(profile.dna-dna!==200||!crates.find(c=>c.id==='alpha-cache'))throw Error('Alpha reward missing');
 damageEnemy(boss,9999);if(profile.dna-dna!==200)throw Error('Duplicate DNA');
 enemies=[];updateDeaths(.85,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==9)throw Error('Lift still blocked');
 return {before,screaming,fallen,mouth,dna:profile.dna-dna,children:children.length};
}};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1366,'height':768});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE);assert all(page.evaluate('alphaTest.ready'))
    result=page.evaluate('alphaTest.run()')
    for kind,name in [('before','alpha-work.png'),('screaming','alpha-scream-work.png'),('fallen','alpha-death-work.png')]:
        (ROOT/'dist'/name).write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert -60 < result['mouth']['x'] < 80 and -160 < result['mouth']['y'] < -30,result
    assert not errors,errors
    print('PASS: floor 10 Alpha art, mouth origin, five summons, locked lift, unique rewards and descent',result)
    browser.close()
