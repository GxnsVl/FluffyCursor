'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const physics = require('./physics');
const START = '<!-- fluffy-cursor:start -->';
const END = '<!-- fluffy-cursor:end -->';
const SCRIPT = 'fluffy-cursor.js';
const BACKUP = 'fluffy-cursor.backup.json';
function strip(html) {
  const start = html.indexOf(START), end = html.indexOf(END);
  if (start < 0 && end < 0) return html;
  if (start < 0 || end < start || html.indexOf(START, start + START.length) >= 0 || html.indexOf(END, end + END.length) >= 0) {
    throw new Error('Fluffy Cursor markers are incomplete. Restore VS Code before installing the effect.');
  }
  return html.slice(0, start) + html.slice(end + END.length);
}
function patch(html) {
  const clean = strip(html);
  if (/neovide-cursor|jelly-cursor|editor-cursor-animation/i.test(clean)) {
    throw new Error('Another custom cursor effect (Neovide/Jelly Cursor) is already installed. Disable or remove that effect using its original extension, reload VS Code, then run this command again.');
  }
  const closing = clean.lastIndexOf('</html>');
  if (closing < 0 || !/workbench[^"']*\.js/.test(clean)) throw new Error('Unrecognized VS Code workbench HTML. No files were changed.');
  return clean.slice(0, closing) + START + '<script src="./' + SCRIPT + '"></script>' + END + clean.slice(closing);
}
function hash(content) { return crypto.createHash('sha256').update(content).digest('hex'); }
function validateBackup(backup) {
  if (backup && (typeof backup.html !== 'string' || hash(backup.html) !== backup.sha256)) {
    throw new Error('The Fluffy Cursor backup is corrupt. No workbench HTML was changed. Restore VS Code before continuing.');
  }
}
async function atomicWrite(file, content) {
  const temporary = file + '.fluffy-' + crypto.randomUUID() + '.tmp';
  try { await fs.writeFile(temporary, content, { flag: 'wx' }); await fs.rename(temporary, file); }
  finally { await fs.rm(temporary, { force: true }); }
}
async function locate(appRoot) {
  const candidates = ['out/vs/code/electron-browser/workbench/workbench.html', 'out/vs/code/electron-sandbox/workbench/workbench.html'];
  for (const relative of candidates) {
    const candidate = path.join(appRoot, relative);
    try { await fs.access(candidate); return candidate; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('Desktop VS Code workbench was not found. Browser-based VS Code is not supported.');
}
async function install(htmlFile, extensionRoot, input) {
  const html = await fs.readFile(htmlFile, 'utf8'), clean = strip(html), patched = patch(html);
  const directory = path.dirname(htmlFile), backupFile = path.join(directory, BACKUP), scriptFile = path.join(directory, SCRIPT);
  let backup;
  try { backup = JSON.parse(await fs.readFile(backupFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  validateBackup(backup);
  if (backup && hash(clean) !== backup.sha256) {
    throw new Error('VS Code or another customization changed the workbench since installation. Remove the old Fluffy Cursor effect first, then reinstall.');
  }
  if (!backup) {
    // Preserve pre-existing customizations byte-for-byte; never back up our own injection.
    backup = { html: clean, sha256: hash(clean) };
    await atomicWrite(backupFile, JSON.stringify(backup));
  }
  const config = JSON.stringify(physics.options(input)).replace(/</g, '\\u003c');
  const [model, renderer] = await Promise.all(['physics.js', 'renderer.js'].map(name => fs.readFile(path.join(extensionRoot, 'src', name), 'utf8')));
  let previous;
  try { previous = await fs.readFile(scriptFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && !previous.toString().startsWith('/* Fluffy Cursor managed renderer */')) throw new Error('An unrelated fluffy-cursor.js already exists. No workbench HTML was changed.');
  try {
    await atomicWrite(scriptFile, '/* Fluffy Cursor managed renderer */\nwindow.__FLUFFY_CURSOR_CONFIG__ = ' + config + ';\n' + model + '\n' + renderer);
    await atomicWrite(htmlFile, patched);
  } catch (error) {
    if (previous) await atomicWrite(scriptFile, previous);
    else await fs.rm(scriptFile, { force: true });
    throw error;
  }
  return { htmlFile, backupFile };
}
async function uninstall(htmlFile) {
  const html = await fs.readFile(htmlFile, 'utf8'), clean = strip(html), directory = path.dirname(htmlFile);
  if (clean === html) return false;
  let backup;
  try { backup = JSON.parse(await fs.readFile(path.join(directory, BACKUP), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  validateBackup(backup);
  // If other tools edited the page later, remove only our marked section.
  const restored = backup && hash(clean) === backup.sha256 ? backup.html : clean;
  await atomicWrite(htmlFile, restored);
  const scriptFile = path.join(directory, SCRIPT);
  const script = await fs.readFile(scriptFile, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
  if (script.startsWith('/* Fluffy Cursor managed renderer */')) await fs.rm(scriptFile, { force: true });
  await fs.rm(path.join(directory, BACKUP), { force: true });
  return true;
}
module.exports = { strip, patch, locate, install, uninstall, START, END };
