// sidebar.js — runs inside the sidebar iframe

let currentSummary = null;

// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── Close ───────────────────────────────────────────────────────────────────
document.getElementById('closeBtn').addEventListener('click', () => {
  up({ type: 'CLOSE_SIDEBAR' });
});

// ─── Ask Claude ───────────────────────────────────────────────────────────────
const askBtn       = document.getElementById('askBtn');
const questionInput = document.getElementById('questionInput');
const qaHistory    = document.getElementById('qaHistory');

askBtn.addEventListener('click', sendQuestion);
questionInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendQuestion();
});

function sendQuestion() {
  const q = questionInput.value.trim();
  if (!q) return;

  // Append question + loading answer to history
  const pair = document.createElement('div');
  pair.className = 'qa-pair';
  pair.innerHTML = `
    <div class="qa-q">${esc(q)}</div>
    <div class="qa-a loading">
      <div class="dots"><span></span><span></span><span></span></div>
      Thinking…
    </div>`;
  qaHistory.appendChild(pair);
  qaHistory.scrollTop = qaHistory.scrollHeight;

  questionInput.value = '';
  askBtn.disabled = true;
  up({ type: 'ASK_CLAUDE', payload: { question: q } });
}

// ─── Notes ────────────────────────────────────────────────────────────────────
const saveNoteBtn = document.getElementById('saveNoteBtn');
const noteInput   = document.getElementById('noteInput');
const notesList   = document.getElementById('notesList');

saveNoteBtn.addEventListener('click', saveNote);
noteInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNote();
});

function saveNote() {
  const text = noteInput.value.trim();
  if (!text) return;
  noteInput.value = '';
  up({ type: 'SAVE_NOTE', payload: { text } });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const summarizeBtn = document.getElementById('summarizeBtn');
const saveDriveBtn = document.getElementById('saveDriveBtn');
const saveNotionBtn = document.getElementById('saveNotionBtn');
const summaryEmpty = document.getElementById('summaryEmpty');
const summaryBody  = document.getElementById('summaryBody');

summarizeBtn.addEventListener('click', () => {
  summaryEmpty.style.display = 'none';
  summaryBody.style.display  = 'block';
  summaryBody.innerHTML = `
    <div class="loading">
      <div class="dots"><span></span><span></span><span></span></div>
      Generating summary…
    </div>`;
  summarizeBtn.disabled = true;
  up({ type: 'SUMMARIZE', payload: {} });
});

saveDriveBtn.addEventListener('click', () => {
  if (!currentSummary) return;
  saveDriveBtn.disabled = true;
  saveDriveBtn.textContent = 'Saving…';
  up({ type: 'SAVE_TO_DRIVE', payload: {
    title:   currentSummary.title,
    content: summaryToText(currentSummary)
  }});
});

saveNotionBtn.addEventListener('click', () => {
  if (!currentSummary) return;
  saveNotionBtn.disabled = true;
  saveNotionBtn.textContent = 'Saving…';
  up({ type: 'SAVE_TO_NOTION', payload: {
    title:       currentSummary.title,
    summary:     currentSummary.summary,
    actionItems: currentSummary.actionItems
  }});
});

// ─── Settings ─────────────────────────────────────────────────────────────────
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const payload = {
    ANTHROPIC_API_KEY:  v('anthropicKey'),
    NOTION_API_KEY:     v('notionKey'),
    NOTION_DATABASE_ID: v('notionDbId'),
    GOOGLE_DOC_ID:      v('googleDocId') || '1kuplZ6LnpuQC95U40d7XXvGVdcR-o_3lmuJCrs9Xikc',
    GOOGLE_ACCESS_TOKEN: v('googleToken')
  };
  // Only send non-empty values
  Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
  up({ type: 'SAVE_SETTINGS', payload });
});

// Load settings on init
up({ type: 'GET_SETTINGS', payload: {} });

