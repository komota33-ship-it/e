"""Perk purchases and actual container interaction, persistence and no duplicate loot."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'game.js').read_text().replace('requestAnimationFrame(frame)','void 0')+'''
window.lootTest={ready:artReady,
 state(){return {mode,player,profile,runEffects,crates,searching,stats:equipmentStats(player)}},
 money(){profile.dna=2100},
 clean(){enemies=[];transitionTime=0;clearInput();player.vy=0;player.y=GROUND},
 floor(n){floor=n;generateLevel();this.clean()},
 baseline(){return sceneLayout().containers.map(c=>containerLoot(floor,sceneLayout().id,c.id,c.kind))},
 stand(){player.x=crates[0].x;camera=cameraTarget()},
 step(n){for(let t=0;t<n-1e-8;t+=.01)update(Math.min(.01,n-t));render()},
 full(){player.inventory=[];player.weaponId=null;player.equipment={};player.weaponSlots=[];addInventoryItem(player.inventory,'medkit',30);syncSupplies()},
 empty(){player.inventory=[];player.weaponId=null;player.equipment={};player.weaponSlots=[];syncSupplies()},
 room(){enterRoom(doors[0]);this.clean()},back(){leaveRoom();this.clean()},
 drop(){const item=player.inventory[0];dropInventoryItem(item.uid);return crates.find(c=>c.portable)},
 bag(){openInventory(crates.find(c=>c.portable))},save(){saveCheckpoint()}
};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game.js',lambda route:route.fulfill(content_type='text/javascript',body=source))
    page.goto(os.environ.get('GAME_URL','http://127.0.0.1:3000'))
    assert all(page.evaluate('lootTest.ready'))
    def call(code):return page.evaluate('lootTest.'+code)
    def state():return call('state()')
    def qty(items):return sum(i['qty'] for i in items)
    def search():
        call('stand()');page.keyboard.press('e')
        call('step(6)');assert state()['mode']=='inventory'
    call('money()');page.locator('#progress-toggle').click()
    assert page.locator('.perk-card').count()==23
    page.locator('#progress-branch').select_option('МАРОДЁР')
    assert page.locator('.perk-card').count()==5
    for perk in ['loader','looter']:
        for _ in range(3):page.locator(f'[data-perk="{perk}"]').click()
        assert page.locator(f'[data-perk="{perk}"]').is_disabled()
    assert state()['profile']['dna']==0
    assert state()['runEffects']['lootBonus']==0 # Purchases do not mutate the current snapshot.
    assert 'ХАМСТЕР АКТИВЕН' in page.locator('#progress-synergy').inner_text()
    page.screenshot(path=str(ROOT/'dist/looting-perks-work.png'))
    page.reload();assert state()['profile']['perks']['looter']==3
    page.locator('#start').click();call('clean()')
    assert state()['stats']['limit']==43 and state()['runEffects']['lootBonus']==6
    for crate,base in zip(state()['crates'],call('baseline()')):assert qty(crate['loot'])==qty(base)+6
    # Cancel searching by walking away: no reroll and no duplicate reward.
    original=state()['crates'][0]['loot'];call('stand()');page.keyboard.press('e');call('step(.3)')
    assert state()['searching']
    page.keyboard.down('d');call('step(.2)');page.keyboard.up('d')
    assert state()['searching'] is None and state()['crates'][0]['loot']==original
    call('full()');search();page.locator('#loot-all').click()
    assert state()['crates'][0]['loot']==original and len(state()['player']['inventory'])==30
    page.keyboard.press('Escape');call('empty()');search();page.locator('#loot-all').click()
    assert state()['crates'][0]['loot']==[]
    collected=state()['player']['inventory']
    page.keyboard.press('Escape');search()
    assert page.locator('#loot-all').is_disabled() and state()['player']['inventory']==collected
    page.keyboard.press('Escape')
    # Room generation gets exactly the same bonus; returning preserves depleted containers.
    call('floor(50)');call('room()')
    for crate,base in zip(state()['crates'],call('baseline()')):assert qty(crate['loot'])==qty(base)+6
    call('empty()');search();page.locator('#loot-all').click();page.keyboard.press('Escape')
    room_crates=state()['crates'];call('back()');call('room()')
    assert state()['crates']==room_crates
    search();assert page.locator('#loot-all').is_disabled();page.keyboard.press('Escape')
    # Dropping and reclaiming actual contents never calls the perk loot generator.
    dropped=state()['player']['inventory'][0]
    bag=call('drop()');assert len(bag['loot'])==1 and qty(bag['loot'])==dropped['qty']
    call('bag()');page.locator('#loot-all').click();page.keyboard.press('Escape')
    call('back()');call('room()');call('bag()');assert page.locator('#loot-all').is_disabled()
    page.keyboard.press('Escape')
    # Checkpoint reload retains perks, capacity and carried items.
    call('back()');call('save()');inventory=state()['player']['inventory']
    page.reload();page.locator('#continue').click()
    assert state()['stats']['limit']==43 and state()['player']['inventory']==inventory
    assert state()['runEffects']['lootBonus']==6
    assert not errors,errors
    print('PASS: twenty-three perk cards, purchases/reload, next-run bonus, roof/rooms, cancelled search, full-bag leftovers, empty reopen/revisit, dropped bag, checkpoint capacity/inventory')
    browser.close()
