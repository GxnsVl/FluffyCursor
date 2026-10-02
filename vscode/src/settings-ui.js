(function () {
  'use strict';
  const api = acquireVsCodeApi(), model = window.FluffyCursorPhysics;
  const restored = api.getState();
  const keys = Object.keys(model.defaults), form = document.getElementById('settings'), status = document.getElementById('status');
  const element = id => document.getElementById(id);
  let config = { ...model.defaults }, frame = 0, previous = 0, started = 0, landing = -1, dx = 0, dy = 0, moving = false;
  const state = model.state(30, 30), height = 22;
  const presets = {
    balanced: model.defaults,
    calm: { ...model.defaults, color: '#B0BEC5', stiffness: 0.18, damping: 0.65, stretch: 0.45, glow: 0.10 },
    neon: { ...model.defaults, color: '#00E5FF', glow: 0.55, stretch: 1.15 },
    snappy: { ...model.defaults, stiffness: 0.45, damping: 0.60, glow: 0.20, stretch: 0.75 }
  };
  function read() {
    return Object.fromEntries(keys.map(key => [key, typeof model.defaults[key] === 'boolean' ? element(key).checked : typeof model.defaults[key] === 'number' ? Number(element(key).value) : element(key).value.trim()]));
  }
  function update() {
    config = model.options(read());
    keys.filter(key => typeof config[key] === 'number').forEach(key => element(key + '-value').textContent = config[key].toFixed(key === 'width' ? 1 : 2));
    element('color').disabled = element('color-picker').disabled = config.useThemeColor;
    if (/^#[\da-f]{6}$/i.test(element('color').value)) element('color-picker').value = element('color').value;
    api.setState(read()); draw(performance.now());
  }
  function load(settings) {
    keys.forEach(key => { if (typeof model.defaults[key] === 'boolean') element(key).checked = settings[key]; else element(key).value = settings[key]; });
    update();
  }
  function draw(now) {
    if (moving) {
      model.step(state, config, Math.min(0.032, (now - (previous || now)) / 1000));
      if (model.settled(state) || now - started >= 220) { model.snap(state); moving = false; landing = config.landingInertia ? now : -1; }
    }
    previous = now;
    const progress = landing < 0 ? 1 : (now - landing) / 260;
    const points = model.polygon(state, config.width, height, config.stretch, model.recoil(progress, height, 1, dx, dy));
    const path = points.map(([x, y], i) => (i ? 'L' : 'M') + x + ',' + y).join('') + 'Z';
    const color = config.useThemeColor ? getComputedStyle(document.body).getPropertyValue('--vscode-editorCursor-foreground').trim() || '#FFFFFF' : config.color;
    for (const name of ['preview-caret','preview-halo']) { element(name).setAttribute('d', path); element(name).setAttribute('fill', color); element(name).setAttribute('visibility', config.enabled ? 'visible' : 'hidden'); }
    element('preview-halo').setAttribute('opacity', config.glow);
    if ((moving || progress < 1) && !document.hidden && !frame) frame = requestAnimationFrame(time => { frame = 0; draw(time); });
    else if (!moving && progress >= 1) previous = 0;
  }
  function jump(x, y) {
    const box = element('preview').getBoundingClientRect();
    dx = x - state.targetX; dy = y - state.targetY;
    state.targetX = Math.max(5, Math.min(box.width - 12, x)); state.targetY = Math.max(5, Math.min(box.height - height - 5, y));
    state.jumpDistance = Math.hypot(dx, dy); started = performance.now(); landing = -1; moving = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { model.snap(state); moving = false; }
    draw(started);
  }
  form.addEventListener('input', event => { if (event.target.id === 'preset') return; element('preset').value = 'custom'; update(); status.textContent = 'Preview updated. Save & apply to update the editor after a reload.'; });
  element('preset').addEventListener('change', () => { if (presets[element('preset').value]) load(presets[element('preset').value]); });
  element('color-picker').addEventListener('input', () => { element('color').value = element('color-picker').value.toUpperCase(); update(); });
  function save(apply) {
    if (!form.reportValidity()) return;
    status.className = ''; status.textContent = apply ? 'Saving settings and updating the effect…' : 'Saving settings…';
    api.postMessage({ type: 'save', config: read(), apply });
  }
  form.addEventListener('submit', event => { event.preventDefault(); save(true); });
  element('save').addEventListener('click', () => save(false));
  element('remove').addEventListener('click', () => api.postMessage({ type: 'remove' }));
  element('source').addEventListener('click', () => api.postMessage({ type: 'source' }));
  element('advanced').addEventListener('click', () => api.postMessage({ type: 'advanced' }));
  element('try').addEventListener('click', () => jump(state.targetX < 100 ? 240 : 30, state.targetY < 100 ? 140 : 30));
  element('preview').addEventListener('click', event => { const box = element('preview').getBoundingClientRect(); jump(event.clientX - box.left, event.clientY - box.top); });
  element('preview').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); element('try').click(); } });
  window.addEventListener('message', event => {
    if (event.data.type === 'settings') { load(restored || event.data.config); status.textContent = event.data.installed ? 'Full effect is installed. Changes require Save & apply and a reload.' : 'Full effect is not installed in this editor version. Save & apply will install it.'; }
    if (event.data.type === 'result') { status.textContent = event.data.message; status.className = event.data.error ? 'error' : ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else if (!document.hidden) draw(performance.now()); });
  load(restored || model.defaults); api.postMessage({ type: 'ready' });
})();
