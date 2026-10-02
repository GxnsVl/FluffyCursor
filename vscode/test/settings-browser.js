'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const panel = require('../src/settings-panel');
const model = require('../src/physics');
async function main() {
  const directory = path.resolve(__dirname, '../test-results'); await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'settings.html');
  await fs.writeFile(file, panel.html({ cspSource: 'file:' }, name => pathToFileURL(path.resolve(__dirname, '../src', name)).href));
  const browser = await chromium.launch({ channel: process.env.FLUFFY_TEST_BROWSER || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(config => {
      window.messages = []; let saved;
      window.acquireVsCodeApi = () => ({ getState: () => saved, setState: value => { saved = value; }, postMessage: message => {
        window.messages.push(message);
        if (message.type === 'ready') queueMicrotask(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'settings', config, installed: true } })));
      } });
    }, { ...model.defaults, color: '#FFFFFF', width: 3 });
    await page.goto(pathToFileURL(file).href);
    await page.locator('#status').filter({ hasText: 'Full effect is installed' }).waitFor();
    assert.equal(await page.locator('#color').inputValue(), '#FFFFFF', 'existing settings must replace initial defaults');
    assert.equal(await page.locator('#width').inputValue(), '3');
    await page.locator('#preset').selectOption('calm'); assert.equal(await page.locator('#color').inputValue(), '#B0BEC5');
    await page.locator('#color').fill('#FFFFFF'); await page.locator('#useThemeColor').check();
    assert.equal(await page.locator('#color').isDisabled(), true); await page.locator('#useThemeColor').uncheck();
    await page.locator('#apply').click();
    const message = await page.evaluate(() => window.messages.findLast(message => message.type === 'save'));
    assert.equal(message.config.color, '#FFFFFF'); assert.equal(message.apply, true);
    await page.locator('#try').click(); await page.locator('#preview-caret').getAttribute('d').then(value => assert.ok(value));
    await page.locator('#save').click(); assert.equal(await page.evaluate(() => window.messages.at(-1).apply), false);
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'result', error: true, message: 'Installation is not writable.' } })));
    assert.equal(await page.locator('#status').textContent(), 'Installation is not writable.');
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'result', error: false, message: 'Settings saved. Use Save & apply when you are ready to update the editor.' } })));
    await page.screenshot({ path: path.join(directory, 'settings-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 480, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'narrow settings page must not overflow');
    await page.screenshot({ path: path.join(directory, 'settings-narrow.png'), fullPage: true });
    assert.deepEqual(errors, []); console.log('Settings UI checks passed: presets, color, theme toggle, save/apply distinction, errors, preview and narrow layout.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
