"""Inventory assignment, centred HUD and persistent quick-belt actions."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.quickTest = {
  ready: artReady,
  hurt() { player.hp = 60; updateHud(); },
  health() { return player.hp; },
  slots() { return [...quickSlots]; }
};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/game.js', lambda route: route.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('quickTest.ready'))
    page.locator('#start').click()
    page.keyboard.press('i')
    page.locator('.inventory-item[title="Бинт"]').click()
    page.locator('[data-quick-index="0"]').click()
    assert page.evaluate('quickTest.slots()')[0] == 'bandage'
    assert page.locator('#quick-assign .item-art').count() >= 3
    page.keyboard.press('Escape')
    page.evaluate('quickTest.hurt()')
    page.locator('#grenade').click()
    assert page.evaluate('quickTest.health()') == 80
    assert page.locator('#grenade b').inner_text() == '1'
    stage = page.locator('.stage').bounding_box()
    belt = page.locator('.quick-slots').bounding_box()
    assert abs((belt['x'] + belt['width']/2) - (stage['x'] + stage['width']/2)) < 2
    assert page.locator('#grenade canvas').count() == 1
    page.reload()
    assert page.evaluate('quickTest.slots()')[0] == 'bandage'
    assert not errors, errors
    browser.close()
    print('PASS: inventory assigns and uses a supply, icons/count update, centred belt survives reload')
