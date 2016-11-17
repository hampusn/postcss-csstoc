/* globals module, require, __dirname */
'use strict';

const os      = require('os');
const postcss = require('postcss');
const extend  = require('extend');


function textFilter (comment, opts) {
  let commentRows      = comment.text.split(os.EOL);
  let hasMultipleRows  = commentRows.length > 1;
  let beginsWithDashes = commentRows[0].substr(0, 3) === '---';
  let endsWithDashes   = commentRows[commentRows.length - 1].substr(0, 3) === '---';

  return hasMultipleRows && beginsWithDashes && endsWithDashes;
}

function textFormatter (comment, opts) {
  let commentRows = comment.text.split(os.EOL);
  if (commentRows.length > 1) {
    let row = commentRows[1];
    let depth = row.match(/^#*/)[0].length; // Get depth

    row = row.replace(/^(#+\s+)/, ''); // Strip depth
    row = row.charAt(0).toUpperCase() + row.slice(1).toLowerCase(); // Capitalize
    row = opts.padDepthChar.repeat(depth) + ' ' + row; // Pad/indent with depth

    return row;
  }
  return '';
}

function tocTemplate (content, opts) {
  return [
    opts.blockIdentifier,
    '',
    'Table of Contents',
    '=================',
    '',
    content,
    '',
    opts.blockIdentifier
  ].join(os.EOL);
}

module.exports = postcss.plugin('csstoc', function csstoc (options) {
  let defaults = {
    "padDepthChar":    "-",
    "blockIdentifier": "--- csstoc ---",
    "textFilter":      textFilter,
    "textFormatter":   textFormatter,
    "tocTemplate":     tocTemplate
  };
  let opts = extend(true, {}, defaults, options);

  return function (root, result) {
    let tocLines        = [];
    let tocInsertionIds = [];

    root.walkComments(comment => {
      let cloned = comment.clone();
      let commentRows = cloned.text.split(os.EOL);

      // Find id for comment which will contain the toc.
      if (commentRows[0].indexOf(opts.blockIdentifier) >= 0) {
        tocInsertionIds.push(root.index(comment));
      } else if (opts.textFilter(comment, opts)) {
        tocLines.push(opts.textFormatter(comment, opts));
      }

      comment.replaceWith(cloned);
    });

    if (!tocLines.length) {
      result.warn('No table of content lines found.', { node: root });
    }

    if (!tocInsertionIds.length) {
      result.warn('No insertion locations found.', { node: root });
    }

    if (tocLines.length && tocInsertionIds.length) {
      let content = tocLines.join(os.EOL);
      let toc     = opts.tocTemplate(content, opts);

      for (var i = tocInsertionIds.length - 1; i >= 0; i--) {
        // Update toc comment's text content.
        root.nodes[tocInsertionIds[i]].text = toc;
      }
    }
  };

});
