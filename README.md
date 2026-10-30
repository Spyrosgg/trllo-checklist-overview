# Checklist Overview — a Trello Power-Up

Adds a **Checklists** button to the top bar of a board. It opens a full-page view
of every checklist item on every card, grouped by list, with **Show completed** and
**Hide completed** buttons and an **Export to Excel** button.

- Items are grouped by list (in board order), then card, then checklist, in the same
  order they have on the board.
- Each card shows its own progress (for example `3/5`). The progress stays accurate
  while completed items are hidden.
- The header shows overall progress, for example `5 of 8 items complete across 3 cards`.
- Each item's **due date** appears at the right of its row, in your own time zone and
  language. Open items whose date has passed are shown in red. Hover a date for the exact
  time.
- Click a card name to open that card.
- Your Show/Hide choice is remembered for you on that board.
- **Export to Excel** downloads what is on screen as an `.xlsx` file (see below).
- Read-only: it never changes your cards or checklists.

This is a separate Power-Up from the Team Effort Tracker. Install it on its own.

## Before it will work

Five things are needed. Without 1 to 4 the Checklists button does not appear, and Trello
shows no error. Without 5 the page opens but asks for setup instead of listing items.

1. The folder is hosted over **HTTPS**.
2. A Power-Up exists in the Trello Power-Up admin portal, with its **Iframe connector URL**
   set to the hosted `index.html`.
3. **The Board Buttons capability is switched on** (admin portal > your Power-Up >
   **Capabilities** tab > tick **Board Buttons**). This is the only capability this
   Power-Up uses.
4. The Power-Up has been added to the board (**Power-Ups > Custom**).
5. **An API key is set up** (admin portal > your Power-Up > **Trello Auth** tab), pasted
   into `config.js`, and each person has clicked **Connect to Trello** once. Trello does
   not offer checklists to Power-Ups directly, so this page reads them through Trello's
   REST API, which needs the key. See **API key setup** below.

## Export to Excel

Click **Export to Excel**, at the top right of the Checklists page (next to Show completed
and Hide completed). It downloads a real `.xlsx` workbook, built in your browser, so
nothing is sent anywhere.

- **It exports what you can see.** With *Show completed* you get every item. With
  *Hide completed* the file holds open items only. The button is greyed out when
  nothing is shown.
- **One row per check item**, in the same order as the page, with these columns:
  `List`, `Card`, `Checklist`, `Item`, `Due date`, `Status` (`Complete` or `Incomplete`),
  `Card link`.
- **Due date is a real Excel date and time**, in your own time zone, so it sorts and
  filters as a date. Items with no due date leave the cell empty.
- The header row is frozen and has filter buttons, so you can filter by status or list
  straight away. Long names wrap, and each card link is clickable.
- The file is named after the board and the date, for example
  `Roadmap-checklist-items-2026-10-28.xlsx` (or `Roadmap-open-checklist-items-...` when
  completed items are hidden).
- Text is always stored as text. An item called `=SUM(1,2)` appears as that text and is
  never run as a formula.

If clicking the button does nothing, your browser or Trello may be blocking the download.
Check the browser's download or pop-up indicator and allow downloads for trello.com.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Name, description and icon. Which capabilities are on is set in the Trello admin portal, not in this file |
| `index.html`, `client.js` | Connector: registers the board button |
| `overview.html`, `overview.css`, `overview.js` | The page the button opens |
| `checklist-model.js` | Grouping, sorting and filtering logic, and the rows for the export (no Trello calls) |
| `xlsx-export.js` | Writes the `.xlsx` file. No libraries needed |
| `config.js` | **Your API key goes here** |
| `images/` | Button and Power-Up icons |

## Install

Trello loads a Power-Up from a web address, so the folder has to be hosted over **HTTPS**.
Any static host works (GitHub Pages, Netlify, Cloudflare Pages, your own server). Upload
the whole folder as it is.

1. Host the folder and note the address, for example `https://example.github.io/checklist-overview/`.
2. Go to <https://trello.com/power-ups/admin> and choose **Create new Power-Up**.
   Pick a workspace, name it, and set the **Iframe connector URL** to
   `https://<your-host>/checklist-overview/index.html`.
3. **Open the Power-Up's Capabilities tab and switch on Board Buttons.** This is what makes
   the **Checklists** button appear on the board. With it off, nothing appears on the board.
4. Open a board in the same Workspace, go to **Power-Ups > Add Power-Ups > Custom**, and
   add it.
5. Do the **API key setup** below.
6. Click **Checklists** in the board's top bar. The page that opens holds **Export to
   Excel**, **Show completed** and **Hide completed**.

## API key setup

Trello's own guidance is that checklists are not offered to Power-Ups at board level (its
web client only loads a card's checklists once that card is opened), and that the REST
API is the way to read them. So this Power-Up needs a free API key. It is set up once for
everyone on the board.

