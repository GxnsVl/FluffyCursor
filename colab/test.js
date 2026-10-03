'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('../vscode/node_modules/playwright');
async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(__dirname,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.permissions,['storage']);
  assert.deepEqual(manifest.content_scripts[0].matches,['https://colab.research.google.com/*']);
  const extensionId = crypto.createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32).replace(/[\da-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
  const extensionPath=path.join(__dirname,'dist');
  const context = await chromium.launchPersistentContext(path.join(__dirname,'../build/colab-test-profile'),{
    channel:process.env.FLUFFY_TEST_BROWSER||'msedge',headless:true,
    args:['--disable-extensions-except='+extensionPath,'--load-extension='+extensionPath],viewport:{width:1000,height:700}
  });
  try {
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const fixture=`<!DOCTYPE html><style>body{margin:0;background:#202124;color:white;font:14px monospace}.notebook{height:500px;overflow:auto;padding:30px}.cell{height:300px}.monaco-editor{position:relative;width:700px;height:200px}.overflow-guard{position:absolute;inset:0;overflow:clip}.cursor{position:absolute;left:60px;top:30px;width:1.6px;height:19px;background:white}textarea{position:absolute;width:1px;height:1px;opacity:0}pre{padding:20px;line-height:22px}</style><div class="notebook"><div class="cell"><div class="monaco-editor"><div class="overflow-guard"><pre>print("Fluffy Cursor")\n\nfor cell in notebook:\n    enjoy_the_glow()</pre><textarea class="inputarea" aria-label="Editor content"></textarea><div class="cursors-layer"><div class="cursor"></div></div></div></div></div><div class="cell"><div class="monaco-editor"><div class="overflow-guard"><textarea class="inputarea" aria-label="Editor content"></textarea><div class="cursors-layer"><div class="cursor"></div></div></div></div></div></div>`;
    await page.route('https://colab.research.google.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
    await page.goto('https://colab.research.google.com/notebooks/fluffy-fixture');
    await page.locator('textarea').first().focus();
    await page.locator('.fluffy-cursor-native-hidden').waitFor();
    assert.equal(await page.locator('#fluffy-cursor-overlay').count(),1);
    const popup=await context.newPage();await popup.goto('chrome-extension://'+extensionId+'/popup.html');
    await popup.locator('#save').waitFor({state:'visible'});
    await popup.waitForFunction(()=>!document.getElementById('save').disabled);
    await popup.locator('#color').fill('#FFFFFF');await popup.locator('#save').click();
    await popup.locator('#status').filter({hasText:'Applied to open Colab tabs'}).waitFor();
    await page.bringToFront();await page.locator('textarea').first().focus();
    await page.waitForFunction(()=>document.querySelector('#fluffy-cursor-overlay > g path:last-child')?.getAttribute('fill')==='#FFFFFF');
    await page.locator('.cursor').first().evaluate(el=>{el.style.left='400px';el.style.top='100px';});
    const aligned = () => {
      const rect=document.querySelector('.cursor').getBoundingClientRect();
      const points=document.querySelector('#fluffy-cursor-overlay > g path:last-child')?.getAttribute('d')?.match(/^M([-\d.]+),([-\d.]+)L([-\d.]+),/);
      return points&&Math.abs(Number(points[1])-(rect.left+(rect.width-2)/2))<0.02&&Math.abs(Number(points[2])-rect.top)<0.02&&Math.abs(Number(points[3])-Number(points[1])-2)<0.02;
    };
    await page.waitForFunction(aligned);
    await page.locator('.notebook').evaluate(el=>{el.scrollTop=20;});
    await page.waitForFunction(aligned);
    await page.locator('textarea').nth(1).focus();
    await page.waitForFunction(()=>document.querySelectorAll('.fluffy-cursor-native-hidden').length===1&&document.querySelectorAll('.monaco-editor')[1].classList.contains('fluffy-cursor-native-hidden'));
    await popup.bringToFront();await popup.locator('#enabled').uncheck();await popup.locator('#save').click();
    await popup.locator('#status').filter({hasText:'Applied to open Colab tabs'}).waitFor();
    await page.waitForFunction(()=>!document.querySelector('#fluffy-cursor-overlay')&&!document.querySelector('.fluffy-cursor-native-hidden'));
    await popup.locator('#enabled').check();await popup.locator('#preset').selectOption('neon');await popup.locator('#save').click();
    await page.bringToFront();await page.locator('textarea').first().focus();await page.locator('.fluffy-cursor-native-hidden').waitFor();
    await fs.mkdir(path.join(__dirname,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'test-results/editor.png')});
    await popup.screenshot({path:path.join(__dirname,'test-results/settings.png'),fullPage:true});
    const settings=await popup.evaluate(async()=> (await chrome.storage.local.get('fluffyCursor')).fluffyCursor);
    assert.equal(settings.color,'#00E5FF');assert.equal(settings.glow,0.55);
    assert.deepEqual(errors,[]);
    console.log('Real unpacked-extension checks passed: scoped content script, local settings, live white color, motion, notebook ancestor scrolling, cell switching, disable/enable and presets.');
  } finally {await context.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
