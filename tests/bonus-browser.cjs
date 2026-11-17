const assert=require('node:assert/strict');
const {chromium}=require(process.env.REDLINE_PLAYWRIGHT);
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:!process.env.REDLINE_HEADFUL});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.goto(pathToFileURL(resolve('game/index.html')).href);
 await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.locator('#patrol').selectOption(process.env.REDLINE_CONTRACT || '0');
 await page.locator('#patrol').evaluate(e=>e.blur());
 await page.keyboard.press('Enter');
 const advance=n=>page.clock.runFor(n);
 const scan=async()=>{await page.keyboard.press('e');await advance(950);await page.keyboard.press('e');await advance(40);};
 await page.keyboard.down('w');await advance(1800);await page.keyboard.up('w');
 await page.keyboard.down('s');await advance(420);await page.keyboard.up('s');await advance(55);await scan();
 const path=[[695,485,120],[690,600,150],[725,650,90],[1010,650,210,1],[900,650,135],[735,650,120],[690,650,75],[690,800,100],[710,910,110],[840,910,210],[1290,910,325]];
 let index=0;const held=new Set();
 async function release(){for(const key of held)await page.keyboard.up(key);held.clear();}
 for(let t=0;t<1100;t++){
  const {c,result}=await page.evaluate(()=>({c:state.car,result:pursuit.result}));
  if(result)break;
  const [x,y,v,stop]=path[index],d=Math.hypot(x-c.x,y-c.y),speed=Math.hypot(c.vx,c.vy);
  if(stop&&d<40&&speed<30){
   await release();
   await page.screenshot({path:'screenshots/03-risk.jpg',quality:82});
   await scan();assert.equal(await page.evaluate(()=>state.bonus),true);
   if(process.env.REDLINE_FAIL){await advance(15000);break;}
   index++;continue;
  }
  if(!stop&&d<35&&index<path.length-1){index++;continue;}
  const delta=Math.atan2(y-c.y,x-c.x)-c.angle,error=Math.atan2(Math.sin(delta),Math.cos(delta));
  const desire=(stop||index===path.length-1)&&d<100?Math.max(0,d*3-45):Math.abs(error)>.5?Math.min(90,v):v;
  const wanted=new Set();
  if(speed<desire-7)wanted.add('w');if(speed>desire+7)wanted.add('s');
  if(error>.08)wanted.add('d');if(error<-.08)wanted.add('a');
  for(const key of held)if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}
  for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
  await advance(17);
 }
 await release();
 const result=await page.evaluate(()=>({result:pursuit.result,bonus:state.bonus,score:Pursuit.score(state,pursuit),time:state.time,car:{x:state.car.x,y:state.car.y},police:pursuit.units.map(u=>({x:u.x,y:u.y})),seen:pursuit.seen,block:pursuit.block}));
 console.log(result);assert.equal(result.bonus,true);if(process.env.REDLINE_FAIL){assert.equal(result.score.total,0);assert.equal(await page.evaluate(()=>Records.table(Contracts[Number(layoutInput.value)].id).length),0);}else assert.ok(['Clean getaway','Escaped'].includes(result.result));
 if(!process.env.REDLINE_FAIL)await page.screenshot({path:'screenshots/04-results.jpg',quality:82});
 assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
