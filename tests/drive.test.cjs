const { test } = require('node:test');
const assert = require('node:assert/strict');
const City = require('../game/src/city.js');
const Drive = require('../game/src/drive.js');

function step(s, frames, gas = 0, turn = 0) {
  for (let i = 0; i < frames; i++) Drive.tick(s, { gas, turn, interact: false });
}

test('brakes inside the vault bay, drills, and resets', () => {
  const s = Drive.reset();
  while (s.car.x < 600) step(s, 1, 1);
  assert.ok(s.car.x > 430);
  while (Math.hypot(s.car.vx, s.car.vy) > 12) step(s, 1, -1);
  assert.ok(City.distance(s.car, Drive.pickup) < 45);
  Drive.tick(s, { gas: 0, turn: 0, interact: true });
  step(s, 58);
  Drive.tick(s, { gas: 0, turn: 0, interact: true });
  assert.equal(s.collected, true);
  assert.deepEqual(Drive.reset().car, { x: 130, y: 400, angle: 0, vx: 0, vy: 0, damage: 0, hits: 0 });
  assert.equal(Drive.reset().collected, false);
});

test('wall collisions contain the vehicle and cost integrity', () => {
  const s = Drive.reset();
  step(s, 300, 1);
  assert.equal(City.wall(s.car.x, s.car.y), false);
  assert.ok(s.car.damage > 0);
  assert.ok(s.car.hits > 0);
});
