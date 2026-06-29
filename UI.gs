// ─── Card builders ────────────────────────────────────────────────────────────

function buildMeetSidebarCard(conferenceId) {
  const cid = conferenceId || '';

  // Ask section
  const askSection = CardService.newCardSection()
    .setHeader('Ask Claude')
    .addWidget(
      CardService.newTextInput()
        .setFieldName('question')
        .setHint('Ask anything during the meeting...')
        .setMultiline(true)
    )
    .addWidget(
      CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText('Ask')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleAskClaude')
              .setParameters({ conferenceId: cid })
          )
      )
    );

  // Notes section
  const notesSection = CardService.newCardSection()
    .setHeader('Capture Notes')
    .addWidget(
      CardService.newTextInput()
        .setFieldName('notes')
        .setHint('Type raw notes — Claude will clean them up...')
        .setMultiline(true)
    )
    .addWidget(
      CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText('Enhance & Save')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleSaveNotes')
              .setParameters({ conferenceId: cid })
          )
      )
    );

  // Post-meeting section
  const postSection = CardService.newCardSection()
    .setHeader('After Meeting')
    .addWidget(
      CardService.newTextParagraph()
        .setText('Generate a summary and action items, then save to Drive or Notion.')
    )
    .addWidget(
      CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText('Summarize Meeting')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleSummarizeMeeting')
              .setParameters({ conferenceId: cid })
          )
      )
    );

  // Settings
  const settingsSection = CardService.newCardSection()
    .addWidget(
      CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText('Settings')
          .setOnClickAction(CardService.newAction().setFunctionName('handleOpenSettings'))
      )
    );

  return CardService.newCardBuilder()
    .setName('main')
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Prolific AI Assistant')
        .setSubtitle('Your meeting co-pilot')
    )
    .addSection(askSection)
    .addSection(notesSection)
    .addSection(postSection)
    .addSection(settingsSection)
    .build();
}

function buildHomepageCard() {
  return CardService.newCardBuilder()
    .setName('homepage')
    .setHeader(CardService.newCardHeader().setTitle('Prolific AI Meeting Assistant'))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            'Open a Google Meet call to start using your AI meeting assistant.\n\n' +
            'Features:\n' +
            '• Ask Claude questions live during meetings\n' +
            '• AI-enhanced note capture\n' +
            '• Post-meeting summaries with action items\n' +
            '• Save to Google Drive and Notion'
          )
        )
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('Settings')
              .setOnClickAction(CardService.newAction().setFunctionName('handleOpenSettings'))
          )
        )
    )
    .build();
}

function buildResponseCard(response, conferenceId) {
  return CardService.newCardBuilder()
    .setName('response')
    .setHeader(CardService.newCardHeader().setTitle("Claude's Response"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(response))
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('Back')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('handleBackToMain')
                  .setParameters({ conferenceId: conferenceId || '' })
              )
          )
        )
    )
    .build();
}

function buildNotesSavedCard(enhanced, conferenceId) {
  return CardService.newCardBuilder()
    .setName('notes_saved')
    .setHeader(CardService.newCardHeader().setTitle('Notes Saved'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText('Notes enhanced and saved:\n\n' + enhanced))
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('Back')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('handleBackToMain')
                  .setParameters({ conferenceId: conferenceId || '' })
              )
          )
        )
    )
    .build();
}

function buildSummaryCard(data, conferenceId) {
  const cid = conferenceId || '';

  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(data.summary));

  if (data.actionItems && data.actionItems.length > 0) {
    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Action Items')
        .setText(data.actionItems.map((item, i) => (i + 1) + '. ' + item).join('\n'))
        .setWrapText(true)
    );
  }

  section.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText('Save to Drive')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleSaveToDrive')
              .setParameters({ conferenceId: cid })
          )
      )
      .addButton(
        CardService.newTextButton()
          .setText('Save to Notion')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleSaveToNotion')
              .setParameters({ conferenceId: cid })
          )
      )
  );

  section.addWidget(
    CardService.newButtonSet().addButton(
      CardService.newTextButton()
        .setText('Back')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('handleBackToMain')
            .setParameters({ conferenceId: cid })
        )
    )
  );

  return CardService.newCardBuilder()
    .setName('summary')
    .setHeader(CardService.newCardHeader().setTitle(data.title || 'Meeting Summary'))
    .addSection(section)
    .build();
}

function buildSavedCard(message, url, conferenceId) {
  return CardService.newCardBuilder()
    .setName('saved')
    .setHeader(CardService.newCardHeader().setTitle('Saved'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('Open')
                .setOpenLink(CardService.newOpenLink().setUrl(url))
            )
            .addButton(
              CardService.newTextButton()
                .setText('Back')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('handleBackToMain')
                    .setParameters({ conferenceId: conferenceId || '' })
                )
            )
        )
    )
    .build();
}

function buildSettingsCard() {
  const s = getSettings();
  const mask = (k) => k ? '●'.repeat(Math.max(0, k.length - 4)) + k.slice(-4) : '';

  return CardService.newCardBuilder()
    .setName('settings')
    .setHeader(CardService.newCardHeader().setTitle('Settings'))
    .addSection(
      CardService.newCardSection()
        .setHeader('API Keys')
        .addWidget(
          CardService.newTextInput()
            .setFieldName('anthropicApiKey')
            .setTitle('Anthropic API Key')
            .setHint(s.anthropicApiKey ? 'Currently: ' + mask(s.anthropicApiKey) : 'sk-ant-...')
        )
        .addWidget(
          CardService.newTextInput()
            .setFieldName('notionApiKey')
            .setTitle('Notion API Key')
            .setHint(s.notionApiKey ? 'Currently: ' + mask(s.notionApiKey) : 'secret_...')
        )
        .addWidget(
          CardService.newTextInput()
            .setFieldName('notionDatabaseId')
            .setTitle('Notion Database ID')
            .setHint(s.notionDatabaseId ? 'Currently: ' + s.notionDatabaseId.slice(0, 8) + '...' : 'From the database page URL')
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('Save')
                .setOnClickAction(CardService.newAction().setFunctionName('handleSaveSettings'))
            )
            .addButton(
              CardService.newTextButton()
                .setText('Back')
                .setOnClickAction(CardService.newAction().setFunctionName('handleBackFromSettings'))
            )
        )
    )
    .build();
}

function buildSettingsSavedCard() {
  return CardService.newCardBuilder()
    .setName('settings_saved')
    .setHeader(CardService.newCardHeader().setTitle('Settings Saved'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText('API keys saved securely to your account.'))
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('Back to Meeting')
              .setOnClickAction(CardService.newAction().setFunctionName('handleBackFromSettings'))
          )
        )
    )
    .build();
}

function buildErrorCard(message) {
  return CardService.newCardBuilder()
    .setName('error')
    .setHeader(CardService.newCardHeader().setTitle('Error'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('Back')
              .setOnClickAction(CardService.newAction().setFunctionName('handleBackFromError'))
          )
        )
    )
    .build();
}
