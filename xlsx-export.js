/*
 * Builds a real .xlsx file (an Office Open XML zip) with no libraries, so the
 * Power-Up has nothing extra to load. No DOM access in here, so it can be tested
 * in Node. Cell text is always written as a string, so a card or item whose name
 * starts with "=" is shown as text and never run as a formula.
 *
 *   XlsxExport.build({
 *     sheetName: 'Checklist items',
 *     headers:   ['List', 'Card', ...],
 *     widths:    [18, 32, ...],          // characters
 *     wrap:      [3],                    // column indexes that wrap long text
 *     links:     [5],                    // column indexes whose text is a URL
 *     rows:      [['To do', 'Card', ...], ...]
 *   }) -> Uint8Array
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.XlsxExport = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  var MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var MAX_CELL_CHARS = 32767;
  var NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  var NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  var XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  // Cell style ids, matching the order of <cellXfs> in STYLES below.
  var STYLE = { header: 1, body: 2, wrap: 3, link: 4 };

  // ---- XML helpers ---------------------------------------------------------

  // Characters XML 1.0 cannot hold at all; Excel refuses a file containing them.
  var ILLEGAL_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(ILLEGAL_XML, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cellText(value) {
    var s = String(value == null ? '' : value).replace(ILLEGAL_XML, '');
    return s.length > MAX_CELL_CHARS ? s.slice(0, MAX_CELL_CHARS) : s;
  }

  // 0 -> A, 25 -> Z, 26 -> AA
  function colName(index) {
    var name = '';
    var n = index + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function safeSheetName(name) {
    var cleaned = String(name || '').replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^'+|'+$/g, '').slice(0, 31).trim();
    return cleaned || 'Sheet1';
  }

  function isWebUrl(s) {
    return /^https?:\/\//i.test(s);
  }

  // ---- Fixed parts of the package -----------------------------------------

  var CONTENT_TYPES = XML_HEAD +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  var ROOT_RELS = XML_HEAD +
    '<Relationships xmlns="' + NS_PKG_REL + '">' +
    '<Relationship Id="rId1" Type="' + NS_REL + '/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  var WORKBOOK_RELS = XML_HEAD +
    '<Relationships xmlns="' + NS_PKG_REL + '">' +
    '<Relationship Id="rId1" Type="' + NS_REL + '/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="' + NS_REL + '/styles" Target="styles.xml"/>' +
    '</Relationships>';

  var STYLES = XML_HEAD +
    '<styleSheet xmlns="' + NS_MAIN + '">' +
    '<fonts count="3">' +
      '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF4F5F7"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FFDFE1E6"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  // ---- Sheet ---------------------------------------------------------------

  function stringCell(ref, text, style) {
    if (text === '') return '<c r="' + ref + '" s="' + style + '"/>';
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' +
      esc(text) + '</t></is></c>';
  }

  function buildSheet(opts) {
    var headers = opts.headers || [];
    var rows = opts.rows || [];
    var widths = opts.widths || [];
    var wrap = opts.wrap || [];
    var links = opts.links || [];
    var lastCol = colName(Math.max(headers.length, 1) - 1);
    var lastRow = rows.length + 1;

    var linkTargets = [];       // distinct URLs, in order of first use
    var linkIds = {};           // url -> rId
    var linkRefs = [];          // [cellRef, rId]

    var xml = XML_HEAD +
      '<worksheet xmlns="' + NS_MAIN + '" xmlns:r="' + NS_REL + '">' +
      '<dimension ref="A1:' + lastCol + lastRow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0">' +
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
        '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
      '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>';

    if (headers.length) {
      xml += '<cols>';
      for (var c = 0; c < headers.length; c++) {
        var w = Number(widths[c]) > 0 ? Number(widths[c]) : 16;
        xml += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>';
      }
      xml += '</cols>';
    }

    xml += '<sheetData>';

    xml += '<row r="1" ht="20" customHeight="1">';
    headers.forEach(function (h, c) {
      xml += stringCell(colName(c) + '1', cellText(h), STYLE.header);
    });
    xml += '</row>';

    rows.forEach(function (row, r) {
      var rowNum = r + 2;
      xml += '<row r="' + rowNum + '">';
      for (var c = 0; c < headers.length; c++) {
        var ref = colName(c) + rowNum;
        var text = cellText(row[c]);
        var style = STYLE.body;

        if (links.indexOf(c) !== -1 && isWebUrl(text)) {
          style = STYLE.link;
          if (!linkIds.hasOwnProperty(text)) {
            linkIds[text] = 'rId' + (linkTargets.length + 1);
            linkTargets.push(text);
          }
          linkRefs.push([ref, linkIds[text]]);
        } else if (wrap.indexOf(c) !== -1) {
          style = STYLE.wrap;
        }
        xml += stringCell(ref, text, style);
      }
      xml += '</row>';
    });

    xml += '</sheetData>';
    xml += '<autoFilter ref="A1:' + lastCol + lastRow + '"/>';

    if (linkRefs.length) {
      xml += '<hyperlinks>';
      linkRefs.forEach(function (l) {
        xml += '<hyperlink ref="' + l[0] + '" r:id="' + l[1] + '"/>';
      });
      xml += '</hyperlinks>';
    }

    xml += '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>';
    xml += '</worksheet>';

    var rels = null;
    if (linkTargets.length) {
      rels = XML_HEAD + '<Relationships xmlns="' + NS_PKG_REL + '">';
      linkTargets.forEach(function (url, i) {
        rels += '<Relationship Id="rId' + (i + 1) + '" Type="' + NS_REL + '/hyperlink" Target="' +
          esc(url) + '" TargetMode="External"/>';
      });
      rels += '</Relationships>';
    }

    return { xml: xml, rels: rels };
  }

  function buildWorkbook(sheetName) {
    return XML_HEAD +
      '<workbook xmlns="' + NS_MAIN + '" xmlns:r="' + NS_REL + '">' +
      '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>' +
      '<sheets><sheet name="' + esc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>';
  }

  // ---- Zip (stored, no compression) ---------------------------------------

  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(d) {
    var year = Math.max(d.getFullYear(), 1980);
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function zip(files, when) {
    var enc = new TextEncoder();
    var stamp = dosDateTime(when || new Date());
    var entries = files.map(function (f) {
      var data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      return { name: enc.encode(f.name), data: data, crc: crc32(data), offset: 0 };
    });

    var size = 22; // end-of-central-directory record
    entries.forEach(function (e) { size += 30 + e.name.length + e.data.length + 46 + e.name.length; });

    var out = new Uint8Array(size);
    var view = new DataView(out.buffer);
    var pos = 0;

    entries.forEach(function (e) {
      e.offset = pos;
      view.setUint32(pos, 0x04034b50, true);            // local file header
      view.setUint16(pos + 4, 20, true);                // version needed
      view.setUint16(pos + 6, 0x0800, true);            // flags: UTF-8 names
      view.setUint16(pos + 8, 0, true);                 // method: stored
      view.setUint16(pos + 10, stamp.time, true);
      view.setUint16(pos + 12, stamp.date, true);
      view.setUint32(pos + 14, e.crc, true);
      view.setUint32(pos + 18, e.data.length, true);    // compressed size
      view.setUint32(pos + 22, e.data.length, true);    // uncompressed size
      view.setUint16(pos + 26, e.name.length, true);
      view.setUint16(pos + 28, 0, true);                // extra length
      pos += 30;
      out.set(e.name, pos); pos += e.name.length;
      out.set(e.data, pos); pos += e.data.length;
    });

    var cdStart = pos;
    entries.forEach(function (e) {
      view.setUint32(pos, 0x02014b50, true);            // central directory header
      view.setUint16(pos + 4, 20, true);                // version made by
      view.setUint16(pos + 6, 20, true);                // version needed
      view.setUint16(pos + 8, 0x0800, true);
      view.setUint16(pos + 10, 0, true);
      view.setUint16(pos + 12, stamp.time, true);
      view.setUint16(pos + 14, stamp.date, true);
      view.setUint32(pos + 16, e.crc, true);
      view.setUint32(pos + 20, e.data.length, true);
      view.setUint32(pos + 24, e.data.length, true);
      view.setUint16(pos + 28, e.name.length, true);
      view.setUint16(pos + 30, 0, true);                // extra length
      view.setUint16(pos + 32, 0, true);                // comment length
      view.setUint16(pos + 34, 0, true);                // disk number
      view.setUint16(pos + 36, 0, true);                // internal attributes
      view.setUint32(pos + 38, 0, true);                // external attributes
      view.setUint32(pos + 42, e.offset, true);
      pos += 46;
      out.set(e.name, pos); pos += e.name.length;
    });

    var cdSize = pos - cdStart;
    view.setUint32(pos, 0x06054b50, true);              // end of central directory
    view.setUint16(pos + 4, 0, true);
    view.setUint16(pos + 6, 0, true);
    view.setUint16(pos + 8, entries.length, true);
    view.setUint16(pos + 10, entries.length, true);
    view.setUint32(pos + 12, cdSize, true);
    view.setUint32(pos + 16, cdStart, true);
    view.setUint16(pos + 20, 0, true);
    return out;
  }

  // ---- Public --------------------------------------------------------------

  function build(opts) {
    var sheet = buildSheet(opts);
    var files = [
      { name: '[Content_Types].xml', data: CONTENT_TYPES },
      { name: '_rels/.rels', data: ROOT_RELS },
      { name: 'xl/workbook.xml', data: buildWorkbook(safeSheetName(opts.sheetName)) },
      { name: 'xl/_rels/workbook.xml.rels', data: WORKBOOK_RELS },
      { name: 'xl/styles.xml', data: STYLES },
      { name: 'xl/worksheets/sheet1.xml', data: sheet.xml }
    ];
    if (sheet.rels) {
      files.push({ name: 'xl/worksheets/_rels/sheet1.xml.rels', data: sheet.rels });
    }
    return zip(files, opts.date);
  }

  return { build: build, MIME: MIME, crc32: crc32, colName: colName };
});
