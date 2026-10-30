"""Real purchases, combat rewards, persistent fractions and infection end screen."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.moraleTest = {
  ready: artReady,
  state(){return {mode,profile,runEffects,runDna}},
  funds(){profile.dna=1050},
  clean(){enemies=[];transitionTime=0;clearInput();aim.active=false},
  kill(type='walker'){
    const e=makeEnemy(type,800);
    damageEnemy(e,99999);damageEnemy(e,99999);
  },
  save(){floor=50;generateLevel();this.clean();saveCheckpoint()},
  die(){player.hp=0;endGame(false,'infection')},
  revive(){runEffects.revivals=1;player.revivesUsed=0},
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(os.environ.get('GAME_URL', 'http://127.0.0.1:3012'))
    def call(code): return page.evaluate('moraleTest.' + code)
    def state(): return call('state()')
    assert all(call('ready'))
    call('funds()')
    page.locator('#progress-toggle').click()
    assert page.locator('.perk-card').count() == 23
    page.locator('#progress-branch').select_option('ПСИХО')
    assert page.locator('.perk-card').count() == 4
    page.locator('[data-perk="morale"]').click()
    assert state()['profile']['dna'] == 900 and state()['runEffects']['dnaBonus'] == 0
    page.locator('#progress-close').click()
    page.locator('#start').click(); call('clean()'); call('kill()')
    assert state()['runEffects']['dnaBonus'] == 10
    assert state()['profile']['dna'] == 905 and state()['profile']['dnaRemainder'] == 50
    assert state()['profile']['kills'] == 1 and state()['runDna'] == 5
    call('save()'); page.reload(); page.locator('#continue').click(); call('clean()')
    assert state()['profile']['dnaRemainder'] == 50 and state()['runDna'] == 0
    call('kill()')
    assert state()['profile']['dna'] == 911 and state()['profile']['dnaRemainder'] == 0
    assert state()['profile']['kills'] == 2 and state()['runDna'] == 6
    call('revive()'); call('die()')
    assert state()['mode'] == 'playing' and state()['profile']['dna'] == 911
    call('die()')
    assert state()['mode'] == 'dead' and state()['profile']['dna'] == 914
    assert state()['runDna'] == 9 and state()['profile']['deaths'] == 1
    assert 'Мораль: +10%' in page.locator('#overlay-copy').inner_text()
    call('die()'); assert state()['profile']['dna'] == 914
    page.locator('#progress-toggle').click()
    page.locator('#progress-branch').select_option('ПСИХО')
    for _ in range(2): page.locator('[data-perk="morale"]').click()
    assert page.locator('[data-perk="morale"]').is_disabled()
    assert state()['profile']['dna'] == 14 and state()['runEffects']['dnaBonus'] == 10
    page.screenshot(path=str(ROOT / 'dist/morale-work.png'))
    page.reload(); page.locator('#start').click(); call('clean()'); call("kill('boss')")
    assert state()['runEffects']['dnaBonus'] == 30
    assert state()['runDna'] == 325 and state()['profile']['dna'] == 339
    assert state()['profile']['earned'] == 339
    assert not errors, errors
    print('PASS: Morale purchases/snapshot/reload, fractional checkpoint carry, single kill reward, revival/no double infection bonus, boss reward and end-screen explanation')
    browser.close()
