import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const out = path.resolve('artifacts');
await mkdir(out, { recursive: true });

// Read the catalog from the site under test, not from disk: against a live
// BASE_URL the local file may be behind a publish made from admin mode.
const projects = await fetch(new URL('projects.json', baseUrl)).then(r => r.json());
const visible = projects.filter(project => !project.hidden).length;

const browser = await chromium.launch({ executablePath: edge, headless: true });
const errors = [];

async function openPage(viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response?.ok()) throw new Error(`Site returned ${response?.status()}`);
  await page.waitForSelector('.card');
  return page;
}

const desktop = await openPage({ width: 1440, height: 1000 });

const shown = await desktop.locator('.card').count();
if (shown !== visible) throw new Error(`Expected ${visible} visible cards, found ${shown}`);

// Hidden activities must not reach a visitor, not even in the markup.
const html = await desktop.content();
for (const project of projects.filter(project => project.hidden)) {
  if (html.includes(project.url)) throw new Error(`Hidden activity ${project.id} is still in the page`);
}

// Every card is a plain link: image, title, one line, no controls.
if (await desktop.locator('.card-admin').count() !== 0) throw new Error('Admin controls are visible to visitors');
if (await desktop.locator('.card-link').count() !== shown) throw new Error('A card is missing its link');
if (await desktop.locator('.card-image img').count() !== shown) throw new Error('A cover image failed to load');

const first = projects.find(project => !project.hidden);
if (await desktop.locator(`.card-link[href="${first.url}"]`).count() !== 1) throw new Error(`${first.id} does not link to its activity`);

await desktop.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });

// The admin door exists but stays shut without an authorised Google account.
await desktop.locator('#admin-link').click();
if (!(await desktop.locator('#signin-dialog').evaluate(node => node.open))) throw new Error('Admin sign-in did not open');
await desktop.locator('[data-close-signin]').click();
await desktop.close();

const mobile = await openPage({ width: 390, height: 844 });
if (await mobile.locator('.card').count() !== visible) throw new Error('Mobile catalog is incomplete');
await mobile.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });

await browser.close();

// The Google script logs a warning when the origin is not authorised locally;
// only real page errors should fail the run.
const real = errors.filter(message => !/accounts\.google|gsi|GSI_LOGGER/i.test(message));
if (real.length) throw new Error(`Console errors:\n- ${real.join('\n- ')}`);

console.log(`Browser check passed: ${visible} visible cards, ${projects.length - visible} hidden, clean console.`);
