/* Drive the Diary app in Edge: every input method, plus invites. */

import { chromium } from 'playwright-core';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// BASE_URL points at the catalog site; the app lives one level below it.
const base = process.env.BASE_URL ? new URL('diary/', process.env.BASE_URL).href : 'http://127.0.0.1:8080/diary/';
const out = 'C:/Users/Admin/AppData/Local/Temp/claude/c--Users-Admin-esl-games-and-beyond/00ba566b-8c57-4f0b-ab70-646880bad70d/scratchpad';

const failures = [];
const errors = [];
const check = (label, ok, detail) => {
  if (ok) console.log(`  ok  ${label}`);
  else { failures.push(label + (detail ? ` — ${detail}` : '')); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const browser = await chromium.launch({
  executablePath: edge,
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
});
const context = await browser.newContext({
  viewport: { width: 420, height: 860 },
  permissions: ['microphone'],
  origin: base
});
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('#chat-screen.is-active', { timeout: 8000 });

console.log('\nfirst run');
check('opens straight into a diary', await page.locator('#chat-screen.is-active').count() === 1);
check('the diary greets with a prompt', await page.locator('.msg.in .bubble').count() >= 1);
check('there is a date pill', (await page.locator('.day-pill').first().textContent()) === 'Today');

console.log('\ntext');
await page.fill('#text-input', 'Today I finally spoke English on the phone.');
check('the mic turns into a send button', await page.locator('#mic-send.sending').count() === 1);
await page.locator('#text-input').press('Enter');
await page.waitForSelector('.msg.out');
check('the entry appears as my own bubble', await page.locator('.msg.out .bubble p').first().textContent() === 'Today I finally spoke English on the phone.');
check('it carries a time and ticks', await page.locator('.msg.out .meta svg').count() >= 1);
check('the composer is empty again', (await page.inputValue('#text-input')) === '');

console.log('\nemoji');
await page.click('[data-act="emoji"]');
check('the emoji panel opens', !(await page.locator('#emoji-panel').isHidden()));
await page.click('[data-emoji="😄"]');
await page.click('[data-emoji="🔥"]');
check('tapping emoji fills the composer', (await page.inputValue('#text-input')) === '😄🔥');
await page.locator('#text-input').press('Enter');
await page.waitForTimeout(200);
check('an emoji-only entry is shown large', await page.locator('.msg.out .bubble.jumbo').count() === 1);

console.log('\npicture');
await page.setInputFiles('#file-input', {
  name: 'photo.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAF0lEQVR4nGP8z8Dwn4GBgYGJAQ0MLgEAJfsD/f0J3B0AAAAASUVORK5CYII=', 'base64')
});
await page.waitForSelector('.bubble.media img', { timeout: 5000 });
check('the photo arrives as a bubble', await page.locator('.bubble.media img').count() === 1);
await page.click('.bubble.media img');
check('tapping it opens the viewer', !(await page.locator('#lightbox').isHidden()));
await page.click('[data-act="close-light"]');

console.log('\nvoice note');
await page.locator('#mic-send').hover();
await page.mouse.down();
await page.waitForTimeout(1400);
check('the recording bar shows while held', !(await page.locator('#recording').isHidden()));
check('the timer runs', (await page.locator('#rec-time').textContent()) !== '0:00');
await page.mouse.up();
await page.waitForSelector('.voice', { timeout: 6000 });
check('releasing sends a voice note', await page.locator('.voice').count() === 1);
check('it draws a waveform', await page.locator('.voice .wave i').count() > 10);
check('it shows a duration', /\d:\d\d/.test(await page.locator('.voice-time').textContent()));

await page.click('.voice-play');
await page.waitForTimeout(700);
const played = await page.locator('.voice .wave i.on').count();
check('playing lights the waveform up', played > 0, `${played} bars lit`);
await page.click('.voice-play');

console.log('\nslide to cancel');
const before = await page.locator('.msg.out').count();
const box = await page.locator('#mic-send').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.move(box.x - 170, box.y + box.height / 2, { steps: 8 });
await page.waitForTimeout(300);
await page.mouse.up();
await page.waitForTimeout(800);
check('sliding left throws the recording away', await page.locator('.msg.out').count() === before, 'an entry was still added');

console.log('\nreactions and deleting');
await page.locator('.msg.out').first().click({ button: 'right' });
check('a long list of reactions appears', await page.locator('#menu .row-emoji button').count() === 6);
await page.click('[data-menu="react:❤️"]');
await page.waitForTimeout(200);
check('the reaction sticks to the bubble', await page.locator('.msg.out .reaction').count() === 1);

console.log('\nsearch');
await page.click('[data-act="chat-search"]');
await page.fill('#chat-search-input', 'phone');
await page.waitForTimeout(200);
check('search narrows the diary', await page.locator('.msg').count() === 1);
check('and highlights the word', await page.locator('mark').count() === 1);
await page.click('[data-act="chat-search"]');

console.log('\ninvites');
await page.click('[data-act="chat-menu"]');
await page.click('[data-menu="invite"]');
await page.fill('#invite-from', 'Eugeni');
const link = await page.inputValue('#invite-link');
check('an invite link is produced', /\?join=[\w-]+$/.test(link), link.slice(0, 80));
check('the link carries no entries', !link.includes('phone'));
await page.click('[data-act="invite-close"]');

console.log('\nthe list');
await page.click('[data-act="back"]');
await page.waitForSelector('#list-screen.is-active');
check('going back shows the diary list', await page.locator('.chat-row').count() === 1);
check('the row previews the last entry', (await page.locator('.row-preview').textContent()).trim().length > 0);
await page.screenshot({ path: `${out}/diary-list.png` });

await page.click('.chat-row');
await page.waitForSelector('#chat-screen.is-active');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/diary-chat.png` });

console.log('\nreopening');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#list-screen.is-active, #chat-screen.is-active');
await page.waitForTimeout(500);
await page.click('.chat-row').catch(() => {});
await page.waitForSelector('.msg.out', { timeout: 5000 });
check('everything survives a reload', await page.locator('.msg.out').count() >= 4);
check('the photo survives too', await page.locator('.bubble.media img').count() === 1);
check('the voice note survives too', await page.locator('.voice').count() === 1);

console.log('\naccepting an invite');
// A separate context, because an invited person is a different device — the
// same one would share this browser's storage and add a diary here.
const guestContext = await browser.newContext({ viewport: { width: 420, height: 860 } });
const guest = await guestContext.newPage();
guest.on('pageerror', e => errors.push('guest: ' + e.message));
await guest.goto(link, { waitUntil: 'networkidle' });
await guest.waitForSelector('#join-sheet[open]', { timeout: 6000 });
check('the invite link shows an invitation', (await guest.locator('#join-line').textContent()).includes('Eugeni'));
await guest.click('[data-act="join-yes"]');
await guest.waitForSelector('#chat-screen.is-active');
check('accepting creates that diary', (await guest.locator('#chat-name').textContent()).length > 0);
check('with the sender\'s prompt', (await guest.locator('.msg.in').count()) >= 1);
await guest.screenshot({ path: `${out}/diary-invite.png` });
await guest.close();
await guestContext.close();

console.log('\nkeeping more than one diary');
await page.click('[data-act="back"]');
await page.waitForSelector('#list-screen.is-active');
await page.click('#new-diary');
await page.waitForSelector('#new-sheet[open]');
await page.fill('#new-name', 'Weekend notes');
await page.fill('#new-prompt', 'What did you do that was not school?');
await page.click('[data-avatar="🎒"]');
check('the icon choice marks itself', await page.locator('#new-avatar [data-avatar="🎒"][aria-pressed="true"]').count() === 1);
await page.click('[data-act="new-create"]');
await page.waitForSelector('#chat-screen.is-active');
check('creating opens the new diary', (await page.locator('#chat-name').textContent()) === 'Weekend notes');
check('and it opens on its own prompt', (await page.locator('.msg.in .bubble p').first().textContent()) === 'What did you do that was not school?');

await page.click('[data-act="back"]');
await page.waitForSelector('#list-screen.is-active');
check('both diaries are listed', await page.locator('.chat-row').count() === 2);

console.log('\nsearching the list');
await page.click('[data-act="list-search"]');
await page.fill('#list-search-input', 'weekend');
await page.waitForTimeout(200);
check('the list narrows', await page.locator('.chat-row').count() === 1);
await page.click('[data-act="list-search"]');
await page.waitForTimeout(200);
check('closing search restores the list', await page.locator('.chat-row').count() === 2);

console.log('\ndeleting an entry');
await page.click('.chat-row:has-text("My English diary")');
await page.waitForSelector('#chat-screen.is-active');
const beforeDelete = await page.locator('.msg').count();
await page.locator('.msg.out').first().click({ button: 'right' });
await page.click('[data-menu="delete-entry"]');
await page.waitForTimeout(250);
check('the entry goes', await page.locator('.msg').count() === beforeDelete - 1);

console.log('\nexporting');
const download = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await page.click('[data-act="chat-menu"]');
await page.click('[data-menu="export"]');
const file = await download;
check('export offers a text file', !!file && /\.md$/.test(file.suggestedFilename()), file ? file.suggestedFilename() : 'no download');

console.log('\ndeleting a diary');
await page.click('[data-act="chat-menu"]');
page.once('dialog', d => d.accept());
await page.click('[data-menu="delete-diary"]');
await page.waitForSelector('#list-screen.is-active');
await page.waitForTimeout(300);
check('the diary is gone from the list', await page.locator('.chat-row').count() === 1);

await page.click('.chat-row');
await page.waitForSelector('#chat-screen.is-active');
await page.click('[data-act="chat-menu"]');
page.once('dialog', d => d.accept());
await page.click('[data-menu="delete-diary"]');
await page.waitForSelector('#list-screen.is-active');
await page.waitForTimeout(300);
check('deleting the last one leaves an empty state', !(await page.locator('#list-empty').isHidden()));

await browser.close();

const real = errors.filter(m => !/favicon|Autoplay|play\(\) failed/i.test(m));
if (real.length) failures.push(`console errors:\n    - ${real.join('\n    - ')}`);

if (failures.length) {
  console.error(`\nDiary check failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nDiary check passed: text, emoji, picture, voice, reactions, search, invites, persistence.');
