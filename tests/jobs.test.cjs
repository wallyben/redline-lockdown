const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Jobs=require('../game/src/jobs.js');
const Drive=require('../game/src/drive.js');
const Traffic=require('../game/src/traffic.js');
const Pursuit=require('../game/src/pursuit.js');

function runAt(point){return {time:0,car:{...point,vx:0,vy:0,damage:0},traffic:{closedEdges:new Set()}};}

test('rolling pickup is a distinct drive-through job and carries secured haul',()=>{
  const jobs=Jobs.reset(1701), run=runAt(Jobs.pickup(jobs,0));
  run.car.vx=70;
  Jobs.tick(jobs,run,{},1/60);
  assert.equal(jobs.completed[0],true);
  assert.equal(jobs.haul,700);
  assert.equal(jobs.pending,true);
  assert.equal(jobs.nextStage,1);
});

test('same seed offers the same upgrades and chosen effects change gameplay modifiers',()=>{
  const a=Jobs.reset(42),b=Jobs.reset(42),c=Jobs.reset(43);
  const ids=Jobs.offer(a).map(u=>u.id), again=Jobs.offer(b).map(u=>u.id), other=Jobs.offer(c).map(u=>u.id);
  assert.deepEqual(ids,again);
  assert.notDeepEqual(ids,other);
  const grip=Jobs.upgrades.find(u=>u.id==='grip');
  a.choices=[grip];a.nextStage=1;
  assert.equal(Jobs.choose(a,'grip'),true);
  assert.equal(a.modifiers.grip,1.18);
  assert.equal(a.multiplier,1.25);
  assert.equal(a.heat,1);
  assert.equal(a.stage,1);
});

test('vault, moving courier transfer and extraction progress are distinct',()=>{
  const jobs=Jobs.reset(11),run=runAt({x:690,y:400});
  jobs.stage=1;
  assert.equal(Jobs.completeVault(jobs),true);
  assert.equal(jobs.completed[1],true);
  assert.equal(jobs.haul,1200);
  jobs.choices=[Jobs.upgrades[0]];jobs.nextStage=2;
  Jobs.choose(jobs,Jobs.upgrades[0].id);
  run.car={x:1010,y:650,vx:0,vy:0};
  for(let i=0;i<90&&jobs.stage===2;i++)Jobs.tick(jobs,run,{interactHeld:true},1/60);
  assert.equal(jobs.completed[2],true);
  assert.equal(jobs.stage,3);
  assert.ok(jobs.haul>=2100);
  assert.ok(City.distance(jobs.target,City.nodes[19])===0);
});

test('partial extraction ends the job chain while preserving its partial-haul flag',()=>{
  const jobs=Jobs.reset(7);
  Jobs.cashOut(jobs);
  assert.equal(jobs.earlyCashout,true);
  assert.equal(jobs.stage,3);
  assert.deepEqual(jobs.target,City.nodes[19]);
});

test('heat across jobs increases the hidden-time escape window',()=>{
  const jobs=Jobs.reset(9);jobs.heat=3;
  const Pursuit=require('../game/src/pursuit.js');
  assert.equal(Pursuit.clearDuration({jobs}),5);
});

test('upgrade effects change steering, collision damage, relay reach and gate timing',()=>{
  const base=Drive.reset(),grippy=Drive.reset();
  Object.assign(base.car,{vx:0,vy:100});Object.assign(grippy.car,{vx:0,vy:100});
  grippy.jobs.modifiers.grip=1.18;
  Drive.tick(base,{gas:0,turn:0,interact:false},1/60);
  Drive.tick(grippy,{gas:0,turn:0,interact:false},1/60);
  assert.ok(Math.abs(grippy.car.vy)<Math.abs(base.car.vy));

  const crash=()=>{const run=Drive.reset();run.car.x=90;run.car.vx=-180;Drive.tick(run,{gas:0,turn:0,interact:false},1/60);return run.car.damage;};
  const ordinary=crash(),armoured=Drive.reset();armoured.car.x=90;armoured.car.vx=-180;armoured.jobs.modifiers.damage=.75;
  Drive.tick(armoured,{gas:0,turn:0,interact:false},1/60);
  assert.ok(armoured.car.damage<ordinary);

  const run=Drive.reset(),police=require('../game/src/pursuit.js').reset();run.traffic=Traffic.reset();
  run.car.x=650;run.car.y=400;
  assert.equal(Traffic.activate(run.traffic,run,police),false);
  run.jobs.modifiers.relayRange=1.3;
  assert.equal(Traffic.activate(run.traffic,run,police),true);
  run.jobs.modifiers.gateDuration=7;run.jobs.modifiers.cooldown=6;
  for(let i=0;i<50;i++)Traffic.tick(run.traffic,run,police,1/60);
  assert.ok(run.traffic.timer>6.9&&run.traffic.timer<=7);
  assert.ok(run.traffic.cooldown>5.9&&run.traffic.cooldown<=6);

  const scoringRun=Drive.reset();scoringRun.jobs.haul=700;scoringRun.jobs.multiplier=1.25;
  scoringRun.jobs.modifiers.feint=250;scoringRun.collected=true;
  const points=Pursuit.score(scoringRun,{result:'Escaped',feint:true});
  assert.equal(points.feint,750);
});

test('partial cashout banks the current haul with a reduced extraction award',()=>{
  const run=Drive.reset();run.collected=true;run.jobs.haul=700;run.jobs.multiplier=1.25;
  run.jobs.earlyCashout=true;
  const score=Pursuit.score(run,{result:'Partial cashout',feint:false});
  assert.equal(score.recorder,875);
  assert.equal(score.extraction,1200);
});
