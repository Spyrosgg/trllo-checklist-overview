# Checklist Overview — a Trello Power-Up

Adds a **Checklists** button to the top bar of a board. It opens a full-page view
of every checklist item on every card, grouped by list, with **Show completed** and
**Hide completed** buttons.

- Items are grouped by list (in board order), then card, then checklist, in the same
  order they have on the board.
- Each card shows its own progress (for example `3/5`). The progress stays accurate
  while completed items are hidden.
- The header shows overall progress, for example `5 of 8 items complete across 3 cards`.
- Click a card name to open that card.
- Your Show/Hide choice is remembered for you on that board.
- **Export to Excel** downloads what is on screen as an `.xlsx` file (see below).
- Read-only: it never changes your cards or checklists.

## Export to Excel

Click **Export to Excel** in the top bar. It downloads a real `.xlsx` workbook, built in
your browser, so nothing is sent anywhere.

- **It exports what you can see.** With *Show completed* you get every item. With
  *Hide completed* the file holds open items only. The button is greyed out when
  nothing is shown.
- **One row per check item**, in the same order as the page, with these columns:
  `List`, `Card`, `Checklist`, `Item`, `Status` (`Complete` or `Incomplete`), `Card link`.
- The header row is frozen and has filter buttons, so you can filter by status or list
  straight away. Long names wrap, and each card link is clickable.
- The file is named after the board and the date, for example
  `Roadmap-checklist-items-2026-10-28.xlsx` (or `Roadmap-open-checklist-items-...` when
  completed items are hidden).
- Text is always stored as text. An item called `=SUM(1,2)` appears as that text and is
  never run as a formula.

If clicking the button does nothing, your browser or Trello may be blocking the download.
Check the browser's download or pop-up indicator and allow downloads for trello.com.

This is a separate Power-Up from the Team Effort Tracker. Install it on its own.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Name, description and icon |
| `index.html`, `client.js` | Connector: registers the board button |
| `overview.html`, `overview.css`, `overview.js` | The page the button opens |
| `checklist-model.js` | Grouping, sorting and filtering logic, and the rows for the export (no Trello calls) |
| `xlsx-export.js` | Writes the `.xlsx` file. No libraries needed |
| `config.js` | Optional API key (see "If the page asks you to connect") |
| `images/` | Button and Power-Up icons |

## Install

Trello loads a Power-Up from a web address, so the folder has to be hosted over **HTTPS**.
Any static host works (GitHub Pages, Netlify, Cloudflare Pages, your own server). Upload
the whole folder as it is.

1. Host the folder and note the address, for example `https://example.github.io/checklist-overview/`.
2. Go to <https://trello.com/power-ups/admin> and choose **Create new Power-Up**.
   Pick a workspace, name it, and set the **Iframe connector URL** to
   `https://<your-host>/checklist-overview/index.html`.
3. Open the Power-Up's **Capabilities** tab and tick **Board Buttons**.
4. Open a board, go to **Power-Ups > Add Power-Ups > Custom**, and add it.
5. Click **Checklists** in the board's top bar.

## Updating

Upload **every file** in the folder again, including any new ones (version 1.1 added
`xlsx-export.js`), then reload the board with a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R
on a Mac) and reopen **Checklists**. Trello and your host both cache these files, and some
hosts, GitHub Pages for one, can take a few minutes to publish.

To check you are on the latest files, scroll to the bottom of the Checklists page. It shows
`Checklist Overview 1.1`. If that line is missing or shows an older number, you are still
being served older files. If you ever edit the code, change the `?v=` number on the script
and style links in `index.html` and `overview.html`, and in `client.js`, so browsers fetch
the new files.

**Where the buttons are:** *Checklists* is on the board's top bar. **Export to Excel**,
*Show completed* and *Hide completed* are inside the page that button opens, at the top
right.

## If the page asks you to connect

Trello's documentation says check items are **not guaranteed** to be included in the
card data a Power-Up receives. The page therefore tries two sources, in this order:

1. **The REST API**, if you have set an API key (below) and connected once.
2. **Trello's built-in card data**, if it contains the check items.

If neither works you will see a setup panel instead of the list. To fix it:

1. In the Power-Up admin portal, open your Power-Up and generate an **API key**.
2. Under **Allowed origins** for that key, add the address your folder is hosted at,
   for example `https://example.github.io`.
3. Put the key in `config.js`:

   ```js
   window.CHECKLIST_OVERVIEW_CONFIG = {
     appKey: 'your-api-key',
     appName: 'Checklist Overview',
     appAuthor: ''
   };
   ```
4. Re-upload `config.js`, refresh the board, open **Checklists**, and click **Connect to Trello**.
   It asks for **read** access only. Each person who uses the Power-Up connects once.

If the panel says "Failed to fetch", the address is missing from the key's Allowed origins.

Some versions of Chrome partition third-party storage, which can make Trello forget the
connection after you close the tab. If you are asked to connect every time, that is the cause.
Using the Power-Up in another browser, or allowing third-party cookies for trello.com, avoids it.

## Limits

- Archived cards are not shown.
- Checklists with no items, and cards with no checklists, are left out.
- Items are shown in the order Trello stores them. Due dates and assigned members on
  individual check items are not shown.
- The list is a snapshot taken when you open the page. Close and reopen it to refresh.

## What has and has not been tested

Tested: the grouping, ordering, filtering and export logic (25 unit tests), and the page
itself in Chromium with a stand-in for the Trello client (66 checks). That covered showing
and hiding completed items, the remembered choice, the empty and everything-complete states,
the connect flow, failed and rejected requests, narrow screens, and card names containing
HTML. For the export, the page was run in Chromium, the real browser download was captured,
and the file was opened with openpyxl and LibreOffice to check the rows, statuses, links,
frozen header, filters, and awkward text (formulas, HTML, emoji, newlines, very long text).

Not tested: a real Trello board, and Microsoft Excel itself. Which of the two data sources
Trello actually provides to your Power-Up, the Connect flow against Trello's real
authorization window, and whether Trello's iframe lets the download through, are the
parts to check first when you install it. Trello announced in 2020 that it allows
downloads started by a click in Power-Up iframes, which is how this button works.
