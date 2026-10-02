'use strict';
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
async function run() {
  const extension = vscode.extensions.getExtension('GxnsVl.fluffy-cursor');
  assert.ok(extension, 'development extension is registered');
  await extension.activate();
  assert.ok(extension.isActive);
  const commands = await vscode.commands.getCommands();
  for (const command of ['fluffyCursor.install', 'fluffyCursor.uninstall', 'fluffyCursor.settings']) assert.ok(commands.includes(command));
  const settings = vscode.workspace.getConfiguration('fluffyCursor');
  assert.equal(settings.get('width'), 2); assert.equal(settings.get('color'), '#00E5FF');
  const document = await vscode.workspace.openTextDocument({ content: 'Fluffy Cursor extension host test\n', language: 'plaintext' });
  await vscode.window.showTextDocument(document);
  await fs.writeFile(path.join(extension.extensionPath, 'test-results/extension-host.json'), JSON.stringify({
    vscode: vscode.version, activated: extension.isActive, commands: 3, defaults: true, documentOpened: true
  }, null, 2));
}
module.exports = { run };
