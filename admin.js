/* ==========================================================================
   ESL Games and Beyond — admin mode

   Loaded only after an authorised Google account signs in (see auth.js).
   Edits are held in the page until Publish, which commits projects.json back
   to the repo through the GitHub Contents API. GitHub Pages redeploys within
   a minute or so and visitors see the change on their next reload.

   THE TOKEN
   ---------
   Publishing needs a GitHub token. This asks for one the first time you
   publish and keeps it in sessionStorage — it is gone when the tab closes and
   it is never written into the page or the repo. Make one at
   https://github.com/settings/personal-access-tokens/new

     - Repository access -> Only select repositories -> esl-games-and-beyond
     - Permissions -> Repository permissions -> Contents -> Read and write
     - Give it a short expiry; you can always mint another.

   Scope it to this one repository. A token pasted into a page is only as safe
   as the browser it is typed into, so a fine-grained token that can touch
   nothing else is the difference between a bad day and a very bad one.
   ========================================================================== */

const GH_REPO = 'audiophrases/esl-games-and-beyond';
const GH_BRANCH = 'main';
const GH_PATH = 'projects.json';
const GH_API = 'https://api.github.com';
const GH_TOKEN_KEY = 'eslGithubToken';

let catalog = null;
let dirty = false;
let editingId = null;
let pendingNew = null;   // a just-added card, dropped again if the editor is cancelled

/* --- token ---------------------------------------------------------------- */

const readToken = () => { try { return sessionStorage.getItem(GH_TOKEN_KEY); } catch { return null; } };
const writeToken = value => { try { sessionStorage.setItem(GH_TOKEN_KEY, value); } catch {} };
const clearToken = () => { try { sessionStorage.removeItem(GH_TOKEN_KEY); } catch {} };

/* --- GitHub Contents API -------------------------------------------------- */

// btoa() throws above U+00FF and these blurbs carry accents and en dashes,
// so encode to UTF-8 bytes first.
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const ghHeaders = token => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
});

// 401, 403 and 404 all mean "this token cannot do this", so all three have to
// forget it. Keeping a wrong-scope token would leave the next publish showing
// "fix the token" with no way left to enter a different one.
function ghError(response, body) {
  const messages = {
    401: 'GitHub rejected the token. It may be expired or mistyped.',
    403: `That token is not allowed to write here. It needs Contents: Read and write on ${GH_REPO}.`,
    404: `GitHub cannot see ${GH_REPO}. Check the token grants access to that repository.`,
    409: 'Someone else changed the catalog first. Reload the page and make the edit again.'
  };
  const error = new Error(messages[response.status]
    || `GitHub returned ${response.status}${body?.message ? `: ${body.message}` : ''}.`);
  error.tokenProblem = [401, 403, 404].includes(response.status);
  return error;
}

// The Contents API needs the blob SHA of the file it is replacing.
async function currentSha(token) {
  const response = await fetch(`${GH_API}/repos/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`, {
    headers: ghHeaders(token), cache: 'no-store'
  });
  if (!response.ok) throw ghError(response, await response.json().catch(() => null));
  return (await response.json()).sha;
}

