const { test } = require('node:test');
const assert = require('node:assert/strict');
const City = require('../game/src/city.js');
const Drive = require('../game/src/drive.js');
const Traffic = require('../game/src/traffic.js');
const Pursuit = require('../game/src/pursuit.js');

function setup() {
  const run=Drive.reset();
  run.traffic=Traffic.reset();
  const police=Pursuit.reset();
  return {run,police};
}

test('relay warning closes one physical road and removes it from routes',()=>{
  const {run,police}=setup();
  run.car.x=560; run.car.y=693;
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  assert.equal(run.traffic.phase,'warning');
  for(let i=0;i<50;i++) Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.phase,'closed');
  assert.equal(run.traffic.charges,2);
  assert.equal(City.wall(560,650,11,run.traffic),true);
  assert.equal(City.edgeOpen(11,12,run.traffic),false);
  assert.ok(City.route(11,12,run.traffic).length>0);
  assert.ok(City.route(City.nearest(run.car),19,run.traffic).length>0);
});

test('occupied gate aborts the warning and restores the charge',()=>{
  const {run,police}=setup();
  run.car.x=560; run.car.y=693;
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  run.car.y=650;
  for(let i=0;i<230;i++) Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.phase,'ready');
  assert.equal(run.traffic.charges,3);
  assert.match(run.traffic.message,/charge restored/);
  assert.equal(City.wall(560,650,11,run.traffic),false);
});

test('a closed barrier blocks the player car before it crosses the road',()=>{
  const {run,police}=setup();
  run.car.x=560; run.car.y=693;
  Traffic.activate(run.traffic,run,police);
  for(let i=0;i<50;i++) Traffic.tick(run.traffic,run,police,1/60);
  Object.assign(run.car,{x:540,y:650,vx:180,vy:0,angle:0});
  Drive.tick(run,{gas:0,turn:0,drift:false,interact:false},1/60);
  assert.ok(run.car.x<560);
  assert.ok(run.car.vx<0);
});

test('interceptor receives a new route when its committed edge closes',()=>{
  const {run,police}=setup();
  run.collected=true;
  Pursuit.tick(police,run);
  run.car.x=560; run.car.y=693;
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  for(let i=0;i<50;i++) Traffic.tick(run.traffic,run,police,1/60);
  Pursuit.tick(police,run);
  assert.equal(police.rerouteEdgeKey,'11:12');
  for(const step of police.units.flatMap(u=>u.path))
    assert.ok(City.edgeOpen(...step.edge,run.traffic));
});

test('an occupied relay request queues safely and commits once the barrier lane clears',()=>{
  const {run,police}=setup();
  run.car.x=560;run.car.y=650;
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  assert.equal(run.traffic.charges,2);
  for(let i=0;i<90;i++)Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.phase,'warning');
  assert.equal(City.wall(560,650,11,run.traffic),false);
  assert.match(run.traffic.message,/queued/);
  run.car.y=693;
  for(let i=0;i<3;i++)Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.phase,'closed');
  assert.equal(run.traffic.successfulClosures,1);
  assert.equal(City.wall(560,650,11,run.traffic),true);
});

test('Grid street sabotage briefly jams police contact without moving or removing police units',()=>{
  const {run,police}=setup();
  run.contractId='switch';run.car.x=560;run.car.y=693;
  police.contact=.55;
  const oldUnits=police.units.slice();
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  for(let i=0;i<50;i++)Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.successfulClosures,1);
  assert.ok(run.traffic.radioJam>3);
  assert.ok(police.refitGrace>=3.49);
  assert.equal(police.contact,0);
  assert.deepEqual(police.units,oldUnits,'Units still move on the road network in future pursuit ticks');
  assert.match(run.traffic.message,/RADIO JAM/);
  for(let i=0;i<320;i++)Traffic.tick(run.traffic,run,police,1/60);
  assert.equal(run.traffic.radioJam,0);
});
