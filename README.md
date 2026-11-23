# Checklist Overview — a Trello Power-Up

Adds a **Checklists** button to the top bar of a board. It opens a full-page view
of every checklist item on every card, grouped by list, with **Show completed** and
**Hide completed** buttons, a checklist filter (**All checklists**, **Milestones** or **Actions**),
an **Export to Excel** button, a chart of everything that is still open, by due date, and a
**Calendar** view that shows two weeks, Monday to Friday, with a row for each card, and moves one week at a time.

- Items are grouped by list (in board order), then card, then checklist, in the same
  order they have on the board.
- Each card shows its own progress (for example `3/5`). The progress stays accurate
  while completed items are hidden.
- The header shows overall progress, for example `5 of 8 items complete across 3 cards`.
- Each item's **due date** appears at the right of its row, in your own time zone and
  language. Open items whose date has passed are shown in red. Hover a date for the exact
  time.
- A **chart of open items by due date** sits above the list (see below).
- A **Calendar** button switches to a two-week planner, weekdays only, a row per card (see below).
- A **filter** shows all checklists, only the ones called Milestones, or only the ones called
  Actions (see below).
- Click a card name to open that card.
- Your choices (completed items, the checklist filter, the chart, and List or Calendar) are
  remembered for you on that board.
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

## Filter: all checklists, only Milestones, or only Actions

Next to Export there is a row of three buttons: **All checklists**, **Milestones** and
**Actions**. Pick one. Milestones shows only the checklists called Milestones, and Actions
shows only the checklists called Actions. They are separate, so you never see both at once.
Everything on the page follows the choice together: the list, the counts at the top, the
chart and its table, and the Excel file.

- A name matches whatever its capitals and spacing, so `milestones` and ` ACTIONS ` count.
  It has to be the whole name: a checklist called `Milestones Q1` does not match.
- Cards with no checklist of that name drop out of the list, and the header counts only what is
  kept, for example `1 of 3 items complete across 1 card · only Actions`.
- It works with Show/Hide completed. The chart still shows open items only.
- An export made with a filter on says so in its file name
  (`...-checklist-items-actions-2026-11-21.xlsx`) and in the sheet's name.
- If no checklist has the name, the page says so, lists the checklist names that do exist on
  the board (handy for spotting a different spelling), and has a **Show all checklists** button.
- Your choice is remembered for you, so it can stay on.

To use other names, add one line inside the braces in `config.js`:

    filterNames: ['Milestones', 'Actions'],

Each name gets its own button, so three names give three buttons after **All checklists**.
Without that line, or with an unusable one, Milestones and Actions are used.

## Chart: open items by due date

A column chart at the top of the page counts every check item that is **not yet complete**,
across all cards together, by the date it is due. Each check item is one milestone. It
answers "how much is still to do, and when is it due?".

- **Overdue** (red, with a warning icon): open items whose due date has passed.
- **Weekly columns**, Monday to Sunday, from the current week to the week of the last due
  date. Weeks with nothing due show as an empty slot so gaps are visible. If the dates run
  more than about six months out, the columns switch to months, and anything more than two
  years away is gathered into **Later**.
- **No date** (grey): open items with no due date.
- Hover a column, or Tab to it, to see its exact dates and count.
- **Show as table**, under the chart, lists the same numbers as text and names every open item
  under its period: the **item**, its **checklist**, its **card** and its **due date**. Within
  a period the soonest comes first (the longest overdue first, under Overdue), and items due
  at the same time follow board order. Click a card name to open that card.
- The chart always shows **open items only**, whatever Show/Hide completed is set to. It
  disappears when nothing is open.
- **Hide chart** collapses it, and the page remembers that for you.
- Dates are grouped in your browser's time zone. The export does not include the chart.
- With a checklist filter on, the chart counts only items in the chosen checklists, and its
  subtitle says so.

## Calendar: two weeks shown, a row per card

**Calendar**, at the top left of the buttons (next to **List**), swaps the list for a planner.
It shows every check item that has a due date, on the day it is due.

- **Rows are cards.** A card gets a row only if it has an item due on a weekday in the two weeks
  shown, so you see just the cards that have something to deliver. Rows follow board order, as
  the List does, and each shows its list and how many items it has in these two weeks. Click a
  card's name to open it.
- **Columns are the weekdays of two weeks, Monday to Friday**, with a heading over each week
  and a heavier line between them. Today's column is tinted and carries the word **Today**
  (nothing is marked when today is a Saturday or Sunday).
- **There is no Saturday or Sunday column.** Items due at the weekend are not lost: they are
  listed under the grid in **Due on a Saturday or Sunday**. A card whose only items fall at the
  weekend has no row; its items are in that list.
- **Milestones per card:** choose **Milestones** in the checklist buttons and the calendar shows
  only the items in checklists called Milestones. With **All checklists** it shows every checklist's
  items, and **Actions** shows only the Actions.
