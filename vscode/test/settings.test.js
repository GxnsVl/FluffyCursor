'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const panel = require('../src/settings-panel');
const model = require('../src/physics');
test('visual settings reject invalid colors and non-finite numbers instead of silently substituting cyan', () => {
  assert.throws(() => panel.validate({ ...model.defaults, color: 'FFFFFF' }), /six-digit/);
  assert.throws(() => panel.validate({ ...model.defaults, glow: Infinity }), /valid value/);
  assert.equal(panel.validate({ ...model.defaults, color: '#FFFFFF' }).color, '#FFFFFF');
});
test('settings page declares local resource CSP and visible installation disclosure', () => {
  const html = panel.html({ cspSource: 'vscode-webview:' }, name => 'vscode-webview://test/' + name);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /This version modifies editor interface files/);
  assert.match(html, /MIT-licensed/);
  assert.match(html, /Save & apply to editor/);
  assert.ok(!html.includes('onclick='));
});
