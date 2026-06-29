// content.js — Injected into meet.google.com

let sidebarContainer = null;
let sidebarFrame    = null;
let toggleBtn       = null;
let sidebarOpen     = false;
let qaHistory       = [];
let notes           = [];

// ─── Live Caption Transcription ───────────────────────────────────────────────

let captionObserver = null;
let pendingCaption  = '';
let captionTimer    = null;
let lastSpeaker     = '';

const CAPTION_SELECTORS = [
  '[jsname="tgaKEf"]',
  '.iTTPOb',
  '.zs7s8d',
  '[jsname="YSxPC"]',
  '[data-is-this-me] ~ * [jsname]',
];

const SPEAKER_SELECTORS = [
  '[jsname="Vt9ybd"]',
  '.KF4T6b',
  '[jsname="bVoNN"]',
];

function extractCaptionText() {
  for (const sel of CAPTION_SELECTORS) {
    const els = document.querySelectorAll(sel);
    if (els.length) {
      const text = Array.from(els).map(e => e.textContent.trim()).filter(Boolean).join(' ');
      if (text) return text;
    }
  }
  return '';
}

function extractSpeakerName() {
  for (const sel of SPEAKER_SELECTORS) {
    const el = document.querySelector(sel);
    if (el?.textContent.trim()) return el.textContent.trim();
  }
  return '';
}

function flushCaption() {
  if (!pendingCaption) return;
  const text    = pendingCaption;
  const speaker = lastSpeaker;
  pendingCaption = '';

  const note = {
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    text: speaker ? `${speaker}: ${text}` : text,
    auto: true
  };
  notes.push(note);
  toSidebar({ type: 'TRANSCRIPT_NOTE', note });
}

function startCaptionCapture() {
  if (captionObserver) return;

  toSidebar({ type: 'CAPTION_STATUS', enabled: true });

  captionObserver = new MutationObserver(() => {
    const text = extractCaptionText();
    if (!text || text === pendingCaption) return;

    pendingCaption = text;
    lastSpeaker    = extractSpeakerName();

    clearTimeout(captionTimer);
    captionTimer = setTimeout(flushCaption, 2500);
  });

  captionObserver.observe(document.body, {
    childList:     true,
    subtree:       true,
    characterData: true
  });
}

function stopCaptionCapture() {
  clearTimeout(captionTimer);
  if (pendingCaption) flushCaption();

  if (captionObserver) {
    captionObserver.disconnect();
    captionObserver = null;
  }
  toSidebar({ type: 'CAPTION_STATUS', enabled: false });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  if (document.getElementById('prolific-sidebar-container')) return;
  buildToggleButton();
  buildSidebar();
  window.addEventListener('message', onSidebarMessage);
}

// Meet loads dynamically — wait for a call UI element before injecting
function waitForMeet() {
  if (document.querySelector('[data-call-ended]') !== null ||
      document.querySelector('div[jsname="HlFzId"]') !== null ||
      document.querySelector('[data-meeting-title]') !== null) {
    init();
  } else {
    setTimeout(waitForMeet, 1500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForMeet);
} else {
  // Run immediately then retry to catch late-loading Meet UI
  init();
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function buildToggleButton() {
  toggleBtn = document.createElement('button');
  toggleBtn.id = 'prolific-toggle-btn';
  toggleBtn.title = 'Prolific AI Assistant';
  toggleBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5Z" stroke="#c8ced8" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M2 17l10 5 10-5" stroke="#c8ced8" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke="#c8ced8" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;

  Object.assign(toggleBtn.style, {
    position:     'fixed',
    right:        '20px',
    bottom:       '90px',
    zIndex:       '2147483646',
    width:        '44px',
    height:       '44px',
    background:   '#050505',
    border:       '1px solid rgba(200,206,216,0.35)',
    borderRadius: '50%',
    cursor:       'pointer',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   'all 0.2s ease',
    boxShadow:    '0 2px 16px rgba(0,0,0,0.5)',
    padding:      '0'
  });

  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.borderColor = 'rgba(200,206,216,0.7)';
    toggleBtn.style.transform   = 'scale(1.08)';
  });
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.borderColor = 'rgba(200,206,216,0.35)';
    toggleBtn.style.transform   = 'scale(1)';
  });
  toggleBtn.addEventListener('click', toggleSidebar);

  document.body.appendChild(toggleBtn);
}

