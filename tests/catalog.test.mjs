import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, focusOptions, modeOptions } from '../data.js';

test('catalog contains a substantial curated launch set', () => {
  assert.ok(projects.length >= 15);
  assert.ok(projects.filter(project => project.status === 'public').length >= 10);
});

test('project IDs and titles are unique', () => {
  assert.equal(new Set(projects.map(project => project.id)).size, projects.length);
  assert.equal(new Set(projects.map(project => project.title)).size, projects.length);
});

test('every tag can be selected in the interface', () => {
  for (const project of projects) {
    project.focus.forEach(focus => assert.ok(focusOptions.includes(focus), `${project.id}: ${focus}`));
    project.modes.forEach(mode => assert.ok(modeOptions.includes(mode), `${project.id}: ${mode}`));
  }
});

test('student-facing summaries are concise and free of repository jargon', () => {
  for (const project of projects) {
    assert.ok(project.summary.length <= 150, `${project.id} summary is ${project.summary.length} characters`);
    assert.doesNotMatch(project.summary, /\b(repo|frontend|backend|API|JavaScript|GitHub Pages)\b/i, project.id);
  }
});

test('prototype cards do not pretend to have a public play link', () => {
  for (const project of projects.filter(project => project.status === 'prototype')) {
    assert.match(project.url, /^https:\/\/github\.com\//);
    assert.match(project.access, /prototype/i);
  }
});
