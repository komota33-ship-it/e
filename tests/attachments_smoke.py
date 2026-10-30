"""UI installation/removal, ammunition, sound/critical effects and saved weapons."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
const savedAttachmentRandom=Math.random;
window.modTest={ready:artReady,
 state(){return {mode,player,stats:equipmentStats(player),weapon:equippedWeapon(),weaponStats:weaponStats(equippedWeapon()),reloadTime,shotTime,floorNoise,enemies,checkpoint,crates,crafting}},
 setup(){startGame();floor=50;generateLevel();enemies=[];transitionTime=0;player.x=500;camera=cameraTarget();aim.active=false;clearInput();addInventoryItem(player.inventory,'shotgun',1,{loaded:6});for(const type of ['suppressor','laser','extendedmag'])addInventoryItem(player.inventory,type);syncSupplies();updateHud()},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 save(){saveCheckpoint()},
 recover(){player.x=crates.find(c=>c.portable).x;interact()},
 fire(){fire();render()},expired(){shotTime=0},
 target(){const e=makeEnemy('walker',player.x+200);Object.assign(e,{size:1,life:1000,hp:1000,y:weaponOrigin().y+125*.55});enemies=[e]},
 random(value){Math.random=()=>value},restoreRandom(){Math.random=savedAttachmentRandom},
 full(){const weapon=equippedWeapon();player.inventory=[weapon];weapon.loaded=weaponStats(weapon).capacity;addInventoryItem(player.inventory,'ammo',59);addInventoryItem(player.inventory,'medkit',27);syncSupplies()},
 space(){player.inventory.splice(-2);syncSupplies()},
 bench(){player.x=crates.find(c=>c.type==='desk'||c.kind==='workshop').x;camera=cameraTarget()},
 resources(){player.inventory=[];player.weaponId=null;player.weaponSlots=[];for(const [type,qty] of [['metal',6],['cloth',2],['electronics',2],['spring',2]])addInventoryItem(player.inventory,type,qty);syncSupplies()},
 interrupted(){hurtTime=0;hurt(1)},
 legacy(){const s=JSON.parse(localStorage.getItem(SAVE_KEY));for(const i of s.inventory)if(ITEMS[i.type].group==='weapon'){delete i.attachments;i.loaded=Math.min(i.loaded,ITEMS[i.type].capacity)}localStorage.setItem(SAVE_KEY,JSON.stringify(s))},
 laserLines(){const draw=ctx.stroke, calls=[];ctx.stroke=function(...a){if(ctx.strokeStyle==='#d85e5e45'||ctx.strokeStyle.startsWith('rgba(216, 94, 94'))calls.push(ctx.strokeStyle);return draw.apply(this,a)};try{render()}finally{ctx.stroke=draw}return calls.length},
};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1080});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3010'))
    assert all(page.evaluate('modTest.ready'))
    def call(code):return page.evaluate('modTest.'+code)
    def state():return call('state()')
    def item(kind):return next(i for i in state()['player']['inventory'] if i['type']==kind)
    def select(kind):page.locator(f'#inventory-grid [data-uid="{item(kind)["uid"]}"]').click()
    def install(kind,weapon='pistol'):
        select(kind);page.locator(f'[data-attach-weapon="{item(weapon)["uid"]}"]').click()
    def close(a,b):assert abs(a-b)<1e-7,(a,b)
    call('setup()');before=state()['stats']['weight'];page.keyboard.press('i')
    for kind in ['suppressor','laser','extendedmag']:install(kind)
    assert state()['weaponStats']=={'capacity':18,'noise':.2,'criticalBonus':.15}
    close(state()['stats']['weight'],before)
    assert '12/18' in page.locator('#attachment-panel').inner_text()
    assert page.locator('[data-remove-attachment]').count()==3
    assert page.locator('#attachment-panel .item-art').count()==3
    page.screenshot(path=str(ROOT/'dist/attachments-work.png'))
    page.keyboard.press('Escape');page.keyboard.press('r');call('step(1.21)')
    assert state()['weapon']['loaded']==18 and state()['player']['reserve']==30
    assert page.locator('#ammo-fill').evaluate('e=>e.style.width')=='96%'
    # Noise suppression and laser critical chance affect actual shots only.
    call('target()');call('random(.1)');call('fire()')
    close(state()['enemies'][0]['life'],980)
    close(sum(e['amount'] for e in state()['floorNoise']['events']),3.6)
    assert call('laserLines()')>0
    page.screenshot(path=str(ROOT/'dist/laser-work.png'))
    page.keyboard.press('i');select('pistol');page.locator('[data-remove-attachment="rail"]').click();page.keyboard.press('Escape')
    assert call('laserLines()')==0
    call('expired()');call('fire()');close(state()['enemies'][0]['life'],970)
    # Reinstall and save all attachments plus >base-capacity ammunition.
    page.keyboard.press('i');install('laser');page.keyboard.press('Escape')
    page.keyboard.press('r');call('step(1.21)');call('save()')
    saved_weapon=state()['weapon'];page.reload();page.locator('#continue').click()
    assert state()['weapon']==saved_weapon and state()['weapon']['loaded']==18
    # Drop/pickup retains every mod and cartridge; mod removal returns surplus.
    page.keyboard.press('i');select('pistol');page.locator('#item-drop').click();page.keyboard.press('Escape')
    assert next(c for c in state()['crates'] if c.get('portable'))['loot'][0]['attachments']==saved_weapon['attachments']
    call('recover()');page.locator('#loot-all').click();select('pistol');page.locator('#item-use').click()
    assert state()['weapon']['loaded']==18 and state()['weapon']['attachments']==saved_weapon['attachments']
    total=state()['player']['reserve']+18;weight=state()['stats']['weight']
    page.locator('[data-remove-attachment="magazine"]').click()
    assert state()['weapon']['loaded']==12 and state()['player']['reserve']+12==total
    close(state()['stats']['weight'],weight)
    install('extendedmag');page.keyboard.press('Escape')
    # Full bag refuses removal atomically, including partially stackable ammo.
    call('full()');before=state()['player'];page.keyboard.press('i');select('pistol')
    page.locator('[data-remove-attachment="magazine"]').click();assert state()['player']==before
    assert 'сохранены' in page.locator('#inventory-message').inner_text()
    page.keyboard.press('Escape');call('space()');page.keyboard.press('i');select('pistol')
    page.locator('[data-remove-attachment="magazine"]').click()
    assert state()['weapon']['loaded']==12 and state()['player']['reserve']==65
    # Transfer a mod to the spare shotgun and verify capacity in its own instance.
    page.keyboard.press('Escape');call('setup()');page.keyboard.press('i')
    install('extendedmag','shotgun');select('shotgun');page.locator('#item-use').click()
    assert state()['weaponStats']['capacity']==9 and state()['weapon']['loaded']==6
    assert not item('pistol').get('attachments')
    # Mod installation cancels an unfinished reload without spending cartridges.
    page.keyboard.press('Escape');call('setup()');call('fire()');page.keyboard.press('r')
    assert state()['reloadTime']>0;reserve=state()['player']['reserve'];delay=state()['shotTime']
    page.keyboard.press('i');install('suppressor');page.keyboard.press('Escape')
    assert state()['reloadTime']==0 and state()['player']['reserve']==reserve and state()['shotTime']==delay
    # Crafting works at a real workbench, with cancellation and exact consumption.
    call('setup()');call('resources()');call('bench()');page.keyboard.press('i');page.locator('.craft-panel summary').click()
    assert page.locator('.craft-recipe').count()==15
    before=state()['player']['inventory'];page.locator('[data-recipe="extendedmag"]').click();call('step(1)');call('interrupted()')
    assert not state()['crafting'] and state()['player']['inventory']==before
    for recipe in ['suppressor','laser','extendedmag']:
        page.keyboard.press('i');page.locator('[data-recipe="'+recipe+'"]').click();call('step(5.01)');assert item(recipe)['qty']==1
    assert item('metal')['qty']==1 and item('spring')['qty']==1
    # Legacy checkpoint weapons without mods remain usable.
    call('setup()');call('save()');call('legacy()');page.reload();page.locator('#continue').click()
    assert state()['weaponStats']=={'capacity':12,'noise':1,'criticalBonus':0}
    call('restoreRandom()');assert not errors,errors
    print('PASS: installation UI/icons, reload/capacity, shot noise and crit, laser beam, save/drop/recover, full-bag atomic removal, per-weapon transfer, reload cancellation, crafting and legacy checkpoints')
    browser.close()