- An item is a small button: click it to open its card. A **red box with `!`** means open and
  overdue; a **green tick with a struck-through name** means completed. Neither is shown by
  colour alone, and screen readers are told "Overdue" or "Completed". If the item is assigned to
  someone, their name is shown on it. Hover an item for its checklist, card, exact due time and
  person.
- **The arrows move one week at a time.** Two weeks are always shown, and **‹** and **›** slide
  them back or forward by one week, so the week you were looking at stays on screen: pressing **›**
  turns the second week into the first and brings a new week in on the right. **This week**
  returns to this week and next week. The heading says which dates you are on, and the line under
  it counts the items, cards and overdue items. If the two weeks are empty, buttons offer the
  nearest week before or after that has items.
- **Under the grid**: a count of open items due after these two weeks, and fold-outs for items
  at the weekend, **Overdue from earlier weeks** (or **Open items due before these 2 weeks**, when
  you are looking ahead), and **No due date**, since those items have no day.
- **It follows the other buttons.** **Hide completed** leaves completed items off the grid (and a
  card with nothing else in the two weeks loses its row), and the checklist filter leaves other
  checklists off. The header counts and **Export to Excel** are unchanged.
- The chart is hidden while you are in the Calendar and comes back in the List.
- Your List or Calendar choice is remembered. The Calendar always opens on this week and next.
- Days and weeks are your browser's local days, and the names of the days and months follow your
  browser's language.
- **Who is assigned** comes with the check items from the REST API. Names come from Trello's member
  list for the board; if an assigned person is not in it, the page asks Trello for the board's
  members once, and shows **Unknown member** if that fails. On a board where nothing is assigned
  that extra request is never made.

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
| `checklist-model.js` | Grouping, sorting, filtering and week-layout logic, and the rows for the export (no Trello calls) |
| `xlsx-export.js` | Writes the `.xlsx` file. No libraries needed |
| `timeline-chart.js` | Draws the chart of open items (plain SVG). No libraries needed |
| `week-calendar.js` | Draws the weekly calendar. No libraries needed |
| `config.example.js` | A template for `config.js`. Copy it to `config.js` and put your API key in the copy |
| `config.js` | **Your own file: your API key goes here.** It is not in the zip, so updates cannot overwrite it |
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
3. Copy `config.example.js` to a new file called `config.js` (if you do not have one yet), paste the key between the quotes after `appKey`, and save:

   ```js
   window.CHECKLIST_OVERVIEW_CONFIG = {
     appKey: 'your-api-key',
     appName: 'Checklist Overview',
     appAuthor: ''
   };
   ```
4. Upload `config.js`, hard-refresh the board, open **Checklists**, and click
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
`xlsx-export.js`, version 1.4 added `timeline-chart.js`, version 1.8 added `week-calendar.js`), then reload the board with a hard refresh (Ctrl+Shift+R, or Cmd+Shift+R
on a Mac) and reopen **Checklists**. Trello and your host both cache these files, and some
hosts, GitHub Pages for one, can take a few minutes to publish. The zip deliberately has no
`config.js`, only `config.example.js`, so uploading its files can never replace your key.
Your `config.js` stays as it is. (Before 1.8 the zip held a blank `config.js`, and uploading
it erased the key.)

To check you are on the latest files, scroll to the bottom of the Checklists page. It shows
`Checklist Overview 1.10`. If that line is missing or shows an older number, you are still
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

**There is no chart.** It is left out when nothing is open, because there is nothing to show.
If items are open and it is still missing, you are probably being served older files, or
`timeline-chart.js` (new in 1.4) was not uploaded. The list, Export and the buttons keep
working without it, so this is easy to miss. Check the bottom of the page says
`Checklist Overview 1.10`, and upload every file.

**The Calendar button is greyed out, or missing.** It is greyed out when the page cannot find
`week-calendar.js` (new in 1.8) or an up-to-date `checklist-model.js`: upload every file and
hard-refresh. It is missing when you are being served an older `overview.html`. The List keeps
working either way. If the calendar ever fails to draw, the page falls back to the List.

**A card is missing from the Calendar.** A card has a row only if it has a dated item due on a
weekday in the two weeks shown (and the item is not hidden by Hide completed or by the checklist
buttons). Items due on a Saturday or Sunday, with no date, or outside the two weeks are listed
under the grid, or in another week. Use **‹** and **›**, or the buttons that appear when the
two weeks are empty.

**An item says "Unknown member".** It is assigned to someone Trello did not name (they may have left
the board, or the member request failed). The name is only a small label on the item; the rows are
cards, not people.

**I can see Checklists but not Export to Excel.** The export button is inside the page that
Checklists opens, at the top right. If it is missing there, you are being served older files:
scroll to the bottom of that page and look for `Checklist Overview 1.10`.

## Limits

- Archived cards are not shown.
- Checklists with no items, and cards with no checklists, are left out.
- Items are shown in the order Trello stores them. The List does not show who a check item is
  assigned to; the Calendar shows the name on the item.
- Due dates are shown in the time zone your browser is set to. Someone in another time zone
  may see a different day for an item due close to midnight.
