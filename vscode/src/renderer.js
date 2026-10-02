(function () {
  'use strict';
  if (window.__fluffyCursorRuntime) window.__fluffyCursorRuntime.dispose();
  const model = window.FluffyCursorPhysics;
  const config = model.options(window.__FLUFFY_CURSOR_CONFIG__);
  if (!config.enabled) return;
  const NS = 'http://www.w3.org/2000/svg', HIDDEN = 'fluffy-cursor-native-hidden';
  let editor = null, states = new Map(), frame = 0, previousTime = 0;
  let lastTyping = -Infinity, windowFocused = true, snapNext = false, disposed = false;
  let previousCount = 0;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('id', 'fluffy-cursor-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;overflow:hidden;';
  const style = document.createElement('style');
  style.textContent = `.${HIDDEN} .cursors-layer .cursor { opacity:0 !important; animation:none !important; transition:none !important; }`;
  const defs = document.createElementNS(NS, 'defs');
  const clip = document.createElementNS(NS, 'clipPath');
  clip.id = 'fluffy-cursor-clip';
  const clipRect = document.createElementNS(NS, 'rect'); clip.appendChild(clipRect);
  const filter = document.createElementNS(NS, 'filter');
  filter.id = 'fluffy-cursor-glow';
  for (const [name, value] of Object.entries({ x: '-100%', y: '-100%', width: '300%', height: '300%' })) filter.setAttribute(name, value);
  const blur = document.createElementNS(NS, 'feGaussianBlur'); blur.setAttribute('stdDeviation', '2'); filter.appendChild(blur);
  defs.append(clip, filter); svg.appendChild(defs);
  const layer = document.createElementNS(NS, 'g'); layer.setAttribute('clip-path', 'url(#fluffy-cursor-clip)'); svg.appendChild(layer);
  document.documentElement.append(style, svg);
  function wake() { if (!disposed && !frame) frame = requestAnimationFrame(tick); }
  function clear() {
    if (editor) editor.classList.remove(HIDDEN);
    editor = null; states.clear(); layer.replaceChildren(); observer.disconnect();
    previousTime = 0; previousCount = 0;
  }
  function focusedEditor() {
    if (!windowFocused || document.hidden) return null;
    const element = document.activeElement;
    if (!element || !element.matches('textarea.inputarea, .inputarea, .native-edit-context, [contenteditable="true"]')) return null;
    return element.closest('.monaco-editor');
  }
  function capture() {
    const nextEditor = focusedEditor();
    if (editor !== nextEditor) {
      clear(); editor = nextEditor; snapNext = true;
      if (editor) observer.observe(editor, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
    if (!editor || !editor.isConnected) return [];
    const viewport = (editor.querySelector('.overflow-guard') || editor).getBoundingClientRect();
    clipRect.setAttribute('x', Math.max(0, viewport.left)); clipRect.setAttribute('y', Math.max(0, viewport.top));
    clipRect.setAttribute('width', Math.max(0, Math.min(innerWidth, viewport.right) - Math.max(0, viewport.left)));
    clipRect.setAttribute('height', Math.max(0, Math.min(innerHeight, viewport.bottom) - Math.max(0, viewport.top)));
    // Read all layout positions before writing any SVG path attributes.
    const nodes = Array.from(editor.querySelectorAll('.cursors-layer .cursor'));
    if (nodes.length > 100) return []; // Keep all native cursors for unusually large selections.
    return nodes.flatMap(node => {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < viewport.top || rect.top > viewport.bottom ||
          rect.right < viewport.left || rect.left > viewport.right || getComputedStyle(node).display === 'none') return [];
      let color = config.color;
      if (config.useThemeColor) {
        color = getComputedStyle(editor).getPropertyValue('--vscode-editorCursor-foreground').trim() || getComputedStyle(node).backgroundColor;
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') color = config.color;
      }
      return [{ node, x: rect.left + (rect.width - config.width) / 2, y: rect.top, height: rect.height, color }];
    });
  }
  function create(data) {
    const s = model.state(data.x, data.y);
    Object.assign(s, { height: data.height, typing: false, directionX: 0, directionY: 0, started: 0, landing: -1, moving: false });
    s.group = document.createElementNS(NS, 'g');
    s.glow = document.createElementNS(NS, 'path'); s.glow.setAttribute('filter', 'url(#fluffy-cursor-glow)');
    s.glow.setAttribute('opacity', config.glow); s.glow.setAttribute('stroke-width', '2');
    s.body = document.createElementNS(NS, 'path');
    s.group.append(s.glow, s.body); layer.appendChild(s.group);
    states.set(data.node, s); return s;
  }
  function tick(now) {
    try { draw(now); }
    catch (error) {
      // Fail open after internal markup changes: never leave the native caret hidden.
      if (frame) cancelAnimationFrame(frame);
      frame = 0; clear();
      console.warn('Fluffy Cursor stopped rendering and restored the native caret.', error);
    }
  }
  function draw(now) {
    frame = 0;
    const targets = capture(), live = new Set(targets.map(target => target.node));
    // Monaco reuses/reorders cursor nodes as selections multiply or merge.
    // Snap multicarets and count transitions instead of animating unrelated identities.
    snapNext ||= targets.length > 1 || targets.length !== previousCount;
    previousCount = targets.length;
    for (const [node, s] of states) if (!live.has(node)) { s.group.remove(); states.delete(node); }
    const seconds = Math.min(0.032, Math.max(0, (now - (previousTime || now)) / 1000));
    previousTime = now;
    let active = false;
    for (const data of targets) {
      const s = states.get(data.node) || create(data);
      const changed = Math.abs(s.targetX - data.x) + Math.abs(s.targetY - data.y) > 0.1;
      if (changed) {
        s.directionX = data.x - s.targetX; s.directionY = data.y - s.targetY;
        s.targetX = data.x; s.targetY = data.y; s.jumpDistance = Math.hypot(s.directionX, s.directionY);
        s.typing = now - lastTyping < 90; s.started = now; s.landing = -1; s.moving = true;
      }
      if (snapNext || s.jumpDistance > 1400 || Math.abs(s.height - data.height) > 0.5) {
        model.snap(s); s.moving = false; s.landing = -1; s.jumpDistance = 0;
      }
      s.height = data.height;
      const strength = s.typing ? 0.25 : 1;
      if (s.moving) {
        model.step(s, config, seconds * (s.typing ? 3 : 1));
        if (model.settled(s) || now - s.started >= (s.typing ? 70 : 220)) {
          model.snap(s); s.moving = false; s.landing = config.landingInertia ? now : -1;
        }
      }
      const progress = s.landing < 0 ? 1 : (now - s.landing) / (s.typing ? 120 : 260);
      const offset = model.recoil(progress, s.height, strength, s.directionX, s.directionY);
      const points = model.polygon(s, config.width, s.height, config.stretch * strength, offset);
      const path = points.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(3) + ',' + y.toFixed(3)).join('') + 'Z';
      s.body.setAttribute('d', path); s.glow.setAttribute('d', path);
      s.body.setAttribute('fill', data.color); s.glow.setAttribute('fill', data.color); s.glow.setAttribute('stroke', data.color);
      active ||= s.moving || progress < 1;
    }
    // Native rendering is hidden only after a valid overlay has been drawn.
    if (editor && editor.classList.contains(HIDDEN) !== (targets.length > 0)) {
      editor.classList.toggle(HIDDEN, targets.length > 0);
    }
    snapNext = false;
    if (active) wake(); else previousTime = 0;
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.target.matches('.cursor, .cursors-layer, .monaco-editor, .overflow-guard'))) wake();
  });
  const discovery = new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node =>
      node.nodeType === 1 && (node.matches('.monaco-editor') || node.querySelector('.monaco-editor'))))) wake();
  });
  discovery.observe(document.documentElement, { childList: true, subtree: true });
  const listeners = [];
  function listen(target, name, callback, capture = false) {
    target.addEventListener(name, callback, capture); listeners.push(() => target.removeEventListener(name, callback, capture));
  }
  listen(document, 'focusin', wake, true);
  listen(document, 'focusout', wake, true);
  listen(window, 'focus', () => { windowFocused = true; snapNext = true; wake(); });
  listen(window, 'blur', () => { windowFocused = false; clear(); if (frame) cancelAnimationFrame(frame); frame = 0; });
  listen(document, 'visibilitychange', () => { snapNext = true; wake(); });
  listen(window, 'resize', () => { snapNext = true; wake(); });
  listen(document, 'scroll', event => { if (editor && (event.target === document || editor.contains(event.target))) { snapNext = true; wake(); } }, true);
  listen(document, 'keydown', event => {
    if (!editor || !editor.contains(event.target)) return;
    if ((!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) || ['Enter', 'Backspace', 'Delete', 'Tab'].includes(event.key)) lastTyping = performance.now();
    else lastTyping = -Infinity;
  }, true);
  listen(document, 'beforeinput', () => { lastTyping = performance.now(); }, true);
  const runtime = {
    dispose() {
      disposed = true; if (frame) cancelAnimationFrame(frame); clear(); discovery.disconnect();
      listeners.forEach(remove => remove()); svg.remove(); style.remove();
      if (window.__fluffyCursorRuntime === runtime) delete window.__fluffyCursorRuntime;
    }
  };
  window.__fluffyCursorRuntime = runtime;
  wake();
})();
