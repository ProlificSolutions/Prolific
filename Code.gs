// ─── Entry points ────────────────────────────────────────────────────────────

function onMeetOpen(e) {
  const conferenceId = e && e.meet ? e.meet.conferenceId : null;
  return buildMeetSidebarCard(conferenceId);
}

function onHomepageOpen() {
  return buildHomepageCard();
}

// ─── Action handlers ─────────────────────────────────────────────────────────

function handleAskClaude(e) {
  const question = e.commonEventObject.formInputs.question?.stringInputs?.value[0];
  if (!question || !question.trim()) {
    return buildErrorCard('Please enter a question before clicking Ask.');
  }

  const conferenceId = e.commonEventObject.parameters.conferenceId;
  const notes = getStoredNotes(conferenceId);

  const system =
    'You are an AI assistant helping during a live Google Meet call. ' +
    'Be concise — the user is in an active meeting. ' +
    (notes ? 'Meeting notes so far:\n' + notes : '');

  try {
    const reply = callClaude(question, system, 1024);
    return buildResponseCard(reply, conferenceId);
  } catch (err) {
    return buildErrorCard(err.message);
  }
}

function handleSaveNotes(e) {
  const raw = e.commonEventObject.formInputs.notes?.stringInputs?.value[0];
  if (!raw || !raw.trim()) {
    return buildErrorCard('Please type some notes before saving.');
  }

  const conferenceId = e.commonEventObject.parameters.conferenceId;

  try {
    const enhanced = callClaude(
      'Clean up and enhance these raw meeting notes. Keep all key points but improve clarity and structure:\n\n' + raw,
      'You are a professional note-taker. Return only the enhanced notes — no preamble, no explanation.',
      1024
    );
    appendToStoredNotes(conferenceId, enhanced);
    return buildNotesSavedCard(enhanced, conferenceId);
  } catch (err) {
    return buildErrorCard(err.message);
  }
}

function handleSummarizeMeeting(e) {
  const conferenceId = e.commonEventObject.parameters.conferenceId;
  const notes = getStoredNotes(conferenceId);

  let transcript = null;
  if (conferenceId) {
    try { transcript = getConferenceTranscript(conferenceId); } catch (_) {}
  }

  if (!notes && !transcript) {
    return buildErrorCard(
      'No notes or transcript found. Capture some notes during the meeting first, ' +
      'or ensure transcription is enabled in Meet settings.'
    );
  }

  const content = [
    transcript ? 'TRANSCRIPT:\n' + transcript : null,
    notes ? 'NOTES:\n' + notes : null
  ].filter(Boolean).join('\n\n');

  try {
    const raw = callClaude(
      'Analyze this meeting content and return a JSON object with exactly these keys:\n' +
      '- "title": short meeting title (5-8 words)\n' +
      '- "summary": 2-4 sentence summary\n' +
      '- "actionItems": array of strings, each a specific action item (include owner if mentioned)\n\n' +
      'Content:\n' + content + '\n\nReturn ONLY valid JSON — no markdown fences, no explanation.',
      'You are a professional meeting summarizer. Return only valid JSON.',
      2048
    );

    const parsed = JSON.parse(raw);
    storeSummaryData(conferenceId, parsed);
    return buildSummaryCard(parsed, conferenceId);
  } catch (err) {
    return buildErrorCard('Failed to generate summary: ' + err.message);
  }
}

function handleSaveToDrive(e) {
  const conferenceId = e.commonEventObject.parameters.conferenceId;
  const data = getSummaryData(conferenceId);
  if (!data) return buildErrorCard('No summary found. Generate a summary first.');

  const notes = getStoredNotes(conferenceId);

  try {
    const url = createMeetingDoc(data.title, data.summary, data.actionItems, notes);
    return buildSavedCard('Saved to Google Drive', url, conferenceId);
  } catch (err) {
    return buildErrorCard('Failed to save to Drive: ' + err.message);
  }
}

function handleSaveToNotion(e) {
  const conferenceId = e.commonEventObject.parameters.conferenceId;
  const data = getSummaryData(conferenceId);
  if (!data) return buildErrorCard('No summary found. Generate a summary first.');

  try {
    const url = saveToNotion(data.title, data.summary, data.actionItems);
    return buildSavedCard('Saved to Notion', url, conferenceId);
  } catch (err) {
    return buildErrorCard('Failed to save to Notion: ' + err.message);
  }
}

function handleOpenSettings() {
  return buildSettingsCard();
}

function handleSaveSettings(e) {
  return saveSettings(e);
}

function handleBackToMain(e) {
  return buildMeetSidebarCard(e.commonEventObject.parameters.conferenceId);
}

function handleBackFromError(e) {
  return buildMeetSidebarCard(e.commonEventObject.parameters?.conferenceId);
}

function handleBackFromSettings() {
  return buildMeetSidebarCard(null);
}

// ─── Notes storage (per conference, per user) ─────────────────────────────────

function getStoredNotes(conferenceId) {
  if (!conferenceId) return '';
  return PropertiesService.getUserProperties().getProperty('notes_' + conferenceId) || '';
}

function appendToStoredNotes(conferenceId, text) {
  if (!conferenceId) return;
  const props = PropertiesService.getUserProperties();
  const key = 'notes_' + conferenceId;
  const existing = props.getProperty(key) || '';
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  props.setProperty(key, existing ? existing + '\n\n[' + ts + ']\n' + text : '[' + ts + ']\n' + text);
}

// ─── Summary storage (per conference, per user) ───────────────────────────────

function storeSummaryData(conferenceId, data) {
  const key = 'summary_' + (conferenceId || 'general');
  PropertiesService.getUserProperties().setProperty(key, JSON.stringify(data));
}

function getSummaryData(conferenceId) {
  const key = 'summary_' + (conferenceId || 'general');
  const val = PropertiesService.getUserProperties().getProperty(key);
  return val ? JSON.parse(val) : null;
}
