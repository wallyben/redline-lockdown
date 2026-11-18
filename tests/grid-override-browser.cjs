// Browser wiring checks use a controlled charge fixture only in test memory.
// No screenshot or leaderboard record is generated from the fixture.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.REDLINE_PLAYWRIGHT||'playwright-core');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.REDLINE_CHROME||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
   const page=await browser.newPage({offline:true,viewport:{width:1280,height:720}});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install();
   await page.goto(pathToFileURL(resolve('game/index.html')).href);
   await page.clock.pauseAt(new Date(Date.now()+1000));
   const advance=ms=>page.clock.runFor(ms);
   async function begin(){
     await page.keyboard.press('Enter');
     await page.keyboard.down('w');
     await advance(1100);
     await page.keyboard.up('w');
     assert.equal(await page.evaluate(()=>state.jobs.completed[0]),true);
     await page.locator('#upgrade-choices button').first().click();
     await page.locator('#continue-job').click();
     assert.equal(await page.evaluate(()=>state.jobs.stage),1);
   }
   await begin();
   await page.evaluate(()=>{state.momentum.charge=.9;});
   await page.keyboard.down('Tab');
   await page.keyboard.press('2');
   let snapshot=await page.evaluate(()=>({
     phase:state.traffic.phase,gate:state.traffic.selected?.id,
     used:state.momentum.remoteUsed,charge:state.momentum.charge,
     charges:state.traffic.charges,choice:state.lockdown.choice
   }));
   assert.equal(snapshot.phase,'warning',JSON.stringify(snapshot));
   assert.equal(snapshot.gate,'yard-cut');
   assert.equal(snapshot.used,1);
   assert.ok(Math.abs(snapshot.charge-.2)<1e-8);
   assert.equal(snapshot.charges,2);
   assert.equal(snapshot.choice,0,'Map command must not choose a different exit');
   await page.keyboard.up('Tab');
   await page.keyboard.press('b');
   assert.equal(await page.evaluate(()=>state.momentum.used),0,'Tactical hack spent the boost charge');
   // Verify browser wiring from a fresh run as well; the renderer and click
   // projection must agree at real display coordinates.
   await page.keyboard.press('r');
   await begin();
   await page.evaluate(()=>{state.momentum.charge=.9;});
   const pos=await page.evaluate(()=>{
     const m=TacticalMap.projection(innerWidth,innerHeight),q=Traffic.gates[2].console;
     return {x:m.tx+q.x*m.scale,y:m.ty+q.y*m.scale};
   });
   await page.keyboard.down('Tab');
   await page.mouse.click(pos.x,pos.y);
   snapshot=await page.evaluate(()=>({
     phase:state.traffic.phase,gate:state.traffic.selected?.id,
     used:state.momentum.remoteUsed,charge:state.momentum.charge
   }));
   assert.equal(snapshot.phase,'warning',JSON.stringify(snapshot));
   assert.equal(snapshot.gate,'dock-cut');
   assert.equal(snapshot.used,1);
   await page.keyboard.up('Tab');
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('Live TAB+relay hotkey, real canvas targeting and shared-charge controls passed');
 } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
