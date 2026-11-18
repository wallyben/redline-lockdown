const {test}=require('node:test');
const assert=require('node:assert/strict');
const Tutorial=require('../game/src/tutorial.js');
const Drive=require('../game/src/drive.js');
const run=()=>Drive.reset();
const text=r=>Tutorial.hint(r,{seen:false,lost:0}).text;

test('first interaction teaches exact rolling pickup minimum',()=>{
  const r=run();assert.match(text(r),/55\+/);
  r.car.vx=100;assert.match(text(r),/CROSS THE GOLD/);
});
test('vault guidance adapts to distance, actual braking threshold and live drill',()=>{
  const r=run();r.jobs.stage=1;
  assert.match(text(r),/DRIVE INTO/);
  Object.assign(r.car,{x:690,y:400,vx:40});
  assert.match(text(r),/BELOW 36/);
  r.car.vx=0;assert.match(text(r),/PRESS E/);
  r.sweep=.9;assert.match(text(r),/GREEN BAND/);
});
test('cash-depot vault uses its actual distinct position',()=>{
  const r=run();r.jobs.stage=1;r.contractId='cash-depot';
  Object.assign(r.car,{x:520,y:400,vx:0});
  assert.match(text(r),/START THE DRILL/);
});
test('GRID contract prerequisite overrides misleading bank prompt',()=>{
  const r=run();r.jobs.stage=1;r.contractId='switch';r.traffic={successfulClosures:0};
  assert.match(text(r),/HACK A LIVE RELAY/);
  r.traffic.successfulClosures=1;
  Object.assign(r.car,{x:430,y:530,vx:0});
  assert.match(text(r),/START THE DRILL/);
});
test('courier guidance describes proximity, safe speed and hold control',()=>{
  const r=run();r.jobs.stage=2;
  assert.match(text(r),/GET WITHIN 65/);
  Object.assign(r.car,{x:r.jobs.courier.x,y:r.jobs.courier.y,vx:90});
  assert.match(text(r),/BELOW 75/);
  r.car.vx=0;assert.match(text(r),/HOLD E|TRANSFER/);
});
test('ghost prerequisite is taught before the courier can be approached',()=>{
  const r=run();r.contractId='iris';r.jobs.stage=2;r.smoke={used:0};
  assert.match(text(r),/DEPLOY SMOKE/);
  r.smoke.used=1;assert.match(text(r),/SERVICE ALLEY/);
});
test('extraction tells the player to finish prerequisites and then break police sight',()=>{
  const r=run();r.contractId='iris';r.jobs.stage=3;r.smoke={used:1};
  assert.match(text(r),/CONTRACT MASTERY/);
  r.ghostAlley=true;
  assert.match(Tutorial.hint(r,{seen:true}).text,/HIDE BEHIND/);
  assert.match(Tutorial.hint(r,{seen:false}).text,/STAY UNSEEN/);
});
