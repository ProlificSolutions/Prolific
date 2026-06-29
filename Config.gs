/**
 * Returns current user settings (masked for display).
 */
function getSettings() {
  const p = PropertiesService.getUserProperties();
  return {
    anthropicApiKey: p.getProperty('ANTHROPIC_API_KEY') || '',
    notionApiKey: p.getProperty('NOTION_API_KEY') || '',
    notionDatabaseId: p.getProperty('NOTION_DATABASE_ID') || ''
  };
}

/**
 * Persists API keys from the settings form into user-scoped Script Properties.
 * Values are stored per-user and never shared across accounts.
 */
function saveSettings(e) {
  const inputs = e.commonEventObject.formInputs;
  const p = PropertiesService.getUserProperties();

  const set = (key, field) => {
    const val = inputs[field]?.stringInputs?.value[0];
    if (val && val.trim()) p.setProperty(key, val.trim());
  };

  set('ANTHROPIC_API_KEY', 'anthropicApiKey');
  set('NOTION_API_KEY', 'notionApiKey');
  set('NOTION_DATABASE_ID', 'notionDatabaseId');

  return buildSettingsSavedCard();
}
