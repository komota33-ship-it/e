"""Floor 30 Elena? encounter: art, false copies, pulse, reward and descent."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.elenaTest={ready:artReady,run(){
 startGame();floor=30;generateLevel();transitionTime=0;
 const boss=enemies.find(e=>e.type==='elena'&&!e.cloned);
 if(!boss||boss.hp!==800)throw Error('Elena? missing');
 const sheet=(spriteAnimator ||= createSpriteAnimator(ctx,art)).framesFor('elena');
 if(!sheet||sheet.frames.length!==12||sheet.walkFrames.length!==4||sheet.volleyFrames.length!==8||sheet.deathFrames.length!==8)throw Error('Elena art incomplete');
 const lift=liftObject();player.x=lift.x;interact();if(floor!==30)throw Error('Lift opens early');
 enemies=[boss];player.x=boss.x-255;camera=cameraTarget();render();const before=canvas.toDataURL('image/png');
 const origin=spriteAnimator.elenaPulseOriginFor();
 if(!(origin.x>20&&origin.x<150&&origin.y<0&&origin.y>-130))throw Error('Pulse origin detached '+JSON.stringify(origin));
 boss.dir=-1;boss.targetX=player.x;boss.targetY=player.y;
 beginEnemyAttack(boss,'volley');boss.attack.time=boss.attack.windup+.01;render();const volley=canvas.toDataURL('image/png');
 resolveEnemyImpact(boss,boss.attack);
 if(projectiles.filter(p=>p.kind==='echo'&&p.damage===14).length!==3)throw Error('Three teal pulses missing');
 render();const pulse=canvas.toDataURL('image/png');
 const oldInfection=player.infection;projectiles[0].x=player.x;projectiles[0].y=player.y-65;projectiles[0].vx=projectiles[0].vy=0;
 update(.02);if(player.infection<=oldInfection)throw Error('Viral pulse did not infect');
 projectiles=[];boss.attack=null;
 damageEnemy(boss,450,{sourceX:player.x});
 if(!boss.echoPhaseOne||enemies.filter(e=>e.cloned&&e.life>0).length!==2)throw Error('First echo phase missing');
 render();const echoes=canvas.toDataURL('image/png');
 const clone=enemies.find(e=>e.cloned&&e.life>0),dna=profile.dna,corpsesBefore=corpses.length;
 damageEnemy(clone,999,{sourceX:player.x});
 if(profile.dna!==dna||corpses.length!==corpsesBefore)throw Error('Clone gave reward or corpse');
 const other=enemies.find(e=>e.cloned&&e.life>0);updateEnemy(other,8);
 if(other.life!==0)throw Error('Clone did not expire');
 damageEnemy(boss,250,{sourceX:player.x});
 if(!boss.echoPhaseTwo||enemies.filter(e=>e.cloned&&e.life>0).length!==2)throw Error('Second echo phase missing');
 const dna2=profile.dna;damageEnemy(boss,9999,{sourceX:player.x});
 if(profile.dna-dna2!==200||!crates.find(c=>c.id==='elena-cache')||enemies.some(e=>e.cloned&&e.life>0))throw Error('Victory incorrect');
 damageEnemy(boss,9999);if(profile.dna-dna2!==200)throw Error('Duplicate victory reward');
 enemies=[];camera=cameraTarget();updateDeaths(.9,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==29)throw Error('Lift remains blocked');
 return {before,volley,pulse,echoes,fallen,origin,dna:profile.dna-dna2};
}};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('elenaTest.ready'))
    result = page.evaluate('elenaTest.run()')
    for kind in ('before','volley','pulse','echoes','fallen'):
        (ROOT / 'dist' / f'elena-{kind}-work.png').write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors, errors
    print('PASS: Elena? art, pulse/infection, two echo phases, no clone farming, reward and descent', result)
    browser.close()
