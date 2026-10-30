"""Search an authored note, read it, retain it after restart and reach normal loot."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('GAME_URL', 'http://127.0.0.1:3000')
source = (ROOT / 'game.js').read_text().replace('requestAnimationFrame(frame)', 'void 0') + '''
window.journalTest={ready:artReady,search(){
 startGame();floor=50;generateLevel();transitionTime=0;enemies=[];
 const archive=crates.find(c=>c.id==='landmark-50');
 if(!archive||archive.noteId!=='log-01')throw Error('Document not on landmark furniture');
 archive.trap=null;archive.ambush=null;player.x=archive.x;
 if(!getPrompt().includes('ЗАПИСЬ'))throw Error('Unfound note lacks a nearby search hint');
 interact();if(!searching)throw Error('Search did not start');
 searching.remaining=.01;update(.02);
 if(mode!=='journal'||!journalNotes.has('log-01')||!archive.opened)throw Error('Document not discovered');
 const x=player.x,hp=player.hp;update(1);
 if(player.x!==x||player.hp!==hp)throw Error('Reading did not pause combat');
 return {id:archive.id,count:journalNotes.size,title:document.getElementById('journal-title').textContent};
},floorNotes(){
 for(const note of JOURNAL_NOTES){floor=note.floor;generateLevel();
  const marked=crates.filter(c=>c.noteId);
  if(marked.length!==1||marked[0].noteId!==note.id||marked[0].id!==`landmark-${note.floor}`)
   throw Error('Wrong note placement at '+note.floor);
 }
 floor=51;generateLevel();if(crates.some(c=>c.noteId))throw Error('Roof has a story note');
 return JOURNAL_NOTES.length;
}};
'''
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1366,'height':768})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/game.js', lambda r: r.fulfill(content_type='text/javascript', body=source))
    page.goto(BASE)
    assert all(page.evaluate('journalTest.ready'))
    result = page.evaluate('journalTest.search()')
    assert result['count']==1 and result['title']=='Приказ об эвакуации',result
    assert page.locator('#journal').is_visible()
    assert page.locator('#journal-list button:not([disabled])').count()==1
    assert len(page.locator('#journal-body').inner_text().split())>=50
    page.screenshot(path=str(ROOT/'dist'/'journal-work.png'))
    page.keyboard.press('Escape')
    assert page.locator('#journal').is_hidden()
    page.keyboard.press('e')
    assert page.locator('#inventory').is_visible()
    page.keyboard.press('Escape')
    assert page.evaluate('journalTest.floorNotes()')==30
    page.reload()
    assert page.locator('#journal-total').inner_text()=='1'
    page.locator('#journal-toggle').click()
    assert page.locator('#journal-title').inner_text()=='Приказ об эвакуации'
    assert not errors, errors
    print('PASS: 30 landmark notes, timed search, paused reading, normal loot, persistent archive', result)
    browser.close()
