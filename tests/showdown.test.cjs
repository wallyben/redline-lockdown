const {test}=require('node:test');
const assert=require('node:assert/strict');
const City=require('../game/src/city.js');
const Drive=require('../game/src/drive.js');
const Traffic=require('../game/src/traffic.js');
const Pursuit=require('../game/src/pursuit.js');
const Lockdown=require('../game/src/lockdown.js');
const Showdown=require('../game/src/showdown.js');

function setup(){
  const run=Drive.reset(),p=Pursuit.reset();
  run.seed=1701;run.contractId='iris';run.collected=true;run.jobs.stage=3;
  run.lockdown=Lockdown.reset();Lockdown.tick(run,p);
  p.refitGrace=4;Pursuit.tick(p,run);
  return {run,p};
}
test('the final boss is a real commander car on a connected drivable road',()=>{
  const {run,p}=setup();
  assert.equal(p.showdown.active,true);
  assert.equal(p.lockdownUnit.role,'commander');
  assert.ok(p.units.includes(p.lockdownUnit));
  assert.ok(p.lockdownUnit.path.length>0);
  assert.equal(p.showdown.countered,false);
  assert.ok(City.route(City.nearest(p.lockdownUnit),p.lockdownTarget,run.traffic).length>=0);
});
test('radio decoy gives the boss a real new pursuit destination',()=>{
  const {run,p}=setup();
  p.sighting={x:run.car.x,y:run.car.y,dx:1,dy:0};
  assert.equal(Pursuit.deployDecoy(p,run),true);
  Pursuit.tick(p,run,1/60);
  assert.equal(p.lockdownTarget,'decoy');
  assert.equal(p.showdown.countered,true);
  assert.match(p.showdown.event,/SPOOFED/);
  assert.ok(p.lockdownUnit.path.length>0,'boss must move toward the false radio report');
  p.result='Escaped';
  assert.equal(Pursuit.score(run,p).commanderBonus,750);
  run.jobs.earlyCashout=true;
  assert.equal(Pursuit.score(run,p).commanderBonus,0);
});
test('a real blocked police edge records the original and re-routed paths',()=>{
  const {run,p}=setup();
  p.units[0].path=[{...City.nodes[7],edge:[6,7]}];
  p.units[0].edge=[6,6];
  p.sighting={x:690,y:400,dx:1,dy:0};
  p.refresh=100;
  run.traffic.phase='closed';
  run.traffic.selected=Traffic.gates[0];
  run.traffic.closedEdges.add(City.edgeKey(6,7));
  Pursuit.tick(p,run,1/60);
  assert.equal(p.routeBreak.real,true);
  assert.ok(p.routeBreak.old.length>=2);
  assert.ok(p.routeBreak.next.length>0);
  assert.equal(p.showdown.countered,true);
  assert.equal(p.feint,true);
});
test('command warning only activates during the genuine final lockdown',()=>{
  const p=Pursuit.reset();
  const run=Drive.reset();run.lockdown=Lockdown.reset();
  Showdown.tick(p,run);
  assert.equal(p.showdown.active,false);
  run.lockdown.active=true;
  Showdown.tick(p,run);
  assert.equal(p.showdown.active,true);
});
