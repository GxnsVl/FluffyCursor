(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FluffyCursorPhysics = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const defaults = Object.freeze({ enabled: true, color: '#00E5FF', useThemeColor: false,
    width: 2, stiffness: 0.30, damping: 0.70, stretch: 1, glow: 0.35, landingInertia: true });
  function clamp(value, min, max, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
  function options(input = {}) {
    return { enabled: input.enabled !== false,
      color: /^#[\da-f]{6}$/i.test(input.color || '') ? input.color : defaults.color,
      useThemeColor: input.useThemeColor === true,
      width: clamp(input.width, 1, 6, 2), stiffness: clamp(input.stiffness, 0.05, 0.8, 0.30),
      damping: clamp(input.damping, 0.3, 0.95, 0.70), stretch: clamp(input.stretch, 0, 1.5, 1),
      glow: clamp(input.glow, 0, 0.8, 0.35), landingInertia: input.landingInertia !== false };
  }
  function state(x, y) {
    return { x, y, vx: 0, vy: 0, targetX: x, targetY: y, jumpDistance: 0 };
  }
  function snap(s) { s.x = s.targetX; s.y = s.targetY; s.vx = s.vy = 0; }
  function settled(s) { return Math.hypot(s.x - s.targetX, s.y - s.targetY) < 0.15 && Math.abs(s.vx) + Math.abs(s.vy) < 0.15; }
  function axis(s, key, velocityKey, targetKey, config, time) {
    const offset = s[key] - s[targetKey], velocity = s[velocityKey];
    const decay = -Math.log(config.damping) / 2;
    const discriminant = config.stiffness * config.damping - decay * decay;
    const envelope = Math.exp(-decay * time);
    let c, f;
    if (discriminant > 1e-10) { const w = Math.sqrt(discriminant); c = Math.cos(w * time); f = Math.sin(w * time) / w; }
    else if (discriminant < -1e-10) { const w = Math.sqrt(-discriminant); c = Math.cosh(w * time); f = Math.sinh(w * time) / w; }
    else { c = 1; f = time; }
    s[key] = s[targetKey] + envelope * (offset * c + (velocity + decay * offset) * f);
    s[velocityKey] = envelope * (velocity * c - (decay * velocity + config.stiffness * config.damping * offset) * f);
  }
  function step(s, config, seconds) {
    if (seconds <= 0) return;
    const dx = s.targetX - s.x, dy = s.targetY - s.y;
    axis(s, 'x', 'vx', 'targetX', config, seconds * 60);
    axis(s, 'y', 'vy', 'targetY', config, seconds * 60);
    if (dx * (s.targetX - s.x) + dy * (s.targetY - s.y) <= 0 || settled(s)) snap(s);
  }
  function recoil(progress, height, strength, dx, dy) {
    const distance = Math.hypot(dx, dy);
    if (progress < 0 || progress >= 1 || distance < 0.001) return { x: 0, y: 0 };
    const ease = t => t * t * (3 - 2 * t);
    const wave = progress < 0.28 ? ease(progress / 0.28) : progress < 0.65 ?
      1 - 1.28 * ease((progress - 0.28) / 0.37) : -0.28 * (1 - ease((progress - 0.65) / 0.35));
    const amplitude = Math.min(3, height * 0.12) * strength * wave;
    return { x: dx / distance * amplitude, y: dy / distance * amplitude };
  }
  function polygon(s, width, height, strength, offset = { x: 0, y: 0 }) {
    const speed = Math.hypot(s.vx, s.vy), activity = Math.min(1, speed / (height * 0.25));
    const jump = Math.min(1, s.jumpDistance / (height * 8));
    const bodyWidth = width + Math.min(width, height * 0.1) * activity * (0.5 + 0.5 * jump) * strength;
    const length = Math.min(height * (0.65 + 0.3 * jump), speed * (0.3 + 0.15 * jump)) * strength;
    const dx = speed > 0.001 ? -s.vx / speed * length : 0, dy = speed > 0.001 ? -s.vy / speed * length : 0;
    const left = s.x + (width - bodyWidth) / 2, direction = Math.abs(s.vx) > 0.01 ? Math.sign(s.vx) : Math.sign(s.vy);
    const lean = -direction * 0.06 * activity * strength, ax = Math.abs(dx), ay = Math.abs(dy);
    const points = [[0, 0], [bodyWidth, 0], [bodyWidth + ax, ay], [bodyWidth + ax, height + ay], [ax, height + ay], [0, height]];
    return points.map(([x, y]) => {
      const px = left + (dx < 0 ? bodyWidth - x : x);
      const py = s.y + (dy < 0 ? height - y : y);
      return [px + lean * (py - s.y - height / 2) + offset.x, py + offset.y];
    });
  }
  return { defaults, options, state, snap, settled, step, recoil, polygon };
});
