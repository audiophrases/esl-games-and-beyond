/* Admin mode, driven in a real browser against a mocked GitHub API.

   Nothing here reaches github.com: every call to the Contents API is answered
   locally, so the run is safe to repeat and needs no token. Sign-in is faked
   by seeding the same sessionStorage key auth.js writes, which is all the page
   checks — Google itself is never contacted. */

import { chromium } from 'playwright-core';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080/';
// From the site under test, not from disk — a live BASE_URL can move under
// us when someone publishes from admin mode.
const catalog = await fetch(new URL('projects.json', baseUrl)).then(r => r.json());

const browser = await chromium.launch({ executablePath: edge, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });

const failures = [];
const errors = [];
let provokingFailure = false;   // the refused-token step makes the browser log a 403
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !provokingFailure) errors.push(message.text());
});
// Playwright dismisses native dialogs by default, which would silently cancel
// every confirm() this script means to go through with.
let confirmAnswer = 'accept';
page.on('dialog', dialog => (confirmAnswer === 'accept' ? dialog.accept() : dialog.dismiss()));

function check(label, condition, detail) {
  if (condition) console.log(`  ok  ${label}`);
  else { failures.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}

/* --- the fake GitHub ------------------------------------------------------ */

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,PUT,OPTIONS'
};

let putBody = null;
let putCount = 0;
let putStatus = 200;
let seenAuth = null;

await page.route('https://api.github.com/**', async route => {
  const request = route.request();
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

  if (request.method() === 'GET') {
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ sha: 'fakesha123' }) });
  }

  putCount += 1;
  seenAuth = await request.headerValue('authorization');
  putBody = JSON.parse(request.postData() || '{}');
  return route.fulfill({
    status: putStatus,
    headers: { ...cors, 'content-type': 'application/json' },
    body: JSON.stringify(putStatus === 200 ? { commit: { sha: 'abc' } } : { message: 'Resource not accessible by personal access token' })
  });
});

await page.addInitScript(() => sessionStorage.setItem('eslAdminEmail', 'eugenime@gmail.com'));
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('.admin-bar');

const state = () => page.locator('#admin-state').textContent();
const publishDisabled = () => page.locator('#admin-publish').isDisabled();
const ids = () => page.locator('.card').evaluateAll(nodes => nodes.map(node => node.dataset.id));

// A dialog's close event fires on a later task than close() itself, so the
// discard of an abandoned card lands just after the click resolves.
async function cardsSettleAt(count) {
  try {
    await page.waitForFunction(n => document.querySelectorAll('.card').length === n, count, { timeout: 3000 });
    return true;
  } catch { return false; }
}

/* --- the catalog as an admin sees it -------------------------------------- */

console.log('\nadmin view');
check('every activity is listed, hidden ones included', (await ids()).length === catalog.length);
check('hidden activities are marked', await page.locator('.card.is-hidden').count() === catalog.filter(p => p.hidden).length);
check('nothing is dirty on arrival', await publishDisabled() && (await state()).trim() === 'Published');

/* --- hide and show -------------------------------------------------------- */

console.log('\nhide and show');
const firstVisible = catalog.find(project => !project.hidden).id;
await page.locator(`.card[data-id="${firstVisible}"] [data-admin="toggle"]`).click();
check('hiding marks the catalog dirty', !(await publishDisabled()) && (await state()).includes('Unpublished'));
check('the hidden card is dimmed', await page.locator(`.card[data-id="${firstVisible}"].is-hidden`).count() === 1);
check('the button now offers to show it', (await page.locator(`.card[data-id="${firstVisible}"] [data-admin="toggle"]`).textContent()) === 'Show');
await page.locator(`.card[data-id="${firstVisible}"] [data-admin="toggle"]`).click();
check('showing it again restores the card', await page.locator(`.card[data-id="${firstVisible}"].is-hidden`).count() === 0);

/* --- reordering ----------------------------------------------------------- */

console.log('\nreordering');
const before = await ids();
await page.locator(`.card[data-id="${before[0]}"] [data-admin="down"]`).click();
const after = await ids();
check('a card moves down one place', after[0] === before[1] && after[1] === before[0]);
check('the first card cannot move up', await page.locator(`.card[data-id="${after[0]}"] [data-admin="up"]`).isDisabled());
check('the last card cannot move down', await page.locator(`.card[data-id="${after[after.length - 1]}"] [data-admin="down"]`).isDisabled());
await page.locator(`.card[data-id="${before[0]}"] [data-admin="up"]`).click();
check('moving back restores the order', (await ids()).join() === before.join());

