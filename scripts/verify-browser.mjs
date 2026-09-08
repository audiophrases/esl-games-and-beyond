import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const out = path.resolve('artifacts');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: edge, headless: true });
const errors = [];

async function openPage(viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response?.ok()) throw new Error(`Site returned ${response?.status()}`);
  return page;
}

const desktop = await openPage({ width: 1440, height: 1000 });
if (await desktop.locator('.project-card').count() !== 16) throw new Error('Expected 16 project cards');
await desktop.getByRole('button', { name: 'Listening', exact: true }).click();
if ((await desktop.locator('.project-card').count()) !== 8) throw new Error('Listening filter should show 8 cards');
await desktop.locator('#search').fill('pronunciation');
if ((await desktop.locator('.project-card').count()) !== 2) throw new Error('Listening + pronunciation should show 2 cards');
await desktop.getByRole('button', { name: 'Clear filters' }).click();
await desktop.getByRole('button', { name: 'More about PinPlay' }).click();
if (!(await desktop.locator('#project-dialog').evaluate(node => node.open))) throw new Error('Details dialog did not open');
if (!(await desktop.getByRole('link', { name: /Join with a PIN/ }).last().isVisible())) throw new Error('Dialog primary action is not visible');
await desktop.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
await desktop.getByRole('button', { name: 'Close details' }).click();

const mobile = await openPage({ width: 390, height: 844 });
if (await mobile.locator('.project-card').count() !== 16) throw new Error('Mobile catalog is incomplete');
await mobile.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
await mobile.getByRole('button', { name: 'Group', exact: true }).click();
if ((await mobile.locator('.project-card').count()) !== 3) throw new Error('Group filter should show 3 cards');

await browser.close();
if (errors.length) {
  console.error(`Browser verification failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('Browser verification passed: desktop and mobile render, search/filter combinations work, dialog action is visible, and no console errors were captured.');
