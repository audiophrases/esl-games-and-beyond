import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const projects = [
  ['pinplay', 'https://audiophrases.github.io/pinplay/'],
  ['dictation-time', 'https://audiophrases.github.io/DictationApp/'],
  ['read-listen-speak', 'https://audiophrases.github.io/speechtoipa/'],
  ['watchword', 'https://audiophrases.github.io/Watchword/'],
  ['impostor', 'https://audiophrases.github.io/impostor/'],
  ['grammar-studio', 'https://audiophrases.github.io/grammar/'],
  ['irregular-verbs', 'https://audiophrases.github.io/irregularverbs/'],
  ['prepositions', 'https://audiophrases.github.io/prepositions/'],
  ['ga-phonetics', 'https://audiophrases.github.io/GAPhonetics/'],
  ['vocab', 'https://audiophrases.github.io/vocab/'],
  ['snakes-ladders', 'https://audiophrases.github.io/snakesandladders/'],
  ['babble-bazaar', 'https://audiophrases.github.io/babblebazaar/'],
  ['number-mania', 'https://audiophrases.github.io/Multiplication-Game/'],
  ['english-hub', 'https://audiophrases.github.io/English-Hub/'],
  ['pdf-library', 'https://audiophrases.github.io/pdfgallery/']
];

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
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(outDir, `${slug}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 800 }
    });
    results.push({ slug, status: response?.status() ?? null, title: await page.title(), errors: errors.slice(0, 3) });
  } catch (error) {
    results.push({ slug, error: error.message, errors: errors.slice(0, 3) });
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.error || (result.status && result.status >= 400))) process.exitCode = 1;
