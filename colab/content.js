(function () {
  'use strict';
  let initialized = false;
  function apply(settings) {
    window.FluffyCursorStart(window.FluffyCursorPhysics.options(settings));
  }
  // Register before reading storage so a simultaneous settings save cannot be lost.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.fluffyCursor) return;
    initialized = true; apply(changes.fluffyCursor.newValue || {});
  });
  chrome.storage.local.get('fluffyCursor').then(result => {
    if (!initialized) { initialized = true; apply(result.fluffyCursor || {}); }
  }).catch(error => console.warn('Fluffy Cursor could not read local settings; native cursor remains active.', error));
  window.addEventListener('pagehide', () => {
    if (window.__fluffyCursorRuntime) window.__fluffyCursorRuntime.dispose();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) chrome.storage.local.get('fluffyCursor').then(result => apply(result.fluffyCursor || {}));
  });
})();