// ─── Incoming messages from content.js ───────────────────────────────────────
window.addEventListener('message', ({ data }) => {
  const { type } = data;

  switch (type) {
    case 'CLAUDE_RESPONSE': {
      const pairs = qaHistory.querySelectorAll('.qa-pair');
      const last  = pairs[pairs.length - 1];
      if (last) {
        const answerEl = last.querySelector('.qa-a');
        answerEl.classList.remove('loading');
        answerEl.innerHTML = md(data.answer);
      }
      askBtn.disabled = false;
      qaHistory.scrollTop = qaHistory.scrollHeight;
      break;
    }

    case 'CLAUDE_ERROR': {
      const pairs = qaHistory.querySelectorAll('.qa-pair');
      const last  = pairs[pairs.length - 1];
      if (last) {
        const answerEl = last.querySelector('.qa-a');
        answerEl.classList.remove('loading');
        answerEl.innerHTML = `<div class="error-chip">${esc(data.error)}</div>`;
      }
      askBtn.disabled = false;
      break;
    }

    case 'NOTE_SAVED': {
      // Remove empty hint if present
      const hint = notesList.querySelector('.empty-hint');
      if (hint) hint.remove();

      const el = document.createElement('div');
      el.className = 'note-item';
      el.innerHTML = `
        <span class="note-time">${esc(data.note.time)}</span>
        <span class="note-text">${esc(data.note.text)}</span>`;
      notesList.appendChild(el);
      notesList.scrollTop = notesList.scrollHeight;
      break;
    }

    case 'SUMMARY_READY': {
      currentSummary = data.summary;
      summarizeBtn.disabled  = false;
      saveDriveBtn.disabled  = false;
      saveNotionBtn.disabled = false;
      renderSummary(data.summary);
      break;
    }

    case 'SUMMARIZE_ERROR':
      summaryBody.innerHTML = `<div class="error-chip">${esc(data.error)}</div>`;
      summarizeBtn.disabled = false;
      break;

    case 'SAVED': {
      const btn = data.target === 'drive' ? saveDriveBtn : saveNotionBtn;
      btn.textContent = data.target === 'drive' ? 'Saved to Drive ✓' : 'Saved to Notion ✓';
      btn.disabled    = false;
      up({ type: 'OPEN_URL', payload: { url: data.url } });
      break;
    }

    case 'SAVE_ERROR': {
      const btn = data.target === 'drive' ? saveDriveBtn : saveNotionBtn;
      btn.textContent = data.target === 'drive' ? 'Save to Google Drive' : 'Save to Notion';
      btn.disabled    = false;
      const chip = document.createElement('div');
      chip.className = 'error-chip';
      chip.textContent = data.error;
      summaryBody.prepend(chip);
      setTimeout(() => chip.remove(), 5000);
      break;
    }

    case 'SETTINGS_SAVED': {
      const s = document.getElementById('settingsStatus');
      s.textContent = 'Settings saved.';
      setTimeout(() => { s.textContent = ''; }, 3000);
      break;
    }

    case 'SETTINGS_DATA': {
      const { settings } = data;
      setVal('anthropicKey', settings.ANTHROPIC_API_KEY);
      setVal('notionKey',    settings.NOTION_API_KEY);
      setVal('notionDbId',   settings.NOTION_DATABASE_ID);
      setVal('googleDocId',  settings.GOOGLE_DOC_ID);
      setVal('googleToken',  settings.GOOGLE_ACCESS_TOKEN);
      break;
    }
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderSummary(s) {
  summaryEmpty.style.display = 'none';
  summaryBody.style.display  = 'block';
  summaryBody.innerHTML = '';

  const sec = (heading, html) => {
    const d = document.createElement('div');
    d.className = 'summary-section';
    d.innerHTML = `<h3>${heading}</h3>${html}`;
    summaryBody.appendChild(d);
  };

  sec('SUMMARY', `<p>${esc(s.summary)}</p>`);

  if (s.actionItems?.length) {
    sec('ACTION ITEMS', s.actionItems
      .map(i => `<div class="action-item">${esc(i)}</div>`)
      .join(''));
  }
}

function summaryToText(s) {
  const date = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const lines = [s.title, date, '', 'SUMMARY', s.summary, ''];
  if (s.actionItems?.length) {
    lines.push('ACTION ITEMS');
    s.actionItems.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  }
  return lines.join('\n');
}

function up(msg)   { window.parent.postMessage(msg, '*'); }
function v(id)     { return document.getElementById(id)?.value?.trim() || ''; }
function setVal(id, val) { if (val && document.getElementById(id)) document.getElementById(id).value = val; }

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function md(text) {
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
