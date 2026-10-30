"""Floor 15 shield miniboss: directional damage, gate, loot and corpse."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.carapaceTest={ready:artReady,run(){
 startGame();floor=15;generateLevel();transitionTime=0;
 const boss=enemies.find(e=>e.type==='carapace');
 if(!boss||boss.hp!==500)throw Error('Carapace missing');
 const sheet=(spriteAnimator ||= createSpriteAnimator(ctx,art)).framesFor('carapace');
 if(!sheet||sheet.frames.length!==12)throw Error('Carapace atlas incomplete');
 if(Math.abs((sheet.frames[4].footRight-sheet.frames[4].hip)-(sheet.frames[6].footRight-sheet.frames[6].anchor))>.001)throw Error('Shield slam slips planted boot');
 const lift=liftObject();player.x=lift.x;interact();if(floor!==15)throw Error('Lift opens early');
 enemies=[boss];boss.dir=-1;player.x=boss.x-230;camera=cameraTarget();render();
 const before=canvas.toDataURL('image/png');
 damageEnemy(boss,100,{sourceX:boss.x-230});
 if(boss.life!==485)throw Error('Front shield reduction');
 damageEnemy(boss,100,{sourceX:boss.x+230});
 if(boss.life!==335)throw Error('Weak rear damage');
 boss.dir=1;damageEnemy(boss,100,{sourceX:boss.x+230});
 if(boss.life!==320)throw Error('Shield does not turn with boss');
 boss.dir=-1;
 beginEnemyAttack(boss,'heavy');boss.attack.time=boss.attack.windup+.01;
 const draw=ctx.drawImage,poses=[];
 ctx.drawImage=function(image,...args){if(image===art.motion_carapace)poses.push(args.slice(0,4));return draw.call(this,image,...args)};
 try{render()}finally{ctx.drawImage=draw}
 if(!poses.some(p=>p[1]>art.motion_carapace.height/3&&p[1]<art.motion_carapace.height*2/3))throw Error('Shield attack pose missing');
 const slam=canvas.toDataURL('image/png');
 const dna=profile.dna;damageEnemy(boss,500,{sourceX:boss.x+230});
 if(profile.dna-dna!==200||!crates.find(c=>c.id==='carapace-cache'))throw Error('Reward missing');
 damageEnemy(boss,9999);if(profile.dna-dna!==200)throw Error('Duplicate reward');
 enemies=[];updateDeaths(.85,false);render();const fallen=canvas.toDataURL('image/png');
 player.x=lift.x;interact();if(floor!==14)throw Error('Lift remains blocked');
 return {before,slam,fallen,dna:profile.dna-dna,pose4:{hip:sheet.frames[4].hip,foot:sheet.frames[4].footRight},pose6:{hip:sheet.frames[6].hip,foot:sheet.frames[6].footRight,anchor:sheet.frames[6].anchor},scale:sheet.scale};
}};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1366,'height':768});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE);assert all(page.evaluate('carapaceTest.ready'))
    result=page.evaluate('carapaceTest.run()')
    for kind,name in [('before','carapace-work.png'),('slam','carapace-slam-work.png'),('fallen','carapace-death-work.png')]:
        (ROOT/'dist'/name).write_bytes(base64.b64decode(result.pop(kind).split(',')[1]))
    assert not errors,errors
    print('PASS: floor 15 shield/rear damage, turning, attack pose, unique reward and descent',result)
    browser.close()
