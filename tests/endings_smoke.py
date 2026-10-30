"""B1 exit offers three distinct outcomes and remembers completed endings."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.endingTest={ready:artReady,
 start(){startGame();floor=0;generateLevel();transitionTime=0;player.x=liftObject().x;camera=cameraTarget();render()},
 gate(){interact();return mode},
 clear(){enemies=[];updateHud();render()},
 state(){return {mode,floor,wins:profile.wins,completed:[...completedEndings],x:player.x,hp:player.hp}},
 history(){return readEndings(progressStorage)},
 tick(){update(1)},
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    for index, ending_id in enumerate(['evacuation', 'rescue', 'truth']):
        page.goto(BASE)
        assert all(page.evaluate('endingTest.ready'))
        page.evaluate('endingTest.start()')
        assert page.evaluate('endingTest.gate()') == 'playing', 'Living boss did not guard the exit'
        page.evaluate('endingTest.clear()')
        assert page.evaluate('endingTest.gate()') == 'endingChoice'
        assert page.locator('#ending-choice').is_visible()
        assert page.locator('#ending-options button').count() == 3
        assert page.locator('#ending-options img').count() == 3
        assert all(page.locator('#ending-options img').evaluate_all('(items) => items.map((image) => image.complete && image.naturalWidth > 0)'))
        if index == 0:
            page.screenshot(path=str(ROOT / 'dist' / 'ending-choice-work.png'))
            frozen = page.evaluate('endingTest.state()')
            page.evaluate('endingTest.tick()')
            assert page.evaluate('endingTest.state()')['x'] == frozen['x']
            page.keyboard.press('Escape')
            assert page.evaluate('endingTest.state().mode') == 'playing'
            assert page.locator('#ending-choice').is_hidden()
            assert page.evaluate('endingTest.gate()') == 'endingChoice'
        page.locator(f'[data-ending="{ending_id}"]').click()
        state = page.evaluate('endingTest.state()')
        assert state['mode'] == 'won' and state['wins'] == index + 1, state
        assert ending_id in state['completed']
        assert page.locator('#ending-choice').is_hidden()
        assert page.locator('#overlay').is_visible()
        assert page.locator('#ending-visual').is_visible()
        assert page.locator('#ending-image').evaluate('(image) => image.complete && image.naturalWidth > 0')
        assert page.locator('#ending-image').get_attribute('src').endswith(f'ending_{ending_id}.webp')
        assert page.locator('#ending-story').is_visible()
        assert 200 <= len(page.locator('#ending-story').inner_text().split()) <= 300
        assert page.locator('#start').evaluate('(e) => e === document.activeElement')
        image_box = page.locator('#ending-image').bounding_box()
        story_box = page.locator('#ending-story').bounding_box()
        assert image_box and story_box and image_box['y'] + image_box['height'] <= story_box['y'], 'Story did not follow its image'
        assert page.locator('.ending-result .intro').evaluate('(e) => {e.scrollTop = e.scrollHeight; return e.scrollTop > 0}')
        assert page.locator('#start').is_visible()
        if ending_id == 'truth':
            assert page.locator('#overlay-title').inner_text() == 'ИСТИНА'
            page.screenshot(path=str(ROOT / 'dist' / 'ending-truth-work.png'))
    page.reload()
    assert len(page.evaluate('endingTest.history()')) == 3
    page.evaluate('endingTest.start()')
    page.evaluate('endingTest.clear()')
    page.evaluate('endingTest.gate()')
    assert page.locator('#ending-options small').all_inner_texts() == ['УЖЕ ПРОЙДЕНО'] * 3
    assert not errors, errors
    print('PASS: guarded B1 choice, Esc, three 200–300-word outcomes, win count and persistent completion')
    browser.close()
