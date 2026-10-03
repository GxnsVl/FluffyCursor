'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
async function build() {
  const firefox = process.argv.includes('--firefox');
  const output = path.join(__dirname,firefox ? 'dist-firefox' : 'dist'); await fs.mkdir(output,{recursive:true});
  const renderer = await fs.readFile(path.join(__dirname,'../vscode/src/renderer.js'),'utf8');
  if (!renderer.startsWith('(function () {') || !renderer.trim().endsWith('})();')) throw new Error('Shared renderer shape changed; review browser adapter.');
  const adapted = renderer.replace('(function () {','window.FluffyCursorStart = function (input) {').replace('const config = model.options(window.__FLUFFY_CURSOR_CONFIG__);','const config = model.options(input);').replace('if (editor && (event.target === document || editor.contains(event.target)))','if (editor)').replace(/\}\)\(\);\s*$/,'};\n');
  await fs.writeFile(path.join(output,'renderer.js'),adapted);
  await fs.copyFile(path.join(__dirname,'../vscode/src/physics.js'),path.join(output,'physics.js'));
  await fs.copyFile(path.join(__dirname,'../LICENSE'),path.join(output,'LICENSE'));
  await fs.cp(path.join(__dirname,'icons'),path.join(output,'icons'),{recursive:true});
  for(const name of ['manifest.json','content.js','popup.html','popup.css','popup.js','README.md'])await fs.copyFile(path.join(__dirname,name),path.join(output,name));
  if (firefox) {
    const manifest = JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8'));
    delete manifest.key; delete manifest.minimum_chrome_version;
    manifest.browser_specific_settings = { gecko: { id: 'fluffy-cursor-colab@GxnsVl', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } }, gecko_android: { strict_min_version: '142.0' } };
    await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  }
  console.log('Browser extension built: '+output);
}
build().catch(error=>{console.error(error);process.exitCode=1;});
