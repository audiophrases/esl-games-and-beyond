import { access, readFile } from 'node:fs/promises';
import { projects, focusOptions, modeOptions } from '../data.js';

const errors = [];
const required = ['index.html', 'styles.css', 'app.js', 'data.js', 'README.md'];
for (const file of required) {
  try { await access(file); } catch { errors.push(`Missing required file: ${file}`); }
}

const ids = new Set();
for (const project of projects) {
  if (ids.has(project.id)) errors.push(`Duplicate project id: ${project.id}`);
  ids.add(project.id);
  for (const key of ['id', 'title', 'summary', 'detail', 'helps', 'level', 'access', 'status', 'action', 'url', 'source', 'image']) {
    if (!project[key]) errors.push(`${project.id || '(unknown)'} is missing ${key}`);
  }
  if (!['public', 'class', 'school', 'prototype'].includes(project.status)) errors.push(`${project.id} has invalid status ${project.status}`);
  if (!Array.isArray(project.focus) || !project.focus.length) errors.push(`${project.id} has no focus tags`);
  if (!Array.isArray(project.modes) || !project.modes.length) errors.push(`${project.id} has no modes`);
  for (const item of project.focus) if (!focusOptions.includes(item)) errors.push(`${project.id} uses unknown focus: ${item}`);
  for (const item of project.modes) if (!modeOptions.includes(item)) errors.push(`${project.id} uses unknown mode: ${item}`);
  try { await access(project.image); } catch { errors.push(`${project.id} image does not exist: ${project.image}`); }
  for (const key of ['url', 'source']) {
    try { new URL(project[key]); } catch { errors.push(`${project.id} has invalid ${key}`); }
  }
}

const html = await readFile('index.html', 'utf8');
for (const id of ['catalog', 'project-grid', 'search', 'project-dialog']) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
}
if (!html.includes('name="viewport"')) errors.push('index.html is missing viewport metadata');
if (!html.includes('Skip to the catalog')) errors.push('index.html is missing the skip link');

if (errors.length) {
  console.error(`Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Validation passed: ${projects.length} projects, ${new Set(projects.flatMap(p => p.focus)).size} focus areas, all local assets present.`);
