/*
 * The calendar: Monday to Friday of two weeks side by side, one row per card, with each
 * check item that has a due date in its day.
 *
 * This file only draws. ChecklistModel.calendarPlan decides what goes where, and the page
 * supplies the text formatting (so dates follow the viewer's language) and what a click
 * does. Names come from Trello users, so everything is set with textContent.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WeekCalendar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

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

  // One check item as a button that opens its card.
  //   detailed  adds the card and the date, for the lists under the grid, where neither the
  //             row nor the column says them. In the grid the row is the card.
  function chip(rec, fmt, ui, detailed) {
    var li = el('li', 'wk-item');
    var btn = el('button', 'wk-chip' + (rec.complete ? ' is-complete' : '') + (rec.overdue ? ' is-overdue' : ''));
    btn.type = 'button';
    btn.title = fmt.itemTitle(rec);

    // The status mark sits in the text, in front of the name, so a narrow column can wrap the
    // name underneath it instead of squeezing the name into what is left beside it.
    var mark = el('span', 'wk-mark', rec.complete ? '\u2713' : rec.overdue ? '!' : '');
    mark.setAttribute('aria-hidden', 'true');

    var text = el('span', 'wk-text');
    var line = el('span', 'wk-nameline');
    line.appendChild(mark);
    line.appendChild(el('span', 'sr-only', rec.complete ? 'Completed: ' : rec.overdue ? 'Overdue: ' : 'Not completed: '));
    line.appendChild(el('span', 'wk-name', rec.name));
    text.appendChild(line);
    if (detailed) text.appendChild(el('span', 'wk-meta', rec.card));
    if (detailed && rec.due) text.appendChild(el('span', 'wk-due', fmt.dueShort(rec.due)));
    if (rec.member) text.appendChild(el('span', 'wk-who-tag', rec.member));
    btn.appendChild(text);

    btn.addEventListener('click', function () {
      if (ui.handlers && ui.handlers.onOpenCard) ui.handlers.onOpenCard({ id: rec.cardId });
    });
    li.appendChild(btn);
    return li;
  }

  function flatList(items, fmt, ui) {
    var ul = el('ul', 'wk-list wk-flat');
    items.forEach(function (rec) { ul.appendChild(chip(rec, fmt, ui, true)); });
    return ul;
  }

  function grid(plan, fmt, ui) {
    var scroll = el('div', 'wk-scroll');
    var table = el('table', 'wk-grid');
    table.setAttribute('aria-label', 'Check items by card and day, ' + fmt.range(plan.start, plan.rangeEnd));

    var head = el('thead');

    // First header row: the card column, then one heading over each week's five days.
    var top = el('tr');
    var corner = el('th', 'wk-corner');
    corner.setAttribute('scope', 'col');
    corner.rowSpan = 2;
    corner.appendChild(el('span', 'wk-corner-text', 'Card'));
    top.appendChild(corner);
    plan.weeks.forEach(function (week) {
      var th = el('th', 'wk-week', fmt.weekRange(week.start, week.end));
      th.setAttribute('scope', 'colgroup');
      th.colSpan = 5;
      top.appendChild(th);
    });
    head.appendChild(top);

    var hr = el('tr');
    plan.days.forEach(function (day, i) {
      var th = el('th', 'wk-day' + (day.today ? ' is-today' : '') + (i % 5 === 0 && i > 0 ? ' is-week-start' : ''));
      th.setAttribute('scope', 'col');
      var time = el('time');
      time.setAttribute('datetime', fmt.dateAttr(day.start));
      time.title = fmt.dayFull(day.start);
      time.appendChild(el('span', 'wk-dow', fmt.weekday(day.start)));
      time.appendChild(el('span', 'wk-dom', fmt.dayOfMonth(day.start)));
      // The month, where it changes, so two weeks that span two months read clearly.
      if (i === 0 || fmt.firstOfMonth(day.start)) time.appendChild(el('span', 'wk-mon', fmt.month(day.start)));
      th.appendChild(time);
      if (day.today) th.appendChild(el('span', 'wk-today', 'Today'));
      hr.appendChild(th);
    });
    head.appendChild(hr);
    table.appendChild(head);

    var body = el('tbody');
    plan.rows.forEach(function (row) {
      var tr = el('tr');
      var who = el('th', 'wk-cardhead');
      who.setAttribute('scope', 'row');
      var link = el('button', 'wk-card-link', row.name);
      link.type = 'button';
      link.title = row.list ? row.name + ' (' + row.list + ')' : row.name;
      link.addEventListener('click', function () {
        if (ui.handlers && ui.handlers.onOpenCard) ui.handlers.onOpenCard({ id: row.id });
      });
      who.appendChild(link);
      if (row.list) who.appendChild(el('span', 'wk-card-list', row.list));
      who.appendChild(el('span', 'wk-card-count', plural(row.count, 'item')));
      tr.appendChild(who);

      row.cells.forEach(function (items, i) {
        var day = plan.days[i];
        var td = el('td', 'wk-cell' + (day.today ? ' is-today' : '') + (i % 5 === 0 && i > 0 ? ' is-week-start' : ''));
        if (items.length) {
          var ul = el('ul', 'wk-list');
          items.forEach(function (rec) { ul.appendChild(chip(rec, fmt, ui, false)); });
          td.appendChild(ul);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    scroll.appendChild(table);
    return scroll;
  }

  function more(title, items, fmt, ui) {
    var details = el('details', 'wk-more');
    details.appendChild(el('summary', null, title));
    details.appendChild(flatList(items, fmt, ui));
    return details;
  }

  // The navigation is built once and kept, so a keyboard user who presses "Next" stays on
  // that button; only the grid under it is redrawn.
  function build(container) {
    var ui = { handlers: null };
    ui.root = el('section', 'wk');
    ui.root.setAttribute('aria-label', 'Calendar, two weeks at a time');

    var nav = el('div', 'wk-nav');
    var steps = el('div', 'toggle wk-steps');
    steps.setAttribute('role', 'group');
    steps.setAttribute('aria-label', 'Change the two weeks shown');

    function stepButton(label, text, name) {
      var b = el('button', null, text);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function () {
        if (ui.handlers && ui.handlers[name]) ui.handlers[name]();
      });
      steps.appendChild(b);
      return b;
    }
    stepButton('Previous 2 weeks', '‹', 'onPrev');
    ui.current = stepButton('Current 2 weeks', 'Current 2 weeks', 'onCurrent');
    stepButton('Next 2 weeks', '›', 'onNext');
    nav.appendChild(steps);

    var titles = el('div', 'wk-titles');
    ui.title = el('h2', 'wk-title');
    ui.title.tabIndex = -1;   // so focus can move here after "Go to ..."
    ui.title.setAttribute('aria-live', 'polite');
    ui.sub = el('p', 'wk-sub');
    titles.appendChild(ui.title);
    titles.appendChild(ui.sub);
    nav.appendChild(titles);

    ui.root.appendChild(nav);
    ui.body = el('div', 'wk-body');
    ui.root.appendChild(ui.body);
    container.appendChild(ui.root);
    return ui;
  }

  // Draws `plan` (from ChecklistModel.calendarPlan) into `container`.
  //   fmt       { range, weekRange, weekday, dayOfMonth, firstOfMonth, month, dayFull, dateAttr, dueShort, itemTitle, weekOf }
  //   handlers  { onPrev, onNext, onCurrent, onGoto(mondayMs), onOpenCard({id}) }
  function render(container, plan, fmt, handlers) {
    var ui = container._weekCalendar;
    if (!ui || ui.root.parentNode !== container) {
      ui = build(container);
      container._weekCalendar = ui;
    }
    ui.handlers = handlers || {};

    ui.title.textContent = fmt.range(plan.start, plan.rangeEnd);
    ui.current.setAttribute('aria-pressed', String(!!plan.current));

    var sub = plural(plan.inGrid, 'item') + ' due in these 2 weeks';
    if (plan.inGrid > 0) sub += ' · ' + plural(plan.rows.length, 'card');
    if (plan.overdueInGrid > 0) sub += ' · ' + plan.overdueInGrid + ' overdue';
    ui.sub.textContent = sub;

    clear(ui.body);
    ui.body.appendChild(grid(plan, fmt, ui));

    if (plan.inGrid === 0) {
      var empty = el('p', 'wk-empty', plan.weekend.count > 0
        ? 'Nothing is due on a weekday in these 2 weeks.'
        : 'Nothing is due in these 2 weeks.');
      var n = plan.neighbours;
      [['prev', 'Go to the last 2 weeks with items'], ['next', 'Go to the next 2 weeks with items']].forEach(function (pair) {
        var target = n[pair[0]];
        if (target === null || target === undefined) return;
        var go = el('button', 'wk-go', pair[1] + ' (' + fmt.weekOf(target) + ')');
        go.type = 'button';
        go.addEventListener('click', function () {
          if (ui.handlers.onGoto) ui.handlers.onGoto(target);
        });
        empty.appendChild(document.createTextNode(' '));
        empty.appendChild(go);
      });
      ui.body.appendChild(empty);
    }

    if (plan.after.count > 0) {
      ui.body.appendChild(el('p', 'wk-note', plural(plan.after.count, 'open item') + ' due after these 2 weeks.'));
    }
    if (plan.weekend.count > 0) {
      ui.body.appendChild(more('Due on a Saturday or Sunday (' + plan.weekend.count + ')', plan.weekend.items, fmt, ui));
    }
    if (plan.before.count > 0) {
      ui.body.appendChild(more(
        (plan.before.overdue ? 'Overdue from earlier weeks' : 'Open items due before these 2 weeks') +
          ' (' + plan.before.count + ')',
        plan.before.items, fmt, ui));
    }
    if (plan.noDate.count > 0) {
      ui.body.appendChild(more('No due date (' + plan.noDate.count + ')', plan.noDate.items, fmt, ui));
    }
  }

  return { render: render };
});
