const { test } = require('node:test');
const assert = require('node:assert/strict');
const City = require('../game/src/city.js');
const Drive = require('../game/src/drive.js');
const Pursuit = require('../game/src/pursuit.js');

function afterPickup() {
  const run = Drive.reset();
  Object.assign(run.car, { x: 680, y: 400 });
  run.collected = true;
  return { run, police: Pursuit.reset() };
}

test('interceptor commits east from a sighting and arrives by road', () => {
  const { run, police } = afterPickup();
  Pursuit.tick(police, run);
  assert.equal(police.intercept.node, 8);
  assert.deepEqual(police.units[1].path.slice(-1), [8]);
  assert.equal(police.block, null);
  for (let i = 0; i < 80; i++) Pursuit.tick(police, run);
  assert.equal(police.block.node, 8);
  assert.deepEqual([police.units[1].x, police.units[1].y], [1010, 400]);
});

test('hidden movement does not change the shared last sighting or order', () => {
  const { run, police } = afterPickup();
  Pursuit.tick(police, run);
  const last = { ...police.sighting };
  for (const node of [15, 17]) {
    Object.assign(run.car, City.nodes[node]);
    Pursuit.tick(police, run);
    assert.equal(police.seen, false);
    assert.deepEqual(police.sighting, last);
    assert.equal(police.intercept.node, 8);
  }
});

test('capture, timeout and wreck are separate end conditions', () => {
  const { run, police } = afterPickup();
  for (let i = 0; i < 300; i++) Pursuit.tick(police, run);
  assert.equal(police.result, 'Intercepted');
  run.time = 180;
  const timeout = Pursuit.reset();
  Pursuit.tick(timeout, run);
  assert.equal(timeout.result, 'Time expired');
  run.car.damage = 100;
  const wreck = Pursuit.reset();
  Pursuit.tick(wreck, run);
  assert.equal(wreck.result, 'Wrecked');
});
