/**
 * Fetches the transcript for a Google Meet conference record.
 * Requires the host to have had transcription enabled during the meeting.
 * Returns a plain-text transcript string, or null if unavailable.
 */
function getConferenceTranscript(conferenceId) {
  const token = ScriptApp.getOAuthToken();
  const headers = { Authorization: 'Bearer ' + token };

  // Find the conference record matching this meeting code
  const recordsRes = UrlFetchApp.fetch(
    'https://meet.googleapis.com/v2/conferenceRecords?filter=space.meeting_code="' + conferenceId + '"',
    { headers, muteHttpExceptions: true }
  );

  if (recordsRes.getResponseCode() !== 200) return null;

  const records = JSON.parse(recordsRes.getContentText()).conferenceRecords;
  if (!records || records.length === 0) return null;

  const recordName = records[0].name;

  // List transcripts for this conference record
  const transcriptsRes = UrlFetchApp.fetch(
    'https://meet.googleapis.com/v2/' + recordName + '/transcripts',
    { headers, muteHttpExceptions: true }
  );

  if (transcriptsRes.getResponseCode() !== 200) return null;

  const transcripts = JSON.parse(transcriptsRes.getContentText()).transcripts;
  if (!transcripts || transcripts.length === 0) return null;

  // Get entries from the first (most recent) transcript
  const entriesRes = UrlFetchApp.fetch(
    'https://meet.googleapis.com/v2/' + transcripts[0].name + '/entries',
    { headers, muteHttpExceptions: true }
  );

  if (entriesRes.getResponseCode() !== 200) return null;

  const entries = JSON.parse(entriesRes.getContentText()).transcriptEntries;
  if (!entries || entries.length === 0) return null;

  return entries
    .map(e => (e.participant?.displayName || 'Unknown') + ': ' + e.text)
    .join('\n');
}