1. Go to <https://trello.com/apps/admin>, open your Power-Up, open the **Trello Auth** tab,
   and choose **Generate a new API Key**. Copy the key.
2. On the same page, add the address your folder is hosted at to **Allowed origins**, for
   example `https://example.github.io`. Just the address, no folder path. The setup panel
   in the page shows the exact address to use.
3. Open `config.js`, paste the key between the quotes after `appKey`, and save:

   ```js
   window.CHECKLIST_OVERVIEW_CONFIG = {
     appKey: 'your-api-key',
     appName: 'Checklist Overview',
     appAuthor: ''
   };
   ```
4. Upload `config.js` again, hard-refresh the board, open **Checklists**, and click
   **Connect to Trello**. It asks for **read** access only. Each person who uses the
   Power-Up does this once.

If the page says "Failed to fetch", the hosting address is missing from the key's
**Allowed origins**.

Some versions of Chrome partition third-party storage, which can make Trello forget the
connection after you close the tab. If you are asked to connect every time, that is the
cause. Using the Power-Up in another browser, or allowing third-party cookies for
trello.com, avoids it.

**How the page decides what to trust.** It uses the REST API whenever you have connected.
Before that, it will use the checklists Trello shares directly only if they are provably
complete: each card's check-item count (the number on its checklist badge) must match
the items found. If they do not match, or Trello shares nothing, the page shows the setup
panel rather than a list that might be missing items. So "No checklist items found" means
there really are none.

## Updating

Upload **every file** in the folder again, including any new ones (version 1.1 added
`xlsx-export.js`), then reload the board with a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R
on a Mac) and reopen **Checklists**. Trello and your host both cache these files, and some
hosts, GitHub Pages for one, can take a few minutes to publish. Keep your own `config.js`
rather than overwriting it with the blank one from the zip.

To check you are on the latest files, scroll to the bottom of the Checklists page. It shows
`Checklist Overview 1.3`. If that line is missing or shows an older number, you are still
being served older files. If you ever edit the code, change the `?v=` number on the script
and style links in `index.html` and `overview.html`, and in `client.js`, so browsers fetch
the new files.

## Troubleshooting

**I can't see the Checklists button on the board.** Work down this list:

1. **Capabilities.** In the admin portal, open your Power-Up > **Capabilities** and check
   **Board Buttons** is ticked. This is the most common cause.
2. **Added to this board?** Power-Ups are added board by board (**Power-Ups > Custom**), and
   the board has to be in the Workspace the Power-Up was created for.
3. **Connector URL.** Paste the Iframe connector URL into a browser tab. A blank page is
   normal. A "not found" page or a security warning means the address is wrong or the host
   is not serving HTTPS.
4. **Old files.** Hard-refresh the board. See **Updating** above.

**The page says "One-time setup needed".** Trello did not share your check items, and no API
key is set yet. Follow **API key setup**.

**The page says "Connect to Trello".** A key is set but you have not connected yet. Click the
button and allow read access. If it fails with "Failed to fetch", add the hosting address to
the key's **Allowed origins**.

**I can see Checklists but not Export to Excel.** The export button is inside the page that
Checklists opens, at the top right. If it is missing there, you are being served older files:
scroll to the bottom of that page and look for `Checklist Overview 1.3`.

## Limits

- Archived cards are not shown.
- Checklists with no items, and cards with no checklists, are left out.
- Items are shown in the order Trello stores them. Assigned members on individual check
  items are not shown.
- Due dates are shown in the time zone your browser is set to. Someone in another time zone
  may see a different day for an item due close to midnight.
- The list is a snapshot taken when you open the page. Close and reopen it to refresh.

## What has and has not been tested

Tested: the grouping, ordering, filtering, due-date, export and data-checking logic (42 unit
tests, run under four time zones), and the page itself in Chromium with a stand-in for the
Trello client (125 checks). That
covered showing and hiding completed items, the remembered choice, the empty and
everything-complete states, Trello leaving checklists out or sharing only some of them, the
setup and connect flow, rejected fields, failed and refused requests, narrow screens, and
card names containing HTML. Due dates were checked for overdue, completed, undated and
far-future items, in three time zones and two languages, on wide and narrow screens, and
through the REST path. For the export, the page was run in Chromium, the real browser
download was captured, and the file was opened with openpyxl and LibreOffice to check the
rows, statuses, due dates as real dates, links, frozen header, filters, and awkward text (formulas, HTML, emoji,
newlines, very long text).

Not tested: a real Trello board, and Microsoft Excel itself. The stand-in for Trello follows
Trello's documentation, and the REST address, key and token handling follow its REST API
client guide, but the real authorization window, Trello's responses (in particular that the check-item data includes each item's `due`, as
Trello's community documentation says) and whether its iframe
lets the download through are the parts to check first when you install it. Trello
announced in 2020 that it allows downloads started by a click in Power-Up iframes, which is
how the export button works.