/* --- the editor ----------------------------------------------------------- */

console.log('\nthe editor');
await page.locator(`.card[data-id="${firstVisible}"] [data-admin="edit"]`).click();
check('the editor opens', await page.locator('#editor-dialog').evaluate(node => node.open));

await page.locator('#editor-dialog [data-field="title"]').fill('');
await page.locator('#editor-dialog [data-editor="save"]').click();
check('a card cannot lose its title', (await page.locator('#editor-dialog [data-role="error"]').textContent()).includes('needs a title'));

await page.locator('#editor-dialog [data-field="title"]').fill('Renamed');
await page.locator('#editor-dialog [data-field="url"]').fill('not a url');
await page.locator('#editor-dialog [data-editor="save"]').click();
check('a broken link is refused', (await page.locator('#editor-dialog [data-role="error"]').textContent()).includes('not a valid URL'));

await page.locator('#editor-dialog [data-field="url"]').fill('https://example.com/renamed');
await page.locator('#editor-dialog [data-editor="save"]').click();
check('a valid edit saves and closes', !(await page.locator('#editor-dialog').evaluate(node => node.open)));
check('the card shows the new title', (await page.locator(`.card[data-id="${firstVisible}"] .card-title`).textContent()) === 'Renamed');

/* --- adding, then changing your mind -------------------------------------- */

console.log('\nadding an activity');
const countBefore = (await ids()).length;
await page.locator('#admin-add').click();
check('a blank card appears with the editor', (await ids()).length === countBefore + 1);
check('the editor says it is adding', (await page.locator('#editor-title').textContent()).includes('Add'));
await page.locator('#editor-dialog [data-editor="cancel"]').click();
check('cancelling takes the blank card away again', await cardsSettleAt(countBefore));
check('cancelling keeps the earlier unpublished edits', !(await publishDisabled()));

await page.locator('#admin-add').click();
await page.keyboard.press('Escape');
check('escape also takes it away', await cardsSettleAt(countBefore));

/* --- publishing is blocked while a card is broken ------------------------- */

console.log('\nrefusing to publish a broken card');
await page.locator('#admin-add').click();
await page.locator('#editor-dialog [data-field="title"]').fill('Not ready');
await page.locator('#editor-dialog [data-field="url"]').fill('https://example.com/not-ready');
await page.locator('#editor-dialog [data-field="hidden"]').uncheck();
await page.locator('#editor-dialog [data-editor="save"]').click();
await page.locator('#admin-publish').click();
check('a visible card with no image stops the publish', (await state()).includes('no image'));
check('nothing was sent to GitHub', putCount === 0, `saw ${putCount} commits`);
check('a card with no image falls back to its initial',
  await page.locator('.card[data-id="not-ready"] .card-image img').count() === 0
  && (await page.locator('.card[data-id="not-ready"] .card-initial').textContent()) === 'N');

await page.locator('.card[data-id="not-ready"] [data-admin="edit"]').click();
await page.locator('#editor-dialog [data-editor="delete"]').click();   // confirm() is auto-accepted below
check('the broken card is gone', (await ids()).includes('not-ready') === false);

/* --- a token GitHub refuses ----------------------------------------------- */

console.log('\na token GitHub refuses');
provokingFailure = true;
putStatus = 403;
await page.locator('#admin-publish').click();
await page.locator('#token-dialog [data-field="token"]').fill('github_pat_wrongscope');
await page.locator('#token-dialog [data-token="save"]').click();
await page.waitForFunction(() => document.querySelector('#admin-state').textContent.includes('Publish again'));
check('the refusal is explained', (await state()).includes('Contents: Read and write'));
check('and it says how to recover', (await state()).includes('Publish again to enter another token'));
check('the refused token is forgotten', await page.evaluate(() => sessionStorage.getItem('eslGithubToken')) === null);
check('the changes are still unpublished', !(await publishDisabled()));

/* --- a token GitHub accepts ----------------------------------------------- */

console.log('\npublishing');
provokingFailure = false;
putStatus = 200;
putCount = 0;
await page.locator('#admin-publish').click();
check('the token is asked for again', await page.locator('#token-dialog').evaluate(node => node.open));
await page.locator('#token-dialog [data-field="token"]').fill('github_pat_goodone');
await page.locator('#token-dialog [data-token="save"]').click();
await page.waitForSelector('.toast');

