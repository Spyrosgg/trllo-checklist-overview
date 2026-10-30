/* global TrelloPowerUp, ChecklistModel, XlsxExport */
var config = window.CHECKLIST_OVERVIEW_CONFIG || {};

var t = config.appKey
  ? TrelloPowerUp.iframe({
      appKey: config.appKey,
      appName: config.appName || 'Checklist Overview',
      appAuthor: config.appAuthor || undefined
    })
  : TrelloPowerUp.iframe();

var HIDE_PREF_KEY = 'hideCompleted';

var state = {
  lists: [],
  cards: [],
  byCard: {},
  source: null,       // 'rest' or 'card data'
  restError: null,    // last REST failure, shown on the connect panel
  hideCompleted: false,
  boardName: '',
  cardStats: null,    // { expected, found } check items, from Trello's card data
  view: null          // what is currently on screen; the Excel export reads this
};

var els = {
  summary: document.getElementById('summary'),
  content: document.getElementById('content'),
  show: document.getElementById('btn-show'),
  hide: document.getElementById('btn-hide'),
  // If an older overview.html is served (cached or only partly uploaded), the button
  // is missing. A detached stand-in keeps the rest of the page working.
  exportBtn: document.getElementById('btn-export') || document.createElement('button')
};

// ---------------------------------------------------------------------------
// Small DOM helpers. Card and checklist names are user content, so everything
// goes through textContent and never innerHTML.
// ---------------------------------------------------------------------------

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

// ---------------------------------------------------------------------------
// Loading data
// ---------------------------------------------------------------------------

function restError(code, message) {
  var err = new Error(message || code);
  err.code = code;
  return err;
}

// One call returns every checklist and check item on the board.
function fetchChecklistsViaRest() {
  var api = t.getRestApi();
  return Promise.all([api.getToken(), t.board('id')]).then(function (results) {
    var token = results[0];
    var boardId = results[1].id;
    if (!token) throw restError('unauthorized');

    var url = 'https://api.trello.com/1/boards/' + encodeURIComponent(boardId) + '/checklists' +
      '?checkItems=all&checkItem_fields=name,state,pos&fields=name,idCard,pos' +
      '&key=' + encodeURIComponent(config.appKey) +
      '&token=' + encodeURIComponent(token);

    return fetch(url).then(function (res) {
      if (res.status === 401) throw restError('unauthorized');
      if (!res.ok) throw restError('http', 'Trello answered with status ' + res.status + '.');
      return res.json();
    });
  }).then(ChecklistModel.fromRestChecklists);
}

// Resolves to a byCard map when REST data is available, or null when it isn't
// (not configured, not authorised yet, or the request failed).
function tryRest() {
  if (!config.appKey) return Promise.resolve(null);

  return t.getRestApi().isAuthorized().then(function (authorized) {
    if (!authorized) return null;
    return fetchChecklistsViaRest();
  }).catch(function (err) {
    if (err && err.code === 'unauthorized') {
      return t.getRestApi().clearToken().then(function () { return null; });
    }
    state.restError = err;
    return null;
  });
}

function loadCards() {
  // `badges` carries each card's check-item count, used to confirm that the
  // checklists Trello shares are the whole picture and not a partial one.
  return t.cards('id', 'name', 'idList', 'pos', 'url', 'checklists', 'badges').catch(function () {
    // If Trello refuses one of those fields, the basics are still enough when the
    // check items come from the REST API.
    return t.cards('id', 'name', 'idList', 'pos', 'url');
  });
}

