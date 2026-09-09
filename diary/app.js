/* Diary — a journal shaped like a messenger.

   Everything lives in this browser. Entries, photos and voice notes go into
   IndexedDB and are never uploaded, which is also why an invite can only
   carry the idea of a diary — its name and prompt — and never its contents.

   The diary answers with a prompt at the start of each day, so the screen has
   two voices in it and there is always something to reply to. */

const DB_NAME = 'diary';
const DB_VERSION = 1;

const PROMPTS = [
  'How did today start?',
  'What is one thing you did well today?',
  'Describe someone you spoke to today.',
  'What made you laugh recently?',
  'What was difficult today, and what did you do about it?',
  'Say three things you can see right now.',
  'What are you looking forward to this week?',
  'What did you eat today? Was it good?',
  'Tell me about a place you went to.',
  'What would you change about today?',
  'What did you learn — about anything at all?',
  'Who helped you this week?',
  'What is the weather doing, and how does it feel?',
  'Describe your room in five sentences.',
  'What song is in your head?'
];

const AVATARS = ['📔', '🌤️', '🎧', '🌱', '📸', '☕', '🎒', '🌙', '🏃', '🎨', '🐈', '⚽'];

const EMOJI = {
  'Smileys': ['😀', '😄', '😅', '😂', '🙂', '😉', '😊', '😍', '😘', '😜', '🤔', '😐', '😴', '😪', '😢', '😭', '😤', '😳', '🥳', '😎', '🤯', '🤗'],
  'People & body': ['👍', '👎', '👏', '🙌', '🙏', '💪', '👀', '🧠', '🫶', '✍️', '🤝', '👋'],
  'Life': ['🏠', '🏫', '🚌', '🚶', '🛏️', '🍕', '🍎', '☕', '⚽', '🎮', '🎧', '📚', '💻', '📷', '✈️', '🏖️', '🎂', '🎉'],
  'Weather & nature': ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '🌈', '🌙', '⭐', '🌊', '🌳', '🌸', '🐈', '🐕'],
  'Hearts & marks': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '🔥', '✅', '❌', '❗', '❓', '💭']
};

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ── storage ────────────────────────────────────────────────────────────── */

