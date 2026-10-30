"""Radio subtitles follow major floors and boss choices without blocking play."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.storyTest={ready:artReady,
 start(){startGame();return {mode,radio:storyRadio}},
 go(n){floor=n;generateLevel();transitionTime=0;enemies=[];storyRadio.play(storyBeatForFloor(n));},
 wait(t){for(let n=0;n<t;n+=.03)update(.03)},
 pause(){pause()},
 boss(type){floor=type==='mama'?25:30;generateLevel();transitionTime=0;
  const e=enemies.find(e=>e.type===type);enemies=[e];player.x=e.x-200;return e.hp},
 surrender(){const e=enemies[0];damageEnemy(e,900,{sourceX:player.x});return {surrender:e.surrender,mode}},
 mercy(){player.x=enemies[0].x-30;interact();return {spared:enemies[0].spared,mode}},
 echo(){damageEnemy(enemies[0],450,{sourceX:player.x});render();return {echo:enemies[0].echoPhaseOne,mode}}
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('storyTest.ready'))
    assert page.evaluate('storyTest.start().mode') == 'playing'
    assert 'ЕЛЕНА' in page.locator('.radio-speaker').inner_text()
    assert page.locator('#story-radio').is_visible()
    page.evaluate('storyTest.go(15)')
    assert 'МАРКУС' in page.locator('.radio-speaker').inner_text()
    first = page.locator('.radio-text').inner_text()
    page.evaluate('storyTest.pause()')
    page.evaluate('storyTest.wait(7)')
    assert page.locator('.radio-text').inner_text() == first, 'Pause did not stop subtitles'
    page.evaluate('storyTest.pause()')
    page.evaluate('storyTest.wait(6)')
    assert page.locator('.radio-text').inner_text() != first, 'Next line did not appear'
    page.evaluate('storyTest.go(49)')
    assert page.locator('#story-radio').is_hidden(), 'Old floor transmission leaked'

    assert page.evaluate("storyTest.boss('mama')") == 700
    assert page.evaluate('storyTest.surrender().surrender')
    assert 'МАМА' in page.locator('.radio-speaker').inner_text()
    assert page.evaluate('storyTest.mercy().spared')
    assert 'Антидот' in page.locator('.radio-text').inner_text()
    assert page.evaluate("storyTest.boss('elena')") == 800
    assert page.evaluate('storyTest.echo().echo')
    assert 'ЕЛЕНА' in page.locator('.radio-speaker').inner_text()
    assert 'копия' in page.locator('.radio-text').inner_text()
    assert not errors, errors
    page.screenshot(path=str(ROOT / 'dist' / 'story-radio-work.png'))
    print('PASS: floor radio, timed lines, pause, floor clearing, Mama mercy and Elena echo')
    browser.close()
