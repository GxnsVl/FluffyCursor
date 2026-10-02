'use strict';
const crypto = require('node:crypto');
const physics = require('./physics');
function validate(input) {
  if (!input || typeof input !== 'object' || !/^#[\da-f]{6}$/i.test(input.color || '')) throw new Error('Choose a color or enter a six-digit hex value, such as #FFFFFF.');
  for (const key of ['width', 'stiffness', 'damping', 'stretch', 'glow']) if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) throw new Error('Enter a valid value for ' + key + '.');
  return physics.options(input);
}
function html(webview, uri) {
  const nonce = crypto.randomBytes(18).toString('base64');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${uri('settings.css')}"><title>Fluffy Cursor settings</title></head><body>
  <main><header><p class="eyebrow">FLUFFY CURSOR · OPEN SOURCE</p><h1>Make the caret feel right.</h1><p>Choose a look, try the motion, and apply it to your editor.</p></header>
  <aside class="disclosure"><strong>This version modifies editor interface files.</strong><p>Full effects add a local script to the desktop VS Code / Code OSS workbench. Applying changes requires write access and a window reload. Updates may remove the effect; the editor may show an integrity warning. Use “Remove effect” before uninstalling the extension.</p></aside>
  <div class="layout"><section class="card"><h2>Live preview</h2><p>Click inside the preview to move the caret. This preview does not change your editor.</p>
  <div id="preview" tabindex="0" role="button" aria-label="Caret motion preview. Click to move or press Enter to try a jump."><pre>const feeling = "fluffy";\n\nfunction makeItYours() {\n  return aLittleGlow;\n}</pre><svg id="preview-svg" aria-hidden="true"><defs><filter id="preview-glow"><feGaussianBlur stdDeviation="2"/></filter></defs><path id="preview-halo" filter="url(#preview-glow)"/><path id="preview-caret"/></svg></div>
  <button id="try">Try a jump</button><p class="hint">Typing uses a lighter effect. Multiple carets snap to their actual positions.</p></section>
  <form id="settings" class="card"><h2>Appearance & motion</h2>
  <label>Starting point<select id="preset"><option value="custom">Custom</option><option value="balanced">Balanced</option><option value="calm">Calm</option><option value="neon">Neon</option><option value="snappy">Snappy</option></select></label>
  <label class="toggle"><input id="enabled" type="checkbox"> Enable Fluffy Cursor</label>
  <label class="toggle"><input id="useThemeColor" type="checkbox"> Match the editor theme color</label>
  <label>Custom color<div class="color-row"><input id="color-picker" type="color" aria-label="Choose caret color"><input id="color" type="text" pattern="#[0-9a-fA-F]{6}" maxlength="7" placeholder="#FFFFFF" aria-label="Caret hex color" required></div><span class="hint">Caret and glow use the same color. Turn off theme matching to use this color.</span></label>
  ${[['width','Caret width','1','6','0.5','Thin at rest; slightly wider during jumps.'],['stiffness','Responsiveness','0.05','0.8','0.01','Higher feels quicker and sharper.'],['damping','Spring retention','0.3','0.95','0.01','Controls how motion carries forward.'],['stretch','Stretch','0','1.5','0.05','A short shape stretched opposite the movement.'],['glow','Glow','0','0.8','0.01','A soft halo; set to zero for a clean line.']].map(([key,label,min,max,step,hint]) => `<label>${label}<output for="${key}" id="${key}-value"></output><input id="${key}" type="range" min="${min}" max="${max}" step="${step}"><span class="hint">${hint}</span></label>`).join('')}
  <label class="toggle"><input id="landingInertia" type="checkbox"> One gentle forward / back landing recoil</label>
  <div class="actions"><button id="apply" type="submit">Save & apply to editor</button><button id="save" type="button" class="secondary">Save only</button></div>
  <p id="status" role="status" aria-live="polite">Loading your settings…</p></form></div>
  <section class="card about"><h2>Open source, by design.</h2><p>Fluffy Cursor is an MIT-licensed project. You can inspect, modify, and redistribute its source. No telemetry or remote rendering scripts are included.</p>
  <p>The VS Code / Code OSS edition uses JavaScript, SVG, DOM observers and requestAnimationFrame with elapsed-time spring physics. The settings page uses the official VS Code webview API. The JetBrains edition uses Kotlin, Swing, and IntelliJ Platform editor APIs; it does not patch IDE installation files.</p>
  <div class="actions"><button id="source" class="secondary">Source & installation guide</button><button id="advanced" class="secondary">Advanced settings</button><button id="remove" class="secondary">Remove effect</button></div></section></main>
  <script nonce="${nonce}" src="${uri('physics.js')}"></script><script nonce="${nonce}" src="${uri('settings-ui.js')}"></script></body></html>`;
}
module.exports = { html, validate };
