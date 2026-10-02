'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const physics = require('../src/physics');
test('spring is invariant to 60, 200 and 240 Hz sampling', () => {
  const results = [60, 200, 240].map(hz => {
    const s = physics.state(0, 0); s.targetX = 400; s.targetY = 160;
    for (let i = 0; i < hz / 20; i++) physics.step(s, physics.defaults, 1 / hz);
    return s;
  });
  for (const s of results.slice(1)) {
    assert.ok(Math.abs(s.x - results[0].x) < 1e-8);
    assert.ok(Math.abs(s.y - results[0].y) < 1e-8);
  }
});
test('navigation converges without repeated spring overshoot', () => {
  const s = physics.state(0, 0); s.targetX = 500; s.targetY = 100;
  for (let i = 0; i < 200; i++) {
    physics.step(s, physics.defaults, 1 / 200);
    assert.ok(s.x <= 500 && s.y <= 100);
  }
  assert.equal(s.x, 500); assert.equal(s.y, 100); assert.ok(physics.settled(s));
});
test('landing has one forward peak, one smaller backward peak, then stops', () => {
  assert.equal(physics.recoil(0, 25, 1, 0, 100).y, 0);
  assert.equal(physics.recoil(0.28, 25, 1, 0, 100).y, 3);
  assert.ok(Math.abs(physics.recoil(0.65, 25, 1, 0, 100).y + 0.84) < 1e-10);
  assert.deepEqual(physics.recoil(1, 25, 1, 0, 100), { x: 0, y: 0 });
  assert.equal(physics.recoil(0.28, 25, 0.25, -100, 0).x, -0.75);
});
test('motion stretches opposite travel and typing stretch is smaller', () => {
  const s = physics.state(100, 100); s.vx = 30; s.jumpDistance = 500;
  const full = physics.polygon(s, 2, 20, 1), typing = physics.polygon(s, 2, 20, 0.25);
  assert.ok(Math.min(...full.map(point => point[0])) < 85);
  assert.ok(Math.min(...typing.map(point => point[0])) > Math.min(...full.map(point => point[0])));
  const idle = physics.polygon(physics.state(100, 100), 2, 20, 1);
  assert.equal(Math.max(...idle.map(point => point[0])) - Math.min(...idle.map(point => point[0])), 2);
});
test('untrusted or invalid settings are clamped before generating renderer code', () => {
  const settings = physics.options({ color: '</script>', width: Infinity, damping: 4, stiffness: -2, glow: NaN });
  assert.equal(settings.color, '#00E5FF'); assert.equal(settings.width, 2);
  assert.equal(settings.damping, 0.95); assert.equal(settings.stiffness, 0.05); assert.equal(settings.glow, 0.35);
});
