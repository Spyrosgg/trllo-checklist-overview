/*
 * A small column chart of open items by due date, drawn as SVG with no libraries.
 *
 * Two parts:
 *   - layout(): pure maths (bar sizes, axis ticks, which labels fit). No DOM, so
 *     it is tested in Node.
 *   - render(): builds the SVG and its hover/focus tooltip. All text goes in as
 *     text, never as HTML, because card and checklist names are user content.
 *
 * Colours come from CSS (see overview.css), so light and dark mode need no code.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TimelineChart = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var CFG = {
    plotH: 168,      // height of the plot area
    top: 28,         // room above the plot for value labels
    axis: 30,        // band under the plot for category labels
    left: 30,        // room for the y-axis numbers
    right: 30,       // room so a wide last label is not cut off
    maxBar: 24,      // columns are never thicker than this
    gap: 2,          // clear space between neighbouring columns
    slotMax: 64,     // widest a column's slot gets, so a few bars stay compact
    slotMin: 10,     // narrowest slot; below this the chart scrolls sideways
    radius: 4        // rounded data-end of a column
  };

  // Rough text width at 11px. Only used to decide whether labels collide.
  function textWidth(text) {
    return String(text).length * 6.4 + 4;
  }

  // Round tick values: 0 and clean steps (1, 2, 5, 10, 20, 50 ...), at most
  // four intervals, always whole numbers because these are counts.
  function niceTicks(max) {
    var top = Math.max(1, max);
    var pow = 1;
    for (;;) {
      var mults = [1, 2, 5];
      for (var i = 0; i < mults.length; i++) {
        var step = mults[i] * pow;
        if (Math.ceil(top / step) <= 4) {
          var end = Math.ceil(top / step) * step;
          var ticks = [];
          for (var v = 0; v <= end; v += step) ticks.push(v);
          return { top: end, ticks: ticks };
        }
      }
      pow *= 10;
    }
  }

  // Decides which category labels are drawn. tier[i] says how much label i
  // matters: 0 is placed first, then 1, then 2 ... and within a tier labels go
  // left to right, each only if it does not touch one already placed. So a
  // column that holds items is never left unnamed because an empty one beside
  // it got there first. Returns a boolean per label.
  function placeLabels(centers, labels, tier) {
    var placed = [];
    var show = labels.map(function () { return false; });
    var pad = 6;

    function tryPlace(i) {
      var half = textWidth(labels[i]) / 2;
      var l = centers[i] - half;
      var r = centers[i] + half;
      for (var k = 0; k < placed.length; k++) {
        if (l < placed[k][1] + pad && r > placed[k][0] - pad) return;
      }
      placed.push([l, r]);
      show[i] = true;
    }

    var last = 0;
    labels.forEach(function (_, i) { if ((tier[i] || 0) > last) last = tier[i]; });
    for (var level = 0; level <= last; level++) {
      labels.forEach(function (_, i) { if ((tier[i] || 0) === level) tryPlace(i); });
    }
    return show;
  }

  // buckets: [{ kind, count }, ...]; labels: the short text under each column.
  function layout(buckets, availWidth, labels) {
    var n = buckets.length;
    var inner = Math.max(0, (availWidth || 0) - CFG.left - CFG.right);
    var slot = n ? Math.min(CFG.slotMax, Math.max(CFG.slotMin, inner / n)) : CFG.slotMax;
    var barW = Math.max(3, Math.min(CFG.maxBar, slot - CFG.gap * 2));

    var maxCount = 0;
    buckets.forEach(function (b) { if (b.count > maxCount) maxCount = b.count; });
    var scale = niceTicks(maxCount);
    var baseY = CFG.top + CFG.plotH;

    var bars = buckets.map(function (b, i) {
      var h = b.count > 0 ? Math.max(2, Math.round(b.count / scale.top * CFG.plotH)) : 0;
      var cx = CFG.left + slot * i + slot / 2;
      return { i: i, count: b.count, kind: b.kind, cx: cx, x: cx - barW / 2, w: barW, h: h, y: baseY - h };
    });

    // Which bars carry a value label: the status bars, plus the tallest upcoming
    // one. Everything else is read from the axis, tooltip and table, so the
    // chart is not a number on every column.
    var peak = -1;
    bars.forEach(function (bar) {
      if ((bar.kind === 'period' || bar.kind === 'later') && bar.count > 0 &&
          (peak === -1 || bar.count > bars[peak].count)) {
        peak = bar.i;
      }
    });
    bars.forEach(function (bar) {
      bar.labelled = bar.count > 0 && (bar.kind === 'overdue' || bar.kind === 'none' || bar.i === peak);
    });

    var centers = bars.map(function (b) { return b.cx; });
    var tier = buckets.map(function (b) {
      if (b.kind === 'overdue' || b.kind === 'none') return 0;   // the status columns
      return b.count > 0 ? 1 : 2;                               // then columns with items
    });
    var showLabel = placeLabels(centers, labels || buckets.map(function () { return ''; }), tier);

    return {
      width: CFG.left + slot * n + CFG.right,
      height: CFG.top + CFG.plotH + CFG.axis,
      left: CFG.left,
      plotW: slot * n,
      baseY: baseY,
      slot: slot,
      barW: barW,
      bars: bars,
      ticks: scale.ticks.map(function (v) {
        return { value: v, y: baseY - Math.round(v / scale.top * CFG.plotH) };
      }),
      showLabel: showLabel
    };
  }

  // ---- drawing --------------------------------------------------------------

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function svgText(text, attrs) {
    var node = svgEl('text', attrs);
    node.textContent = text;
    return node;
  }

  // A column with a rounded top and a square foot, so it sits flat on the baseline.
  function columnPath(bar) {
    var r = Math.min(CFG.radius, bar.h, bar.w / 2);
    var x = bar.x, y = bar.y, w = bar.w, b = bar.y + bar.h;
    return 'M' + x + ',' + b + ' L' + x + ',' + (y + r) + ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      ' L' + (x + w - r) + ',' + y + ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      ' L' + (x + w) + ',' + b + ' Z';
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // timeline: the result of ChecklistModel.openTimeline.
  // fmt: { label(bucket), title(bucket), count(n), summary(timeline) } -> strings,
  //      so this module stays free of dates and language.
  function render(wrap, timeline, fmt, availWidth) {
    clearNode(wrap);

    var buckets = timeline.buckets;
    var labels = buckets.map(fmt.label);
    var lay = layout(buckets, availWidth, labels);

    var scroll = document.createElement('div');
    scroll.className = 'tl-scroll';
    var tip = document.createElement('div');
    tip.className = 'tl-tip';
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    var tipTitle = document.createElement('div');
    tipTitle.className = 'tl-tip-title';
    var tipValue = document.createElement('div');
    tipValue.className = 'tl-tip-value';
    var tipKey = document.createElement('span');
    tipKey.className = 'tl-tip-key';
    var tipNum = document.createElement('strong');
    var tipRest = document.createElement('span');
    tipValue.appendChild(tipKey);
    tipValue.appendChild(tipNum);
    tipValue.appendChild(tipRest);
    tip.appendChild(tipTitle);
    tip.appendChild(tipValue);

    var svg = svgEl('svg', {
      'class': 'tl-svg',
      width: lay.width,
      height: lay.height,
      viewBox: '0 0 ' + lay.width + ' ' + lay.height,
      role: 'group',
      'aria-label': fmt.summary(timeline)
    });

    // Gridlines: one hairline per tick, the zero line is the baseline.
    lay.ticks.forEach(function (t) {
      svg.appendChild(svgEl('line', {
        'class': t.value === 0 ? 'tl-base' : 'tl-grid',
        x1: lay.left, x2: lay.left + lay.plotW, y1: t.y + 0.5, y2: t.y + 0.5
      }));
      svg.appendChild(svgText(String(t.value), {
        'class': 'tl-tick', x: lay.left - 8, y: t.y + 4, 'text-anchor': 'end'
      }));
    });

    function showTip(bar, bucket) {
      tip.hidden = false;
      tipTitle.textContent = fmt.title(bucket);
      tipKey.className = 'tl-tip-key tl-key-' + bucket.kind;
      tipNum.textContent = String(bucket.count);
      tipRest.textContent = ' ' + fmt.count(bucket.count, true);
      var tipW = tip.offsetWidth;
      var cx = bar.cx - scroll.scrollLeft;
      var half = tipW / 2;
      var x = Math.min(Math.max(cx, half), Math.max(half, wrap.clientWidth - half));
      tip.style.left = x + 'px';
      tip.style.top = Math.max(0, bar.y - 10) + 'px';
    }

    function hideTip() { tip.hidden = true; }

    buckets.forEach(function (bucket, i) {
      var bar = lay.bars[i];
      var g = svgEl('g', {
        'class': 'tl-slot',
        tabindex: '0',
        role: 'img',
        'aria-label': fmt.title(bucket) + ': ' + fmt.count(bucket.count)
      });
      // The hit area is the whole column slot, from the top of the plot to the
      // category label, so nobody has to land on a thin bar.
      g.appendChild(svgEl('rect', {
        'class': 'tl-hit',
        x: lay.left + lay.slot * i, y: CFG.top - 6,
        width: lay.slot, height: lay.plotH + CFG.axis + 6
      }));
      if (bar.h > 0) {
        g.appendChild(svgEl('path', { 'class': 'tl-bar tl-bar-' + bucket.kind, d: columnPath(bar) }));
      }
      ['pointerenter', 'pointermove', 'focus'].forEach(function (name) {
        g.addEventListener(name, function () { showTip(bar, bucket); });
      });
      ['pointerleave', 'blur'].forEach(function (name) {
        g.addEventListener(name, hideTip);
      });
      svg.appendChild(g);

      if (bar.labelled) {
        var vy = bar.y - 7;
        if (bucket.kind === 'overdue') {
          // Status colour never travels alone: a warning icon sits beside the number.
          var numW = String(bar.count).length * 7;
          var startX = bar.cx - (12 + 3 + numW) / 2;
          svg.appendChild(svgEl('path', {
            'class': 'tl-icon', d: 'M' + (startX + 6) + ',' + (vy - 11) + ' L' + (startX + 12) + ',' + (vy + 0.5) +
              ' L' + startX + ',' + (vy + 0.5) + ' Z'
          }));
          svg.appendChild(svgEl('rect', { 'class': 'tl-icon-mark', x: startX + 5.2, y: vy - 7, width: 1.6, height: 4.2 }));
          svg.appendChild(svgEl('rect', { 'class': 'tl-icon-mark', x: startX + 5.2, y: vy - 2, width: 1.6, height: 1.6 }));
          svg.appendChild(svgText(String(bar.count), { 'class': 'tl-val', x: startX + 15, y: vy, 'text-anchor': 'start' }));
        } else {
          svg.appendChild(svgText(String(bar.count), { 'class': 'tl-val', x: bar.cx, y: vy, 'text-anchor': 'middle' }));
        }
      }

      if (lay.showLabel[i]) {
        svg.appendChild(svgText(labels[i], {
          'class': 'tl-label', x: bar.cx, y: lay.baseY + 18, 'text-anchor': 'middle'
        }));
      }
    });

    scroll.appendChild(svg);
    wrap.appendChild(scroll);
    wrap.appendChild(tip);
    return lay;
  }

  return {
    CFG: CFG,
    layout: layout,
    niceTicks: niceTicks,
    placeLabels: placeLabels,
    textWidth: textWidth,
    render: render
  };
});
