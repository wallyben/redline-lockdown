// Fully interactive offline browser proof for both non-Ghost contract circuits.
// All objective progression is achieved through real keyboard controls.
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {chromium}=require(process.env.REDLINE_PLAYWRIGHT||'playwright-core');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const modes=[{idx:1,name:'BREAK THE GRID'},{idx:2,name:'HIGH-RISK PAYDAY'}];
const capture=process.argv.includes('--shots');
if(capture)mkdirSync(resolve('screenshots'),{recursive:true});

async function play(browser,idx,name){
  const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
  const errors=[],external=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('request',req=>{if(!req.url().startsWith('file:'))external.push(req.url());});
  await page.clock.install();
  await page.goto(pathToFileURL(resolve('game/index.html')).href);
  await page.clock.pauseAt(new Date(Date.now()+1000));
  const advance=ms=>page.clock.runFor(ms);
  const read=fn=>page.evaluate(fn);

  async function driveTo(x,y,targetSpeed=180,maxFrames=300,stopWithin=20){
    const held=new Set();
    for(let frame=0;frame<maxFrames;frame++){
      const {car,result}=await read(()=>({car:state.car,result:pursuit.result}));
      if(result) break;
      const dx=x-car.x,dy=y-car.y,distance=Math.hypot(dx,dy);
      if(distance<stopWithin){for(const key of held)await page.keyboard.up(key);return true;}
      const desiredAngle=Math.atan2(dy,dx);
      const error=Math.atan2(Math.sin(desiredAngle-car.angle),Math.cos(desiredAngle-car.angle));
      const speed=Math.hypot(car.vx,car.vy);
      const desiredSpeed=distance<100?Math.min(targetSpeed,distance*2.4):targetSpeed;
      const wanted=new Set();
      if(speed<desiredSpeed-10)wanted.add('w');
      if(speed>desiredSpeed+10)wanted.add('s');
      if(error>.09)wanted.add('d');
      if(error<-.09)wanted.add('a');
      for(const key of held)if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}
      for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
      await advance(34);
    }
    for(const key of held)await page.keyboard.up(key);
    return false;
  }
  async function interceptMovingCourier(maxFrames=300){
    const held=new Set();
    for(let frame=0;frame<maxFrames;frame++){
      const data=await read(()=>({
        car:state.car,courier:state.jobs.courier,
        completed:state.jobs.completed[2],result:pursuit.result,transfer:state.jobs.transfer
      }));
      if(data.completed||data.result)break;
      const dx=data.courier.x-data.car.x,dy=data.courier.y-data.car.y;
      const distance=Math.hypot(dx,dy),speed=Math.hypot(data.car.vx,data.car.vy);
      const desiredSpeed=distance<65?25:distance<125?60:125;
      const error=Math.atan2(Math.sin(Math.atan2(dy,dx)-data.car.angle),Math.cos(Math.atan2(dy,dx)-data.car.angle));
      const wanted=new Set();
      if(speed<desiredSpeed-10)wanted.add('w');
      if(speed>desiredSpeed+10)wanted.add('s');
      if(error>.09 && distance>13)wanted.add('d');
      if(error<-.09 && distance>13)wanted.add('a');
      if(distance<64&&speed<72)wanted.add('e');
      for(const key of held)if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}
      for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
      await advance(34);
    }
    for(const key of held)await page.keyboard.up(key);
    return read(()=>state.jobs.completed[2]);
  }

  async function brake(){
    await page.keyboard.down('s');
    for(let i=0;i<75;i++){
      if(await read(()=>Math.hypot(state.car.vx,state.car.vy)<12))break;
      await advance(34);
    }
    await page.keyboard.up('s');await advance(100);
  }
  async function upgrade(){
    assert.equal(await page.locator('#upgrade-choices button').count(),3,'An actual contract upgrade must be offered');
    await page.locator('#upgrade-choices button').first().click();
    await page.locator('#continue-job').click();
  }
  async function drill(){
    await brake();
    await page.keyboard.press('e');await advance(950);
    await page.keyboard.press('e');await advance(100);
  }
  async function report(tag){
    const snapshot=await read(()=>({
      contract:state.contractId,stage:state.jobs.stage,jobDone:state.jobs.completed,car:state.car,
      road:state.traffic.phase,closures:state.traffic.successfulClosures,bonus:state.bonus,
      smoke:state.smoke?.charges,transfer:state.jobs.transfer,alert:state.jobs.event,
      police:pursuit.result,lost:pursuit.lost,seen:pursuit.seen,intercept:pursuit.intercept?.node,
      remaining:180-state.time
    }));
    console.log(name+' '+tag,JSON.stringify(snapshot));
    return snapshot;
  }

  try{
    await page.locator('#patrol').selectOption(String(idx));
    await page.keyboard.press('Enter');
    assert.equal(await read(()=>state.contractId),idx===1?'switch':'cash-depot');
    await page.keyboard.down('w');await advance(1100);await page.keyboard.up('w');
    assert.equal(await read(()=>state.jobs.completed[0]),true,'Rolling pickup never triggered');
    await upgrade();

    if(idx===1){
      // Grid: leave the short boulevard circuit, travel to the service-yard relay,
      // seal the road, then return to the bank along a safe alternative street.
      await driveTo(430,400,230,140);
      await driveTo(430,650,165,200);
      await driveTo(495,650,75,130,14);
      await page.keyboard.down('Shift');await advance(34);await page.keyboard.up('Shift');
      await driveTo(430,650,140,140);
      await advance(1000);
      let status=await report('AFTER GRID RELAY');
      assert.ok(status.closures>=1,'Grid relay never sealed: '+JSON.stringify(status));
      if(capture){
        await page.keyboard.down('Tab');
        await advance(110);
        await page.screenshot({path:resolve('screenshots/03-risk.jpg'),type:'jpeg',quality:84});
        await page.keyboard.up('Tab');
      }
      await driveTo(430,530,45,230,8);
    }else{
      await page.keyboard.press('q');
      await driveTo(520,400,45,230,8);
    }

    await drill();
    assert.equal(await read(()=>state.jobs.completed[1]),true,'Vault drill incomplete: '+JSON.stringify(await report('BANK')));
    await upgrade();

    if(idx===1){
      // Grid's courier stays in the western service corridor the relay opened.
      await driveTo(430,650,90,140);
    }else{
      // Payday: first travel to the cash depot, then the southern freight courier.
      // Force police to chase a false radio report while we cut southeast.
      if(await read(()=>pursuit.decoyCharges>0&&!!pursuit.sighting))await page.keyboard.press('f');
      await driveTo(690,450,90,130);
      await driveTo(690,650,185,180);
      await driveTo(875,650,155,150,18);
      // The second smoke charge shields the exposed final depot approach.
      await page.keyboard.press('q');
      const reachedDepot = await driveTo(1010,650,95,170,8);
      const beforeDepot = await report('BEFORE DEPOT');
      assert.equal(reachedDepot,true,'Depot approach did not complete: '+JSON.stringify(beforeDepot));
      await drill();
      const afterDepot = await report('AFTER DEPOT');
      assert.equal(afterDepot.bonus,true,'Payday requires actual depot cash: '+JSON.stringify({beforeDepot,afterDepot}));
      await page.keyboard.press('f');
      await driveTo(1010,910,95,200,12);
    }

    const transferred=await interceptMovingCourier(350);
    let handoff=await report('AFTER COURIER');
    assert.equal(transferred,true,'Live courier matching failed despite active pursuit');
    assert.equal(handoff.jobDone[2],true,'Distinct courier transfer did not complete');
    assert.equal(handoff.stage,3);
    assert.equal(await read(()=>state.lockdown.active),true);
    assert.equal(await read(()=>ContractRules.escapeReady(state,pursuit)),true,'Contract mastery requirements not met');

    if(idx===1){
      // Sabotage creates a western escape corridor. Drive the ACTUAL alternate
      // exit rather than passing straight through the occupied dock blockade.
      await page.keyboard.press('2');
      assert.equal(await read(()=>state.lockdown.choice),1,'Grid selected the West Quay route');
      await driveTo(430,910,145,220);
      await page.keyboard.press('q');
      if(await read(()=>pursuit.decoyCharges>0&&!!pursuit.sighting))await page.keyboard.press('f');
      await driveTo(130,910,165,250,15);
      await brake();
    }else{
      assert.equal(await read(()=>state.lockdown.choice),1,'Payday must force West Quay');
      const decoyReady=await read(()=>pursuit.decoyCharges>0&&!!pursuit.sighting);
      if(decoyReady)await page.keyboard.press('f');
      await page.keyboard.press('q');
      // The already successful high-speed westbound breakout. Cover under
      // the quay remains available, but cannot be made mandatory for escape.
      await driveTo(690,910,220,230);
      await driveTo(430,910,220,200);
      await driveTo(130,910,170,240,15);
      await brake();
    }
    await advance(12000);
    const final=await read(()=>({
      result:pursuit.result,score:Pursuit.score(state,pursuit),contract:state.contractId,
      duration:state.time,completed:state.jobs.completed,clear:pursuit.lost,
      route:state.lockdown.choice,damage:state.car.damage,car:state.car
    }));
    console.log(name+' FINAL',JSON.stringify(final));
    assert.deepEqual(final.completed,[true,true,true],'All real mission objectives must complete');
    assert.ok(['Escaped','Clean getaway'].includes(final.result),'Contract must escape for real: '+JSON.stringify(final));
    assert.ok(final.score.total>0);
    if(idx===1)assert.ok(final.score.styleBonus>0,'Grid mastery scoring must be real');
    if(idx===2){assert.equal(final.route,1);assert.equal(final.score.routeBonus,1750);assert.ok(final.score.bonus>0);}
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    assert.equal(await read(()=>Records.table(state.contractId).length),1);
    console.log(name+' offline keyboard playthrough PASSED');
  }finally{await page.close();}
}
(async()=>{
  const browser=await chromium.launch({
    executablePath:process.env.REDLINE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:!process.env.REDLINE_HEADFUL,
  });
  try{for(const contract of modes)await play(browser,contract.idx,contract.name);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
