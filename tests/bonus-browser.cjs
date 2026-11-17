const assert = require('node:assert/strict');
const { chromium } = require(process.env.REDLINE_PLAYWRIGHT || 'playwright-core');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.REDLINE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: !process.env.REDLINE_HEADFUL,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, offline: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(pathToFileURL(resolve('game/index.html')).href);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const advance = milliseconds => page.clock.runFor(milliseconds);
    const state = expression => page.evaluate(expression);

    async function driveTo(x, y, speedLimit, maxFrames = 260, stopWithin = 22) {
      const held = new Set();
      for (let frame = 0; frame < maxFrames; frame++) {
        const { car, result } = await state(() => ({ car: state.car, result: pursuit.result }));
        if (result) break;
        const dx = x - car.x, dy = y - car.y, distance = Math.hypot(dx, dy);
        if (distance < stopWithin) break;
        const error = Math.atan2(Math.sin(Math.atan2(dy, dx) - car.angle), Math.cos(Math.atan2(dy, dx) - car.angle));
        const speed = Math.hypot(car.vx, car.vy), desired = distance < 100 ? Math.min(speedLimit, distance * 2.4) : speedLimit;
        const wanted = new Set();
        if (speed < desired - 10) wanted.add('w');
        if (speed > desired + 10) wanted.add('s');
        if (error > .09) wanted.add('d');
        if (error < -.09) wanted.add('a');
        for (const key of held) if (!wanted.has(key)) { await page.keyboard.up(key); held.delete(key); }
        for (const key of wanted) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
        await advance(34);
      }
      for (const key of held) await page.keyboard.up(key);
    }

    async function brakeToStop() {
      for (let frame = 0; frame < 70; frame++) {
        if (await state(() => Math.hypot(state.car.vx, state.car.vy) < 12)) break;
        await page.keyboard.down('s');
        await advance(34);
      }
      await page.keyboard.up('s');
      await advance(100);
    }

    await page.locator('#patrol').selectOption('0');
    await page.keyboard.press('Enter');
    await page.keyboard.down('w'); await advance(1100); await page.keyboard.up('w');
    assert.equal(await state(() => state.jobs.completed[0]), true, 'Rolling pickup did not start the job chain');
    await page.locator('#upgrade-choices button').first().click();
    await page.locator('#continue-job').click();

    await driveTo(610, 400, 310, 180);
    await page.keyboard.down('Shift'); await advance(34); await page.keyboard.up('Shift'); await advance(900);
    await driveTo(690, 400, 24, 180, 8);
    await brakeToStop();
    await page.keyboard.press('e'); await advance(950); await page.keyboard.press('e'); await advance(80);
    assert.equal(await state(() => state.jobs.completed[1]), true, 'Vault drill did not complete: ' + JSON.stringify(await state(() => ({car:state.car,sweep:state.sweep,stage:state.jobs.stage,mode}))))
    await page.locator('#upgrade-choices button').first().click();
    await page.locator('#continue-job').click();

    await driveTo(690, 450, 80, 100);
    await driveTo(690, 650, 180, 150);
    await driveTo(1010, 650, 180, 180, 8);
    await brakeToStop();
    const approach = await state(() => ({ distance: Math.hypot(state.car.x - 1010, state.car.y - 650), speed: Math.hypot(state.car.vx, state.car.vy) }));
    assert.ok(approach.distance < 45 && approach.speed < 36, 'Could not stop at the optional cash: ' + JSON.stringify(approach));
    await page.keyboard.press('e'); await advance(950); await page.keyboard.press('e'); await advance(80);
    assert.equal(await state(() => state.bonus), true, 'Optional cash interaction failed');
    assert.equal(await state(() => pursuit.bonusAlarm), true, 'Optional cash did not publish its alarm');
    await advance(15000);
    const result = await state(() => ({ outcome: pursuit.result, score: Pursuit.score(state, pursuit).total, time: state.time,units:pursuit.units,car:state.car }));
    assert.equal(result.outcome, 'Intercepted', 'The optional-alarm capture path did not resolve: ' + JSON.stringify(result));
    assert.equal(result.score, 0);
    assert.equal(await state(() => Records.table(Contracts[0].id).length), 0, 'Captured cash must not bank');
    assert.deepEqual(errors, []);
    console.log(`1280×720 offline Chrome: optional cash raised the alarm, capture resolved at ${result.time.toFixed(1)}s, no score banked`);
    await page.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
