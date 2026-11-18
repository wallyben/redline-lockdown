const test=require('node:test');
const assert=require('node:assert/strict');
const Smoke=require('../game/src/smoke.js');
test('smoke blocks distant sight through its cloud but preserves close capture',()=>{
  const clouds=[{x:100,y:0,age:1}];
  assert.equal(Smoke.obscures(clouds,{x:0,y:0},{x:200,y:0}),true);
  assert.equal(Smoke.obscures(clouds,{x:90,y:0},{x:110,y:0}),false);
  assert.equal(Smoke.obscures(clouds,{x:0,y:100},{x:200,y:100}),false);
});
test('smoke stays at deployment position, expires, and has finite charges',()=>{
  const run={car:{x:100,y:200},smoke:Smoke.reset()};
  assert.equal(Smoke.deploy(run),true);run.car.x=500;
  assert.equal(run.smoke.clouds[0].x,100);
  assert.equal(Smoke.deploy(run),false);
  Smoke.tick(run,7);assert.equal(run.smoke.clouds.length,0);
  assert.equal(Smoke.deploy(run),true);Smoke.tick(run,7);
  assert.equal(Smoke.deploy(run),false);
});
