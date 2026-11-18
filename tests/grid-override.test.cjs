const { test }=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Traffic=require('../game/src/traffic.js');
const Pursuit=require('../game/src/pursuit.js');
const Momentum=require('../game/src/momentum.js');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {resolve}=require('node:path');

function setup(){
  const run=Drive.reset(), p=Pursuit.reset();
  run.traffic=Traffic.reset();
  run.jobs.stage=1;run.collected=true;run.contractId='iris';
  run.momentum=Momentum.reset();
  run.momentum.charge=.85;
  run.car.x=130;run.car.y=400;
  return {run,p};
}
test('remote operator spends earned charge and seals a real street from far away',()=>{
  const {run,p}=setup();
  assert.equal(Traffic.near(run),null,'Player must genuinely be away from local consoles');
  const beforeUnits=p.units.map(u=>({x:u.x,y:u.y}));
  assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),true);
  assert.equal(run.momentum.remoteUsed,1);
  assert.ok(Math.abs(run.momentum.charge-.15)<1e-10);
  assert.equal(Momentum.activate(run),false,'Boost and sabotage share one resource');
  assert.equal(run.traffic.selected.id,'hotel-cut');
  assert.equal(run.traffic.charges,2);
  for(let i=0;i<60;i++)Traffic.tick(run.traffic,run,p);
  assert.equal(run.traffic.phase,'closed');
  assert.equal(run.traffic.remoteSealed,1,'Remote command only succeeds once road physically seals');
  assert.equal(City.edgeOpen(6,7,run.traffic),false);
  assert.deepEqual(p.units.map(u=>({x:u.x,y:u.y})),beforeUnits,'Remote hack must not teleport police');
  for(const exit of [15,19])assert.ok(City.route(City.nearest(run.car),exit,run.traffic).length>0);
});
test('one grid override per full run, even after charge re-accumulates',()=>{
  const {run,p}=setup();
  assert.equal(Traffic.override(run.traffic,run,p,'yard-cut'),true);
  for(let i=0;i<540;i++)Traffic.tick(run.traffic,run,p);
  run.momentum.charge=1;
  const charges=run.traffic.charges;
  assert.equal(Traffic.override(run.traffic,run,p,'dock-cut'),false);
  assert.equal(run.traffic.charges,charges);
  assert.equal(run.momentum.charge,1);
});
test('unearned, active-boost and invalid relay requests cannot spend any charge',()=>{
  const {run,p}=setup();
  run.momentum.charge=.69;
  assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),false);
  assert.equal(run.traffic.charges,3);
  run.momentum.charge=.95;run.momentum.active=1;
  assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),false);
  run.momentum.active=0;
  assert.equal(Traffic.override(run.traffic,run,p,'invented-cut'),false);
  assert.equal(run.momentum.charge,.95);
  run.collected=false;
  assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),false);
  assert.equal(run.traffic.phase,'ready');
});
test('unsafe blocked exits reject the override without charge loss',()=>{
  const {run,p}=setup();
  // On an arbitrary test graph, force a route rejection. This proves
  // the remote path shares the exact same safety predicate as local Shift.
  const old=City.route;
  try {
    City.route=()=>[];
    assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),false);
    assert.equal(run.momentum.remoteUsed,0);
    assert.equal(run.momentum.charge,.85);
    assert.equal(run.traffic.charges,3);
  } finally {City.route=old;}
});
test('every displayed tactical relay has a pixel-accurate mouse hit target',()=>{
  const source=readFileSync(resolve(__dirname,'../game/src/tactical-map.js'),'utf8');
  const tactical=runInNewContext(source+'\nTacticalMap;',{Traffic});
  for(const [w,h] of [[1280,720],[1920,1080],[850,680]]){
    const m=tactical.projection(w,h);
    for(const gate of Traffic.gates){
      const x=m.tx+gate.console.x*m.scale,y=m.ty+gate.console.y*m.scale;
      assert.equal(tactical.hitRelay(w,h,x,y)?.id,gate.id);
      assert.equal(tactical.hitRelay(w,h,x+60,y+60),null);
    }
  }
});

test('occupied remote relay aborts safely and refunds BOTH the boost charge and remote token',()=>{
  const {run,p}=setup();
  const before=run.momentum.charge;
  assert.equal(Traffic.override(run.traffic,run,p,'yard-cut'),true);
  // Put a stationary car in the exact barrier lane before the countdown.
  run.car.x=560;run.car.y=650;
  for(let i=0;i<245;i++)Traffic.tick(run.traffic,run,p);
  assert.equal(run.traffic.phase,'ready');
  assert.equal(run.traffic.remotePending,null);
  assert.equal(run.traffic.remoteSealed,0);
  assert.equal(run.traffic.charges,3);
  assert.equal(run.momentum.remoteUsed,0);
  assert.ok(Math.abs(run.momentum.charge-before)<1e-10);
  assert.equal(City.edgeOpen(11,12,run.traffic),true);
  // A genuine new tactical decision is available once the traffic clears.
  run.car.x=130;run.car.y=400;
  assert.equal(Traffic.override(run.traffic,run,p,'hotel-cut'),true);
});
