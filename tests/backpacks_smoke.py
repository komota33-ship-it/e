"""Real backpack exchange UI, resized grids, weapon hotkeys and expanded checkpoints."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
let packTestChest;
window.packTest={ready:artReady,
 setup(full=false){startGame();floor=50;generateLevel();enemies=[];transitionTime=0;player.x=500;camera=cameraTarget();
 if(full){player.inventory=[];player.weaponId=null;player.equipment={};player.weaponSlots=[];addInventoryItem(player.inventory,'medkit',30)}syncSupplies();updateHud()},
 state(){return {mode,player,stats:equipmentStats(player),transitionTime,crafting,toast:$("toast").textContent,reloadTime,shotTime,checkpoint,chest:packTestChest}},
 box(type){packTestChest={label:'РЮКЗАКИ',loot:[{type,qty:1}],opened:true};openInventory(packTestChest)},
 showAll(){packTestChest={label:'СНАРЯЖЕНИЕ',loot:Object.keys(BACKPACKS).map(type=>({type,qty:1})),opened:true};openInventory(packTestChest)},
 load(){packTestChest.loot.push({type:'medkit',qty:18});inventoryUI.render()},save(){saveCheckpoint()},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 small(){player.inventory=player.inventory.slice(0,4);syncSupplies()},
 wide(){player.inventory=[];player.weaponId=null;player.weaponSlots=[];addInventoryItem(player.inventory,'shotgun',1,{loaded:3},backpackFor(player));const i=player.inventory[0];Object.assign(i,{x:7,y:3,rotated:true});syncSupplies()},
 spare(){addInventoryItem(player.inventory,'pack_military',1,{},backpackFor(player));syncSupplies()},
 weapons(){addInventoryItem(player.inventory,'shotgun',1,{loaded:3},backpackFor(player));equippedWeapon().loaded=6;syncSupplies()},
 legacy(){const data=JSON.parse(localStorage.getItem(SAVE_KEY));delete data.backpack;delete data.weaponSlots;localStorage.setItem(SAVE_KEY,JSON.stringify(data))},
 invalid(){const data=JSON.parse(localStorage.getItem(SAVE_KEY));data.backpack='pack_waist';localStorage.setItem(SAVE_KEY,JSON.stringify(data));return readCheckpoint()},
 bench(){player.x=crates.find(c=>c.type==='desk'||c.kind==='workshop').x;camera=cameraTarget()},
 craftWide(){enemies=[];hurtTime=0;transitionTime=0;player.infection=0;refreshInfection();player.hp=player.maxHp;player.inventory=[];player.weaponId=null;player.weaponSlots=[];addInventoryItem(player.inventory,'medkit',44,{},backpackFor(player));addInventoryItem(player.inventory,'cloth',2,{},backpackFor(player));syncSupplies()},
};
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/game.js',lambda r:r.fulfill(content_type='text/javascript',body=source));page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3005'));assert all(page.evaluate('packTest.ready'))
 def call(code):return page.evaluate('packTest.'+code)
 def state():return call('state()')
 def item(t):return next(i for i in state()['player']['inventory'] if i['type']==t)
 def select(t):page.locator(f'#inventory-grid [data-uid="{item(t)["uid"]}"]').click()
 def wear(t):page.locator(f'[data-swap-pack="{t}"]').click()
 def cells(n):assert page.locator('.inventory-cell').count()==n
 call('setup(true)');call("box('pack_cargo')");wear('pack_cargo');cells(48)
 assert len(state()['player']['inventory'])==30 and state()['chest']['loot']==[{'type':'pack_survivor','qty':1}]
 assert state()['stats']['limit']==30 and abs(state()['stats']['speed']-.8)<1e-8
 call('load()');page.locator('#loot-all').click();assert len(state()['player']['inventory'])==48
 before=state();wear('pack_survivor');assert state()['player']==before['player'] and state()['chest']==before['chest'];assert 'сохранены' in page.locator('#inventory-message').inner_text()
 page.keyboard.press('Escape');call('save()');page.reload();page.locator('#continue').click();assert len(state()['player']['inventory'])==48 and state()['player']['backpack']=='pack_cargo'
 page.keyboard.press('i');cells(48);page.screenshot(path=str(ROOT/'dist/cargo-work.png'));page.keyboard.press('Escape')
 # Actual UI placement uses the eighth column and sixth row, including rotation.
 call('wide()');page.keyboard.press('i');select('shotgun');page.keyboard.press('r');assert item('shotgun')['rotated']
 page.get_by_role('button',name='Ячейка 6, 4',exact=True).click();page.keyboard.press('r');assert not item('shotgun')['rotated'] and item('shotgun')['x']==5
 page.locator('#inventory-sort').click();assert item('shotgun')['loaded']==3;page.keyboard.press('Escape')
 # A craft can complete entirely beyond the old 30-cell area.
 call('craftWide()');call('bench()');page.keyboard.press('i');page.locator('.craft-panel summary').click();page.locator('[data-recipe="bandage"]').click();call('step(2.1)')
 assert any(i['type']=='bandage' for i in state()['player']['inventory']), {k:state()[k] for k in ['mode','transitionTime','reloadTime','crafting','toast']} | {'items':state()['player']['inventory'][-3:]}
 assert item('bandage')['y']==5 and not any(i['type']=='cloth' for i in state()['player']['inventory'])
 # Safe downsizing repacks the remaining objects and returns the cargo pack.
 call('small()');call("box('pack_waist')");wear('pack_waist');cells(6);assert state()['stats']['limit']==10
 assert state()['chest']['loot'][0]['type']=='pack_cargo';assert len(state()['player']['inventory'])==4
 page.keyboard.press('Escape')
 # Six generated icons and all exchange actions work in one container.
 call('setup()');call('showAll()');assert page.locator('[data-swap-pack]').count()==6
 page.screenshot(path=str(ROOT/'dist/backpacks-work.png'));page.keyboard.press('Escape')
 # Equip a spare pack from the grid; the old pack remains in that same item slot.
 call('spare()');spare=item('pack_military')['uid'];page.keyboard.press('i');select('pack_military');page.locator('#item-use').click()
 assert state()['player']['backpack']=='pack_military' and item('pack_survivor')['uid']==spare
 assert page.locator('.weapon-slot').count()==3;page.keyboard.press('Escape')
 call('weapons()');page.keyboard.press('i');select('shotgun');page.locator('[data-weapon-slot="1"]').click()
 shotgun=item('shotgun')['uid'];pistol=item('pistol')['uid'];assert state()['player']['weaponSlots'][1]==shotgun
 page.keyboard.press('Escape');page.keyboard.press('1');assert state()['player']['weaponId']==pistol
 page.keyboard.press('r');assert state()['reloadTime']>0;ammo=item('ammo')['qty'];page.keyboard.press('2');assert state()['player']['weaponId']==shotgun and state()['reloadTime']==0
 assert item('pistol')['loaded']==6 and item('ammo')['qty']==ammo
 page.keyboard.down('f');call('step(.01)');page.keyboard.up('f');assert item('shotgun')['loaded']==2
 page.keyboard.press('1');page.keyboard.down('f');call('step(.01)');page.keyboard.up('f');assert item('pistol')['loaded']==6,'Weapon switch bypassed shot cooldown'
 call('step(1)');page.keyboard.down('f');call('step(.01)');page.keyboard.up('f');assert item('pistol')['loaded']==5
 call('save()');page.reload();page.locator('#continue').click();assert state()['player']['backpack']=='pack_military' and state()['player']['weaponSlots'][1]==shotgun
 page.keyboard.press('2');assert state()['player']['weaponId']==shotgun and item('shotgun')['loaded']==2
 assert call('invalid()') is None
 # Pre-backpack checkpoints continue as Survivor 6x5 with one active weapon slot.
 call('setup()');call('save()');call('legacy()');page.reload();page.locator('#continue').click();assert state()['player']['backpack']=='pack_survivor' and len(state()['player']['weaponSlots'])==1
 assert not errors,errors
 b.close();print('PASS: full-bag exchange, 48-item checkpoint, resizing/rotation/sort, wide-grid crafting, safe downsizing, six icons, spare pack swap, weapon bindings/hotkeys/cooldown/ammo, invalid and legacy saves')
