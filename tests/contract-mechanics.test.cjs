const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Jobs=require('../game/src/jobs.js');
const Rules=require('../game/src/contract-rules.js');

const control={gas:0,turn:0,drift:false,interact:false,interactHeld:false};
function setup(id,seed,stage=2) {
  const run=Drive.reset();
  run.contractId=id;run.jobs=Jobs.reset(seed);run.jobs.stage=stage;run.collected=true;
  run.car={x:1010,y:650,vx:0,vy:0,damage:0,angle:0};
  run.smoke={used:0};run.ghostAlley=false;run.bonus=false;
  return run;
}
test('three courier circuits are geographically different, legal city routes',()=>{
  const routes=[1701,1702,1703].map(seed=>Jobs.courierRoute(Jobs.reset(seed)));
  assert.notDeepEqual(routes[0],routes[1]);
  assert.notDeepEqual(routes[1],routes[2]);
  for(const route of routes){
    assert.equal(route.length,7);
    assert.equal(route[0],route.at(-1));
    for(let i=1;i<route.length;i++)assert.ok(City.edgeOpen(route[i-1],route[i]),'Must follow connected streets');
  }
});
test('Grid requires an executed relay closure before bank may be drilled',()=>{
  const run=setup('switch',1702,1);
  Object.assign(run.car,{x:690,y:400});
  assert.equal(Rules.required(run,1).ready,false);
  Drive.tick(run,{...control,interact:true});
  for(let i=0;i<60;i++)Drive.tick(run,control);
  Drive.tick(run,{...control,interact:true});
  assert.equal(run.jobs.completed[1],false);
  assert.match(run.jobs.event,/RELAY/);
  run.traffic.successfulClosures=1;
  assert.equal(Rules.required(run,1).ready,true);
  Drive.tick(run,{...control,interact:true});
  for(let i=0;i<60;i++)Drive.tick(run,control);
  Drive.tick(run,{...control,interact:true});
  assert.equal(run.jobs.completed[1],true);
});
test('Ghost handoff is blocked until both smoke and covered alley are completed',()=>{
  const run=setup('iris',1701);
  for(let i=0;i<90;i++)Jobs.tick(run.jobs,run,{interactHeld:true});
  assert.equal(run.jobs.transfer,0);
  run.smoke.used=1;
  assert.equal(Rules.required(run,2).ready,false);
  for(let i=0;i<90;i++)Jobs.tick(run.jobs,run,{interactHeld:true});
  assert.equal(run.jobs.transfer,0);
  run.ghostAlley=true;
  assert.equal(Rules.required(run,2).ready,true);
  for(let i=0;i<90;i++)Jobs.tick(run.jobs,run,{interactHeld:true});
  assert.equal(run.jobs.completed[2],true);
});
test('Payday must raid the actual optional depot before courier cash handoff',()=>{
  const run=setup('cash-depot',1703);
  const start=Jobs.courierPoint(run.jobs);
  Object.assign(run.car,{x:start.x,y:start.y});
  assert.equal(Rules.required(run,2).ready,false);
  for(let i=0;i<30;i++)Jobs.tick(run.jobs,run,{interactHeld:true});
  assert.equal(run.jobs.transfer,0);
  run.bonus=true;
  assert.equal(Rules.required(run,2).ready,true);
  for(let i=0;i<90;i++)Jobs.tick(run.jobs,run,{interactHeld:true});
  assert.equal(run.jobs.completed[2],true);
});
test('Early cashout does not force optional mastery tasks',()=>{
  const run=setup('cash-depot',1703);
  run.jobs.earlyCashout=true;
  assert.equal(Rules.required(run,1).ready,true);
  assert.equal(Rules.required(run,2).ready,true);
});
