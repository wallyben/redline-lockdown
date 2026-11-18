const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Jobs=require('../game/src/jobs.js');
const Traffic=require('../game/src/traffic.js');

function scenario(seed) {
  const run=Drive.reset();
  run.jobs=Jobs.reset(seed);
  run.jobs.stage=2;
  run.collected=true;
  run.traffic=Traffic.reset();
  Object.assign(run.car,{x:130,y:130,vx:0,vy:0});
  return run;
}
const step=(run,n,held=false)=>{
  for(let i=0;i<n;i++)Jobs.tick(run.jobs,run,{interactHeld:held},1/60);
};

for(const seed of [1701,1702,1703]) {
  test('courier '+seed+' waits at a road closure instead of teleporting',()=>{
    const run=scenario(seed);
    step(run,40);
    const [a,b]=Jobs.courierRoute(run.jobs);
    const before={x:run.jobs.courier.x,y:run.jobs.courier.y,leg:run.jobs.courier.leg,progress:run.jobs.courier.progress};
    assert.ok(before.progress>0);
    run.traffic.closedEdges.add(City.edgeKey(a,b));
    step(run,320);
    const after=run.jobs.courier;
    assert.equal(after.leg,before.leg,'must stay on the same segment');
    assert.equal(after.progress,before.progress,'must retain progress');
    assert.equal(after.x,before.x,'must not teleport across a barrier');
    assert.equal(after.y,before.y,'must not teleport across a barrier');
    assert.equal(run.jobs.stage,2);
    run.traffic.closedEdges.clear();
    step(run,70);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>2,'route reopens and courier resumes');
  });
}
test('stationary courier remains interceptable while its road is closed',()=>{
  const run=scenario(1701);
  const [a,b]=Jobs.courierRoute(run.jobs);
  run.traffic.closedEdges.add(City.edgeKey(a,b));
  Jobs.tick(run.jobs,run,{interactHeld:false});
  Object.assign(run.car,{x:run.jobs.courier.x,y:run.jobs.courier.y,vx:0,vy:0});
  step(run,55,true);
  assert.equal(run.jobs.completed[2],true,'closure must not soft-lock the transfer');
  assert.equal(run.jobs.stage,3);
});
