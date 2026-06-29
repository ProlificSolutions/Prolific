/**
 * Creates a formatted Google Doc with meeting notes and returns its URL.
 */
function createMeetingDoc(title, summary, actionItems, rawNotes) {
  const docTitle = title + ' — Meeting Notes';
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();

  body.appendParagraph(docTitle)
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph(
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEEE, MMMM d, yyyy')
  ).setItalic(true);

  body.appendParagraph('');

  body.appendParagraph('Summary')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(summary);

  if (actionItems && actionItems.length > 0) {
    body.appendParagraph('');
    body.appendParagraph('Action Items')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    actionItems.forEach(item => {
      body.appendListItem(item)
          .setGlyphType(DocumentApp.GlyphType.BULLET);
    });
  }

  if (rawNotes) {
    body.appendParagraph('');
    body.appendParagraph('Notes')
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(rawNotes);
  }

  doc.saveAndClose();
  return doc.getUrl();
}
