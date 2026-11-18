const test = require('node:test');
const assert = require('node:assert/strict');
const City = require('../game/src/city.js');
const Traffic = require('../game/src/traffic.js');
const Civilians = require('../game/src/civilian-traffic.js');

function run(car = { x: 1200, y: 200, vx: 0, vy: 0, hits: 0, damage: 0 }) {
  return { car, traffic: Traffic.reset(), jobs: { heat: 0, modifiers: { damage: 1 } }, impact: 0 };
}
test('traffic spawns deterministically and on valid road nodes', () => {
  const a = Civilians.reset(1701);
  const b = Civilians.reset(1701);
  assert.deepEqual(a, b);
  assert.equal(a.length, 5);
  for (const v of a) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
    assert.ok(City.nodes.some(n => City.distance(n, v) < .01));
    for (let i = 0; i < v.route.length - 1; i++) {
      assert.ok(City.edges[v.route[i]].includes(v.route[i + 1]));
    }
  }
});
test('traffic progresses through the city without leaving finite coordinates', () => {
  const vehicles = Civilians.reset(1701), state = run();
  const original = vehicles.map(v => ({ x: v.x, y: v.y }));
  for (let n = 0; n < 600; n++) Civilians.tick(vehicles, state);
  assert.ok(vehicles.some((v, i) => City.distance(v, original[i]) > 20));
  for (const v of vehicles) assert.ok([v.x, v.y, v.angle, v.speed].every(Number.isFinite));
});
test('a closed relay street makes approaching traffic wait', () => {
  const vehicles = Civilians.reset(1701), state = run();
  const v = vehicles[0];
  state.traffic.closedEdges.add(City.edgeKey(v.route[v.step], v.route[v.step + 1]));
  const before = {x:v.x,y:v.y};
  for(let i=0;i<120;i++) Civilians.tick([v],state);
  assert.equal(City.distance(v,before),0);
});
test('a player-traffic collision has bounded damage and a per-vehicle cooldown', () => {
  const vehicles = Civilians.reset(1701), v = vehicles[0];
  const state = run({x:v.x,y:v.y,vx:160,vy:0,hits:0,damage:0});
  Civilians.tick([v],state);
  assert.ok(state.car.damage > 0 && state.car.damage <= 13);
  assert.equal(state.car.hits,1);
  assert.ok(state.impact > 0);
  Civilians.tick([v],state);
  assert.equal(state.car.hits,1);
});
