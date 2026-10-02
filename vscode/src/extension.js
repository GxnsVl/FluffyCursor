'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const patcher = require('./patcher');
const physics = require('./physics');
let busy = false;
async function reloadNotice(message) {
  const choice = await vscode.window.showInformationMessage(message, 'Reload Window');
  if (choice === 'Reload Window') await vscode.commands.executeCommand('workbench.action.reloadWindow');
}
function activate(context) {
  const output = vscode.window.createOutputChannel('Fluffy Cursor');
  context.subscriptions.push(output);
  async function run(action) {
    if (busy) return;
    busy = true;
    try {
      const html = await patcher.locate(vscode.env.appRoot);
      if (action === 'install') {
        const settings = vscode.workspace.getConfiguration('fluffyCursor');
        const config = physics.options(Object.fromEntries(Object.keys(physics.defaults).map(key => [key, settings.get(key)])));
        await patcher.install(html, context.extensionPath, config);
        output.appendLine('Installed full effect in ' + html);
        await reloadNotice('Fluffy Cursor installed. Reload to apply the effect. VS Code updates may require reinstalling it.');
      } else {
        const removed = await patcher.uninstall(html);
        await reloadNotice(removed ? 'Fluffy Cursor removed. Reload to restore the original caret.' : 'No Fluffy Cursor injection exists in this VS Code version.');
      }
    } catch (error) {
      output.appendLine(error.stack || String(error));
      let message = error.message;
      if (['EACCES', 'EPERM', 'EROFS'].includes(error.code)) message = 'The VS Code installation is not writable. Use a user-owned/portable installation. On Linux, system packages and read-only Flatpak/Snap installs may prevent full effects. No automatic privilege escalation is performed.';
      vscode.window.showErrorMessage('Fluffy Cursor: ' + message);
    } finally { busy = false; }
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('fluffyCursor.install', () => run('install')),
    vscode.commands.registerCommand('fluffyCursor.uninstall', () => run('uninstall')),
    vscode.commands.registerCommand('fluffyCursor.settings', () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GxnsVl.fluffy-cursor')),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('fluffyCursor')) vscode.window.showInformationMessage('Run Fluffy Cursor: Install / Update Full Effect, then reload to apply the new settings.');
    })
  );
  // New VS Code versions use a new appRoot; do not silently patch a new installation.
  patcher.locate(vscode.env.appRoot).then(html => fs.readFile(html, 'utf8')).then(html => {
    if (!html.includes(patcher.START)) output.appendLine('Full effect is not installed in this VS Code version. Use Fluffy Cursor: Install / Update Full Effect.');
  }).catch(error => output.appendLine(error.message));
}
module.exports = { activate };
