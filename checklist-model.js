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

  // A check item's due date arrives as an ISO 8601 string (UTC), or null/absent
  // when none is set. Anything that is not a readable date becomes null.
  function normalizeDue(due) {
    if (typeof due !== 'string' || due === '') return null;
    return isNaN(Date.parse(due)) ? null : due;
  }

  function normalizeItem(item) {
    return {
      id: item.id,
      name: item.name,
      state: item.state === 'complete' ? 'complete' : 'incomplete',
      pos: item.pos,
      due: normalizeDue(item.due),
      member: (typeof item.idMember === 'string' && item.idMember) ? item.idMember : null
    };
  }

  // Overdue means: open, has a due date, and that moment has passed. Completed
  // items are never overdue, however old their date.
  function isOverdue(item, nowMs) {
    if (!item || isComplete(item) || !item.due) return false;
    var ms = Date.parse(item.due);
    return !isNaN(ms) && ms < nowMs;
  }

  // Reads checklists out of the card objects returned by t.cards().
  //
  // Trello does not offer checklists to Power-Ups at board level: its web client
  // only loads a card's checklists once that card's back has been opened, so the
  // field can be missing, empty or partial. Nothing here is taken on trust.
  // `complete` is true only when the data is verifiably the whole picture:
  //   - every card either has a checklists array or has a badge saying it has no
  //     check items (badges.checkItems === 0);
  //   - every checklist has a checkItems array, and every item has a state;
  //   - where a card's badge gives its check-item count, the number found matches;
  //   - finding nothing at all is accepted only if every card's badge says zero.
  // When `complete` is false the caller should use the REST API instead.
  //
  // `expected` is the total from the badges (null if any card has no badge count)
  // and `found` is the number of items actually read, for explaining a mismatch.
  function fromCardData(cards) {
    var byCard = {};
    var complete = true;
    var found = 0;
    var expected = 0;
    var badgesKnown = true;
    var allBadgesZero = true;

    (cards || []).forEach(function (card) {
      var badge = (card.badges && typeof card.badges.checkItems === 'number')
        ? card.badges.checkItems
        : null;

      if (badge === null) {
        badgesKnown = false;
        allBadgesZero = false;
      } else {
        expected += badge;
        if (badge > 0) allBadgesZero = false;
      }

      if (!Array.isArray(card.checklists)) {
        // Field left out. That only means "no checklists" if the badge says so.
        if (badge !== 0) complete = false;
        return;
      }

      var cardFound = 0;
      card.checklists.forEach(function (cl) {
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
        cardFound += cl.checkItems.length;
      });

      found += cardFound;
      if (badge !== null && badge !== cardFound) complete = false;
    });

    if (found === 0 && !allBadgesZero) complete = false;

    return {
      byCard: byCard,
      complete: complete,
      expected: badgesKnown ? expected : null,
      found: found
    };
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

  var EXPORT_HEADERS = ['List', 'Card', 'Checklist', 'Item', 'Due date', 'Status', 'Card link'];

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
              item.due || '',      // ISO string; the workbook writer turns it into a real date
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
  // scope: optional words for a filtered export, e.g. "Milestones Actions", which end up
  // in the file name so exports of different views are easy to tell apart.
  function exportFileName(boardName, hideCompleted, date, scope) {
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
    var only = String(scope || '')
      .replace(/[\u0000-\u001F\\\/:*?"<>|&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40)
      .trim()
      .toLowerCase()
      .replace(/ /g, '-');
    return (board ? board.replace(/ /g, '-') + '-' : '') + what + (only ? '-' + only : '') + '-' + stamp + '.xlsx';
  }

  // ---- filtering by checklist name -----------------------------------------

  // Names are compared ignoring case, surrounding spaces and runs of spaces, so
  // "milestones " and "Milestones" are the same name.
  function nameKey(name) {
    return String(name == null ? '' : name).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  var hasOwn = Object.prototype.hasOwnProperty;

  // Keeps only the checklists whose name is one of `names`, and drops cards left
  // with none. With no usable names the data is returned as it came.
  function filterChecklists(byCard, names) {
    var wanted = {};
    var any = false;
    (names || []).forEach(function (n) {
      var key = nameKey(n);
      if (key) { wanted[key] = true; any = true; }
    });
    if (!any) return byCard;

    var out = {};
    Object.keys(byCard || {}).forEach(function (cardId) {
      var kept = (byCard[cardId] || []).filter(function (cl) {
        return hasOwn.call(wanted, nameKey(cl.name));
      });
      if (kept.length > 0) out[cardId] = kept;
    });
    return out;
  }

  // The distinct checklist names on the board (first spelling seen), A to Z.
  function checklistNames(byCard) {
    var seen = {};
    var names = [];
    Object.keys(byCard || {}).forEach(function (cardId) {
      (byCard[cardId] || []).forEach(function (cl) {
        var key = nameKey(cl.name);
        if (!key || hasOwn.call(seen, key)) return;
        seen[key] = true;
        names.push(String(cl.name).replace(/\s+/g, ' ').trim());
      });
    });
    return names.sort(function (a, b) {
      return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0;
    });
  }

  // ---- open items over time (for the chart) -------------------------------

  var DAY_MS = 86400000;

  // Whole days since 1970 for a local calendar date; unaffected by clock changes.
  function dayNumber(ms) {
    var d = new Date(ms);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  // Monday 00:00 in the viewer's time zone, for the week containing `ms`.
  function startOfWeek(ms) {
    var d = new Date(ms);
    var sinceMonday = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
  }

  function addDays(ms, n) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
  }

  function startOfMonth(ms) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }

  function addMonths(ms, n) {
    var d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
  }

  function monthsBetween(aMs, bMs) {
    var a = new Date(aMs);
    var b = new Date(bMs);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  // Cards in board order (list order, then position) when the lists are given, so
  // items that share a date come out in the same order as on the page.
  function boardOrder(cards, lists) {
    var listIndex = {};
    (lists || []).forEach(function (list, i) { listIndex[list.id] = i; });
    function listRank(card) {
      return hasOwn.call(listIndex, card.idList) ? listIndex[card.idList] : Number.MAX_SAFE_INTEGER;
    }
    return (cards || []).slice().sort(function (a, b) {
      var d = listRank(a) - listRank(b);
      return d !== 0 && !isNaN(d) ? d : byPos(a, b);
    });
  }

  // Groups every OPEN (not complete) check item on the given cards by when it is
  // due, for a single bar chart:
  //   'overdue'  open items whose date has passed (same rule as the red chips)
  //   'period'   one bucket per week, from this week to the last due date, with
  //              empty weeks kept so the gaps are visible; or per month when the
  //              span is longer than `maxWeeks`
  //   'later'    months beyond `maxMonths`, folded into one bucket
  //   'none'     open items with no due date
  // Buckets with nothing in them are left out only for overdue/none/later; empty
  // periods in the middle stay. Completed items never count, and only cards in
  // `cards` are read, so archived cards are ignored.
  function openTimeline(cards, byCard, nowMs, opts) {
    var maxWeeks = (opts && opts.maxWeeks) || 26;
    var maxMonths = (opts && opts.maxMonths) || 24;
    var openItems = 0;
    var openCards = 0;
    var overdueItems = [];
    var noneItems = [];
    var upcoming = [];

    var ordered = boardOrder(cards, opts && opts.lists);

    ordered.forEach(function (card) {
      var cardOpen = 0;
      ((byCard && byCard[card.id]) || []).slice().sort(byPos).forEach(function (cl) {
        cl.items.slice().sort(byPos).forEach(function (item) {
          if (isComplete(item)) return;
          cardOpen += 1;
          var due = normalizeDue(item.due);
          var ms = due ? Date.parse(due) : NaN;
          var rec = {
            name: item.name, checklist: cl.name, card: card.name, cardId: card.id,
            due: due, ms: ms
          };
          if (isNaN(ms)) noneItems.push(rec);
          else if (ms < nowMs) overdueItems.push(rec);
          else upcoming.push(rec);
        });
      });
      openItems += cardOpen;
      if (cardOpen > 0) openCards += 1;
    });

    // Soonest first. Items on the same date keep the board order they were found in.
    function bySoonest(a, b) { return a.ms - b.ms; }
    overdueItems.sort(bySoonest);
    upcoming.sort(bySoonest);

    // What the caller gets for each item: names, card and date. No internals.
    function publicItem(r) {
      return { name: r.name, checklist: r.checklist, card: r.card, cardId: r.cardId, due: r.due };
    }

    var buckets = [];
    var unit = null;

    if (overdueItems.length > 0) {
      buckets.push({ kind: 'overdue', count: overdueItems.length, start: null, end: null, items: overdueItems.map(publicItem) });
    }

    if (upcoming.length > 0) {
      var last = upcoming[0].ms;
      upcoming.forEach(function (r) { if (r.ms > last) last = r.ms; });

      var firstWeek = startOfWeek(nowMs);
      var weeks = (dayNumber(startOfWeek(last)) - dayNumber(firstWeek)) / 7 + 1;
      var periods = [];
      var indexOf;

      if (weeks <= maxWeeks) {
        unit = 'week';
        for (var w = 0; w < weeks; w++) {
          var ws = addDays(firstWeek, 7 * w);
          periods.push({ kind: 'period', unit: 'week', count: 0, start: ws, end: addDays(ws, 7), items: [] });
        }
        indexOf = function (ms) { return (dayNumber(startOfWeek(ms)) - dayNumber(firstWeek)) / 7; };
      } else {
        unit = 'month';
        var firstMonth = startOfMonth(nowMs);
        var months = monthsBetween(firstMonth, startOfMonth(last)) + 1;
        var shown = Math.min(months, maxMonths);
        for (var m = 0; m < shown; m++) {
          periods.push({
            kind: 'period', unit: 'month', count: 0,
            start: addMonths(firstMonth, m), end: addMonths(firstMonth, m + 1), items: []
          });
        }
        indexOf = function (ms) { return monthsBetween(firstMonth, startOfMonth(ms)); };
      }

      var laterItems = [];
      upcoming.forEach(function (r) {
        var i = indexOf(r.ms);
        if (i < periods.length) periods[i].items.push(publicItem(r));
        else laterItems.push(publicItem(r));
      });
      periods.forEach(function (p) { p.count = p.items.length; });

      buckets = buckets.concat(periods);
      if (laterItems.length > 0) {
        buckets.push({
          kind: 'later', count: laterItems.length, start: periods[periods.length - 1].end, end: null,
          items: laterItems
        });
      }
    }

    if (noneItems.length > 0) {
      buckets.push({ kind: 'none', count: noneItems.length, start: null, end: null, items: noneItems.map(publicItem) });
    }

    return { unit: unit, buckets: buckets, openItems: openItems, openCards: openCards };
  }

  // ---- two weeks, by card and weekday (for the calendar) --------------------

  // Lays out the check items that have a due date on a grid of weekdays:
  // Monday to Friday of each of `weeks` weeks (two by default), one row for each card
  // that has an item in them, one cell for each day.
  //
  //   startMs  any moment in the first week (it is moved back to that Monday)
  //   opts     { lists, hideCompleted, members: { memberId: name }, weeks }
  //
  // Items due on a Saturday or Sunday have no column, so they are listed beside the grid
  // (`weekend`) rather than dropped. The rest of what is not in the grid is also counted
  // or listed beside it:
  //   before   OPEN items due before the first day (`overdue` is true once that day has
  //            come, since all of them are then past due)
  //   after    how many OPEN items fall after the last week
  //   noDate   items with no due date (respecting hideCompleted)
  //   neighbours  the Monday of the nearest week either side that has items, or null
  // Rows are in board order, like the list. A card with items only at the weekend, or only
  // outside these weeks, has no row. Days are the viewer's local days; completed items are
  // left out only when hideCompleted is true, and are never counted as overdue.
  function calendarPlan(cards, byCard, startMs, nowMs, opts) {
    var hideCompleted = !!(opts && opts.hideCompleted);
    var members = (opts && opts.members) || {};
    var weeks = Math.max(1, Math.min(8, Math.floor(Number(opts && opts.weeks)) || 2));
    var start = startOfWeek(isFinite(startMs) ? startMs : nowMs);
    var end = addDays(start, 7 * weeks);
    var startDay = dayNumber(start);
    var todayDay = dayNumber(nowMs);

    function personName(id) {
      var name = hasOwn.call(members, id) ? String(members[id] == null ? '' : members[id]).trim() : '';
      return name || 'Unknown member';
    }

    var listNames = {};
    ((opts && opts.lists) || []).forEach(function (list) { listNames[list.id] = list.name; });

    var dated = [];     // every shown item with a due date, in board order
    var noDate = [];
    var cardInfo = {};  // card id to { name, url, list }
    boardOrder(cards, opts && opts.lists).forEach(function (card, index) {
      cardInfo[card.id] = {
        index: index,
        id: card.id,
        name: card.name,
        url: card.url || '',
        list: hasOwn.call(listNames, card.idList) ? String(listNames[card.idList]) : ''
      };
      ((byCard && byCard[card.id]) || []).slice().sort(byPos).forEach(function (cl) {
        cl.items.slice().sort(byPos).forEach(function (item) {
          var complete = isComplete(item);
          if (complete && hideCompleted) return;
          var due = normalizeDue(item.due);
          var ms = due ? Date.parse(due) : NaN;
          var memberId = (typeof item.member === 'string' && item.member) ? item.member : null;
          var rec = {
            name: item.name, checklist: cl.name, card: card.name, cardId: card.id,
            due: due, ms: ms, complete: complete,
            overdue: !complete && !isNaN(ms) && ms < nowMs,
            memberId: memberId,
            member: memberId ? personName(memberId) : null
          };
          if (isNaN(ms)) noDate.push(rec); else dated.push(rec);
        });
      });
    });

    function bySoonest(a, b) { return a.ms - b.ms; }
    dated.sort(bySoonest);

    function publicRec(r) {
      return {
        name: r.name, checklist: r.checklist, card: r.card, cardId: r.cardId, due: r.due,
        complete: r.complete, overdue: r.overdue, memberId: r.memberId, member: r.member
      };
    }

    // The columns: Monday to Friday of each week.
    var days = [];
    var weekList = [];
    var column = {};    // day number to column index; weekend days are absent
    for (var w = 0; w < weeks; w++) {
      var ws = addDays(start, 7 * w);
      weekList.push({ start: ws, end: addDays(ws, 5) });   // end: the Saturday, so the last day is Friday
      for (var d = 0; d < 5; d++) {
        var ds = addDays(ws, d);
        column[dayNumber(ds)] = days.length;
        days.push({
          start: ds,
          end: addDays(ds, 1),
          week: w,
          today: dayNumber(ds) === todayDay
        });
      }
    }

    var rowsByCard = {};
    var rows = [];
    var before = [];
    var weekend = [];
    var afterCount = 0;
    var inGrid = 0;
    var overdueInGrid = 0;
    var prevMs = null;    // latest dated item before the first day
    var nextMs = null;    // earliest dated item after the last week

    dated.forEach(function (r) {
      if (r.ms < start) {
        prevMs = r.ms;    // dated is sorted, so the last one wins
        if (!r.complete) before.push(r);
      } else if (r.ms >= end) {
        if (nextMs === null) nextMs = r.ms;
        if (!r.complete) afterCount += 1;
      } else {
        var col = column[dayNumber(r.ms)];
        if (col === undefined) {
          weekend.push(r);
          return;
        }
        if (!hasOwn.call(rowsByCard, r.cardId)) {
          var info = cardInfo[r.cardId];
          var row = { id: info.id, name: info.name, url: info.url, list: info.list, cells: [], count: 0 };
          for (var c = 0; c < days.length; c++) row.cells.push([]);
          rowsByCard[r.cardId] = row;
          rows.push(row);
        }
        rowsByCard[r.cardId].cells[col].push(publicRec(r));
        rowsByCard[r.cardId].count += 1;
        inGrid += 1;
        if (r.overdue) overdueInGrid += 1;
      }
    });

    // Board order: the order the cards came out of boardOrder.
    rows.sort(function (a, b) { return cardInfo[a.id].index - cardInfo[b.id].index; });

    return {
      start: start,
      end: end,
      current: start === startOfWeek(nowMs),   // the two weeks that begin with this week
      weeks: weekList,
      rangeEnd: addDays(start, 7 * (weeks - 1) + 5),   // the Saturday after the last Friday
      days: days,
      rows: rows,
      inGrid: inGrid,
      overdueInGrid: overdueInGrid,
      before: { count: before.length, overdue: start <= nowMs, items: before.map(publicRec) },
      after: { count: afterCount },
      weekend: { count: weekend.length, items: weekend.map(publicRec) },
      noDate: { count: noDate.length, items: noDate.map(publicRec) },
      neighbours: {
        prev: prevMs === null ? null : startOfWeek(prevMs),
        next: nextMs === null ? null : startOfWeek(nextMs)
      }
    };
  }

  return {
    isComplete: isComplete,
    isOverdue: isOverdue,
    openTimeline: openTimeline,
    calendarPlan: calendarPlan,
    startOfWeek: startOfWeek,
    addDays: addDays,
    fromCardData: fromCardData,
    fromRestChecklists: fromRestChecklists,
    buildView: buildView,
    filterChecklists: filterChecklists,
    checklistNames: checklistNames,
    toTable: toTable,
    exportFileName: exportFileName
  };
});
