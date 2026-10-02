'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const patcher = require('./patcher');
const physics = require('./physics');
const settingsPanel = require('./settings-panel');
let busy = false;
function reloadNotice(message) {
  vscode.window.showInformationMessage(message, 'Reload Window').then(choice => {
    if (choice === 'Reload Window') return vscode.commands.executeCommand('workbench.action.reloadWindow');
  });
}
function activate(context) {
  const output = vscode.window.createOutputChannel('Fluffy Cursor');
  context.subscriptions.push(output);
  let panel, saving = false;
  const readSettings = () => {
    const settings = vscode.workspace.getConfiguration('fluffyCursor');
    return physics.options(Object.fromEntries(Object.keys(physics.defaults).map(key => [key, settings.get(key)])));
  };
  async function run(action) {
    if (busy) return false;
    busy = true;
    try {
      const html = await patcher.locate(vscode.env.appRoot);
      if (action === 'install') {
        const config = readSettings();
        await patcher.install(html, context.extensionPath, config);
        output.appendLine('Installed full effect in ' + html);
        await reloadNotice('Fluffy Cursor installed. Reload to apply the effect. VS Code updates may require reinstalling it.');
      } else {
        const removed = await patcher.uninstall(html);
        await reloadNotice(removed ? 'Fluffy Cursor removed. Reload to restore the original caret.' : 'No Fluffy Cursor injection exists in this VS Code version.');
      }
      return true;
    } catch (error) {
      output.appendLine(error.stack || String(error));
      let message = error.message;
      if (['EACCES', 'EPERM', 'EROFS'].includes(error.code)) message = 'The VS Code installation is not writable. Use a user-owned/portable installation. On Linux, system packages and read-only Flatpak/Snap installs may prevent full effects. No automatic privilege escalation is performed.';
      vscode.window.showErrorMessage('Fluffy Cursor: ' + message);
      return false;
    } finally { busy = false; }
  }
  function openSettings() {
    if (panel) { panel.reveal(); return; }
    const resources = vscode.Uri.joinPath(context.extensionUri, 'src');
    panel = vscode.window.createWebviewPanel('fluffyCursor.settings', 'Fluffy Cursor', vscode.ViewColumn.One, { enableScripts: true, localResourceRoots: [resources] });
    const current = panel;
    current.webview.html = settingsPanel.html(current.webview, name => current.webview.asWebviewUri(vscode.Uri.joinPath(resources, name)).toString());
    current.onDidDispose(() => { if (panel === current) panel = undefined; }, null, context.subscriptions);
    current.webview.onDidReceiveMessage(async message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'ready') {
        let installed = false;
        try { installed = (await fs.readFile(await patcher.locate(vscode.env.appRoot), 'utf8')).includes(patcher.START); } catch (_) { /* Report an uninstalled effect in unavailable environments. */ }
        current.webview.postMessage({ type: 'settings', config: readSettings(), installed });
      } else if (message.type === 'save' && !saving && !busy) {
        saving = true;
        try {
          const config = settingsPanel.validate(message.config), settings = vscode.workspace.getConfiguration('fluffyCursor');
          for (const [key, value] of Object.entries(config)) await settings.update(key, value, vscode.ConfigurationTarget.Global);
          const applied = message.apply === true ? await run('install') : false;
          current.webview.postMessage({ type: 'result', error: message.apply === true && !applied,
            message: message.apply === true ? applied ? 'Effect updated. Reload the window to use your new settings.' : 'Settings saved, but the effect could not be updated. Check the error notification or Fluffy Cursor output.' : 'Settings saved. Use Save & apply when you are ready to update the editor.' });
        } catch (error) { current.webview.postMessage({ type: 'result', error: true, message: error.message }); }
        finally { saving = false; }
      } else if (message.type === 'save') current.webview.postMessage({ type: 'result', error: true, message: 'Another operation is in progress. Try again when it finishes.' });
      else if (message.type === 'remove' && !saving) await run('uninstall');
      else if (message.type === 'advanced') await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:GxnsVl.fluffy-cursor');
      else if (message.type === 'source') await vscode.env.openExternal(vscode.Uri.parse('https://github.com/GxnsVl/FluffyCursor'));
    }, null, context.subscriptions);
    context.subscriptions.push(current);
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('fluffyCursor.install', () => run('install')),
    vscode.commands.registerCommand('fluffyCursor.uninstall', () => run('uninstall')),
    vscode.commands.registerCommand('fluffyCursor.settings', openSettings),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (!saving && event.affectsConfiguration('fluffyCursor')) vscode.window.showInformationMessage('Open Fluffy Cursor settings and use Save & apply, then reload to apply the new settings.');
    })
  );
  // New VS Code versions use a new appRoot; do not silently patch a new installation.
  patcher.locate(vscode.env.appRoot).then(html => fs.readFile(html, 'utf8')).then(html => {
    if (!html.includes(patcher.START)) output.appendLine('Full effect is not installed in this VS Code version. Use Fluffy Cursor: Install / Update Full Effect.');
  }).catch(error => output.appendLine(error.message));
}
module.exports = { activate };
