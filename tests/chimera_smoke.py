"""Floor 20 Chimera: art, mutations, acid attack, gate, reward, death."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.chimeraTest={ready:artReady,run(){
 startGame();floor=20;generateLevel();transitionTime=0;
 const boss=enemies.find(e=>e.type==='chimera');
 if(!boss||boss.hp!==600||boss.mutations.length!==2||new Set(boss.mutations).size!==2)throw Error('Boss or mutations missing');
 const sheet=(spriteAnimator ||= createSpriteAnimator(ctx,art)).framesFor('chimera');
 if(!sheet||sheet.frames.length!==12||sheet.walkFrames.length!==8||sheet.deathFrames.length!==8||sheet.spitFrames.length!==8)throw Error('Chimera art incomplete');
 const lift=liftObject();player.x=lift.x;interact();if(floor!==20)throw Error('Lift opens early');
 enemies=[boss];boss.dir=-1;player.x=boss.x-250;camera=cameraTarget();render();
 const before=canvas.toDataURL('image/png');
 boss.state='walk';boss.moveBlend=1;boss.phase=Math.PI*.8;render();
 const walk=canvas.toDataURL('image/png');boss.state='idle';boss.moveBlend=0;
 boss.mutations=['armored','regenerative'];
 damageEnemy(boss,100,{sourceX:player.x});if(boss.life!==530)throw Error('Armor mutation ignored');
 boss.regenDelay=0;updateEnemy(boss,1);if(boss.life<=530)throw Error('Regeneration mutation ignored');
 boss.mutations=['fast','acidic'];boss.speed=37*1.5;
 if(boss.speed!==55.5)throw Error('Fast mutation ignored');
 const origin=spriteAnimator.chimeraSpitOriginFor();
 if(!(origin.x>40&&origin.x<150&&origin.y<0&&origin.y>-125))throw Error('Acid origin detached from hand '+JSON.stringify(origin));
 boss.cooldown=0;boss.hit=0;boss.brain='chase';boss.seesPlayer=true;boss.targetX=player.x;boss.attack=null;
 beginEnemyAttack(boss,'spit');boss.attack.time=boss.attack.windup+.01;
 render();const spit=canvas.toDataURL('image/png');
 resolveEnemyImpact(boss,{kind:'spit',targetX:player.x,targetY:player.y});
 if(!projectiles.some(p=>p.kind==='acid'&&p.damage===16))throw Error('Acid attack missing');
 boss.mutations=['fast','armored'];launchAcid(boss,0,{x:player.x,y:player.y});
 if(!projectiles.some(p=>p.kind==='acid'&&p.damage===12))throw Error('Base acid attack missing');
 const dna=profile.dna;damageEnemy(boss,9999,{sourceX:player.x});
 if(profile.dna-dna!==200||!crates.find(c=>c.id==='chimera-cache'))throw Error('Boss reward missing');
 damageEnemy(boss,9999);if(profile.dna-dna!==200)throw Error('Duplicate reward');
 enemies=[];updateDeaths(.85,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==19)throw Error('Lift remains blocked');
 return {before,walk,spit,fallen,origin,mutations:boss.mutations,dna:profile.dna-dna};
}};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('chimeraTest.ready'))
    result = page.evaluate('chimeraTest.run()')
    for kind in ('before','walk','spit','fallen'):
        (ROOT / 'dist' / f'chimera-{kind}-work.png').write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors, errors
    print('PASS: Chimera art, two mutations, armor, regeneration, acid, lift gate, reward and descent', result)
    browser.close()
