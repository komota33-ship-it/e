"""Exercise the visible menu, settings, exact room save and animated shots."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.menuTest = {
  ready: artReady,
  enterRoom() {
    floor = 49; generateLevel(); transitionTime = 0;
    enterRoom(doors[0]); transitionTime = 0;
    enemies = []; player.x = 350; player.hp = 73;
    crates[0].opened = true; crates[0].loot = [{type:'ammo',qty:7}];
    updateHud(); render();
  },
  state() { return {floor,scene,x:player.x,hp:player.hp,opened:crates[0].opened,
    loot:crates[0].loot,mode,roomReturnX}; },
  setHealth(value) { player.hp=value; },
  async music() { await audioContext.resume(); scheduleMusic(); return {bus:!!musicBus,steps:musicStep}; },
  shot() {
    floor = 50; generateLevel(); transitionTime = 0; enemies = [];
    player.x = 300; player.dir = 1; aim.active = false;
    shotTime = 0; fire();
    const traces = particles.filter(p => p.tracer);
    const before = traces[0].life;
    update(.05);
    return {count:traces.length,before,after:traces[0].life,context:!!audioContext};
  }
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/game.js', lambda route: route.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('menuTest.ready'))
    assert 'menu_backdrop.png' in page.locator('.stage').evaluate('(el)=>getComputedStyle(el).backgroundImage')
    assert page.locator('.hud').evaluate('(el)=>getComputedStyle(el).visibility') == 'hidden'
    page.locator('#menu-settings').click()
    assert page.locator('#settings-panel').is_visible()
    page.locator('#setting-volume').fill('35')
    page.locator('#setting-music').fill('23')
    page.locator('#setting-shake').uncheck()
    page.locator('#setting-sound').check()
    page.locator('#settings-back').click()
    page.locator('#start').click()
    assert page.evaluate('menuTest.music()') == {'bus': True, 'steps': 1}
    page.evaluate('menuTest.enterRoom()')
    saved = page.evaluate('menuTest.state()')
    page.keyboard.press('Escape')
    assert page.locator('#menu-save').is_visible()
    page.locator('#menu-save').click()
    assert 'СОХРАНЕНО' in page.locator('#menu-save').inner_text()
    page.locator('#menu-main').click()
    assert page.locator('#continue').is_visible()
    page.locator('#continue').click()
    assert page.evaluate('menuTest.state()') == saved
    page.evaluate('menuTest.setHealth(30)')
    page.keyboard.press('Escape')
    page.locator('#menu-main').click()
    page.reload()
    assert all(page.evaluate('menuTest.ready'))
    assert page.evaluate('JSON.parse(localStorage.getItem("elevator-to-hell-settings-v1")).volume') == .35
    assert page.evaluate('JSON.parse(localStorage.getItem("elevator-to-hell-settings-v1")).music') == .23
    assert page.locator('#continue').is_visible()
    page.locator('#continue').click()
    assert page.evaluate('menuTest.state()') == saved
    result = page.evaluate('menuTest.shot()')
    assert result['count'] == 1 and result['before'] > .065 and result['after'] < result['before']
    assert result['context'] and not errors, errors
    browser.close()
    print('PASS: separate menu backdrop, music chord scheduling and saved volume, explicit room save through menu and reload, moving bullet tracer and generated audio')
