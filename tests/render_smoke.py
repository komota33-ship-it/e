"""Regression for opaque head pixels while aiming, plus an offline build check."""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0').replace('{ alpha: false }', '{ alpha: true }') + '''
window.visualTest = {ready:artReady, head(angle, direction, phase=0, bodyOnly=false){
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  aim.active=true;aim.angle=angle;player.gait=1;shotTime=0;
  const draw=ctx.drawImage;
  if(bodyOnly)ctx.drawImage=function(image,...args){if(image!==art.weapon_arms)return draw.call(this,image,...args)};
  try{generatedHuman(200,170,direction,phase,'player',0)}finally{ctx.drawImage=draw}
  const left=direction===1?196:179;
  return Array.from(ctx.getImageData(left*2,48*2,25*2,24*2).data).filter((_,i)=>i%4===3);
}, painting(n,kind){
  floor=n;generateLevel();mode='playing';
  if(kind)enterRoom(doors.find(d=>d.kind===kind));
  transitionTime=0;
  const background=sceneBackdrop(sceneLayout()),draw=ctx.drawImage,calls=[];
  ctx.drawImage=function(image,...args){if(image===background)calls.push(args);return draw.call(this,image,...args)};
  try {render()} finally {ctx.drawImage=draw}
  return {calls,width:WORLD,sourceWidth:background.width,layout:activeLayoutId};
}};
''' 
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(BASE)
    assert all(page.evaluate('visualTest.ready'))
    for direction, rest, angles in [(1,.8,[0,-.7,-1.5,.8]),(-1,2.34,[3.14,2.4,-2.4,-1.65])]:
        for phase in [0,1.5,3,4.5]:
            baseline = page.evaluate('v=>visualTest.head(...v)',[rest,direction,phase,True])
            mask = [i for i,a in enumerate(baseline) if a>250]
            assert len(mask)>250, 'Head region must contain visible pixels'
            for angle in angles:
                actual = page.evaluate('v=>visualTest.head(...v)',[angle,direction,phase])
                assert all(actual[i]>245 for i in mask), 'Aiming cut a hole in the head'
    for n,kind in [(50,None),(40,None),(30,None),(20,None),(10,None),(0,None),(50,'technical'),(50,'office'),(30,'apartment'),(50,'infirmary')]:
        result=page.evaluate('v=>visualTest.painting(...v)',[n,kind])
        assert len(result['calls'])==1, ('Backdrop was repeated or omitted',result)
        assert result['calls'][0][2]==result['width'], result
    print('PASS: all six zone panoramas and four rooms draw as one complete scene without tiling')
    assert not errors,errors
    print('PASS: head remains opaque across aim angles, walk phases and both directions')
    page.close()
    context=browser.new_context()
    # Serve the actual file instead of copying the entire embedded-art document
    # through the DevTools protocol (which imposes a large response size limit).
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    offline=context.new_page();offline.on('pageerror',lambda e:errors.append(str(e)))
    offline.goto(f'http://127.0.0.1:{server.server_port}/lift-v-ad.html',timeout=60000)
    offline.wait_for_function('document.querySelectorAll(".art-icon").length===4')
    context.set_offline(True)
    offline.locator('#start').click()
    offline.keyboard.down('d');offline.wait_for_timeout(400);offline.keyboard.up('d')
    assert offline.locator('#overlay').evaluate('e=>e.classList.contains("hidden")')
    assert offline.evaluate('Object.keys(EMBEDDED_GAME_ART).length')==79
    offline.keyboard.press('i')
    assert offline.locator('.equipment-slot').count()==4
    offline.locator('.craft-panel summary').click()
    assert offline.locator('.craft-recipe').count()==15
    offline.keyboard.press('Escape')
    assert not errors,errors
    # The bundled code must also accept and render expanded checkpoint inventories.
    cargo={'version':3,'floor':50,'hp':100,'battery':100,'kills':0,'stamina':100,'infection':0,
           'weaponId':None,'armorId':None,'weaponSlots':[None],'equipment':{},'backpack':'pack_cargo',
           'inventory':[{'uid':f'offline-{i}','type':'medkit','qty':1,'x':i%8,'y':i//8,'rotated':False} for i in range(48)]}
    offline.evaluate("data=>localStorage.setItem('elevator-to-hell-v3',JSON.stringify(data))",cargo)
    context.set_offline(False)
    offline.reload(timeout=60000)
    offline.wait_for_function('document.querySelectorAll(".art-icon").length===4')
    context.set_offline(True)
    offline.locator('#continue').click()
    offline.keyboard.press('i')
    assert offline.locator('.inventory-cell').count()==48
    assert offline.locator('.inventory-item').count()==48
    assert 'КАРГО' in offline.locator('#inventory-load').inner_text()
    assert not errors,errors
    # Modified weapon saves must survive the bundled validator and atomic removal offline.
    cargo.update(weaponId='offline-gun',weaponSlots=['offline-gun'],inventory=[
        {'uid':'offline-gun','type':'pistol','qty':1,'x':0,'y':0,'rotated':False,'loaded':18,
         'attachments':{'muzzle':'suppressor','rail':'laser','magazine':'extendedmag'}},
        {'uid':'offline-ammo','type':'ammo','qty':30,'x':2,'y':0,'rotated':False}])
    offline.evaluate("data=>localStorage.setItem('elevator-to-hell-v3',JSON.stringify(data))",cargo)
    context.set_offline(False);offline.reload(timeout=60000)
    offline.wait_for_function('document.querySelectorAll(".art-icon").length===4')
    context.set_offline(True);offline.locator('#continue').click();offline.keyboard.press('i')
    offline.locator('[data-uid="offline-gun"]').click()
    assert '18/18' in offline.locator('#attachment-panel').inner_text()
    assert offline.locator('#attachment-panel .item-art').count()==3
    offline.locator('[data-remove-attachment="magazine"]').click()
    assert '12/12' in offline.locator('#attachment-panel').inner_text()
    assert offline.locator('[data-uid="offline-ammo"] b').inner_text()=='36'
    assert not errors,errors
    print('PASS: offline modified-weapon save, three icons and magazine removal preserve ammunition')
    # Saved shotgun with all three mods must execute the new volley offline.
    cargo['inventory'][0].update(type='shotgun',loaded=9)
    cargo['inventory'][1].update(type='shells',qty=20,x=3)
    offline.evaluate("data=>localStorage.setItem('elevator-to-hell-v3',JSON.stringify(data))",cargo)
    context.set_offline(False);offline.reload(timeout=60000)
    offline.wait_for_function('document.querySelectorAll(".art-icon").length===4')
    context.set_offline(True);offline.locator('#continue').click()
    assert offline.locator('#ammo').inner_text()=='9 / 20'
    offline.keyboard.down('f')
    offline.wait_for_function('document.querySelector("#ammo").textContent==="8 / 20"')
    offline.keyboard.up('f');offline.keyboard.press('i')
    offline.locator('[data-uid="offline-gun"]').click()
    assert '8/9' in offline.locator('#attachment-panel').inner_text()
    assert not errors,errors
    print('PASS: saved nine-shell shotgun fires one shell offline with all three attachments')
    print('PASS: standalone starts offline with 79 embedded images and restores a 48-item cargo checkpoint')
    server.shutdown();server.server_close()
    browser.close()