check('exactly one commit was made', putCount === 1, `saw ${putCount}`);
check('the token was sent as a bearer credential', seenAuth === 'Bearer github_pat_goodone');
check('the commit targets main', putBody.branch === 'main');
check('the commit carries the file SHA it replaces', putBody.sha === 'fakesha123');
check('the commit message counts the catalog', /^Update the catalog: \d+ activities, \d+ hidden$/.test(putBody.message));

const committed = JSON.parse(Buffer.from(putBody.content, 'base64').toString('utf8'));
check('the committed file is the catalog', Array.isArray(committed) && committed.length === catalog.length);
check('the edit made in the browser is in the commit', committed.find(p => p.id === firstVisible)?.title === 'Renamed');
check('the abandoned cards are not in the commit', !committed.some(p => ['not-ready', 'new-activity'].includes(p.id)));
check('accents survive the base64 round trip', committed.every(p => typeof p.blurb === 'string'));
check('every committed card has the six fields', committed.every(p => Object.keys(p).sort().join() === 'blurb,hidden,id,image,title,url'));
check('the page returns to a published state', await publishDisabled() && (await state()).trim() === 'Published');

/* --- the token is remembered for the rest of the session ------------------ */

// The first toast lingers for a few seconds, so clear it or waiting for "a
// toast" would return before the second publish had even been sent.
await page.evaluate(() => document.querySelectorAll('.toast').forEach(node => node.remove()));
await page.locator(`.card[data-id="${firstVisible}"] [data-admin="toggle"]`).click();
await page.locator('#admin-publish').click();
await page.waitForSelector('.toast');
check('a second publish does not ask for the token again', !(await page.locator('#token-dialog').evaluate(node => node.open)));
check('the second commit was sent', putCount === 2, `saw ${putCount}`);
check('the second commit carries the newly hidden card', JSON.parse(Buffer.from(putBody.content, 'base64').toString('utf8')).find(p => p.id === firstVisible)?.hidden === true);

/* --- leaving admin mode without signing out ------------------------------- */

console.log('\nleaving admin mode');
const publishedVisible = catalog.filter(project => !project.hidden).length;

await page.locator('#admin-done').click();
await page.waitForFunction(() => !document.querySelector('.admin-bar') && !document.querySelector('.card-admin'));
check('the admin bar goes away', await page.locator('.admin-bar').count() === 0);
check('the card controls go away', await page.locator('.card-admin').count() === 0);
check('the visitor sees only published activities', (await ids()).length === publishedVisible, `saw ${(await ids()).length}`);
check('the account is still signed in', await page.evaluate(() => sessionStorage.getItem('eslAdminEmail')) !== null);
check('the unpublished edits are gone', (await page.locator(`.card[data-id="${firstVisible}"] .card-title`).textContent()) !== 'Renamed');

await page.locator('#admin-link').click();
await page.waitForSelector('.admin-bar');
check('the Admin link comes straight back in', await page.locator('.admin-bar').count() === 1);
check('without asking Google again', !(await page.locator('#signin-dialog').evaluate(node => node.open)));
check('the whole catalog is listed again', (await ids()).length === catalog.length);
check('and it arrives clean', await publishDisabled());

// Unpublished work must not vanish on a mis-click.
await page.locator(`.card[data-id="${firstVisible}"] [data-admin="toggle"]`).click();
confirmAnswer = 'dismiss';
await page.locator('#admin-done').click();
check('leaving with unpublished changes asks first', await page.locator('.admin-bar').count() === 1);
check('saying no keeps the changes', !(await publishDisabled()));

confirmAnswer = 'accept';
await page.locator('#admin-done').click();
await page.waitForFunction(() => !document.querySelector('.admin-bar') && !document.querySelector('.card-admin'));
check('saying yes leaves and discards them', (await ids()).length === publishedVisible);

await browser.close();

const real = errors.filter(message => !/accounts\.google|gsi|GSI_LOGGER/i.test(message));
if (real.length) failures.push(`console errors:\n    - ${real.join('\n    - ')}`);

if (failures.length) {
  console.error(`\nAdmin check failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAdmin check passed: edit, hide, show, reorder, add, discard, refuse, recover, publish.');
