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
  assert.deepEqual(police.units[1].path.at(-1).edge, [8, 8]);
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
    assert.equal(police.feint,false);
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

test('a patrol searches from its last sighting and can reacquire the player', () => {
  const { run, police } = afterPickup();
  Pursuit.tick(police, run);
  const last = { ...police.sighting };
  Object.assign(run.car, { x: 690, y: 520, angle: Math.PI / 2 });
  for (let i = 0; i < 140; i++) Pursuit.tick(police, run);
  assert.equal(police.seen, false);
  assert.deepEqual(police.sighting, last);
  assert.ok(City.distance(police.units[0], last) < 25);
  for (let i = 0; i < 550 && !police.reacquired; i++) Pursuit.tick(police, run);
  assert.equal(police.reacquired, 1);
  assert.equal(police.lost, 0);
  assert.equal(police.sighting.y, 520);
});

test('north and south patrols deploy from distinct roads', () => {
  const south = Pursuit.reset(0);
  const north = Pursuit.reset(1);
  assert.ok(south.units[1].y > City.nodes[8].y);
  assert.ok(north.units[1].y < City.nodes[8].y);
  assert.notEqual(south.units[0].x, north.units[0].x);
});

test('accumulated job heat adds a third road patrol',()=>{
  const {run,police}=afterPickup();
  run.jobs={heat:2,stage:1};
  Pursuit.tick(police,run);
  assert.equal(police.units.length,3);
  assert.equal(police.extraSpawned,true);
});

test('a closed committed edge earns one feint only after the interceptor misses',()=>{
  const run={car:{x:1290,y:910,vx:0,vy:0,angle:0,damage:0},collected:true,time:0,
    traffic:{phase:'closed',closedEdges:new Set(['6:7'])}};
  const police=Pursuit.reset();
  police.sighting={x:430,y:400,dx:1,dy:0};
  police.intercept={id:1,node:6,from:5,expires:9,diverted:false,rewarded:false};
  police.units[1].path=[{x:690,y:400,edge:[6,7]}];
  police.refresh=1;
  Pursuit.tick(police,run);
  assert.equal(police.intercept.diverted,true);
  Object.assign(police.units[1],City.nodes[6],{edge:[6,6],path:[]});
  police.refresh=1;
  Pursuit.tick(police,run);
  assert.equal(police.feint,true);
  assert.equal(police.intercept.rewarded,true);
  assert.equal(police.intercept.id,1);
});

test('the service passage narrows the turn and obscures sight from the boulevard', () => {
  assert.equal(City.wall(690, 520), false);
  assert.equal(City.wall(712, 520), true);
  assert.equal(City.wall(709, 520), false);
  assert.equal(Pursuit.canSee({ x: 690, y: 435 }, { x: 690, y: 520 }), false);
  assert.equal(Pursuit.canSee({ x: 690, y: 500 }, { x: 690, y: 550 }), true);
});

test('dock cargo gives the final extraction a real line-of-sight hiding pocket',()=>{
  assert.equal(City.wall(1290,940),false);
  assert.equal(Pursuit.canSee({x:1290,y:910},{x:1290,y:940}),false);
  assert.equal(City.inDockShadow({x:1290,y:940}),true);
});
