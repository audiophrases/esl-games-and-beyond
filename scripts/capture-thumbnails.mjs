import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Read the catalog rather than keeping a second copy of it: an activity added
// through admin mode should get a cover from this script without anyone having
// to remember to edit it too. Repository links have no app to photograph.
const catalog = JSON.parse(await readFile('projects.json', 'utf8'));
const projects = catalog
  .filter(project => !/^https:\/\/github\.com\//.test(project.url))
  .map(project => [project.id, project.url]);

console.log(`Capturing ${projects.length} of ${catalog.length} activities.`);

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const outDir = path.resolve('assets/screens');
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edge, headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce'
});

const results = [];
for (const [slug, url] of projects) {
  const page = await context.newPage();
  let capturePage = page;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    if (slug === 'password') {
      await page.click('#load-sample');
      capturePage = await Promise.all([
        context.waitForEvent('page'),
        page.click('#start-game')
      ]).then(([opened]) => opened);
      capturePage.on('pageerror', error => errors.push(error.message));
      await capturePage.waitForLoadState('networkidle');
      await capturePage.waitForTimeout(500);
    }
    await capturePage.screenshot({
      path: path.join(outDir, `${slug}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });
    results.push({ slug, status: response?.status() ?? null, title: await capturePage.title(), errors: errors.slice(0, 3) });
  } catch (error) {
    results.push({ slug, error: error.message, errors: errors.slice(0, 3) });
  } finally {
    if (capturePage !== page) await capturePage.close();
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.error || (result.status && result.status >= 400))) process.exitCode = 1;
