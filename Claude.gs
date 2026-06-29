/**
 * Calls the Claude API via UrlFetchApp.
 * API key is read from user-scoped Script Properties so each user stores their own.
 */
function callClaude(userMessage, systemPrompt, maxTokens) {
  const apiKey = PropertiesService.getUserProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    throw new Error('Anthropic API key not set. Open Settings in the sidebar to add it.');
  }

  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens || 2048,
    system: systemPrompt || 'You are a helpful meeting assistant.',
    messages: [{ role: 'user', content: userMessage }]
  };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    const err = JSON.parse(response.getContentText());
    throw new Error('Claude API error: ' + (err.error?.message || response.getContentText()));
  }

  return JSON.parse(response.getContentText()).content[0].text;
}
