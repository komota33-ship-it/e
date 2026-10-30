"""Floor 25 Mama: summons, surrender, mercy, execution, saves and descent."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.mamaTest={ready:artReady,run(){
 startGame();floor=25;generateLevel();transitionTime=0;
 const mama=enemies.find(e=>e.type==='mama');
 if(!mama||mama.hp!==700)throw Error('Mama missing');
 const sheet=(spriteAnimator ||= createSpriteAnimator(ctx,art)).framesFor('mama');
 if(!sheet||sheet.frames.length!==12||sheet.deathFrames.length!==8||sheet.surrenderFrames.length!==8)throw Error('Mama art incomplete');
 const lift=liftObject();player.x=lift.x;interact();if(floor!==25)throw Error('Lift opens early');
 enemies=[mama];player.x=mama.x-240;camera=cameraTarget();render();
 const before=canvas.toDataURL('image/png');
 mama.moveBlend=1;mama.phase=Math.PI*.7;render();const walk=canvas.toDataURL('image/png');mama.moveBlend=0;
 beginEnemyAttack(mama,'summon');mama.attack.time=mama.attack.windup+.05;render();
 const attack=canvas.toDataURL('image/png');mama.attack=null;
 for(let i=0;i<3;i++){
   mama.dir=-1;mama.targetX=player.x;mama.targetY=player.y;
   beginEnemyAttack(mama,'summon');mama.attack.time=mama.attack.windup+.01;
   resolveEnemyImpact(mama,mama.attack);
 }
 if(enemies.filter(e=>e.summonedBy==='mama').length!==5)throw Error('Cult follower cap broken');
 enemies=[mama];mama.attack=null;
 damageEnemy(mama,900,{sourceX:player.x});
 if(!mama.surrender||mama.life!==84||mama.attack)throw Error('Mama did not surrender');
 updateEnemy(mama,1);render();const surrender=canvas.toDataURL('image/png');
 player.x=mama.x-30;camera=cameraTarget();
 if(interactionTarget()?.type!=='mama')throw Error('Mercy prompt missing');
 const dna=profile.dna;interact();
 if(!mama.spared||profile.dna-dna!==100||!crates.find(c=>c.id==='mama-cache'&&c.loot.some(i=>i.type==='antidote')))throw Error('Mercy reward missing');
 if(!checkpoint?.session?.active?.enemies?.find(e=>e.type==='mama'&&e.spared))throw Error('Mercy not saved');
 damageEnemy(mama,9999);if(mama.life!==84||profile.dna-dna!==100)throw Error('Spared Mama can be killed or farmed');
 startGame(true);transitionTime=0;
 if(!enemies.find(e=>e.type==='mama'&&e.spared)||!crates.find(c=>c.id==='mama-cache'))throw Error('Mercy did not restore');
 player.x=lift.x;interact();if(floor!==24)throw Error('Mercy did not open lift');
 floor=25;generateLevel();transitionTime=0;
 const other=enemies.find(e=>e.type==='mama');enemies=[other];player.x=other.x-200;
 const dna2=profile.dna;damageEnemy(other,9999,{sourceX:player.x});
 if(!other.surrender||other.life!==84)throw Error('Execution path has no surrender');
 damageEnemy(other,100,{sourceX:player.x});
 if(other.life>0||profile.dna-dna2!==200||!crates.find(c=>c.id==='mama-cache'&&!c.loot.some(i=>i.type==='antidote')))throw Error('Execution reward incorrect');
 enemies=[];camera=cameraTarget();updateDeaths(.9,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==24)throw Error('Execution did not open lift');
 return {before,walk,attack,surrender,fallen,mercyDna:100,executionDna:200,followers:5};
}};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('mamaTest.ready'))
    result = page.evaluate('mamaTest.run()')
    for kind in ('before','walk','attack','surrender','fallen'):
        (ROOT / 'dist' / f'mama-{kind}-work.png').write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors, errors
    print('PASS: floor 25 art, follower cap, surrender, mercy/save, execution, rewards and descent', result)
    browser.close()