async function commit(projects, message) {
  const token = readToken();
  if (!token) throw new Error('No GitHub token in this session.');

  const sha = await currentSha(token);
  const response = await fetch(`${GH_API}/repos/${GH_REPO}/contents/${GH_PATH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...ghHeaders(token) },
    body: JSON.stringify({
      message,
      content: toBase64(`${JSON.stringify(projects, null, 2)}\n`),
      sha,
      branch: GH_BRANCH
    })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw ghError(response, body);
  return body;
}

/* --- small helpers -------------------------------------------------------- */

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function slugify(title) {
  return String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'activity';
}

function uniqueId(base, ignoreId) {
  const taken = new Set(catalog.get().filter(project => project.id !== ignoreId).map(project => project.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}

function markDirty(on) {
  dirty = on;
  document.querySelector('#admin-publish').disabled = !on;
  document.querySelector('#admin-state').textContent = on ? 'Unpublished changes' : 'Published';
}

/* --- admin bar ------------------------------------------------------------ */

function buildBar(email) {
  const bar = document.createElement('div');
  bar.className = 'admin-bar';
  bar.innerHTML = `
    <span class="admin-who">Admin · ${esc(email || '')}</span>
    <span id="admin-state" class="admin-state">Published</span>
    <span class="admin-bar-actions">
      <button type="button" id="admin-add">Add activity</button>
      <button type="button" id="admin-publish" disabled>Publish to GitHub</button>
      <button type="button" id="admin-done" class="ghost">Done</button>
      <button type="button" id="admin-signout" class="ghost">Sign out</button>
    </span>`;
  document.body.prepend(bar);

  bar.querySelector('#admin-add').addEventListener('click', addActivity);
  bar.querySelector('#admin-publish').addEventListener('click', publish);
  bar.querySelector('#admin-done').addEventListener('click', exitAdmin);
  bar.querySelector('#admin-signout').addEventListener('click', () => {
    if (dirty && !confirm('There are unpublished changes. Sign out and lose them?')) return;
    dirty = false;
    adminSignOut();
  });
}

/* --- card actions --------------------------------------------------------- */

function move(id, delta) {
  const projects = catalog.get().slice();
  const from = projects.findIndex(project => project.id === id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= projects.length) return;
  [projects[from], projects[to]] = [projects[to], projects[from]];
  catalog.set(projects);
  markDirty(true);
}

function toggleHidden(id) {
  catalog.set(catalog.get().map(project =>
    project.id === id ? { ...project, hidden: !project.hidden } : project));
  markDirty(true);
}

// The blank card has to exist before the editor can point at it, so cancelling
// has to take it away again — otherwise a change of mind leaves an untitled,
// linkless entry sitting in the catalog waiting to be published.
function addActivity() {
  const project = { id: uniqueId('new-activity'), title: '', blurb: '', url: '', image: '', hidden: true };
  pendingNew = { id: project.id, wasDirty: dirty };
  catalog.set([...catalog.get(), project]);
  markDirty(true);
  openEditor(project.id);
}

function discardPendingNew() {
  if (!pendingNew) return;
  const { id, wasDirty } = pendingNew;
  pendingNew = null;
  catalog.set(catalog.get().filter(project => project.id !== id));
  markDirty(wasDirty);
}

/* --- editor --------------------------------------------------------------- */

function field(label, name, value, hint) {
  return `<label class="admin-field">
    <span>${esc(label)}</span>
    <input type="text" data-field="${name}" value="${esc(value)}"${hint ? ` placeholder="${esc(hint)}"` : ''}>
  </label>`;
}

function editorMarkup(project) {
  return `
    <h2 id="editor-title">${pendingNew ? 'Add an activity' : 'Edit activity'}</h2>
    ${field('Title', 'title', project.title)}
    <label class="admin-field">
      <span>Short description</span>
      <textarea data-field="blurb" rows="3" maxlength="160">${esc(project.blurb)}</textarea>
      <small data-role="count"></small>
    </label>
    ${field('Link', 'url', project.url, 'https://audiophrases.github.io/...')}
    ${field('Image', 'image', project.image, 'assets/covers/name.webp')}
    ${field('Id', 'id', pendingNew ? '' : project.id, 'made from the title')}
    <label class="admin-check">
      <input type="checkbox" data-field="hidden"${project.hidden ? ' checked' : ''}>
      <span>Hidden — only admins see this card</span>
    </label>
    <p class="admin-error" data-role="error" hidden></p>
    <div class="admin-editor-actions">
      <button type="button" data-editor="delete" class="danger">Delete</button>
      <span class="spacer"></span>
      <button type="button" data-editor="cancel" class="ghost">Cancel</button>
      <button type="button" data-editor="save">Save</button>
    </div>`;
}

function editorDialog() {
  let dialog = document.querySelector('#editor-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'editor-dialog';
    dialog.setAttribute('aria-labelledby', 'editor-title');
    document.body.append(dialog);
    // Assigned, not added: reopening must not stack a second handler on the
    // same dialog and fire every action twice.
    dialog.onclick = event => {
      const button = event.target.closest('[data-editor]');
      if (!button) return;
      if (button.dataset.editor === 'cancel') dialog.close();
      else if (button.dataset.editor === 'save') saveEditor(dialog);
      else if (button.dataset.editor === 'delete') deleteEditor(dialog);
    };
    // Covers Cancel and the Escape key alike. Saving clears pendingNew first,
    // so a saved card survives the close that follows it.
    dialog.onclose = discardPendingNew;
  }
  return dialog;
}

function openEditor(id) {
  const project = catalog.get().find(item => item.id === id);
  if (!project) return;
  editingId = id;

  const dialog = editorDialog();
  dialog.innerHTML = editorMarkup(project);

  const blurb = dialog.querySelector('[data-field="blurb"]');
  const count = dialog.querySelector('[data-role="count"]');
  const updateCount = () => { count.textContent = `${blurb.value.length}/160 — one sentence is plenty.`; };
  blurb.addEventListener('input', updateCount);
  updateCount();

  dialog.showModal();
  dialog.querySelector('[data-field="title"]').focus();
}

function saveEditor(dialog) {
  const value = name => dialog.querySelector(`[data-field="${name}"]`).value.trim();
  const fail = message => {
    const box = dialog.querySelector('[data-role="error"]');
    box.textContent = message;
    box.hidden = false;
  };

  const title = value('title');
  if (!title) return fail('An activity needs a title.');

  const url = value('url');
  if (!url) return fail('An activity needs a link.');
  try { new URL(url); } catch { return fail('That link is not a valid URL.'); }

  const updated = {
    id: uniqueId(slugify(value('id') || title), editingId),
    title,
    blurb: value('blurb'),
    url,
    image: value('image'),
    hidden: dialog.querySelector('[data-field="hidden"]').checked
  };

  pendingNew = null;   // it has a title and a link now; it is a real card
  catalog.set(catalog.get().map(project => (project.id === editingId ? updated : project)));
  markDirty(true);
  dialog.close();
}

function deleteEditor(dialog) {
  const project = catalog.get().find(item => item.id === editingId);
  if (!confirm(`Delete "${project && project.title ? project.title : 'this activity'}" from the catalog?`)) return;
  pendingNew = null;
  catalog.set(catalog.get().filter(item => item.id !== editingId));
  markDirty(true);
  dialog.close();
}

/* --- publish -------------------------------------------------------------- */

// A password field in the page rather than prompt(): the token stays out of
// the browser's own dialog history, and it can be re-entered after a refusal.
function askForToken() {
  let dialog = document.querySelector('#token-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'token-dialog';
    dialog.setAttribute('aria-labelledby', 'token-title');
    document.body.append(dialog);
  }

  dialog.innerHTML = `
    <h2 id="token-title">A GitHub token is needed to publish</h2>
    <p>Create a fine-grained token with <strong>Contents: Read and write</strong> on
    <strong>${GH_REPO.split('/')[1]}</strong> only, then paste it here. It stays in this tab
    for this session and is never saved to the site.
    <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create one</a>.</p>
    <label class="admin-field">
      <span>Token</span>
      <input type="password" data-field="token" placeholder="github_pat_…" autocomplete="off">
    </label>
    <p class="admin-error" data-role="error" hidden></p>
    <div class="admin-editor-actions">
      <span class="spacer"></span>
      <button type="button" data-token="cancel" class="ghost">Cancel</button>
      <button type="button" data-token="save">Use this token</button>
    </div>`;

  return new Promise(resolve => {
    // Escape closes the dialog without touching the buttons, so resolve there
    // too or publish() would wait for a promise that never settles.
    dialog.onclose = () => resolve(false);
    dialog.onclick = event => {
      const button = event.target.closest('[data-token]');
      if (!button) return;
      if (button.dataset.token === 'cancel') { dialog.close(); return; }

      const value = dialog.querySelector('[data-field="token"]').value.trim();
      if (!value) {
        const box = dialog.querySelector('[data-role="error"]');
        box.textContent = 'Paste a token, or cancel.';
        box.hidden = false;
        return;
      }
      writeToken(value);
      resolve(true);
      dialog.close();
    };
    dialog.showModal();
    dialog.querySelector('[data-field="token"]').focus();
  });
}

// Publishing writes the file the whole site reads, so a broken card must not
// get that far — the page would render a dead link and npm run validate would
// start failing in the repo.
function firstProblem(projects) {
  for (const project of projects) {
    if (!project.title) return `${project.id} has no title.`;
    if (!project.url) return `“${project.title}” has no link.`;
    if (!project.hidden && !project.image) return `“${project.title}” is visible but has no image. Add one, or hide it.`;
  }
  return null;
}

async function publish() {
  const projects = catalog.get();

  const problem = firstProblem(projects);
  if (problem) {
    document.querySelector('#admin-state').textContent = problem;
    return;
  }

  if (!readToken() && !(await askForToken())) return;

  const button = document.querySelector('#admin-publish');
  const hidden = projects.filter(project => project.hidden).length;

  button.disabled = true;
  document.querySelector('#admin-state').textContent = 'Publishing…';

  try {
    await commit(projects, `Update the catalog: ${projects.length} activities, ${hidden} hidden`);
    markDirty(false);
    toast('Published. GitHub Pages usually redeploys within a minute.');
  } catch (error) {
    button.disabled = false;
    if (error?.tokenProblem) {
      clearToken();
      document.querySelector('#admin-state').textContent = `${error.message} Publish again to enter another token.`;
    } else {
      document.querySelector('#admin-state').textContent = error?.message || 'The commit failed.';
    }
  }
}

/* --- entry point ---------------------------------------------------------- */

function onGridClick(event) {
  const button = event.target.closest('[data-admin]');
  if (!button) return;
  const { admin: action, id } = button.dataset;
  if (action === 'edit') openEditor(id);
  else if (action === 'toggle') toggleHidden(id);
  else if (action === 'up') move(id, -1);
  else if (action === 'down') move(id, 1);
}

function onBeforeUnload(event) {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
}

// Done: back to the visitor's view, still signed in. The Admin link in the
// footer comes straight back here without another trip through Google.
async function exitAdmin() {
  if (dirty && !confirm('There are unpublished changes. Leave admin mode and lose them?')) return;

  // Fetch first. Show what is actually published, not the edits just
  // abandoned; if the fetch fails the in-memory list stays, which still hides
  // the hidden ones.
  await catalog.reload().catch(() => {});

  // Everything from here runs in one task, so the page never paints a state
  // that is half out of admin mode.
  document.querySelector('#grid').removeEventListener('click', onGridClick);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.querySelector('.admin-bar')?.remove();
  document.querySelectorAll('#editor-dialog, #token-dialog').forEach(dialog => dialog.remove());

  dirty = false;
  pendingNew = null;
  editingId = null;
  catalog.setAdmin(false);
}

export function startAdmin(api) {
  if (document.querySelector('.admin-bar')) return;   // already on

  catalog = api;
  dirty = false;
  pendingNew = null;
  editingId = null;

  catalog.setAdmin(true);
  buildBar(adminSignedInEmail());

  document.querySelector('#grid').addEventListener('click', onGridClick);
  window.addEventListener('beforeunload', onBeforeUnload);
}
