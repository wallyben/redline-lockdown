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
  for (let i = 0; i < 240 && !police.block; i++) { police.refitGrace=1; Pursuit.tick(police, run); }
  assert.equal(police.block.node, 8);
  assert.ok(City.distance(police.units[1],City.nodes[8])<8);
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
  for (let i = 0; i < 1600 && !police.reacquired; i++) Pursuit.tick(police, run);
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

test('police accelerate progressively and keep their footprint on streets',()=>{
  const {run,police}=afterPickup();
  let previous=police.units.map(u=>({...u}));
  for(let frame=0;frame<1200;frame++){
    police.refitGrace=1;
    if(frame===1)Object.assign(run.car,{x:690,y:520});
    Pursuit.tick(police,run);
    police.units.forEach((u,i)=>{
      assert.equal(City.wall(u.x,u.y,10,run.traffic),false,`unit ${i} off road at ${frame}`);
      assert.ok(City.distance(u,previous[i])<5.1,'No position jumps');
      const turn=Math.abs(Math.atan2(Math.sin(u.angle-previous[i].angle),Math.cos(u.angle-previous[i].angle)));
      assert.ok(turn<=4.4/60+.001,'No instantaneous rotation');
      assert.ok((u.speed||0)-(previous[i].speed||0)<=210/60+.001,'Bounded acceleration');
    });
    previous=police.units.map(u=>({...u}));
  }
});

test('search order stays fixed until the officer reaches its destination',()=>{
  const {run,police}=afterPickup();Pursuit.tick(police,run);
  Object.assign(run.car,{x:1290,y:940});
  for(let frame=0;frame<50;frame++)Pursuit.tick(police,run);
  const tail=police.units[0],goal={...tail.search.goal};
  for(let frame=0;frame<45;frame++){
    Pursuit.tick(police,run);
    assert.deepEqual(tail.search.goal,goal);
  }
});

test('a visible relay prompt accepts interaction at the same distance',()=>{
 const Traffic=require('../game/src/traffic.js');
 const run={car:{x:620,y:400},jobs:{modifiers:{relayRange:1}}};
 const state=Traffic.reset();
 assert.ok(Traffic.near(run));
 assert.equal(Traffic.activate(state,run,{units:[]}),true);
});


test('precision vault drill suppresses contact briefly without canceling pursuit AI', () => {
  const { run, police }=afterPickup();
  run.jobs.stage=1;
  run.sweep=1.1;
  Object.assign(run.car,{x:690,y:400,vx:0,vy:0});
  Object.assign(police.units[0],{x:692,y:400,angle:0});
  police.hadContact=true;
  police.contact=.7;
  police.refitGrace=0;
  Pursuit.tick(police,run,1/60);
  assert.ok(police.contact<=.16,'Timed minigame must remain playable even with a cruiser nearby');
  assert.equal(police.result,null);
  assert.ok(police.elapsed>0,'Police simulation must continue normally');
});

test('payday tail stages on a southern road rather than blocking the first rolling pickup',()=>{
 const payday=Pursuit.reset(2),ghost=Pursuit.reset(0);
 assert.deepEqual({x:payday.units[0].x,y:payday.units[0].y},{x:430,y:650});
 assert.deepEqual({x:ghost.units[0].x,y:ghost.units[0].y},{x:452,y:400});
 assert.equal(payday.units[0].role,'tail');
 assert.ok(City.route(City.nearest(payday.units[0]),7).length>0,'The pursuit must remain road-connected');
});
