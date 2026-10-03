'use strict';
// Gecko rendering and browser.* API contract test. Real add-on loading is checked separately with web-ext run.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { firefox } = require('../vscode/node_modules/playwright');
async function main() {
  const root = path.join(__dirname, 'dist-firefox');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '140.0');
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
  assert.equal(manifest.key, undefined);
  const browser = await firefox.launch({ headless: true });
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(10000);
    const page = await context.newPage(), popup = await context.newPage();
    let settings = {};
    await context.exposeFunction('getLocalSettings', () => ({ fluffyCursor: settings }));
    await context.exposeFunction('setLocalSettings', async value => {
      const oldValue = settings; settings = value.fluffyCursor;
      await page.evaluate(({oldValue,newValue}) => window.storageListener({fluffyCursor:{oldValue,newValue}}, 'local'), {oldValue,newValue:settings});
    });
    await context.addInitScript(() => {
      window.browser = { storage: { local: { get: () => window.getLocalSettings(), set: value => window.setLocalSettings(value) }, onChanged: { addListener: listener => { window.storageListener = listener; } } } };
    });
    await page.goto('about:blank');
    await page.setContent('<style>.monaco-editor{position:relative;width:700px;height:300px}.overflow-guard{position:absolute;inset:0;overflow:hidden}.cursor{position:absolute;left:50px;top:40px;width:2px;height:20px;background:white}</style><div class="monaco-editor"><div class="overflow-guard"><textarea class="inputarea"></textarea><div class="cursors-layer"><div class="cursor"></div></div></div></div>');
    for (const name of ['physics.js','renderer.js','content.js']) await page.addScriptTag({path:path.join(root,name)});
    await page.bringToFront(); await page.locator('textarea').focus();
    await page.locator('.fluffy-cursor-native-hidden').waitFor();
    await popup.route('https://fluffy.test/**', async route => {
      const name = new URL(route.request().url()).pathname.slice(1) || 'popup.html';
      const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css'};
      await route.fulfill({body:await fs.readFile(path.join(root,name)),contentType:types[path.extname(name)]||'application/octet-stream'});
    });
    await popup.goto('https://fluffy.test/popup.html');
    await popup.waitForFunction(() => !document.getElementById('save').disabled);
    await popup.locator('#color').fill('#FFFFFF'); await popup.locator('#save').click();
    await popup.locator('#status').filter({hasText:'Applied to open Colab tabs'}).waitFor();
    await page.bringToFront(); await page.locator('textarea').focus();
    await page.waitForFunction(() => document.querySelector('#fluffy-cursor-overlay > g path:last-child')?.getAttribute('fill') === '#FFFFFF');
    await page.locator('.cursor').evaluate(el => {el.style.left='400px';el.style.top='150px';});
    await page.waitForFunction(() => {
      const cursor = document.querySelector('.cursor').getBoundingClientRect();
      const d = document.querySelector('#fluffy-cursor-overlay > g path:last-child')?.getAttribute('d');
      const match = d?.match(/^M([-\d.]+),([-\d.]+)/);
      return match && Math.abs(Number(match[1])-cursor.left)<0.02 && Math.abs(Number(match[2])-cursor.top)<0.02;
    });
    await popup.locator('#enabled').uncheck(); await popup.locator('#save').click();
    await page.waitForFunction(() => !document.querySelector('#fluffy-cursor-overlay') && !document.querySelector('.fluffy-cursor-native-hidden'));
    assert.equal(settings.color,'#FFFFFF');
    console.log('Firefox Gecko checks passed: browser API contract, live white color, movement settling and native caret restoration.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
