import { access, readFile } from 'node:fs/promises';

const errors = [];
const required = ['index.html', 'styles.css', 'app.js', 'admin.js', 'auth.js', 'projects.json', 'README.md'];
for (const file of required) {
  try { await access(file); } catch { errors.push(`Missing required file: ${file}`); }
}

const projects = JSON.parse(await readFile('projects.json', 'utf8'));
const ids = new Set();

for (const project of projects) {
  if (ids.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
  ids.add(project.id);

  for (const key of ['id', 'title', 'blurb', 'url']) {
    if (!project[key]) errors.push(`${project.id || '(unknown)'} is missing ${key}`);
  }
  // A card being prepared may not have a cover yet; a published one must.
  if (!project.hidden && !project.image) errors.push(`${project.id} is visible but has no image`);
  if (typeof project.hidden !== 'boolean') errors.push(`${project.id} needs a true/false hidden flag`);
  if (project.blurb && project.blurb.length > 160) errors.push(`${project.id} blurb is ${project.blurb.length} characters`);

  for (const key of Object.keys(project)) {
    if (!['id', 'title', 'blurb', 'url', 'image', 'hidden'].includes(key)) errors.push(`${project.id} has an unknown key: ${key}`);
  }

  try { new URL(project.url); } catch { errors.push(`${project.id} has an invalid url`); }
  if (project.image && !/^https?:\/\//.test(project.image)) {
    try { await access(project.image); } catch { errors.push(`${project.id} image does not exist: ${project.image}`); }
  }
}

const html = await readFile('index.html', 'utf8');
for (const id of ['catalog', 'grid', 'admin-link', 'signin-dialog']) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
}
if (!html.includes('name="viewport"')) errors.push('index.html is missing viewport metadata');
if (!html.includes('Skip to the activities')) errors.push('index.html is missing the skip link');

if (errors.length) {
  console.error(`Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const visible = projects.filter(project => !project.hidden).length;
console.log(`Validation passed: ${projects.length} activities (${visible} visible), all local covers present.`);
