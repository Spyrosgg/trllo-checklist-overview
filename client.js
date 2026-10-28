/* global TrelloPowerUp */
var config = window.CHECKLIST_OVERVIEW_CONFIG || {};

var capabilities = {
  // Button in the board's top bar that opens the full-page checklist view
  'board-buttons': function () {
    return [{
      icon: {
        dark: './images/icon-white.svg',
        light: './images/icon-dark.svg'
      },
      text: 'Checklists',
      callback: function (t) {
        return t.modal({
          title: 'All checklist items',
          url: './overview.html',
          fullscreen: true,
          accentColor: 'blue'
        });
      }
    }];
  }
};

// appKey and appName must be passed together for the REST API client to exist.
if (config.appKey) {
  var options = {
    appKey: config.appKey,
    appName: config.appName || 'Checklist Overview'
  };
  if (config.appAuthor) options.appAuthor = config.appAuthor;
  TrelloPowerUp.initialize(capabilities, options);
} else {
  TrelloPowerUp.initialize(capabilities);
}
