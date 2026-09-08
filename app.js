/* ESL Games and Beyond — the catalog.
   One list, one card per activity, nothing to configure before you can play.
   Admin controls live in admin.js and are only fetched once someone signs in. */

const grid = document.querySelector('#grid');
const note = document.querySelector('#grid-note');
const adminLink = document.querySelector('#admin-link');
const signinDialog = document.querySelector('#signin-dialog');

const state = { projects: [], admin: false };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function cardMarkup(project) {
  return `
    <a class="card-link" href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">
      <span class="card-image">
        <img src="${escapeHtml(project.image)}" alt="" loading="lazy" width="960" height="600" onerror="this.remove()">
        <span class="card-initial" aria-hidden="true">${escapeHtml(project.title.trim().charAt(0))}</span>
      </span>
      <span class="card-body">
        <span class="card-title">${escapeHtml(project.title)}</span>
        <span class="card-blurb">${escapeHtml(project.blurb)}</span>
      </span>
    </a>`;
}

function adminControls(project, index, total) {
  return `
    <div class="card-admin">
      <button type="button" data-admin="edit" data-id="${escapeHtml(project.id)}" aria-label="Edit ${escapeHtml(project.title)}">Edit</button>
      <button type="button" data-admin="toggle" data-id="${escapeHtml(project.id)}" aria-label="${project.hidden ? 'Show' : 'Hide'} ${escapeHtml(project.title)}">${project.hidden ? 'Show' : 'Hide'}</button>
      <span class="card-admin-move">
        <button type="button" data-admin="up" data-id="${escapeHtml(project.id)}" aria-label="Move ${escapeHtml(project.title)} earlier"${index === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" data-admin="down" data-id="${escapeHtml(project.id)}" aria-label="Move ${escapeHtml(project.title)} later"${index === total - 1 ? ' disabled' : ''}>↓</button>
      </span>
    </div>`;
}

export function render() {
  const visible = state.admin ? state.projects : state.projects.filter(project => !project.hidden);

  grid.replaceChildren(...visible.map((project, index) => {
    const article = document.createElement('article');
    article.className = `card${project.hidden ? ' is-hidden' : ''}`;
    article.dataset.id = project.id;
    article.innerHTML = cardMarkup(project) + (state.admin ? adminControls(project, index, visible.length) : '');
    return article;
  }));

  const hiddenCount = state.projects.filter(project => project.hidden).length;
  if (!visible.length) {
    // Everything hidden would otherwise leave a visitor on a blank page.
    note.textContent = 'Nothing is published here just yet. Please check back soon.';
    note.hidden = false;
  } else if (state.admin && hiddenCount) {
    note.textContent = `${hiddenCount} ${hiddenCount === 1 ? 'activity is' : 'activities are'} hidden from visitors.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }
}

/* The API admin.js works through, so nothing student-facing depends on it. */
export const catalog = {
  get: () => state.projects,
  set(next) { state.projects = next; render(); },
  setAdmin(on) { state.admin = on; document.body.classList.toggle('admin-on', on); render(); },
  isAdmin: () => state.admin,
  render,
  escapeHtml
};

async function startAdmin() {
  try {
    const module = await import('./admin.js');
    module.startAdmin(catalog);
  } catch (error) {
    // Silence here would look like a sign-in that simply did nothing.
    note.textContent = 'Admin mode could not load. Reload the page and sign in again.';
    note.hidden = false;
    console.error(error);
  }
}

async function load() {
  try {
    // GitHub Pages will happily serve a stale copy right after a commit.
    const response = await fetch(`projects.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`projects.json returned ${response.status}`);
    state.projects = await response.json();
  } catch (error) {
    note.textContent = 'The activity list could not be loaded. Please reload the page.';
    note.hidden = false;
    console.error(error);
    return;
  }

  render();
  if (typeof adminIsSignedIn === 'function' && adminIsSignedIn()) startAdmin();
}

window.onAdminAuthSuccess = () => {
  signinDialog.close();
  startAdmin();
};

adminLink.addEventListener('click', () => {
  if (state.admin) return;
  signinDialog.showModal();
  adminRenderSignIn('gsi-button');
});

signinDialog.querySelector('[data-close-signin]').addEventListener('click', () => signinDialog.close());

load();
