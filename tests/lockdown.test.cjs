const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Lockdown=require('../game/src/lockdown.js');
const Rules=require('../game/src/contract-rules.js');
const Pursuit=require('../game/src/pursuit.js');
const Traffic=require('../game/src/traffic.js');

test('lockdown offers two connected, distinct, physically reachable exits',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.jobs.stage=3;run.contractId='iris';run.lockdown=Lockdown.reset();
  Lockdown.tick(run,p);
  assert.equal(run.lockdown.active,true);
  assert.deepEqual(Lockdown.target(run),{x:1290,y:910});
  assert.equal(Lockdown.select(run,1),true);
  assert.deepEqual(Lockdown.target(run),{x:130,y:910});
  assert.deepEqual(City.nodes[15],Lockdown.target(run));
  assert.ok(City.route(0,15,run.traffic).length>0);
  assert.ok(City.route(0,19,run.traffic).length>0);
});

test('payday requires actual cash and committed western exit',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.contractId='cash-depot';run.jobs.stage=3;run.lockdown=Lockdown.reset();
  Lockdown.tick(run,p);
  assert.equal(run.lockdown.choice,1);
  assert.equal(Lockdown.select(run,0),false);
  assert.equal(Rules.escapeReady(run,p),false);
  run.bonus=true;
  assert.equal(Rules.escapeReady(run,p),true);
});

test('ghost requires both a used smoke charge and the covered alley',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.contractId='iris';run.smoke={used:0};run.ghostAlley=false;
  assert.match(Rules.nextAction(run,p),/SMOKE/);
  assert.equal(Rules.escapeReady(run,p),false);
  run.smoke.used=1;
  assert.match(Rules.nextAction(run,p),/ALLEY/);
  assert.equal(Rules.escapeReady(run,p),false);
  run.ghostAlley=true;
  assert.equal(Rules.escapeReady(run,p),true);
});

test('grid contract requires a real gate closure and an interceptor commitment',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.contractId='switch';run.traffic=Traffic.reset();
  assert.equal(Rules.escapeReady(run,p),false);
  run.traffic.successfulClosures=1;
  assert.equal(Rules.escapeReady(run,p),false);
  p.hadIntercept=true;
  assert.equal(Rules.escapeReady(run,p),true);
});

test('early cashout bypasses optional contract mastery without a full-run reward',()=>{
  const run=Drive.reset(),p=Pursuit.reset();run.contractId='cash-depot';
  run.lockdown=Lockdown.reset();run.jobs.earlyCashout=true;run.lockdown.choice=1;
  assert.equal(Rules.escapeReady(run,p),true);
  p.result='Partial cashout';run.collected=true;
  assert.equal(Pursuit.score(run,p).routeBonus,0);
});

test('west exit gives a payout premium only on a successful complete escape',()=>{
  const run=Drive.reset(),p=Pursuit.reset();run.collected=true;
  run.lockdown=Lockdown.reset();run.lockdown.active=true;run.lockdown.choice=1;
  p.result='Escaped';
  assert.equal(Pursuit.score(run,p).routeBonus,1750);
  p.result='Intercepted';
  assert.equal(Pursuit.score(run,p).routeBonus,0);
});

test('radio decoy gives police a real, reachable false sighting with cooldown',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.collected=true;run.seed=1701;
  p.sighting={x:680,y:400,dx:1,dy:0};
  assert.equal(Pursuit.deployDecoy(p,run),true);
  assert.equal(p.decoyCharges,1);
  assert.equal(p.decoyTime,3.5);
  assert.ok(City.nodes.some(n=>City.distance(n,p.sighting)<1));
  assert.ok(City.route(City.nearest(run.car),City.nearest(p.sighting),run.traffic).length>0);
  assert.equal(Pursuit.deployDecoy(p,run),false);
  p.refitGrace=5;
  Pursuit.tick(p,run,1/60);
  assert.equal(p.seen,false);
  assert.ok(p.units[0].path.length>0);
});

test('lockdown escort actually joins the pursuit from a real road node',()=>{
  const run=Drive.reset(),p=Pursuit.reset();run.collected=true;
  run.contractId='iris';run.jobs.stage=3;run.lockdown=Lockdown.reset();
  Lockdown.tick(run,p);
  p.refitGrace=5;
  Pursuit.tick(p,run,1/60);
  assert.ok(p.lockdownUnit);
  assert.equal(p.lockdownUnit.role,'roadblock');
  assert.ok(p.units.includes(p.lockdownUnit));
  assert.equal(p.lockdownTarget,13);
  assert.ok(p.lockdownUnit.path.length>0);
});

test('East Dock extraction accepts the accessible loading apron without entering cargo collision',()=>{
  const run=Drive.reset(),p=Pursuit.reset();
  run.collected=true;run.jobs.stage=3;run.lockdown=Lockdown.reset();
  run.lockdown.active=true;run.lockdown.choice=0;
  Object.assign(run.car,{x:1252.2,y:938.5,vx:0,vy:0});
  assert.ok(City.wall(run.car.x,run.car.y,11,run.traffic)===false);
  p.lost=10;p.refitGrace=3;
  Pursuit.tick(p,run,1/60);
  assert.ok(['Escaped','Clean getaway'].includes(p.result),String(p.result));
});
