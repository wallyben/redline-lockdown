const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const {resolve}=require('node:path');
const source=readFileSync(resolve(__dirname,'../game/src/siren.js'),'utf8');

function boot(AudioContext) {
  const globals={};
  if(AudioContext)globals.AudioContext=AudioContext;
  return runInNewContext(source+`
    Siren.enable();
    Siren.update(42,1.4,false,.5);
    Siren.engine(true,200,0);
    Siren.cue();
    Siren.enable(); // repeated starts must remain safe
    'survived';
  `,{globalThis:globals,Promise});
}
test('Web Audio being unavailable never blocks starting or driving',()=>{
  assert.equal(boot(null),'survived');
});
test('Web Audio constructor rejection gracefully preserves silent play',()=>{
  class BlockedAudio {constructor(){throw new Error('Playback denied');}}
  assert.equal(boot(BlockedAudio),'survived');
});
