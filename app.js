import { projects, focusOptions, modeOptions } from './data.js';

const state = { query: '', focus: 'All', mode: 'All' };
const grid = document.querySelector('#project-grid');
const count = document.querySelector('#result-count');
const empty = document.querySelector('#empty-state');
const search = document.querySelector('#search');
const dialog = document.querySelector('#project-dialog');
const dialogContent = document.querySelector('#dialog-content');

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function iconFor(project) {
  const icons = {
    Games: '<path d="M7 18h10l2-8a4 4 0 0 0-4-5H9a4 4 0 0 0-4 5l2 8Z"/><path d="M8 10h4m-2-2v4m5-2h.01"/>',
    Listening: '<path d="M4 14v-4a8 8 0 0 1 16 0v4"/><path d="M4 14a2 2 0 0 0 2 2h1v-5H4v3Zm16 0a2 2 0 0 1-2 2h-1v-5h3v3ZM17 16c0 3-2 4-5 4"/>',
    Grammar: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h5M8 16h7"/>',
    Pronunciation: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3"/>',
    Reading: '<path d="M3 5a4 4 0 0 1 4-1c3 0 5 2 5 2s2-2 5-2a4 4 0 0 1 4 1v14a4 4 0 0 0-4-1c-3 0-5 2-5 2s-2-2-5-2a4 4 0 0 0-4 1V5Z"/>',
    Beyond: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/>'
  };
  const key = project.focus.find(item => icons[item]) || 'Reading';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>`;
}

function statusLabel(status) {
  return ({ public: 'Open now', class: 'Class link', school: 'School access', prototype: 'In development' })[status];
}

function createCard(project, index) {
  const article = document.createElement('article');
  article.className = `project-card status-${project.status}${project.featured ? ' featured' : ''}`;
  article.dataset.id = project.id;
  article.style.setProperty('--order', index);
  article.innerHTML = `
    <div class="card-visual">
      <img src="${escapeHtml(project.image)}" alt="Preview of ${escapeHtml(project.title)}" width="960" height="600">
      <span class="status-badge">${statusLabel(project.status)}</span>
      <span class="card-icon">${iconFor(project)}</span>
    </div>
    <div class="card-body">
      <p class="card-kicker">${escapeHtml(project.kicker)}</p>
      <h3>${escapeHtml(project.title)}</h3>
      <p class="card-summary">${escapeHtml(project.summary)}</p>
      <ul class="tag-list" aria-label="Skills and format">
        ${project.focus.slice(0, 3).map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}
        <li>${escapeHtml(project.modes[0])}</li>
      </ul>
      <div class="card-actions">
        <a href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">${escapeHtml(project.action)} <span aria-hidden="true">↗</span></a>
        <button type="button" data-details="${escapeHtml(project.id)}" aria-label="More about ${escapeHtml(project.title)}">Details</button>
      </div>
    </div>`;
  return article;
}

function filteredProjects() {
  const words = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return projects.filter(project => {
    const haystack = [project.title, project.kicker, project.summary, project.detail, project.helps, project.level, project.access, ...project.focus, ...project.modes].join(' ').toLowerCase();
    const queryMatch = words.every(word => haystack.includes(word));
    const focusMatch = state.focus === 'All' || project.focus.includes(state.focus);
    const modeMatch = state.mode === 'All' || project.modes.includes(state.mode);
    return queryMatch && focusMatch && modeMatch;
  });
}

function render() {
  const visible = filteredProjects();
  grid.replaceChildren(...visible.map(createCard));
  count.textContent = `${visible.length} ${visible.length === 1 ? 'activity' : 'activities'}`;
  empty.hidden = visible.length > 0;
  grid.hidden = visible.length === 0;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const active = state[button.dataset.group] === button.dataset.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function makeFilters(targetId, options, group) {
  const target = document.querySelector(targetId);
  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = option;
    button.dataset.group = group;
    button.textContent = option === 'All' ? `All ${group === 'focus' ? 'topics' : 'formats'}` : option;
    button.addEventListener('click', () => { state[group] = option; render(); });
    target.append(button);
  });
}

function clearFilters() {
  state.query = '';
  state.focus = 'All';
  state.mode = 'All';
  search.value = '';
  render();
}

function openDetails(id) {
  const project = projects.find(item => item.id === id);
  if (!project) return;
  dialogContent.innerHTML = `
    <div class="dialog-image"><img src="${escapeHtml(project.image)}" alt="Preview of ${escapeHtml(project.title)}" width="960" height="600"></div>
    <div class="dialog-copy">
      <p class="card-kicker">${escapeHtml(project.kicker)} · ${statusLabel(project.status)}</p>
      <h2 id="dialog-title">${escapeHtml(project.title)}</h2>
      <p class="dialog-summary">${escapeHtml(project.detail)}</p>
      <dl>
        <div><dt>How it helps</dt><dd>${escapeHtml(project.helps)}</dd></div>
        <div><dt>Level</dt><dd>${escapeHtml(project.level)}</dd></div>
        <div><dt>Works best</dt><dd>${escapeHtml(project.modes.join(' · '))}</dd></div>
        <div><dt>Before you start</dt><dd>${escapeHtml(project.access)}</dd></div>
      </dl>
      <div class="dialog-actions">
        <a class="primary-action" href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">${escapeHtml(project.action)} <span aria-hidden="true">↗</span></a>
        <a class="source-action" href="${escapeHtml(project.source)}" target="_blank" rel="noreferrer">View source</a>
      </div>
    </div>`;
  dialog.showModal();
}

makeFilters('#focus-filters', focusOptions, 'focus');
makeFilters('#mode-filters', modeOptions, 'mode');
search.addEventListener('input', event => { state.query = event.target.value; render(); });
document.querySelector('#clear-filters').addEventListener('click', clearFilters);
document.querySelector('[data-clear]').addEventListener('click', clearFilters);
document.querySelector('[data-quick-filter]').addEventListener('click', event => {
  clearFilters(); state.focus = event.currentTarget.dataset.quickFilter; render();
  document.querySelector('#catalog').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  clearFilters(); state.mode = button.dataset.preset; render();
  document.querySelector('#catalog').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));
grid.addEventListener('click', event => {
  const trigger = event.target.closest('[data-details]');
  if (trigger) openDetails(trigger.dataset.details);
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (outside) dialog.close();
});

render();
