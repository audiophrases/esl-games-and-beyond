import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projects = JSON.parse(await readFile('projects.json', 'utf8'));

test('the catalog holds the curated set', () => {
  assert.ok(projects.length >= 15);
  assert.ok(projects.filter(project => !project.hidden).length >= 10);
});

test('ids and titles are unique', () => {
  assert.equal(new Set(projects.map(project => project.id)).size, projects.length);
  assert.equal(new Set(projects.map(project => project.title)).size, projects.length);
});

test('every card carries exactly the six fields the page renders', () => {
  for (const project of projects) {
    assert.deepEqual(Object.keys(project).sort(), ['blurb', 'hidden', 'id', 'image', 'title', 'url']);
    assert.equal(typeof project.hidden, 'boolean');
  }
});

test('descriptions stay short and free of repository jargon', () => {
  for (const project of projects) {
    assert.ok(project.blurb.length <= 160, `${project.id} blurb is ${project.blurb.length} characters`);
    assert.doesNotMatch(project.blurb, /\b(repo|frontend|backend|API|JavaScript|GitHub Pages)\b/i, project.id);
  }
});

test('every link is a real URL', () => {
  for (const project of projects) assert.doesNotThrow(() => new URL(project.url), project.id);
});

test('admin mode is limited to the three owner accounts', async () => {
  const auth = await readFile('auth.js', 'utf8');
  const list = auth.match(/ADMIN_ALLOWED_EMAILS = \[([\s\S]*?)\]/)[1];
  const emails = [...list.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.equal(emails.length, 3);
  for (const email of emails) assert.equal(email, email.toLowerCase(), `${email} must be lowercase to match Google`);
});

test('admin publishing targets this repository only', async () => {
  const admin = await readFile('admin.js', 'utf8');
  assert.match(admin, /GH_REPO = 'audiophrases\/esl-games-and-beyond'/);
  assert.match(admin, /GH_PATH = 'projects\.json'/);
  assert.doesNotMatch(admin, /gh[pousr]_[A-Za-z0-9]{16,}/, 'a GitHub token must never be committed');
});
