// popup.js

const statusEl = document.getElementById('status');

chrome.storage.sync.get(['ANTHROPIC_API_KEY', 'NOTION_API_KEY', 'NOTION_DATABASE_ID'], settings => {
  const lines = [
    settings.ANTHROPIC_API_KEY  ? '<span class="check">✓</span> Anthropic key set'  : '<span class="x">✗</span> Anthropic key missing',
    settings.NOTION_API_KEY     ? '<span class="check">✓</span> Notion key set'      : '<span class="x">✗</span> Notion key missing',
    settings.NOTION_DATABASE_ID ? '<span class="check">✓</span> Notion DB set'       : '<span class="x">✗</span> Notion DB missing'
  ];
  statusEl.innerHTML = lines.join('<br>');
});

// Open Meet with sidebar — clicking the button navigates to Meet
document.getElementById('settingsBtn').addEventListener('click', () => {
  // Open a Meet tab; user can open settings from the sidebar there
  chrome.tabs.query({ url: 'https://meet.google.com/*' }, tabs => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url: 'https://meet.google.com/' });
    }
    window.close();
  });
});
