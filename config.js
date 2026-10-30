// Your Power-Up's API key. Needed to read check items.
//
// Trello does not offer checklists to Power-Ups directly, so this Power-Up reads
// them through Trello's REST API, which needs a key.
//
//   1. Go to https://trello.com/apps/admin and open this Power-Up.
//   2. Open the "Trello Auth" tab and choose "Generate a new API Key".
//   3. Paste the key below, between the quotes after appKey.
//   4. On the same page, add the address this folder is hosted at to
//      "Allowed origins" (for example https://example.github.io).
//   5. Upload this file again, refresh the board, open Checklists and choose
//      "Connect to Trello".
//
// The README has the same steps in more detail.
window.CHECKLIST_OVERVIEW_CONFIG = {
  appKey: '',
  appName: 'Checklist Overview',
  appAuthor: ''
};