- The list is a snapshot taken when you open the page. Close and reopen it to refresh.
- The chart counts check items that are open. It does not look at the dates on cards
  themselves, only the due dates on the check items.
- Weeks start on Monday, whatever your region's calendar says.
- The Calendar shows two weeks, Monday to Friday, with no hours of the day. It moves one week at
  a time, and the number of weeks shown and the days shown are fixed. Items with no due date
  are not on the grid, and items due at the weekend are only in the fold-out under it. Rows are
  cards, not people.
- The filter matches whole checklist names only, one name at a time. It cannot match part of
  a name or show two names together, and it filters on checklist names, not on card names or labels.
- In a narrow window there is not room to name every column, so some date labels are left
  off. Hover or Tab to a column for its dates, or use **Show as table**.

## What has and has not been tested

Tested: the grouping, ordering, filtering, due-date, chart-bucketing, export and
data-checking logic (125 unit tests, each run under six time zones, including ones that
change their clocks), and the page itself in Chromium with a stand-in for the Trello
client (441 checks, plus 106 more run against the zipped files served over HTTP). That covered showing and hiding completed items, the remembered
choice, the empty and everything-complete states, Trello leaving checklists out or sharing
only some of them, the setup and connect flow, rejected fields, failed and refused
requests, narrow screens, and card names containing HTML. Due dates were checked for
overdue, completed, undated and far-future items, in three time zones and two languages,
on wide and narrow screens, and through the REST path. For the export, the page was run in
Chromium, the real browser download was captured, and the file was opened with openpyxl and
LibreOffice to check the rows, statuses, due dates as real dates, links, frozen header,
filters, and awkward text (formulas, HTML, emoji, newlines, very long text).

For the filter: the matching rules (capitals, spacing, whole names only, names that look like
programming keywords such as `constructor`), each button keeping only its own checklists and
switching straight from one to another, the list, header counts, chart, table and Excel
file all agreeing with each other, the saved choice (and a saved name that no longer has a
button), changing the names in `config.js` (and ignoring unusable settings), what is shown when
nothing matches or a matching checklist is empty, keyboard use, and a narrow screen. It also copes with
an older cached page: one with no filter buttons (a saved choice is ignored rather than leaving
you stuck), the version 1.6 page with its single combined button (that button is replaced),
and an older script file.

For the chart, the number in every column was compared with a separate calculation of the
same dates, and the tests were run with the checking code deliberately broken to confirm
they fail when they should. They covered overdue, undated, weekly, monthly and "Later"
columns, completed items staying out, the Show/Hide completed buttons leaving it alone,
hover and keyboard tooltips, the table of items (right items under each period, in the right
order, with checklist, card and date; card names opening the card; names containing HTML;
a 140-character unbroken name on a narrow screen), collapsing and remembering that, resizing, light and dark
colours, a narrow screen with many columns, REST data, and two time zones. The chart is built
so it cannot take the page down: with an older cached `overview.html`, a missing
`timeline-chart.js`, an older `checklist-model.js`, or a chart that throws, the list, the buttons and the
export were checked still to work, with the chart simply left out.

For the calendar: which weekday and which of the two weeks each item lands on (the first and last
moment of each week, and every two-week window of 2026 and early 2027 with items just after
midnight, at noon and just before the next midnight, in time zones that change their clocks),
Saturday and Sunday items going to the fold-out rather than disappearing, rows being the cards
that have a weekday item (in board order, with their list and count, none for a card with only
weekend or out-of-range items, separate rows for cards with the same name), overdue and
completed items, the fold-outs for earlier-overdue, weekend and undated items, the nearest two
weeks with items, the arrows moving one week at a time (and the week the two windows share looking the same in both) and keeping keyboard focus, Hide completed
and the checklist filter both applying, the saved choice, opening on the current two weeks,
a Sunday (no day marked Today), REST data with and without a member request (and a failed one),
names containing HTML, long unbroken names, a narrow screen, another language, and falling back
to the List if the calendar cannot be drawn. The tests were run with the code deliberately broken
in 35 different ways, and each one was caught. An older cached page, a missing `week-calendar.js`,
an older `checklist-model.js` and a calendar script that throws were each checked to leave the List
working. The checking also began failing on any error the browser logs, which found a mistake that
had been in the chart since 1.4: its invisible hover area had no height, so hovering or tabbing only
worked on the thin bar itself. That is fixed.

Not tested: a real Trello board, and Microsoft Excel itself. The stand-in for Trello follows
Trello's documentation, and the REST address, key and token handling follow its REST API
client guide, but the real authorization window, Trello's responses (in particular that the check-item data includes each item's `due` and `idMember`, as
Trello's community documentation says, and that `t.board('members')` names the board's members) and whether its iframe
lets the download through are the parts to check first when you install it. Trello
announced in 2020 that it allows downloads started by a click in Power-Up iframes, which is
how the export button works. The chart has only been seen in Chromium: Firefox and Safari
should draw it the same way, since it is plain SVG, but they were not run.
