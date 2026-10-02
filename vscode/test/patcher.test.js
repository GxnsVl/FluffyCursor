'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const patcher = require('../src/patcher');
const HTML = '\uFEFF<!DOCTYPE html>\r\n<html><head></head><body></body><script src="./workbench.js" type="module"></script></html>\r\n';
const ROOT = path.resolve(__dirname, '..');
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fluffy-cursor-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const html = path.join(directory, 'workbench.html'); await fs.writeFile(html, HTML);
  return { directory, html };
}
test('install is idempotent and removal restores original HTML byte-for-byte', async t => {
  const { html, directory } = await fixture(t);
  await patcher.install(html, ROOT, { color: '#FF00FF' });
  const firstInstall = await fs.readFile(html, 'utf8');
  await patcher.install(html, ROOT, { width: 3 });
  const changed = await fs.readFile(html, 'utf8');
  assert.notEqual(changed, firstInstall, 'renderer URL changes so reloading cannot reuse stale settings');
  assert.equal(changed.split(patcher.START).length, 2);
  assert.match(await fs.readFile(path.join(directory, 'fluffy-cursor.js'), 'utf8'), /"width":3/);
  assert.equal(await patcher.uninstall(html), true);
  assert.equal(await fs.readFile(html, 'utf8'), HTML);
  assert.equal(await patcher.uninstall(html), false);
  await assert.rejects(fs.access(path.join(directory, 'fluffy-cursor.js')));
});
test('removal preserves customizations added after installation', async t => {
  const { html } = await fixture(t); await patcher.install(html, ROOT, {});
  await fs.appendFile(html, '<!-- unrelated later change -->');
  await patcher.uninstall(html);
  assert.equal(await fs.readFile(html, 'utf8'), HTML + '<!-- unrelated later change -->');
});
test('install refuses conflicting cursor renderers without changing the HTML', async t => {
  const { html } = await fixture(t);
  const original = HTML + '<script src="./jelly-cursor.js"></script>';
  await fs.writeFile(html, original);
  await assert.rejects(patcher.install(html, ROOT, {}), /Another custom cursor effect/);
  assert.equal(await fs.readFile(html, 'utf8'), original);
});
test('updating refuses concurrent workbench changes rather than overwriting them', async t => {
  const { html } = await fixture(t); await patcher.install(html, ROOT, {});
  await fs.appendFile(html, '<!-- changed -->');
  const original = await fs.readFile(html, 'utf8');
  await assert.rejects(patcher.install(html, ROOT, {}), /changed the workbench/);
  assert.equal(await fs.readFile(html, 'utf8'), original);
});
test('unknown markup and incomplete markers are rejected', () => {
  assert.throws(() => patcher.patch('<html></html>'), /Unrecognized/);
  assert.throws(() => patcher.strip(HTML + patcher.START), /incomplete/);
});
test('a corrupt backup cannot overwrite the workbench during removal', async t => {
  const { html, directory } = await fixture(t); await patcher.install(html, ROOT, {});
  const backupFile = path.join(directory, 'fluffy-cursor.backup.json');
  const backup = JSON.parse(await fs.readFile(backupFile, 'utf8')); backup.html = 'corrupt';
  await fs.writeFile(backupFile, JSON.stringify(backup));
  const before = await fs.readFile(html, 'utf8');
  await assert.rejects(patcher.uninstall(html), /backup is corrupt/);
  assert.equal(await fs.readFile(html, 'utf8'), before);
});
test('supports modern appRoot and both desktop workbench layouts', async t => {
  const { directory } = await fixture(t);
  const workbench = path.join(directory, 'out/vs/code/electron-sandbox/workbench/workbench.html');
  await fs.mkdir(path.dirname(workbench), { recursive: true }); await fs.writeFile(workbench, HTML);
  assert.equal(await patcher.locate(directory), workbench);
});
