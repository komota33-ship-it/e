"""Record a controlled enemy demonstration using the real game loop and canvas.

GAME_URL=http://127.0.0.1:3000 python3 tests/record_enemy_preview.py brute
Writes a WebM and a PNG to dist; does not create a release archive.
"""
import base64
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
ENEMY = sys.argv[1] if len(sys.argv) > 1 else 'brute'
CONFIG = {
    'brute': (30, 'heavy', 'melee_brute'),
    'walker': (50, 'melee', 'melee_walker'),
    'runner': (50, 'runner', 'melee_runner'),
    'spitter': (40, 'spit', 'spit_spitter'),
    'screamer': (20, 'scream', 'scream_screamer'),
    'armored': (10, 'melee', 'melee_armored'),
    'boss': (0, 'heavy', 'melee_boss'),
    'boss_volley': (0, 'volley', 'volley_boss'),
}
if ENEMY not in CONFIG:
    raise SystemExit('Enemy must be one of: ' + ', '.join(CONFIG))
level, attack_kind, attack_art = CONFIG[ENEMY]
enemy_type = 'boss' if ENEMY == 'boss_volley' else ENEMY
source = (ROOT / 'game.js').read_text() + '\nconst previewConfig=' + json.dumps(
    {'type': enemy_type, 'floor': level, 'attack': attack_kind, 'art': attack_art}
) + ';\n' + '''
window.enemyPreview={ready:artReady,
 start(){
  startGame();floor=previewConfig.floor;generateLevel();
  enemies=[makeEnemy(previewConfig.type,450),makeEnemy(previewConfig.type,850)];
  enemies[0].dir=1;enemies[1].dir=-1;player.x=650;camera=cameraTarget();transitionTime=0;
  spriteAnimator ||= createSpriteAnimator(ctx,art);spriteAnimator.framesFor(previewConfig.type);
  for(const e of enemies){e.cooldown=999;rememberTarget(e,player.x,player.y,'sight')}
 },
 attack(){for(const e of enemies){e.targetX=player.x;e.targetY=player.y;beginEnemyAttack(e,previewConfig.attack)}},
 kill(){for(const e of enemies)if(e.life>0)damageEnemy(e,9999)},
 record(){
  window.previewCounts={walk:0,attack:0,death:0,deathPoses:[],burst:0};const draw=ctx.drawImage;
  ctx.drawImage=function(image,...args){
   if(image===art['walk_'+previewConfig.type])previewCounts.walk++;
   if(image===art[previewConfig.art])previewCounts.attack++;
   if(image===art['death_'+previewConfig.type]||(!art['death_'+previewConfig.type]&&image===art['motion_'+previewConfig.type]&&args[1]>image.height*.6)){
    previewCounts.death++;
    const key=args.slice(0,4).join(',');
    if(!previewCounts.deathPoses.includes(key))previewCounts.deathPoses.push(key);
   }
   if(image===art.brute_burst)previewCounts.burst++;
   return draw.call(this,image,...args);
  };
  const chunks=[];window.previewRecorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm'});
  previewRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  previewRecorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>window.previewVideo=reader.result;
   reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));ctx.drawImage=draw};
  previewRecorder.start();
 },
 stop(){previewRecorder.stop()},png(){return canvas.toDataURL('image/png')}
};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda route: route.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('enemyPreview.ready')), 'An art asset failed to load'
    page.evaluate('enemyPreview.start();enemyPreview.record()')
    page.wait_for_timeout(3200)
    page.evaluate('enemyPreview.attack()')
    page.wait_for_timeout(800 if ENEMY == 'screamer' else 350 if ENEMY == 'armored' else 550)
    (ROOT / f'dist/{ENEMY}-motion-work.png').write_bytes(
        base64.b64decode(page.evaluate('enemyPreview.png()').split(',')[1]))
    page.wait_for_timeout(1250)
    page.evaluate('enemyPreview.kill()')
    if ENEMY == 'brute':
        page.wait_for_function('previewCounts.burst > 0')
        page.wait_for_timeout(110)
        (ROOT / 'dist/brute-burst-work.png').write_bytes(
            base64.b64decode(page.evaluate('enemyPreview.png()').split(',')[1]))
    page.wait_for_timeout(1200)
    (ROOT / f'dist/{ENEMY}-death-work.png').write_bytes(
        base64.b64decode(page.evaluate('enemyPreview.png()').split(',')[1]))
    page.evaluate('enemyPreview.stop()')
    page.wait_for_function('window.previewVideo')
    (ROOT / f'dist/{ENEMY}-motion-work.webm').write_bytes(
        base64.b64decode(page.evaluate('previewVideo').split(',')[1]))
    counts = page.evaluate('previewCounts')
    assert counts['walk'] > 10 and counts['attack'] > 0 and counts['death'] > 0, counts
    assert len(counts['deathPoses']) == 8, counts
    if ENEMY == 'brute':
        assert counts['burst'] > 0 and counts['death'] > 0, counts
    assert not errors, errors
    print(f'PASS: {ENEMY} walk, attack and death recorded without browser errors; {counts}')
    browser.close()
