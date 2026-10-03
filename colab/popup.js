(function () {
  'use strict';
  const model = window.FluffyCursorPhysics, keys = Object.keys(model.defaults), element = id => document.getElementById(id);
  let config = { ...model.defaults }, frame = 0, previous = 0, started = 0, landing = -1, moving = false, dx = 0, dy = 0;
  const state = model.state(15, 15), height = 18;
  const presets = {
    balanced: model.defaults,
    calm: { ...model.defaults, color: '#B0BEC5', stiffness: 0.18, damping: 0.65, stretch: 0.45, glow: 0.1 },
    neon: { ...model.defaults, glow: 0.55, stretch: 1.15 },
    snappy: { ...model.defaults, stiffness: 0.45, damping: 0.6, stretch: 0.75, glow: 0.2 }
  };
  function read() {
    return Object.fromEntries(keys.map(key => [key, typeof model.defaults[key] === 'boolean' ? element(key).checked : typeof model.defaults[key] === 'number' ? Number(element(key).value) : element(key).value.trim()]));
  }
  function update() {
    config = model.options(read());
    keys.filter(key => typeof config[key] === 'number').forEach(key => { element(key + '-value').textContent = config[key].toFixed(key === 'width' ? 1 : 2); });
    element('color').disabled = element('color-picker').disabled = config.useThemeColor;
    if (/^#[\da-f]{6}$/i.test(element('color').value)) element('color-picker').value = element('color').value;
    draw(performance.now());
  }
  function load(settings) {
    const options = model.options(settings);
    keys.forEach(key => { if (typeof options[key] === 'boolean') element(key).checked = options[key]; else element(key).value = options[key]; }); update();
  }
  function draw(now) {
    if (moving) {
      model.step(state, config, Math.min(0.032, Math.max(0, now - (previous || now)) / 1000));
      if (model.settled(state) || now - started >= 220) { model.snap(state); moving = false; landing = config.landingInertia ? now : -1; }
    }
    previous = now;
    const progress = landing < 0 ? 1 : (now - landing) / 260;
    const path = model.polygon(state, config.width, height, config.stretch, model.recoil(progress, height, 1, dx, dy)).map(([x,y],i) => (i?'L':'M')+x+','+y).join('')+'Z';
    for (const id of ['caret-path','glow-path']) { element(id).setAttribute('d',path); element(id).setAttribute('fill',config.useThemeColor?'#FFFFFF':config.color); element(id).setAttribute('visibility',config.enabled?'visible':'hidden'); }
    element('glow-path').setAttribute('opacity',config.glow);
    if ((moving || progress < 1) && !document.hidden && !frame) frame = requestAnimationFrame(time => { frame = 0; draw(time); });
    else if (!moving && progress >= 1) previous = 0;
  }
  function jump(x,y) {
    dx=x-state.targetX;dy=y-state.targetY;state.targetX=x;state.targetY=y;state.jumpDistance=Math.hypot(dx,dy);started=performance.now();moving=true;landing=-1;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { model.snap(state); moving=false; }
    draw(started);
  }
  element('settings').addEventListener('input', event => { if(event.target.id==='preset')return;element('preset').value='custom';update();element('status').textContent='Preview updated. Save to apply to open Colab tabs.'; });
  element('preset').addEventListener('change', () => { if(presets[element('preset').value])load(presets[element('preset').value]); });
  element('color-picker').addEventListener('input', () => { element('color').value=element('color-picker').value.toUpperCase();update(); });
  element('settings').addEventListener('submit', async event => {
    event.preventDefault(); element('save').disabled=true;
    try {
      const settings=read();if(!/^#[\da-f]{6}$/i.test(settings.color))throw new Error('Choose a color such as #FFFFFF.');
      await chrome.storage.local.set({fluffyCursor:model.options(settings)});
      element('status').className='';element('status').textContent='Applied to open Colab tabs. No reload needed.';
    } catch(error) { element('status').className='error';element('status').textContent=error.message; }
    finally { element('save').disabled=false; }
  });
  element('preview').addEventListener('click', event => {const box=element('preview').getBoundingClientRect();jump(Math.max(5,Math.min(box.width-12,event.clientX-box.left)),Math.max(5,Math.min(box.height-height-5,event.clientY-box.top)));});
  element('preview').addEventListener('keydown', event => {if(event.key==='Enter'||event.key===' '){event.preventDefault();jump(state.targetX<100?220:15,state.targetY<50?85:15);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else if(!document.hidden)draw(performance.now());});
  element('save').disabled=true;
  chrome.storage.local.get('fluffyCursor').then(result=>{load(result.fluffyCursor||{});element('save').disabled=false;element('status').textContent='Settings are stored locally and apply only to Colab.';}).catch(error=>{element('status').className='error';element('status').textContent='Could not read settings: '+error.message;});
})();
