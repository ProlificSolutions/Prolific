# Prolific AI Meeting Assistant — Setup Guide

## What's built
A Google Workspace Add-on that shows a Claude-powered sidebar in Google Meet for live Q&A, note capture, and post-meeting summaries saved to Google Drive and Notion.

---

## What's already done
- [x] All code written and pushed to the repo (`claude/google-meet-integration-ldxx8e`)
- [x] Apps Script project created (script ID in `.clasp.json`)
- [x] Deployed as Add-on (Deployment ID: `AKfycbzZ8VSFiYf0IQWOBw-3JNu973BFUqJ6skkX7A6rygwhhLVwwvG9QV4xLtfT-FSODUgVIQ`)
- [x] GCP project created and linked (`prolific-meeting-mate`)
- [x] OAuth consent screen configured (Internal)
- [x] Google Meet API enabled
- [x] Google Workspace Marketplace SDK enabled

---

## Remaining steps

### Step 1 — Allow Marketplace apps in Admin Console
1. Go to `admin.google.com`
2. **Apps** → **Google Workspace Marketplace apps** → **Settings**
3. Select **"Allow users to install and run any app from the Marketplace"**
4. Save

### Step 2 — Install the add-on
1. Go to the Apps Script editor:
   `https://script.google.com/d/1T7-9NwoYAS8iUG1mPOqu9MydlGRZh9IHCqD0YDmetl3Xgss0ZCbhNu7p/edit`
2. Click **Deploy** → **Test deployments**
3. Click **Install** → **Done**

### Step 3 — Add your Anthropic API key
1. Go to `console.anthropic.com` → **API Keys** → create a key and copy it
2. Open `meet.google.com` in Chrome on desktop → start a meeting
3. Click the puzzle piece / Activities icon on the right
4. Open **Prolific AI Meeting Assistant**
5. Click **Settings** → paste your Anthropic API key → **Save**

### Step 4 — Optional: add Notion
1. Go to `notion.so/my-integrations` → create a new integration → copy the token
2. Open the database you want meeting notes saved to
3. Copy the database ID from the URL (the part after the last `/` and before `?`)
4. In the add-on sidebar → **Settings** → paste Notion API Key and Database ID → **Save**

---

## If the add-on still shows "not available on this device"
This happens when Workspace blocks add-ons at the domain level. Fix:
1. `admin.google.com` → **Apps** → **Google Workspace Marketplace apps** → **Settings**
2. Ensure installs are allowed
3. Try removing and reinstalling via **Deploy** → **Test deployments** in the Apps Script editor
4. Hard refresh Meet with `Ctrl+Shift+R`

---

## Apps Script editor
`https://script.google.com/d/1T7-9NwoYAS8iUG1mPOqu9MydlGRZh9IHCqD0YDmetl3Xgss0ZCbhNu7p/edit`

## Pushing code updates
```sh
cd C:\Users\Emil\Documents\ProlificMeetingAssistant
git pull origin claude/google-meet-integration-ldxx8e
clasp push
```
Then redeploy: **Deploy** → **Manage deployments** → edit the existing deployment → **Deploy**.
