"""Visual floor-plane checks with characters, source-aligned hotspots and camera travel."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.floorDepthTest={ready:artReady,run(n,kind){
 startGame();floor=n;generateLevel();if(kind)enterRoom(doors.find(d=>d.kind===kind));
 transitionTime=0;player.x=Math.min(540,WORLD*.45);camera=cameraTarget();
 enemies=[makeEnemy('walker',player.x+180)];enemies[0].dir=-1;
 player.moveBlend=1;player.phase=1;enemies[0].moveBlend=1;enemies[0].phase=2;
 const layout=sceneLayout(),d=sceneDepth(layout,GROUND),background=sceneBackdrop(layout);
 const original=ctx.drawImage,calls=[];
 ctx.drawImage=function(image,...args){if(image===background)calls.push(args);return original.call(this,image,...args)};
 try{render()}finally{ctx.drawImage=original}
 if(calls.length!==1)throw Error('Scene must remain one continuous painting');
 const a=calls[0],rear=a[1]+layout.ground*d.scale;
 if(Math.abs(rear-(GROUND-(n===51?0:30)))>.01)throw Error('Feet coincide with wall');
 if(n!==51&&a[1]+a[3]<GROUND+45)throw Error('No painted floor in front of feet');
 for(const object of [...layout.containers,...(layout.doors||[]),...[layout.exit,layout.lift].filter(Boolean)]){
  const b=sceneObject(object,layout).bounds,[x,y,w,h]=object.rect;
  const paintY=v=>a[1]+(v<=layout.ground?v:layout.ground+(v-layout.ground)*d.floorStretch)*d.scale;
  if(Math.abs(b.x-camera-(a[0]+x*d.scale))>.001||Math.abs(b.y-paintY(y))>.001||Math.abs(b.y+b.h-paintY(y+h))>.001)throw Error('Hotspot detached from its painting');
 }
 const png=canvas.toDataURL('image/png');
 camera+=130;render();
 if(player.y!==GROUND||enemies[0].y!==GROUND)throw Error('Camera moves actors off floor');
 return {png,zone:layout.zone,layout:layout.id,rear,feet:GROUND};
}};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1366,'height':768});errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/game.js',lambda route:route.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE);assert all(page.evaluate('floorDepthTest.ready'))
    for floor,kind in [(51,None),(50,None),(40,None),(30,None),(20,None),(10,None),(0,None),
                       (50,'technical'),(50,'office'),(50,'infirmary'),(30,'apartment')]:
        result=page.evaluate('v=>floorDepthTest.run(...v)',[floor,kind])
        label=kind or str(floor)
        (ROOT/f'dist/floor-depth-{label}.png').write_bytes(base64.b64decode(result['png'].split(',')[1]))
    assert not errors,errors
    print('PASS: seven zones and four rooms have a continuous floor plane, aligned doors/loot and grounded actors after camera movement')
    browser.close()