function load() {
  state.restError = null;
  setLoading();

  return Promise.all([
    t.lists('id', 'name'),
    loadCards(),
    t.get('member', 'private', HIDE_PREF_KEY, false),
    t.board('name')
  ]).then(function (results) {
    state.lists = results[0] || [];
    state.cards = results[1] || [];
    state.hideCompleted = results[2] === true;
    state.boardName = (results[3] && results[3].name) || '';

    return tryRest().then(function (restByCard) {
      if (restByCard) {
        state.byCard = restByCard;
        state.source = 'rest';
        return render();
      }

      var fromCards = ChecklistModel.fromCardData(state.cards);
      state.cardStats = { expected: fromCards.expected, found: fromCards.found };
      if (fromCards.complete) {
        state.byCard = fromCards.byCard;
        state.source = 'card data';
        return render();
      }

      return showConnect();
    });
  }).catch(showError);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function updateToggle() {
  els.show.disabled = false;
  els.hide.disabled = false;
  els.show.setAttribute('aria-pressed', String(!state.hideCompleted));
  els.hide.setAttribute('aria-pressed', String(state.hideCompleted));
}

var noteTimer = null;

function disableControls() {
  state.view = null;
  els.show.disabled = true;
  els.hide.disabled = true;
  els.exportBtn.disabled = true;
}

function updateSummary(totals) {
  clearTimeout(noteTimer);
  clear(els.summary);
  if (totals.items === 0) {
    els.summary.textContent = 'No checklist items on this board';
    return;
  }

  var strong = el('strong', null, totals.done + ' of ' + totals.items);
  els.summary.appendChild(strong);
  els.summary.appendChild(document.createTextNode(
    ' items complete across ' + plural(totals.cards, 'card')));

  if (state.hideCompleted) {
    els.summary.appendChild(document.createTextNode(
      ' · showing ' + totals.shown + ' open'));
  }
}

function openCard(card) {
  // Opens the card on this board, then closes the overview so it is visible.
  return Promise.resolve(t.showCard(card.id)).then(function () {
    return t.closeModal();
  }).catch(function () {
    if (card.url) window.open(card.url, '_blank');
  });
}

function renderCard(card) {
  var wrap = el('article', 'card');

  var head = el('div', 'card-head');
  var link = el('a', 'card-link', card.name);
  link.href = card.url || '#';
  link.addEventListener('click', function (e) {
    e.preventDefault();
    openCard(card);
  });
  head.appendChild(link);
  head.appendChild(el('span', 'card-progress', card.done + '/' + card.total));
  wrap.appendChild(head);

  card.checklists.forEach(function (cl) {
    var block = el('section', 'checklist');
    block.appendChild(el('h4', 'checklist-name', cl.name));

    var ul = el('ul', 'items');
    cl.items.forEach(function (item) {
      var done = ChecklistModel.isComplete(item);
      var li = el('li', 'item' + (done ? ' is-complete' : ''));
      var tick = el('span', 'tick');
      tick.setAttribute('aria-hidden', 'true');
      li.appendChild(tick);
      li.appendChild(el('span', 'sr-only', done ? 'Completed: ' : 'Not completed: '));
      li.appendChild(el('span', 'item-name', item.name));
      ul.appendChild(li);
    });
    block.appendChild(ul);
    wrap.appendChild(block);
  });

  return wrap;
}

function panel(title, lines) {
  var box = el('div', 'panel');
  box.appendChild(el('h2', null, title));
  lines.forEach(function (line) {
    box.appendChild(el('p', line.small ? 'detail' : null, line.text));
  });
  return box;
}

function render() {
  var view = ChecklistModel.buildView(state.lists, state.cards, state.byCard, {
    hideCompleted: state.hideCompleted
  });

  state.view = view;
  updateToggle();
  updateSummary(view.totals);
  els.exportBtn.disabled = view.totals.shown === 0;
  clear(els.content);

  if (view.totals.items === 0) {
    // Only reached when the source is trustworthy: the REST API, or card data that
    // every card's badge confirmed is empty. So this really means "none".
    els.content.appendChild(panel('No checklist items found', [
      { text: 'Add a checklist to a card and its items will appear here.' }
    ]));
    return;
  }

  if (view.totals.shown === 0) {
    els.content.appendChild(panel('Everything is complete', [
      { text: 'All ' + view.totals.items + ' items are done. Choose Show completed to see them.' }
    ]));
    return;
  }

  view.sections.forEach(function (section) {
    var heading = el('h3', 'list-heading', section.list.name);
    heading.appendChild(el('span', 'count', plural(section.cards.length, 'card')));
    els.content.appendChild(heading);
    section.cards.forEach(function (card) {
      els.content.appendChild(renderCard(card));
    });
  });
}

function setLoading() {
  disableControls();
  els.summary.textContent = 'Loading checklists…';
  clear(els.content);
}

// The address this page is served from, which is what the API key's Allowed
// origins must contain. Null when opened from a file.
function hostedOrigin() {
  var origin = window.location && window.location.origin;
  return origin && /^https?:\/\//i.test(origin) ? origin : null;
}

// Says what Trello did and did not share, using the badge counts when it has them.
function whyUnavailable() {
  var s = state.cardStats;
  if (s && typeof s.expected === 'number' && s.expected > s.found) {
    return 'Trello shows ' + plural(s.expected, 'check item') + ' on this board’s cards, ' +
      'but shared ' + s.found + ' of them with this Power-Up.';
  }
  return 'Trello did not share this board’s check items with this Power-Up.';
}

// A list item built from plain strings and { code: '...' } parts, all as text.
function stepItem(parts) {
  var li = el('li');
  parts.forEach(function (part) {
    if (typeof part === 'string') li.appendChild(document.createTextNode(part));
    else li.appendChild(el('code', null, part.code));
  });
  return li;
}

function showConnect() {
  disableControls();
  els.summary.textContent = 'Check items are not available yet';
  clear(els.content);

  var origin = hostedOrigin();

  if (!config.appKey) {
    var setup = el('div', 'panel');
    setup.appendChild(el('h2', null, 'One-time setup needed'));
    setup.appendChild(el('p', null, whyUnavailable() + ' Trello does not offer checklists to ' +
      'Power-Ups directly and recommends its REST API instead. That needs a free API key for ' +
      'this Power-Up, set up once for everyone on the board.'));

    var steps = el('ol', 'steps');
    steps.appendChild(stepItem([
      'Open ', { code: 'trello.com/apps/admin' }, ', choose this Power-Up, open the ',
      { code: 'Trello Auth' }, ' tab and choose ', { code: 'Generate a new API Key' },
      '. Copy the key.'
    ]));
    steps.appendChild(stepItem(origin
      ? ['On the same page, add this address to ', { code: 'Allowed origins' }, ': ', { code: origin }]
      : ['On the same page, add the address this folder is hosted at to ', { code: 'Allowed origins' }, '.']));
    steps.appendChild(stepItem([
      'In the Power-Up folder, open ', { code: 'config.js' }, ', paste the key between the quotes after ',
      { code: 'appKey' }, ', and upload the file again.'
    ]));
    steps.appendChild(stepItem([
      'Refresh the board (Ctrl+Shift+R), open ', { code: 'Checklists' }, ' and choose ',
      { code: 'Connect to Trello' }, '.'
    ]));
    setup.appendChild(steps);
    setup.appendChild(el('p', 'detail', 'The README has the same steps in more detail.'));
    els.content.appendChild(setup);
    return;
  }

  var box = panel('Connect to Trello', [
    { text: whyUnavailable() + ' Connect once to let this page read the board’s checklists ' +
      'through Trello. It only asks for read access.' }
  ]);

  if (state.restError) {
    box.appendChild(el('p', 'detail',
      'Last attempt failed: ' + (state.restError.message || 'unknown error') + '. ' +
      'If this says "Failed to fetch", add ' + (origin || 'the address this folder is hosted at') +
      ' to your API key’s Allowed origins.'));
  }

  var button = el('button', null, 'Connect to Trello');
  button.type = 'button';
  button.addEventListener('click', function () {
    // authorize() must run from a click in this iframe, or the browser blocks its popup.
    t.getRestApi().authorize({ scope: 'read', expiration: 'never' }).then(function () {
      return load();
    }).catch(function () {
      state.restError = new Error('Authorization was cancelled or did not complete.');
      showConnect();
    });
  });
  box.appendChild(button);
  els.content.appendChild(box);
}

function showError(err) {
  disableControls();
  els.summary.textContent = 'Could not load checklists';
  clear(els.content);
  els.content.appendChild(panel('Something went wrong', [
    { text: (err && err.message) ? err.message : 'Unknown error.' }
  ]));
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

function setHideCompleted(hide) {
  if (state.hideCompleted === hide) return;
  state.hideCompleted = hide;
  render();
  // Remember the choice for this member. Failing to save is not worth surfacing.
  t.set('member', 'private', HIDE_PREF_KEY, hide).catch(function () {});
}

els.show.addEventListener('click', function () { setHideCompleted(false); });
els.hide.addEventListener('click', function () { setHideCompleted(true); });

// ---------------------------------------------------------------------------
// Excel export. Exports exactly what is on screen, so Hide completed leaves the
// completed items out of the file too.
// ---------------------------------------------------------------------------

function download(bytes, filename) {
  var blob = new Blob([bytes], { type: XlsxExport.MIME });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Give the browser time to start the download before releasing the file.
  setTimeout(function () {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 10000);
}

// Replaces the header summary for a few seconds, then puts it back.
function flashSummary(text) {
  clearTimeout(noteTimer);
  clear(els.summary);
  els.summary.textContent = text;
  noteTimer = setTimeout(function () {
    if (state.view) updateSummary(state.view.totals);
  }, 5000);
}

function exportToExcel() {
  var view = state.view;
  if (!view || view.totals.shown === 0) return;

  try {
    var table = ChecklistModel.toTable(view);
    var bytes = XlsxExport.build({
      sheetName: state.hideCompleted ? 'Open checklist items' : 'Checklist items',
      headers: table.headers,
      widths: [18, 30, 24, 60, 12, 42],
      wrap: [1, 2, 3],   // Card, Checklist, Item
      links: [5],        // Card link
      rows: table.rows
    });
    download(bytes, ChecklistModel.exportFileName(state.boardName, state.hideCompleted));
    flashSummary('Created an Excel file with ' + plural(table.rows.length, 'item') +
      '. Check your downloads.');
  } catch (err) {
    flashSummary('Could not create the Excel file: ' +
      ((err && err.message) ? err.message : 'unknown error'));
  }
}

els.exportBtn.addEventListener('click', exportToExcel);

// Trello may call the render callback again on later updates; load only once so
// the page does not reset while someone is reading it.
var started = false;
t.render(function () {
  if (started) return;
  started = true;
  return load();
});
