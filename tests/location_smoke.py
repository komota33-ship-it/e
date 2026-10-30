"""All new landmark furniture must be reachable through the real interaction flow."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('GAME_URL','http://127.0.0.1:3000')
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.locationTest={ready:artReady,run(){
  startGame();let checked=0;
  for(const n of [...Array.from({length:49},(_,i)=>50-i),0]){
    floor=n;generateLevel();mode='playing';transitionTime=0;enemies=[];
    const container=crates.find(c=>c.id===`landmark-${n}`);
    if(!container)throw Error('Missing landmark furniture on floor '+n);
    player.x=container.x;interact();for(let i=0;i<300&&mode==='playing';i++)update(.02);
    if(mode!=='inventory')throw Error('Cannot search landmark on floor '+n);
    closeInventory();if(!container.opened)throw Error('Search did not persist');checked++;
  }
  return checked;
}};
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(BASE)
 assert all(page.evaluate('locationTest.ready'));assert page.evaluate('locationTest.run()')==50
 assert not errors,errors;b.close();print('PASS: all 50 new landmark containers searchable')
