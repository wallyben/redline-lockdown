const { test } = require('node:test');
const assert = require('node:assert/strict');
const Momentum = require('../game/src/momentum.js');
const Drive = require('../game/src/drive.js');
const Pursuit = require('../game/src/pursuit.js');

const run = () => {
  const state=Drive.reset();
  state.collected=true;
  state.momentum=Momentum.reset();
  Object.assign(state.car,{x:690,y:400,vx:150,vy:0,angle:0});
  return state;
};

test('overdrive cannot be spammed or triggered before collecting a job', () => {
  const r=run();
  r.collected=false;
  assert.equal(Momentum.activate(r),false);
  r.collected=true;
  assert.equal(Momentum.activate(r),false);
  r.momentum.charge=.8;
  assert.equal(Momentum.activate(r),true);
  assert.equal(Momentum.activate(r),false);
  assert.ok(r.momentum.charge<.11);
  assert.equal(r.momentum.used,1);
});

test('high-speed driving charges only under observable police pressure', () => {
  const r=run(),p={seen:false,units:[]};
  const first=r.momentum.charge;
  for(let i=0;i<120;i++) Momentum.tick(r,p,1/60);
  assert.equal(r.momentum.charge,first);
  p.seen=true;
  for(let i=0;i<120;i++) Momentum.tick(r,p,1/60);
  assert.ok(r.momentum.charge>first);
  assert.ok(r.momentum.charge<=1);
});

test('physical near misses chain but have a per-unit anti-farming cooldown', () => {
  const r=run(),p={seen:true,units:[{x:735,y:400}]};
  Momentum.tick(r,p);
  assert.equal(r.momentum.nearMisses,1);
  const charge=r.momentum.charge;
  Momentum.tick(r,p);
  assert.equal(r.momentum.nearMisses,1);
  assert.ok(r.momentum.charge<charge+.001);
  p.units[0].x=900;
  for(let i=0;i<320;i++) Momentum.tick(r,p);
  p.units[0].x=735;
  Momentum.tick(r,p);
  assert.equal(r.momentum.nearMisses,2);
  assert.equal(r.momentum.bestStreak,2); // A second legitimate pass within seven seconds chains.
});

test('activated overdrive delivers greater acceleration while keeping speed bounded', () => {
  const base=run(),fast=run();
  fast.momentum.charge=1;
  assert.equal(Momentum.activate(fast),true);
  for(let i=0;i<18;i++){
    Drive.tick(base,{gas:1,turn:0,drift:false,interact:false,interactHeld:false});
    Drive.tick(fast,{gas:1,turn:0,drift:false,interact:false,interactHeld:false});
  }
  assert.ok(Math.hypot(fast.car.vx,fast.car.vy)>Math.hypot(base.car.vx,base.car.vy)+20);
  assert.ok(Math.hypot(fast.car.vx,fast.car.vy)<465);
});

test('only a successful full extraction banks overdrive skill points', () => {
  const r=run();
  r.momentum.nearMisses=3;r.momentum.used=2;
  const police={result:'Escaped',feint:false};
  const full=Pursuit.score(r,police);
  assert.equal(full.redlineBonus,775);
  r.jobs.earlyCashout=true;
  assert.equal(Pursuit.score(r,{result:'Partial cashout',feint:false}).redlineBonus,0);
  r.jobs.earlyCashout=false;
  assert.equal(Pursuit.score(r,{result:'Intercepted',feint:false}).redlineBonus,0);
});

test('overdrive timers use simulation time and stop naturally without wall time', () => {
  const r=run();r.momentum.charge=.9;
  assert.equal(Momentum.activate(r),true);
  for(let i=0;i<145;i++) Momentum.tick(r,{seen:false,units:[]},1/60);
  assert.equal(r.momentum.active,0);
  assert.ok(r.momentum.cooldown>0);
  const before=r.momentum.cooldown;
  assert.ok(before>0);
  assert.equal(Momentum.activate(r),false);
});
