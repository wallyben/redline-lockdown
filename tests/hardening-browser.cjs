// Focus and silent-audio smoke tests run against the real offline build.
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.REDLINE_PLAYWRIGHT||'playwright-core');
(async()=>{
  const browser=await chromium.launch({
    executablePath:process.env.REDLINE_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:!process.env.REDLINE_HEADFUL
  });
  try {
    const target=pathToFileURL(resolve('game/index.html')).href;
    const p=await browser.newPage({offline:true,viewport:{width:1280,height:720}});
    const errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(target);
    await p.locator('#mute').focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(()=>mode),'title','Enter on mute must not accidentally start a run');
    assert.equal(await p.locator('#mute').textContent(),'Sound off');
    await p.locator('#start').focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.evaluate(()=>mode),'playing','Native keyboard activation on Drive must start');
    assert.deepEqual(errors,[]);
    await p.close();
    const silent=await browser.newPage({offline:true});
    const silentErrors=[];
    silent.on('pageerror',e=>silentErrors.push(e.message));
    await silent.addInitScript(()=>{
      Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});
      Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
    });
    await silent.goto(target);
    await silent.keyboard.press('Enter');
    assert.equal(await silent.evaluate(()=>mode),'playing','Missing Web Audio must not prevent a run');
    await silent.keyboard.down('w');
    await silent.waitForTimeout(500);
    await silent.keyboard.up('w');
    assert.ok(await silent.evaluate(()=>state.time>0),'Silent gameplay must advance');
    assert.deepEqual(silentErrors,[]);
    await silent.close();
    console.log('Offline focus, native keyboard and missing-audio smoke tests passed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
