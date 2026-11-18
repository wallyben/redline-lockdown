const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const source=readFileSync(resolve(__dirname,'../game/src/hud.js'),'utf8');
const dependencies={
  ContractRules:{required:()=>({ready:true,task:''}),nextAction:()=>''},
  Lockdown:{exits:[{name:'EAST DOCK'},{name:'WEST QUAY'}]},
  Pursuit:{clearDuration:()=>3.8},
  Traffic:{near:()=>null},
  Tutorial:{hint:()=>({key:'DRIVE',text:'KEEP MOVING'})}
};
const create=()=>({
  jobs:{stage:0,haul:0,multiplier:1,heat:0,transfer:0},
  car:{vx:0,vy:0,damage:0},time:0,collected:false,
  traffic:{gridfallFlash:0,radioJam:0,phase:'ready',charges:3},
  smoke:{charges:2,maxCharges:2},momentum:{charge:.2,nearMisses:0}
});
const police={
  contact:0,seen:false,lost:0,nearestRange:400,decoyCharges:2,
  decoyCooldown:0,units:[],showdown:{countered:false},intercept:null
};
test('full 60 fps simulation only reparses tactical DOM ~10 times per second',()=>{
  const hud=runInNewContext(source+'\nChaseHUD;',dependencies);
  let paints=0;
  const el={set innerHTML(value){paints++}};
  const r=create();
  for(let frame=0;frame<60;frame++){
    r.time=frame/60;
    hud.update(el,r,police,'→',500-frame);
  }
  assert.ok(paints>=8 && paints<=12,'HUD should reflow ~10 Hz; got '+paints);
  const before=paints;
  r.jobs.stage=1;
  hud.update(el,r,police,'→',50);
  assert.equal(paints,before+1,'A new objective must update immediately');
  const after=paints;
  const restarted=create();
  hud.update(el,restarted,police,'→',500);
  assert.equal(paints,after+1,'Fresh run must refresh HUD even when game time resets');
});
