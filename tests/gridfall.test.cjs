const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Traffic=require('../game/src/traffic.js');
const Pursuit=require('../game/src/pursuit.js');

function setup(stage=1){
  const run=Drive.reset(),p=Pursuit.reset();
  run.traffic=Traffic.reset();run.collected=true;run.jobs.stage=stage;
  Object.assign(run.car,{x:560,y:693,vx:0,vy:0});
  return {run,p};
}
function advance(run,p,frames){for(let i=0;i<frames;i++)Traffic.tick(run.traffic,run,p,1/60);}
test('GRIDFALL seals two physical streets in sequence with a real accessible escape',()=>{
  const {run,p}=setup();
  assert.equal(Traffic.activate(run.traffic,run,p),true);
  advance(run,p,55);
  assert.equal(run.traffic.phase,'closed');
  assert.equal(run.traffic.cascade.phase,'warning');
  assert.equal(run.traffic.closedEdges.size,1);
  advance(run,p,56);
  assert.equal(run.traffic.cascade.phase,'closed');
  assert.equal(run.traffic.closedEdges.size,2);
  assert.equal(run.traffic.gridfallCompleted,1);
  assert.equal(City.edgeOpen(11,12,run.traffic),false);
  assert.equal(City.edgeOpen(6,7,run.traffic),false);
  assert.equal(City.wall(560,650,11,run.traffic),true);
  assert.equal(City.wall(560,400,11,run.traffic),true);
  for(const exit of [15,19])
    assert.ok(City.route(City.nearest(run.car),exit,run.traffic).length>0,'Both exits remain reachable');
  assert.ok(run.traffic.gridfallFlash>run.time);
  advance(run,p,220);
  assert.equal(run.traffic.phase,'ready');
  assert.equal(run.traffic.closedEdges.size,0);
  assert.equal(City.wall(560,400,11,run.traffic),false);
});
test('GRIDFALL refuses to trap a vehicle and does not award an unsafe second closure',()=>{
  const {run,p}=setup();
  Object.assign(p.units[0],{x:560,y:400});
  assert.equal(Traffic.activate(run.traffic,run,p),true);
  advance(run,p,55);
  assert.equal(run.traffic.cascade.phase,'warning');
  advance(run,p,185);
  assert.equal(run.traffic.gridfallCompleted,0);
  assert.equal(run.traffic.cascade.phase,'aborted');
  assert.equal(run.traffic.closedEdges.size,1);
  assert.equal(City.wall(560,400,11,run.traffic),false);
});
test('GRIDFALL only triggers once and only for an actual in-progress heist',()=>{
  const {run,p}=setup(0);
  Traffic.activate(run.traffic,run,p);advance(run,p,55);
  assert.equal(run.traffic.cascade.phase,'idle');
  assert.equal(run.traffic.gridfallUsed,false);
  const b=setup();
  b.run.collected=false;
  Traffic.activate(b.run.traffic,b.run,b.p);advance(b.run,b.p,55);
  assert.equal(b.run.traffic.cascade.phase,'idle');
});
test('GRIDFALL score is earned only on a completed full escape',()=>{
  const {run,p}=setup();
  Traffic.activate(run.traffic,run,p);advance(run,p,115);
  assert.equal(run.traffic.gridfallCompleted,1);
  p.result='Wrecked';
  assert.equal(Pursuit.score(run,p).gridfallBonus,0);
  p.result='Escaped';
  assert.equal(Pursuit.score(run,p).gridfallBonus,900);
  run.jobs.earlyCashout=true;
  assert.equal(Pursuit.score(run,p).gridfallBonus,0);
});
