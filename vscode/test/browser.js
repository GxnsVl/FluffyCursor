'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
async function main() {
  const browser = await chromium.launch({ channel: process.env.FLUFFY_TEST_BROWSER || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 500 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`<style>
      body{background:#1e1e1e;color:#ddd;font:16px monospace}
      .monaco-editor{position:absolute;left:80px;top:60px;width:700px;height:350px}
      .overflow-guard{position:absolute;inset:0;overflow:hidden}
      .cursor{position:absolute;left:40px;top:20px;width:2px;height:22px;background:#fff}
      textarea{position:absolute;width:1px;height:1px;opacity:0}
      </style><div class="monaco-editor"><div class="overflow-guard"><textarea class="inputarea"></textarea><div class="cursors-layer"><div class="cursor"></div></div></div></div><button>Other focus</button>`);
    // Flush Chromium's initial viewport resize before replacing its frame clock.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => {
      window.testClock = 1000; window.frames = new Map(); window.frameId = 0;
      window.schedules = [];
      window.requestAnimationFrame = fn => { const id = ++window.frameId; window.frames.set(id, fn); window.schedules.push(new Error().stack); return id; };
      window.cancelAnimationFrame = id => window.frames.delete(id);
      performance.now = () => window.testClock;
      window.advance = delta => {
        window.testClock += delta; const pending = Array.from(window.frames.values()); window.frames.clear();
        pending.forEach(fn => fn(window.testClock));
      };
      document.querySelector('textarea').focus();
    });
    await page.addScriptTag({ path: path.resolve(__dirname, '../src/physics.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '../src/renderer.js') });
    const advance = async (frames, delta = 5) => {
      for (let i = 0; i < frames; i++) await page.evaluate(delta => window.advance(delta), delta);
    };
    await advance(12);
    assert.equal(await page.locator('.monaco-editor').evaluate(el => el.classList.contains('fluffy-cursor-native-hidden')), true);
    assert.equal(await page.evaluate(() => window.frames.size), 0, 'idle must not continuously repaint: ' + await page.evaluate(() => window.schedules.slice(-3).join('\n')));
    const idlePath = await page.locator('#fluffy-cursor-overlay g path').last().getAttribute('d');
    await page.locator('.cursor').evaluate(el => { el.style.left = '400px'; el.style.top = '150px'; });
    await advance(8);
    const motionPath = await page.locator('#fluffy-cursor-overlay g path').last().getAttribute('d');
    assert.notEqual(motionPath, idlePath);
    assert.equal(await page.locator('#fluffy-cursor-overlay > g > g').count(), 1, 'one caret body, no ghost copies');
    await fs.mkdir(path.resolve(__dirname, '../test-results'), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/motion.png') });
    await advance(110);
    assert.equal(await page.evaluate(() => window.frames.size), 0, 'navigation and landing must stop');
    const finalPath = await page.locator('#fluffy-cursor-overlay g path').last().getAttribute('d');
    assert.match(finalPath, /^M480\.000,210\.000/);
    await page.locator('textarea').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })));
    await page.locator('.cursor').evaluate(el => { el.style.left = '408px'; });
    await advance(42);
    assert.equal(await page.evaluate(() => window.frames.size), 0, 'typing settles in 70ms plus 120ms recoil');
    await page.locator('.cursor').evaluate(el => { el.style.top = '230px'; el.parentElement.dispatchEvent(new Event('scroll', { bubbles: true })); });
    await advance(3);
    assert.equal(await page.evaluate(() => window.frames.size), 0, 'scroll should snap without a trail');
    await page.locator('button').focus(); await advance(3);
    assert.equal(await page.locator('.fluffy-cursor-native-hidden').count(), 0, 'native cursor restored on focus loss');
    assert.equal(await page.locator('#fluffy-cursor-overlay > g > g').count(), 0);
    await page.locator('textarea').focus(); await advance(3);
    await page.locator('.cursors-layer').evaluate(el => {
      const second = el.firstElementChild.cloneNode(); second.style.left = '200px'; el.appendChild(second);
    });
    await advance(3);
    assert.equal(await page.locator('#fluffy-cursor-overlay > g > g').count(), 2);
    await page.evaluate(() => {
      const input = document.createElement('div'); input.className = 'native-edit-context'; input.tabIndex = 0;
      document.querySelector('.overflow-guard').appendChild(input); input.focus();
    });
    await advance(3);
    assert.equal(await page.locator('.fluffy-cursor-native-hidden').count(), 1, 'modern native EditContext input is supported');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('.fluffy-cursor-native-hidden').count(), 0);
    await page.evaluate(() => window.__fluffyCursorRuntime.dispose());
    assert.equal(await page.locator('#fluffy-cursor-overlay').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: motion, idle scheduling, typing, scroll, multicursor, native EditContext, focus restoration and disposal.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
