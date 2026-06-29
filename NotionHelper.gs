/**
 * Creates a meeting notes page in a Notion database.
 * Requires NOTION_API_KEY and NOTION_DATABASE_ID in user Script Properties.
 * Returns the URL of the created Notion page.
 */
function saveToNotion(title, summary, actionItems) {
  const props = PropertiesService.getUserProperties();
  const apiKey = props.getProperty('NOTION_API_KEY');
  const databaseId = props.getProperty('NOTION_DATABASE_ID');

  if (!apiKey || !databaseId) {
    throw new Error('Notion API key or Database ID not set. Open Settings to add them.');
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const children = [
    _notionHeading('Summary'),
    _notionParagraph(summary),
    _notionHeading('Action Items'),
    ...(actionItems || []).map(item => _notionTodo(item))
  ];

  const body = {
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ type: 'text', text: { content: title } }] },
      Date: { date: { start: today } }
    },
    children
  };

  const res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    const err = JSON.parse(res.getContentText());
    throw new Error('Notion API error: ' + (err.message || res.getContentText()));
  }

  return JSON.parse(res.getContentText()).url;
}

function _notionHeading(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] }
  };
}

function _notionParagraph(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: text } }] }
  };
}

function _notionTodo(text) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [{ type: 'text', text: { content: text } }],
      checked: false
    }
  };
}
