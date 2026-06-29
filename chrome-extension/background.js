// background.js — Service worker. Handles all external API calls.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'ASK_CLAUDE':   return askClaude(msg.question, msg.notes, msg.qaHistory);
    case 'SUMMARIZE':    return summarize(msg.notes, msg.qaHistory);
    case 'SAVE_TO_DRIVE':   return saveToDrive(msg.title, msg.content);
    case 'SAVE_TO_NOTION':  return saveToNotion(msg.title, msg.summary, msg.actionItems);
    default: throw new Error('Unknown message type: ' + msg.type);
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function getSettings() {
  return chrome.storage.sync.get([
    'ANTHROPIC_API_KEY', 'NOTION_API_KEY', 'NOTION_DATABASE_ID', 'GOOGLE_DOC_ID'
  ]);
}

// ─── Google auth ─────────────────────────────────────────────────────────────
// Uses Chrome's built-in identity API — token is refreshed automatically,
// no manual token management needed.

async function getGoogleToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      if (chrome.runtime.lastError) {
        reject(new Error(
          'Google sign-in failed: ' + chrome.runtime.lastError.message +
          '. Make sure you are signed into Chrome with your Google account.'
        ));
      } else {
        resolve(token);
      }
    });
  });
}

// ─── Business context (Google Doc) ───────────────────────────────────────────

async function fetchBusinessContext() {
  const settings = await getSettings();
  const docId = settings.GOOGLE_DOC_ID || '1kuplZ6LnpuQC95U40d7XXvGVdcR-o_3lmuJCrs9Xikc';

  let token;
  try { token = await getGoogleToken(); } catch (_) { return ''; }

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return '';

  const doc = await res.json();
  return extractDocText(doc);
}

function extractDocText(doc) {
  if (!doc.body?.content) return '';
  const parts = [];

  function walk(elements) {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pe of el.paragraph.elements || []) {
          if (pe.textRun?.content) parts.push(pe.textRun.content);
        }
      } else if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) walk(cell.content || []);
        }
      }
    }
  }

  walk(doc.body.content);
  return parts.join('').trim();
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, messages, maxTokens = 1024) {
  const { ANTHROPIC_API_KEY } = await getSettings();
  if (!ANTHROPIC_API_KEY) throw new Error('Anthropic API key not set — open Settings in the sidebar.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error (${res.status})`);
  }

  const data = await res.json();
  return data.content[0].text;
}

async function askClaude(question, notes, qaHistory) {
  const businessContext = await fetchBusinessContext();

  const system = [
    'You are an AI assistant helping during a live Google Meet meeting. Be concise — the user is in an active meeting.',
    businessContext ? '\n\nBUSINESS CONTEXT:\n' + businessContext : '',
    notes        ? '\n\nMEETING NOTES SO FAR:\n' + notes : ''
  ].join('');

  const messages = [];
  for (const { q, a } of (qaHistory || [])) {
    messages.push({ role: 'user', content: q });
    messages.push({ role: 'assistant', content: a });
  }
  messages.push({ role: 'user', content: question });

  const answer = await callClaude(system, messages, 1024);
  return { answer };
}

async function summarize(notes, qaHistory) {
  const businessContext = await fetchBusinessContext();

  const contentParts = [];
  if (notes) contentParts.push('NOTES:\n' + notes);
  if (qaHistory?.length) {
    contentParts.push('Q&A:\n' + qaHistory.map(({ q, a }) => `Q: ${q}\nA: ${a}`).join('\n\n'));
  }
  if (!contentParts.length) throw new Error('No notes or Q&A to summarize.');

  const system = [
    'You are a professional meeting summarizer. Return only valid JSON — no markdown, no explanation.',
    businessContext ? '\n\nBUSINESS CONTEXT:\n' + businessContext : ''
  ].join('');

  const prompt =
    'Analyze this meeting content and return a JSON object with:\n' +
    '- "title": short meeting title (5-8 words)\n' +
    '- "summary": 2-4 sentence summary\n' +
    '- "actionItems": array of specific action item strings\n\n' +
    contentParts.join('\n\n');

  const raw = await callClaude(system, [{ role: 'user', content: prompt }], 2048);
  return { summary: JSON.parse(raw) };
}

// ─── Google Drive ─────────────────────────────────────────────────────────────

async function saveToDrive(title, content) {
  const token = await getGoogleToken();

  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error('Drive error: ' + (err.error?.message || createRes.status));
  }

  const { documentId } = await createRes.json();

  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] })
  });

  return { url: `https://docs.google.com/document/d/${documentId}/edit` };
}

// ─── Notion ───────────────────────────────────────────────────────────────────

async function saveToNotion(title, summary, actionItems) {
  const { NOTION_API_KEY, NOTION_DATABASE_ID } = await getSettings();
  if (!NOTION_API_KEY)     throw new Error('Notion API key not set — open Settings.');
  if (!NOTION_DATABASE_ID) throw new Error('Notion Database ID not set — open Settings.');

  const today = new Date().toISOString().split('T')[0];

  const children = [
    { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Summary' } }] } },
    { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: summary } }] } },
    { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Action Items' } }] } },
    ...(actionItems || []).map(item => ({
      object: 'block', type: 'to_do',
      to_do: { rich_text: [{ type: 'text', text: { content: item } }], checked: false }
    }))
  ];

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        Name: { title: [{ type: 'text', text: { content: title } }] },
        Date: { date: { start: today } }
      },
      children
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Notion error: ' + (err.message || res.status));
  }

  const page = await res.json();
  return { url: page.url };
}
