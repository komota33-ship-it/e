"""Real pointer input and update-loop regressions for vertical aim and walking."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.motionTest={ready:artReady,setup(dir){
 startGame();floor=50;generateLevel();enemies=[];obstacles=[];transitionTime=0;
 player.x=600;player.dir=dir;camera=cameraTarget();aim.active=false;
 return {x:player.x-camera,y:GROUND,viewW};
},step(n){const directions=[];for(let i=0;i<n;i++){update(1/60);directions.push(player.dir)}
 const origin=weaponOrigin(),dx=aim.x+camera-origin.x,dy=aim.y-origin.y;
 return {directions,angle:aim.angle,rayError:Math.abs(Math.cos(aim.angle)*dy-Math.sin(aim.angle)*dx),
 phase:player.phase,x:player.x,blend:player.moveBlend};
},render(){render()}};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
 page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3003'))
 assert all(page.evaluate('motionTest.ready'))
 def point(state,dx,dy):
  box=page.locator('#game').bounding_box()
  page.mouse.move(box['x']+(state['x']+dx)/state['viewW']*box['width'],box['y']+(state['y']+dy)/540*box['height'])
 for direction in [-1,1]:
  for offset in [-8,-3,0,3,8]:
   for vertical in [35,-210]:
    state=page.evaluate('motionTest.setup',direction);point(state,offset,vertical)
    result=page.evaluate('motionTest.step(180)')
    assert set(result['directions'])=={direction},(direction,offset,vertical,result)
    assert result['rayError']<1e-7,result
 # Intentional side crossing turns once; moving backward does not overwrite aim.
 state=page.evaluate('motionTest.setup',1);point(state,-45,35)
 assert set(page.evaluate('motionTest.step(30)')['directions'])=={-1}
 state=page.evaluate('motionTest.setup',1);point(state,250,-70)
 page.keyboard.down('a');result=page.evaluate('motionTest.step(30)');page.keyboard.up('a')
 assert result['x']<540 and result['phase']<0 and set(result['directions'])=={1},result
 # Stop blends to a settled stance without changing the aim side.
 result=page.evaluate('motionTest.step(60)');assert result['blend']<.001,result
 # Walk through a fixed downward cursor: one deliberate turn, no feedback loop.
 state=page.evaluate('motionTest.setup',1);point(state,0,35)
 page.keyboard.down('d');result=page.evaluate('motionTest.step(90)');page.keyboard.up('d')
 turns=sum(a!=b for a,b in zip(result['directions'],result['directions'][1:]))
 assert turns<=1,(turns,result)
 assert result['rayError']<1e-7,result
 # Also exercise actual drawing with a downward aiming arm during the gait.
 page.evaluate('motionTest.render()')
 assert not errors,errors
 b.close()
 print('PASS: vertical aim at 20 positions for 180 frames, deliberate turns, backward walking, stopping, camera tracking and aim ray alignment')
