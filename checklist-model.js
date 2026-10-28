/*
 * Pure data logic for the Checklist Overview Power-Up. No DOM or Trello calls
 * in here, so it can be tested in Node and reused by the browser page.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChecklistModel = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function posOf(x) {
    var n = Number(x && x.pos);
    return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  }

  function byPos(a, b) {
    return posOf(a) - posOf(b);
  }

  function isComplete(item) {
    return !!item && item.state === 'complete';
  }

  function normalizeItem(item) {
    return {
      id: item.id,
      name: item.name,
      state: item.state === 'complete' ? 'complete' : 'incomplete',
      pos: item.pos
    };
  }

  // Reads checklists out of the card objects returned by t.cards(). Trello does
  // not guarantee check items are included there, so `complete` is false when
  // any checklist has no checkItems array, or any item has no state. The caller
  // should then fetch the data from the REST API instead.
  function fromCardData(cards) {
    var byCard = {};
    var complete = true;

    (cards || []).forEach(function (card) {
      (card.checklists || []).forEach(function (cl) {
        if (!Array.isArray(cl.checkItems)) {
          complete = false;
          return;
        }
        var itemsHaveState = cl.checkItems.every(function (it) {
          return typeof it.state === 'string';
        });
        if (!itemsHaveState) {
          complete = false;
          return;
        }
        (byCard[card.id] = byCard[card.id] || []).push({
          id: cl.id,
          name: cl.name,
          pos: cl.pos,
          items: cl.checkItems.map(normalizeItem)
        });
      });
    });

    return { byCard: byCard, complete: complete };
  }

  // Reads the response of GET /boards/{id}/checklists?checkItems=all.
  function fromRestChecklists(checklists) {
    var byCard = {};
    (checklists || []).forEach(function (cl) {
      if (!cl.idCard) return;
      (byCard[cl.idCard] = byCard[cl.idCard] || []).push({
        id: cl.id,
        name: cl.name,
        pos: cl.pos,
        items: (cl.checkItems || []).map(normalizeItem)
      });
    });
    return byCard;
  }

  // Groups checklist items by board list, then card, then checklist.
  // Only cards passed in are shown, so checklists belonging to archived cards
  // (which the REST call also returns) are dropped here.
  // `totals` always counts everything; `shown` reflects the hideCompleted filter.
  function buildView(lists, cards, byCard, opts) {
    var hideCompleted = !!(opts && opts.hideCompleted);
    var totals = { cards: 0, checklists: 0, items: 0, done: 0, shown: 0 };
    var sections = [];
    var sectionsById = {};

    (lists || []).forEach(function (list) {
      var section = { list: list, cards: [] };
      sectionsById[list.id] = section;
      sections.push(section);
    });

    (cards || []).slice().sort(byPos).forEach(function (card) {
      var checklists = [];
      var cardTotal = 0;
      var cardDone = 0;

      ((byCard && byCard[card.id]) || []).slice().sort(byPos).forEach(function (cl) {
        var all = cl.items.slice().sort(byPos);
        if (all.length === 0) return;

        var done = all.filter(isComplete).length;
        totals.checklists += 1;
        totals.items += all.length;
        totals.done += done;
        cardTotal += all.length;
        cardDone += done;

        var visible = hideCompleted
          ? all.filter(function (it) { return !isComplete(it); })
          : all;
        if (visible.length === 0) return;

        totals.shown += visible.length;
        checklists.push({
          id: cl.id,
          name: cl.name,
          items: visible,
          total: all.length,
          done: done
        });
      });

      if (cardTotal > 0) totals.cards += 1;
      if (checklists.length === 0) return;

      var section = sectionsById[card.idList];
      if (!section) {
        section = { list: { id: card.idList, name: 'Other' }, cards: [] };
        sectionsById[card.idList] = section;
        sections.push(section);
      }
      section.cards.push({
        id: card.id,
        name: card.name,
        url: card.url,
        checklists: checklists,
        total: cardTotal,
        done: cardDone
      });
    });

    return {
      sections: sections.filter(function (s) { return s.cards.length > 0; }),
      totals: totals
    };
  }

  var EXPORT_HEADERS = ['List', 'Card', 'Checklist', 'Item', 'Status', 'Card link'];

  // Flattens a view (from buildView) into one row per check item, in the same
  // order as the page. Because it reads the view, the Show/Hide completed choice
  // carries over: hidden items are not exported.
  function toTable(view) {
    var rows = [];
    ((view && view.sections) || []).forEach(function (section) {
      section.cards.forEach(function (card) {
        card.checklists.forEach(function (cl) {
          cl.items.forEach(function (item) {
            rows.push([
              section.list.name,
              card.name,
              cl.name,
              item.name,
              isComplete(item) ? 'Complete' : 'Incomplete',
              card.url || ''
            ]);
          });
        });
      });
    });
    return { headers: EXPORT_HEADERS.slice(), rows: rows };
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // e.g. "Roadmap-checklist-items-2026-10-28.xlsx", or "...-open-checklist-items-..."
  // when completed items are hidden. Characters Windows and macOS reject are dropped.
  function exportFileName(boardName, hideCompleted, date) {
    var d = date || new Date();
    var board = String(boardName || '')
      .replace(/[\u0000-\u001F\\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 60)
      .trim();
    var stamp = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    var what = hideCompleted ? 'open-checklist-items' : 'checklist-items';
    return (board ? board.replace(/ /g, '-') + '-' : '') + what + '-' + stamp + '.xlsx';
  }

  return {
    isComplete: isComplete,
    fromCardData: fromCardData,
    fromRestChecklists: fromRestChecklists,
    buildView: buildView,
    toTable: toTable,
    exportFileName: exportFileName
  };
});