// ─── Sidebar iframe ───────────────────────────────────────────────────────────

function buildSidebar() {
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'prolific-sidebar-container';

  Object.assign(sidebarContainer.style, {
    position:   'fixed',
    top:        '0',
    right:      '-400px',
    width:      '380px',
    height:     '100vh',
    zIndex:     '2147483647',
    transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
    borderLeft: '1px solid rgba(200,206,216,0.12)',
    boxShadow:  '-6px 0 32px rgba(0,0,0,0.6)'
  });

  sidebarFrame = document.createElement('iframe');
  sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
  Object.assign(sidebarFrame.style, {
    width:  '100%',
    height: '100%',
    border: 'none'
  });

  sidebarContainer.appendChild(sidebarFrame);
  document.body.appendChild(sidebarContainer);
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  sidebarContainer.style.right = sidebarOpen ? '0' : '-400px';
  toggleBtn.style.right        = sidebarOpen ? '396px' : '20px';
}

// ─── Message bridge (sidebar ↔ background) ────────────────────────────────────

function onSidebarMessage(event) {
  if (!sidebarFrame || event.source !== sidebarFrame.contentWindow) return;
  const { type, payload } = event.data;

  (async () => {
    switch (type) {
      case 'CLOSE_SIDEBAR':
        sidebarOpen = false;
        sidebarContainer.style.right = '-400px';
        toggleBtn.style.right = '20px';
        break;

      case 'ASK_CLAUDE': {
        const res = await chrome.runtime.sendMessage({
          type: 'ASK_CLAUDE',
          question: payload.question,
          notes: notes.map(n => `[${n.time}] ${n.text}`).join('\n'),
          qaHistory
        });
        if (res.error) {
          toSidebar({ type: 'CLAUDE_ERROR', error: res.error });
        } else {
          qaHistory.push({ q: payload.question, a: res.answer });
          toSidebar({ type: 'CLAUDE_RESPONSE', answer: res.answer });
        }
        break;
      }

      case 'SAVE_NOTE': {
        const note = {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          text: payload.text
        };
        notes.push(note);
        toSidebar({ type: 'NOTE_SAVED', note });
        break;
      }

      case 'SUMMARIZE': {
        const res = await chrome.runtime.sendMessage({
          type: 'SUMMARIZE',
          notes:     notes.map(n => `[${n.time}] ${n.text}`).join('\n'),
          qaHistory
        });
        toSidebar(res.error
          ? { type: 'SUMMARIZE_ERROR', error: res.error }
          : { type: 'SUMMARY_READY',   summary: res.summary }
        );
        break;
      }

      case 'SAVE_TO_DRIVE': {
        const res = await chrome.runtime.sendMessage({
          type: 'SAVE_TO_DRIVE',
          title:   payload.title,
          content: payload.content
        });
        toSidebar(res.error
          ? { type: 'SAVE_ERROR', target: 'drive',  error: res.error }
          : { type: 'SAVED',      target: 'drive',  url:   res.url   }
        );
        break;
      }

      case 'SAVE_TO_NOTION': {
        const res = await chrome.runtime.sendMessage({
          type:        'SAVE_TO_NOTION',
          title:       payload.title,
          summary:     payload.summary,
          actionItems: payload.actionItems
        });
        toSidebar(res.error
          ? { type: 'SAVE_ERROR', target: 'notion', error: res.error }
          : { type: 'SAVED',      target: 'notion', url:   res.url   }
        );
        break;
      }

      case 'SAVE_SETTINGS':
        await chrome.storage.sync.set(payload);
        toSidebar({ type: 'SETTINGS_SAVED' });
        break;

      case 'GET_SETTINGS': {
        const settings = await chrome.storage.sync.get([
          'ANTHROPIC_API_KEY', 'NOTION_API_KEY', 'NOTION_DATABASE_ID', 'GOOGLE_DOC_ID'
        ]);
        toSidebar({ type: 'SETTINGS_DATA', settings });
        break;
      }

      case 'TOGGLE_CAPTIONS':
        payload.enabled ? startCaptionCapture() : stopCaptionCapture();
        break;

      case 'OPEN_URL':
        window.open(payload.url, '_blank');
        break;
    }
  })();
}

function toSidebar(message) {
  sidebarFrame?.contentWindow?.postMessage(message, '*');
}