let db;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result;
      if (!store.objectStoreNames.contains('diaries')) {
        store.createObjectStore('diaries', { keyPath: 'id' });
      }
      if (!store.objectStoreNames.contains('entries')) {
        const entries = store.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('diaryId', 'diaryId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(store, mode, run) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = run(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(request && request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

const putDiary = diary => tx('diaries', 'readwrite', store => store.put(diary));
const allDiaries = () => tx('diaries', 'readonly', store => store.getAll());
const putEntry = entry => tx('entries', 'readwrite', store => store.put(entry));
const dropEntry = id => tx('entries', 'readwrite', store => store.delete(id));
const entriesFor = id => tx('entries', 'readonly', store => store.index('diaryId').getAll(id));

async function dropDiary(id) {
  const entries = await entriesFor(id);
  await tx('entries', 'readwrite', store => { entries.forEach(entry => store.delete(entry.id)); });
  await tx('diaries', 'readwrite', store => store.delete(id));
}

/* ── little helpers ─────────────────────────────────────────────────────── */

const $ = selector => document.querySelector(selector);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const clock = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayKey = ts => new Date(ts).toDateString();

function dayLabel(ts) {
  const key = dayKey(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (key === today.toDateString()) return 'Today';
  if (key === yesterday.toDateString()) return 'Yesterday';
  const date = new Date(ts);
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
}

function listTime(ts) {
  if (!ts) return '';
  if (dayKey(ts) === new Date().toDateString()) return clock(ts);
  if (dayKey(ts) === new Date(Date.now() - 864e5).toDateString()) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const mmss = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// Emoji-only messages get shown large, the way messengers do.
const emojiOnly = text => text.length <= 8 && /\p{Extended_Pictographic}/u.test(text)
  && !/[\p{L}\p{N}]/u.test(text);

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ── state ──────────────────────────────────────────────────────────────── */

const state = { diaries: [], current: null, entries: [], filter: '', listFilter: '' };
let menuTarget = null;   // the entry a context menu was opened on
const urls = new Map();   // entry id -> object URL, revoked when the diary closes

function urlFor(entry) {
  if (!urls.has(entry.id)) urls.set(entry.id, URL.createObjectURL(entry.blob));
  return urls.get(entry.id);
}

function releaseUrls() {
  urls.forEach(url => URL.revokeObjectURL(url));
  urls.clear();
}

function show(screen) {
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('is-active', el.id === screen));
}

/* ── the diary list ─────────────────────────────────────────────────────── */

function previewOf(diary) {
  const last = diary.last;
  if (!last) return { icon: null, text: diary.prompt || 'Nothing written yet' };
  if (last.kind === 'voice') return { icon: '#i-mic', text: `Voice note (${mmss(last.duration || 0)})` };
  if (last.kind === 'image') return { icon: '#i-camera', text: last.text || 'Photo' };
  return { icon: null, text: last.text };
}

function renderList() {
  const list = $('#diary-list');
  const query = state.listFilter.trim().toLowerCase();
  const shown = state.diaries
    .filter(diary => !query || `${diary.name} ${diary.prompt || ''}`.toLowerCase().includes(query))
    .sort((a, b) => (b.last?.createdAt || b.createdAt) - (a.last?.createdAt || a.createdAt));

  list.innerHTML = shown.map(diary => {
    const preview = previewOf(diary);
    return `
      <li>
        <button type="button" class="chat-row" data-open="${esc(diary.id)}">
          <span class="avatar">${esc(diary.avatar)}</span>
          <span class="row-body">
            <span class="row-top">
              <span class="row-name">${esc(diary.name)}</span>
              <span class="row-time">${esc(listTime(diary.last?.createdAt))}</span>
            </span>
            <span class="row-preview">
              ${preview.icon ? `<svg><use href="${preview.icon}"/></svg>` : ''}
              <span>${esc(preview.text)}</span>
              ${diary.count ? `<span class="row-count">${diary.count}</span>` : ''}
            </span>
          </span>
        </button>
      </li>`;
  }).join('');

  $('#list-empty').hidden = shown.length > 0 || !!query;
}

async function loadDiaries() {
  state.diaries = await allDiaries();
  for (const diary of state.diaries) {
    const entries = await entriesFor(diary.id);
    const mine = entries.filter(entry => entry.side !== 'in').sort((a, b) => a.createdAt - b.createdAt);
    diary.last = mine.at(-1);
    diary.count = mine.length;
  }
  renderList();
}

/* ── the conversation ───────────────────────────────────────────────────── */

function waveBars(peaks, played = 0) {
  return peaks.map((peak, index) => {
    const height = Math.max(3, Math.round(peak * 24));
    const on = index / peaks.length < played ? ' class="on"' : '';
    return `<i${on} style="height:${height}px"></i>`;
  }).join('');
}

function bubbleFor(entry, runOn) {
  const side = entry.side === 'in' ? 'in' : 'out';
  const meta = `<span class="meta">${esc(clock(entry.createdAt))}${side === 'out' ? '<svg><use href="#i-ticks"/></svg>' : ''}</span>`;
  const reaction = entry.reaction ? `<span class="reaction">${esc(entry.reaction)}</span>` : '';

  let inner;
  let classes = 'bubble';

  if (entry.kind === 'image') {
    classes += entry.text ? ' media' : ' media bare';
    inner = `<img src="${urlFor(entry)}" alt="${esc(entry.text || 'Diary photo')}" data-photo="${esc(entry.id)}">`
      + (entry.text ? `<p class="caption">${highlight(entry.text)}${meta}</p>` : meta);
  } else if (entry.kind === 'voice') {
    inner = `<div class="voice" data-voice="${esc(entry.id)}">
        <button type="button" class="voice-play" aria-label="Play voice note"><svg><use href="#i-play"/></svg></button>
        <span class="wave">${waveBars(entry.peaks || [])}</span>
        <span class="voice-time">${esc(mmss(entry.duration || 0))}</span>
      </div>${meta}`;
  } else {
    if (emojiOnly(entry.text)) classes += ' jumbo';
    inner = `<p>${highlight(entry.text)}</p>${meta}`;
  }

  return `<div class="msg ${side}${runOn ? ' run' : ''}" data-id="${esc(entry.id)}">
      <div class="${classes}">${inner}${reaction}</div>
    </div>`;
}

function highlight(text) {
  const safe = esc(text);
  const query = state.filter.trim();
  if (!query) return safe;
  const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return safe.replace(pattern, '<mark>$1</mark>');
}

function renderChat() {
  const box = $('#messages');
  const query = state.filter.trim().toLowerCase();
  const shown = state.entries
    .filter(entry => !query || (entry.text || '').toLowerCase().includes(query))
    .sort((a, b) => a.createdAt - b.createdAt);

  let html = '';
  let day = null;
  let previous = null;

  for (const entry of shown) {
    if (dayKey(entry.createdAt) !== day) {
      day = dayKey(entry.createdAt);
      html += `<span class="day-pill">${esc(dayLabel(entry.createdAt))}</span>`;
      previous = null;
    }
    const runOn = previous
      && (previous.side === 'in' ? 'in' : 'out') === (entry.side === 'in' ? 'in' : 'out')
      && entry.createdAt - previous.createdAt < 6e5;
    html += bubbleFor(entry, runOn);
    previous = entry;
  }

  if (!shown.length) {
    html = `<p class="empty-note">${query ? 'Nothing matches that.' : 'Say something — type, or hold the microphone.'}</p>`;
  }

  box.innerHTML = html;
  if (!query) box.scrollTop = box.scrollHeight;
}

// The diary speaks first each day, so there is something to answer.
async function ensureDailyPrompt() {
  const today = dayKey(Date.now());
  const already = state.entries.some(entry => entry.side === 'in' && dayKey(entry.createdAt) === today);
  if (already) return;

  const seed = state.diaries.findIndex(diary => diary.id === state.current.id) + new Date().getDate();
  const text = state.current.prompt && state.entries.length === 0
    ? state.current.prompt
    : PROMPTS[seed % PROMPTS.length];

  const entry = { id: uid(), diaryId: state.current.id, side: 'in', kind: 'text', text, createdAt: Date.now() };
  await putEntry(entry);
  state.entries.push(entry);
}

async function openDiary(id) {
  releaseUrls();
  state.current = state.diaries.find(diary => diary.id === id);
  if (!state.current) return;
  state.filter = '';
  $('#chat-search-row').hidden = true;
  $('#chat-search-input').value = '';

  state.entries = await entriesFor(id);
  await ensureDailyPrompt();

  $('#chat-avatar').textContent = state.current.avatar;
  $('#chat-name').textContent = state.current.name;
  $('#chat-sub').textContent = state.current.prompt || 'Your private diary';
  show('chat-screen');
  renderChat();
}

function closeChat() {
  stopPlayback();
  releaseUrls();
  state.current = null;
  hideEmoji();
  show('list-screen');
  loadDiaries();
}

/* ── writing ────────────────────────────────────────────────────────────── */

async function addEntry(fields) {
  const entry = { id: uid(), diaryId: state.current.id, side: 'out', createdAt: Date.now(), ...fields };
  await putEntry(entry);
  state.entries.push(entry);
  renderChat();
}

async function sendText() {
  const input = $('#text-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  resizeInput();
  updateMicSend();
  await addEntry({ kind: 'text', text });
}

function resizeInput() {
  const input = $('#text-input');
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

function updateMicSend() {
  $('#mic-send').classList.toggle('sending', $('#text-input').value.trim().length > 0);
}

/* ── pictures ───────────────────────────────────────────────────────────── */

// Big camera files would fill the quota quickly, so shrink before storing.
function shrink(file, limit = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image'));
      img.onload = () => {
        const scale = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not process that image')), 'image/jpeg', 0.82);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addPicture(file) {
  if (!file) return;
  try {
    const blob = await shrink(file);
    const caption = $('#text-input').value.trim();
    $('#text-input').value = '';
    resizeInput();
    updateMicSend();
    await addEntry({ kind: 'image', blob, text: caption });
  } catch (error) {
    toast(error.message || 'That picture could not be added');
  }
}

/* ── voice notes ────────────────────────────────────────────────────────── */

const rec = { media: null, chunks: [], stream: null, started: 0, timer: null, cancelled: false, armed: false, locked: false };

const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

async function startRecording() {
  if (rec.media) return;
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast('Microphone permission is needed for voice notes');
    return;
  }
  rec.chunks = [];
  rec.cancelled = false;
  rec.started = Date.now();
  rec.media = new MediaRecorder(rec.stream);
  rec.media.ondataavailable = event => { if (event.data.size) rec.chunks.push(event.data); };
  rec.media.onstop = finishRecording;
  rec.media.start();

  $('#recording').hidden = false;
  $('#rec-hint').textContent = rec.locked ? 'Recording…' : 'Slide left to cancel';
  rec.timer = setInterval(() => {
    $('#rec-time').textContent = mmss((Date.now() - rec.started) / 1000);
  }, 200);
}

function stopRecording(cancelled) {
  if (!rec.media) return;
  rec.cancelled = cancelled;
  clearInterval(rec.timer);
  rec.media.stop();
  rec.stream.getTracks().forEach(track => track.stop());
}

async function finishRecording() {
  const blob = new Blob(rec.chunks, { type: rec.media.mimeType || 'audio/webm' });
  const seconds = (Date.now() - rec.started) / 1000;
  const cancelled = rec.cancelled;

  rec.media = null;
  rec.stream = null;
  rec.locked = false;
  $('#recording').hidden = true;
  $('#recording').classList.remove('cancelling');
  $('#rec-time').textContent = '0:00';
  $('#mic-send').classList.remove('armed');

  if (cancelled || seconds < 0.6 || !blob.size) return;
  await addEntry({ kind: 'voice', blob, duration: seconds, peaks: await peaksOf(blob) });
}

// A small set of amplitude peaks, drawn as the bars behind the play button.
async function peaksOf(blob, bars = 34) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = audio.getChannelData(0);
    const step = Math.floor(data.length / bars) || 1;
    const peaks = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      for (let j = i * step; j < (i + 1) * step && j < data.length; j++) peak = Math.max(peak, Math.abs(data[j]));
      peaks.push(peak);
    }
    ctx.close();
    const loudest = Math.max(...peaks, 0.01);
    return peaks.map(peak => Math.min(1, peak / loudest));
  } catch {
    return Array.from({ length: bars }, () => 0.35 + Math.random() * 0.45);
  }
}

/* ── playback ───────────────────────────────────────────────────────────── */

let player = null;
let playingId = null;

function stopPlayback() {
  if (player) {
    // Drop the handlers first: a queued timeupdate would otherwise fire after
    // this and read a player that is already gone.
    player.ontimeupdate = null;
    player.onended = null;
    player.pause();
    player = null;
  }
  if (playingId) {
    const node = document.querySelector(`[data-voice="${playingId}"]`);
    if (node) {
      node.querySelector('.voice-play use').setAttribute('href', '#i-play');
      node.querySelectorAll('.wave i').forEach(bar => bar.classList.remove('on'));
    }
    playingId = null;
  }
}

function playVoice(id, from = 0) {
  const entry = state.entries.find(item => item.id === id);
  if (!entry) return;
  const wasPlaying = playingId === id;
  stopPlayback();
  if (wasPlaying && from === 0) return;

  const node = document.querySelector(`[data-voice="${id}"]`);
  const bars = [...node.querySelectorAll('.wave i')];
  const audio = new Audio(urlFor(entry));
  audio.currentTime = from * (entry.duration || 0);
  player = audio;
  playingId = id;
  node.querySelector('.voice-play use').setAttribute('href', '#i-pause');

  audio.ontimeupdate = () => {
    const done = audio.currentTime / (audio.duration || entry.duration || 1);
    bars.forEach((bar, index) => bar.classList.toggle('on', index / bars.length < done));
    node.querySelector('.voice-time').textContent = mmss(audio.currentTime);
  };
  audio.onended = () => {
    node.querySelector('.voice-time').textContent = mmss(entry.duration || 0);
    stopPlayback();
  };
  audio.play().catch(() => { toast('That voice note could not be played'); stopPlayback(); });
}

/* ── menus ──────────────────────────────────────────────────────────────── */

function openMenu(anchor, items) {
  const menu = $('#menu');
  menu.innerHTML = items.map(item => item.emojiRow
    ? `<div class="row-emoji">${REACTIONS.map(emoji => `<button type="button" data-menu="react:${emoji}">${emoji}</button>`).join('')}</div>`
    : `<button type="button" data-menu="${esc(item.id)}"${item.danger ? ' class="danger"' : ''}>
         ${item.icon ? `<svg><use href="${item.icon}"/></svg>` : ''}${esc(item.label)}
       </button>`).join('');

  const box = anchor.getBoundingClientRect();
  menu.hidden = false;
  const width = menu.offsetWidth;
  menu.style.left = `${Math.max(8, Math.min(box.left, innerWidth - width - 8))}px`;
  menu.style.top = `${Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8)}px`;
  $('#backdrop').hidden = false;
}

function closeMenu() {
  $('#menu').hidden = true;
  $('#backdrop').hidden = true;
}

/* ── invites ────────────────────────────────────────────────────────────── */

function inviteLink(diary, from) {
  const payload = { n: diary.name, p: diary.prompt || '', a: diary.avatar, f: from || '' };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}?join=${encoded}`;
}

function readInvite() {
  const raw = new URLSearchParams(location.search).get('join');
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))));
    const data = JSON.parse(json);
    if (!data.n) return null;
    return data;
  } catch {
    return null;
  }
}

/* ── export ─────────────────────────────────────────────────────────────── */

function exportDiary() {
  const lines = [`# ${state.current.name}`, state.current.prompt ? `_${state.current.prompt}_` : '', ''];
  let day = null;
  for (const entry of [...state.entries].sort((a, b) => a.createdAt - b.createdAt)) {
    if (dayKey(entry.createdAt) !== day) {
      day = dayKey(entry.createdAt);
      lines.push('', `## ${dayLabel(entry.createdAt)}`, '');
    }
    const who = entry.side === 'in' ? 'Diary' : 'Me';
    const body = entry.kind === 'voice' ? `[voice note, ${mmss(entry.duration || 0)}]`
      : entry.kind === 'image' ? `[photo]${entry.text ? ` ${entry.text}` : ''}`
      : entry.text;
    lines.push(`- **${who}** (${clock(entry.createdAt)}): ${body}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${state.current.name.replace(/[^\w -]/g, '').trim() || 'diary'}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* ── emoji panel ────────────────────────────────────────────────────────── */

function buildEmoji() {
  $('#emoji-panel').innerHTML = Object.entries(EMOJI).map(([group, list]) => `
    <h3>${esc(group)}</h3>
    <div class="emoji-grid">${list.map(emoji => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join('')}</div>
  `).join('');
}

const hideEmoji = () => { $('#emoji-panel').hidden = true; };

/* ── wiring ─────────────────────────────────────────────────────────────── */

function chooseAvatar(selected) {
  $('#new-avatar').innerHTML = AVATARS.map(emoji =>
    `<button type="button" data-avatar="${emoji}" aria-pressed="${emoji === selected}">${emoji}</button>`).join('');
}

async function createDiary(name, prompt, avatar) {
  const diary = { id: uid(), name: name || 'My diary', prompt: prompt || '', avatar: avatar || '📔', createdAt: Date.now() };
  await putDiary(diary);
  await loadDiaries();
  await openDiary(diary.id);
}

function wire() {
  // list screen
  $('#new-diary').addEventListener('click', () => {
    $('#new-name').value = '';
    $('#new-prompt').value = '';
    chooseAvatar('📔');
    $('#new-sheet').showModal();
  });

  $('#diary-list').addEventListener('click', event => {
    const button = event.target.closest('[data-open]');
    if (button) openDiary(button.dataset.open);
  });

  $('#list-search-input').addEventListener('input', event => {
    state.listFilter = event.target.value;
    renderList();
  });

  // sheets
  $('#new-avatar').addEventListener('click', event => {
    const button = event.target.closest('[data-avatar]');
    if (button) chooseAvatar(button.dataset.avatar);
  });

  document.addEventListener('click', async event => {
    const act = event.target.closest('[data-act]')?.dataset.act;
    if (!act) return;

    if (act === 'new-cancel') $('#new-sheet').close();
    if (act === 'new-create') {
      $('#new-sheet').close();
      await createDiary($('#new-name').value.trim(), $('#new-prompt').value.trim(),
        $('#new-avatar').querySelector('[aria-pressed="true"]')?.dataset.avatar);
    }
    if (act === 'back') closeChat();
    if (act === 'list-search') {
      const row = $('#list-search-row');
      row.hidden = !row.hidden;
      if (!row.hidden) $('#list-search-input').focus();
      else { state.listFilter = ''; $('#list-search-input').value = ''; renderList(); }
    }
    if (act === 'chat-search') {
      const row = $('#chat-search-row');
      row.hidden = !row.hidden;
      if (!row.hidden) $('#chat-search-input').focus();
      else { state.filter = ''; $('#chat-search-input').value = ''; renderChat(); }
    }
    if (act === 'list-menu') {
      openMenu(event.target.closest('[data-act]'), [
        { id: 'theme', label: 'Match system theme', icon: '#i-moon' },
        { id: 'about', label: 'About Diary', icon: '#i-people' }
      ]);
    }
    if (act === 'chat-menu') {
      openMenu(event.target.closest('[data-act]'), [
        { id: 'invite', label: 'Invite someone', icon: '#i-people' },
        { id: 'export', label: 'Export as text', icon: '#i-download' },
        { id: 'delete-diary', label: 'Delete this diary', icon: '#i-bin', danger: true }
      ]);
    }
    if (act === 'emoji') {
      const panel = $('#emoji-panel');
      panel.hidden = !panel.hidden;
    }
    if (act === 'attach') $('#file-input').click();
    if (act === 'camera') $('#camera-input').click();
    if (act === 'rec-cancel') stopRecording(true);
    if (act === 'rec-send') stopRecording(false);
    if (act === 'close-light') $('#lightbox').hidden = true;
    if (act === 'invite-close') $('#invite-sheet').close();
    if (act === 'invite-share') {
      const link = $('#invite-link').value;
      const text = `Keep a diary with me: ${state.current.name}`;
      if (navigator.share) {
        navigator.share({ title: 'Diary', text, url: link }).catch(() => {});
      } else {
        navigator.clipboard.writeText(link).then(() => toast('Link copied'), () => toast('Could not copy the link'));
      }
    }
    if (act === 'join-no') { $('#join-sheet').close(); history.replaceState(null, '', location.pathname); }
    if (act === 'join-yes') {
      const invite = readInvite();
      $('#join-sheet').close();
      history.replaceState(null, '', location.pathname);
      if (invite) await createDiary(invite.n, invite.p, invite.a);
    }
  });

  // menu choices
  $('#menu').addEventListener('click', async event => {
    const choice = event.target.closest('[data-menu]')?.dataset.menu;
    if (!choice) return;
    closeMenu();

    if (choice === 'about') toast('Diary keeps everything on this device.');
    if (choice === 'theme') toast('Diary follows your system light or dark setting.');
    if (choice === 'invite') {
      $('#invite-from').value = localStorage.getItem('diary.me') || '';
      $('#invite-link').value = inviteLink(state.current, $('#invite-from').value);
      $('#invite-share-label').textContent = navigator.share ? 'Share' : 'Copy link';
      $('#invite-sheet').showModal();
    }
    if (choice === 'export') exportDiary();
    if (choice === 'delete-diary') {
      if (!confirm(`Delete "${state.current.name}" and everything in it?`)) return;
      await dropDiary(state.current.id);
      closeChat();
    }
    if (choice === 'delete-entry' && menuTarget) {
      await dropEntry(menuTarget);
      state.entries = state.entries.filter(entry => entry.id !== menuTarget);
      renderChat();
    }
    if (choice === 'copy-entry' && menuTarget) {
      const entry = state.entries.find(item => item.id === menuTarget);
      navigator.clipboard.writeText(entry?.text || '').then(() => toast('Copied'), () => {});
    }
    if (choice.startsWith('react:') && menuTarget) {
      const emoji = choice.slice(6);
      const entry = state.entries.find(item => item.id === menuTarget);
      if (entry) {
        entry.reaction = entry.reaction === emoji ? '' : emoji;
        await putEntry(entry);
        renderChat();
      }
    }
  });

  $('#invite-from').addEventListener('input', event => {
    localStorage.setItem('diary.me', event.target.value);
    $('#invite-link').value = inviteLink(state.current, event.target.value);
  });

  $('#backdrop').addEventListener('click', closeMenu);

  // composer
  const input = $('#text-input');
  input.addEventListener('input', () => { resizeInput(); updateMicSend(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendText(); }
  });

  $('#emoji-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-emoji]');
    if (!button) return;
    input.value += button.dataset.emoji;
    input.focus();
    resizeInput();
    updateMicSend();
  });

  $('#file-input').addEventListener('change', event => { addPicture(event.target.files[0]); event.target.value = ''; });
  $('#camera-input').addEventListener('change', event => { addPicture(event.target.files[0]); event.target.value = ''; });

  $('#chat-search-input').addEventListener('input', event => { state.filter = event.target.value; renderChat(); });

  // Hold the button to record, slide left to throw it away, tap to send text.
  const mic = $('#mic-send');
  let holdFrom = null;
  let holdTimer = null;

  mic.addEventListener('pointerdown', event => {
    if (mic.classList.contains('sending')) return;
    if (!canRecord()) { toast('This browser cannot record audio'); return; }
    mic.setPointerCapture(event.pointerId);
    holdFrom = event.clientX;
    rec.armed = true;
    mic.classList.add('armed');
    holdTimer = setTimeout(startRecording, 180);
  });

  mic.addEventListener('pointermove', event => {
    if (!rec.armed || holdFrom === null) return;
    const slid = holdFrom - event.clientX;
    $('#recording').classList.toggle('cancelling', slid > 90);
    if (slid > 150) { clearTimeout(holdTimer); rec.armed = false; holdFrom = null; stopRecording(true); }
  });

  mic.addEventListener('pointerup', event => {
    if (mic.classList.contains('sending')) { sendText(); return; }
    clearTimeout(holdTimer);
    mic.classList.remove('armed');
    if (!rec.armed) return;
    rec.armed = false;

    const held = Date.now() - rec.started;
    const cancel = $('#recording').classList.contains('cancelling');
    holdFrom = null;

    // A tap rather than a hold locks recording on, so it can run hands-free.
    if (!rec.media) { rec.locked = true; startRecording(); return; }
    if (held < 500 && !cancel) {
      rec.locked = true;
      $('#rec-hint').textContent = 'Recording — tap send when you are done';
      return;
    }
    stopRecording(cancel);
  });

  mic.addEventListener('click', event => {
    if (mic.classList.contains('sending')) event.preventDefault();
  });

  // messages: play, view, react
  $('#messages').addEventListener('click', event => {
    const photo = event.target.closest('[data-photo]');
    if (photo) {
      const entry = state.entries.find(item => item.id === photo.dataset.photo);
      $('#lightbox-img').src = urlFor(entry);
      $('#lightbox-caption').textContent = entry.text || '';
      $('#lightbox').hidden = false;
      return;
    }
    const play = event.target.closest('.voice-play');
    if (play) { playVoice(play.closest('[data-voice]').dataset.voice); return; }
    const wave = event.target.closest('.wave');
    if (wave) {
      const box = wave.getBoundingClientRect();
      playVoice(wave.closest('[data-voice]').dataset.voice, (event.clientX - box.left) / box.width);
    }
  });

  $('#messages').addEventListener('contextmenu', event => {
    const msg = event.target.closest('.msg');
    if (!msg) return;
    event.preventDefault();
    menuTarget = msg.dataset.id;
    const entry = state.entries.find(item => item.id === menuTarget);
    openMenu(msg.querySelector('.bubble'), [
      { emojiRow: true },
      ...(entry?.kind === 'text' ? [{ id: 'copy-entry', label: 'Copy text', icon: '#i-copy' }] : []),
      { id: 'delete-entry', label: 'Delete', icon: '#i-bin', danger: true }
    ]);
  });

  // Long press stands in for right click on a touch screen.
  let pressTimer;
  $('#messages').addEventListener('pointerdown', event => {
    const msg = event.target.closest('.msg');
    if (!msg || event.pointerType === 'mouse') return;
    pressTimer = setTimeout(() => {
      menuTarget = msg.dataset.id;
      const entry = state.entries.find(item => item.id === menuTarget);
      openMenu(msg.querySelector('.bubble'), [
        { emojiRow: true },
        ...(entry?.kind === 'text' ? [{ id: 'copy-entry', label: 'Copy text', icon: '#i-copy' }] : []),
        { id: 'delete-entry', label: 'Delete', icon: '#i-bin', danger: true }
      ]);
    }, 480);
  });
  ['pointerup', 'pointermove', 'pointercancel'].forEach(name =>
    $('#messages').addEventListener(name, () => clearTimeout(pressTimer)));

  $('#lightbox').addEventListener('click', event => {
    if (event.target.id === 'lightbox') $('#lightbox').hidden = true;
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('#lightbox').hidden) { $('#lightbox').hidden = true; return; }
    if (!$('#menu').hidden) { closeMenu(); return; }
    if (!$('#emoji-panel').hidden) { hideEmoji(); return; }
    if (state.current) closeChat();
  });
}

/* ── start ──────────────────────────────────────────────────────────────── */

async function start() {
  try {
    db = await openDb();
  } catch {
    document.body.innerHTML = '<p style="padding:2rem;font:16px system-ui">Diary could not open its storage. Private browsing sometimes blocks it.</p>';
    return;
  }

  buildEmoji();
  wire();
  if (!canRecord()) $('#mic-send').setAttribute('aria-label', 'Send');

  await loadDiaries();

  const invite = readInvite();
  if (invite) {
    $('#join-avatar').textContent = invite.a || '📔';
    $('#join-line').textContent = invite.f
      ? `${invite.f} invited you to keep a diary.`
      : 'You have been invited to keep a diary.';
    $('#join-prompt').textContent = invite.p || invite.n;
    $('#join-sheet').showModal();
    return;
  }

  // A first-time visitor gets one ready to write in rather than an empty list.
  if (!state.diaries.length) {
    await createDiary('My English diary', 'One honest sentence a day', '📔');
  }
}

start();
