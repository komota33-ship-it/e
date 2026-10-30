"""Check Object 0's volley uses the drawn claw and emits one three-shot burst."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.volleyTest={ready:artReady,run(){
 startGame();floor=0;generateLevel();transitionTime=0;
 const e=makeEnemy('boss',620);e.dir=1;e.targetX=player.x=1000;e.targetY=player.y=GROUND;
 enemies=[e];projectiles=[];
 spriteAnimator ||= createSpriteAnimator(ctx,art);
 const sheet=spriteAnimator.framesFor('boss');
 if(!sheet.volleyFrames||sheet.volleyFrames.length!==8)throw Error('Missing eight volley poses');
 const origin=spriteAnimator.bossVolleyOriginFor(), frame=sheet.volleyFrames[3];
 const expected={x:(1485-frame.sx-frame.anchor)*sheet.volleyScale,y:(280-frame.sy-frame.floor)*sheet.volleyScale};
 if(Math.abs(origin.x-expected.x)>.001||Math.abs(origin.y-expected.y)>.001)throw Error('Projectile detached from claw');
 beginEnemyAttack(e,'volley');e.attack.time=e.attack.windup-.01;
 const impact=stepEnemyAttack(e,.02);if(!impact)throw Error('No strike');
 resolveEnemyImpact(e,e.attack);
 if(projectiles.length!==3||new Set(projectiles.map(p=>p.vx)).size!==3)throw Error('Volley shot count/spread');
 for(const p of projectiles)
  if(Math.abs(p.x-(e.x+origin.x*e.size))>.001||Math.abs(p.y-(e.y+origin.y*e.size))>.001)throw Error('Shot misses claw');
 camera=cameraTarget();render();const warning=canvas.toDataURL('image/png');
 projectiles=[];addStain('slime',900,34,5);render();
 return {origin,shotX:e.x+origin.x*e.size,warning,puddle:canvas.toDataURL('image/png')};
}};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE);assert all(page.evaluate('volleyTest.ready'))
    result=page.evaluate('volleyTest.run()')
    assert 0 < result['origin']['x'] < 150 and -150 < result['origin']['y'] < -30,result
    for kind in ['warning','puddle']:
        (ROOT/f'dist/acid-{kind}-work.png').write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors,errors
    print('PASS: Object 0 has eight volley poses and fires three projectiles from the visible claw',result)
    browser.close()
