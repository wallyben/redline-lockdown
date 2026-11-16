const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const Pursuit=require('../game/src/pursuit.js');
function storage(initial='[]',blocked=false){
 let value=initial;
 const context=vm.createContext({Pursuit,localStorage:{
  getItem(){if(blocked)throw Error();return value;},
  setItem(k,v){if(blocked)throw Error();value=v;}
 }});
 vm.runInContext(fs.readFileSync('game/src/records.js','utf8')+';globalThis.records=Records;',context);
 return context.records;
}
test('one bank, failure retention, score ordering and corrupt storage',()=>{
 const rows=storage();
 const contract={id:'iris'};
 const run=()=>({collected:true,bonus:true,time:20,car:{damage:0}});
 const win={result:'Clean getaway',feint:true};
 const a=run();
 assert.ok(rows.bank(a,win,contract));
 assert.equal(rows.bank(a,win,contract),null);
 assert.equal(rows.bank(run(),{result:'Intercepted'},contract),null);
 assert.equal(rows.table('iris').length,1);
 const b=run();b.time=10;
 rows.bank(b,win,contract);
 assert.equal(rows.table('iris')[0].time,10);
 const corrupt=storage('{');
 assert.equal(corrupt.table('iris').length,0);
 const blocked=storage('[]',true);
 blocked.bank(run(),win,contract);
 assert.equal(blocked.table('iris').length,1);
 assert.equal(blocked.persistent,false);
});
