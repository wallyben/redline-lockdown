const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { chromium } = require(process.env.REDLINE_PLAYWRIGHT || 'playwright-core');

const capture = process.argv.includes('--shots');
const normalClock = process.argv.includes('--normal');
if (capture) mkdirSync(resolve('screenshots'), { recursive: true });

async function play(browser, viewport, takeShots) {
  const page = await browser.newPage({ viewport, offline: true });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('file:')) external.push(request.url()); });
  if (!normalClock) await page.clock.install();
  await page.goto(pathToFileURL(resolve('game/index.html')).href);
  if (!normalClock) await page.clock.pauseAt(new Date(Date.now() + 1000));
  const advance = milliseconds => normalClock ? page.waitForTimeout(milliseconds) : page.clock.runFor(milliseconds);
  const shot = async name => {
    if (takeShots) await page.screenshot({ path: resolve('screenshots', name), type: 'jpeg', quality: 84 });
  };
  const state = expression => page.evaluate(expression);

  async function driveTo(x, y, speedLimit, maxFrames = 260, stopWithin = 22) {
    const held = new Set();
    for (let frame = 0; frame < maxFrames; frame++) {
      const { car, result } = await state(() => ({ car: state.car, result: pursuit.result }));
      if (result) break;
      const dx = x - car.x, dy = y - car.y, distance = Math.hypot(dx, dy);
      if (distance < stopWithin) {
        for (const key of held) await page.keyboard.up(key);
        return;
      }
      const desiredAngle = Math.atan2(dy, dx);
      const error = Math.atan2(Math.sin(desiredAngle - car.angle), Math.cos(desiredAngle - car.angle));
      const speed = Math.hypot(car.vx, car.vy);
      const desiredSpeed = distance < 100 ? Math.min(speedLimit, distance * 2.4) : speedLimit;
      const wanted = new Set();
      if (speed < desiredSpeed - 10) wanted.add('w');
      if (speed > desiredSpeed + 10) wanted.add('s');
      if (error > .09) wanted.add('d');
      if (error < -.09) wanted.add('a');
      for (const key of held) if (!wanted.has(key)) { await page.keyboard.up(key); held.delete(key); }
      for (const key of wanted) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
      await advance(34);
    }
    for (const key of held) await page.keyboard.up(key);
  }

  async function chooseUpgrade() {
    await page.locator('#upgrade-choices button').first().click();
    await page.locator('#continue-job').click();
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
  await shot('02-start.jpg');
  await page.keyboard.press('Enter');

  // Rolling pickup and visible pursuit.
  await page.keyboard.down('w');
  await advance(1100);
  await page.keyboard.up('w');
  assert.equal(await state(() => state.jobs.completed[0]), true);
  assert.equal(await state(() => state.jobs.pending), true);
  assert.equal(await page.locator('#upgrade-choices button').count(), 3);
  await chooseUpgrade();

  // Close the boulevard gate after passing its barrier; patrols must route around it.
  await driveTo(610, 400, 310, 180);
  await page.keyboard.down('Shift');
  await advance(34);
  await page.keyboard.up('Shift');
  await advance(900);
  const chase = await state(() => ({
    phase: state.traffic.phase,
    edge: [...state.traffic.closedEdges][0],
    tail: pursuit.tailRange,
    intercept: pursuit.intercept?.node, message:state.traffic.message, car:state.car.x,
  }));
  if(normalClock && chase.phase==='ready'){
    assert.match(chase.message,/occupied|barrier lane/,JSON.stringify(chase));
    console.log('Gate safely refused closure with a vehicle in its lane');
  }else{
    assert.equal(chase.phase,'closed',JSON.stringify(chase));
    assert.equal(chase.edge,'6:7');
  }
  assert.ok(chase.tail < 150, 'Police did not visibly close in: ' + chase.tail);
  await shot('01-chase.jpg');

  // Bank drill and second seeded upgrade.
  await driveTo(690, 400, 24, 180, 8);
  await brakeToStop();
  const bankApproach = await state(() => ({
    distance: Math.hypot(state.car.x - 690, state.car.y - 400),
    speed: Math.hypot(state.car.vx, state.car.vy),
  }));
  assert.ok(bankApproach.distance < 45 && bankApproach.speed < 36, 'Could not stop in bank bay: ' + JSON.stringify(bankApproach));
  await page.keyboard.press('e');
  await advance(950);
  await page.keyboard.press('e');
  await advance(80);
  assert.equal(await state(() => state.jobs.completed[1]), true, 'Vault interaction failed: ' + JSON.stringify(await state(() => ({ car: state.car, sweep: state.sweep, jobs: state.jobs.stage }))));
  assert.equal(await page.locator('#upgrade-choices button').count(), 3);
  await shot('03-risk.jpg');
  await chooseUpgrade();

  // Alley, moving courier and controlled transfer.
  await driveTo(690, 450, 80, 100);
  await driveTo(690, 650, 180, 150);
  await driveTo(1010, 650, 220, 140);
  await driveTo(1010, 790, 85, 120);
  await page.keyboard.down('s');
  for (let i = 0; i < 40; i++) {
    if (await state(() => Math.hypot(state.car.vx, state.car.vy) < 18)) break;
    await advance(34);
  }
  await page.keyboard.up('s');
  await page.keyboard.down('e');
  await advance(1500);
  await page.keyboard.up('e');
  await advance(34);
  assert.equal(await state(() => state.jobs.completed[2]), true, 'Courier transfer did not complete');
  assert.equal(await state(() => state.jobs.stage), 3);

  // Leave through the dock lane and hide under the loading canopy until all units search past.
  await driveTo(1010, 910, 160, 140);
  await driveTo(1010, 940, 90, 70);
  await driveTo(1290, 940, 180, 180, 8);
  await page.keyboard.down('Space');
  await advance(900);
  await page.keyboard.up('Space');
  await advance(10000);
  const result = await state(() => ({
    outcome: pursuit.result,
    lost: pursuit.lost,
    score: Pursuit.score(state, pursuit).total,
    done: state.jobs.completed,
    damage: state.car.damage,
    time: state.time, car: state.car, exitDistance: City.distance(state.car, Pursuit.exit),
  }));
  assert.deepEqual(result.done, [true, true, true]);
  assert.ok(['Escaped', 'Clean getaway'].includes(result.outcome), JSON.stringify(result));
  assert.ok(result.score > 0);
  assert.ok(result.lost >= await state(() => Pursuit.clearDuration(state)));
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.equal(await state(() => Records.table(Contracts[0].id).length), 1);
  await shot('04-results.jpg');

  // A real keyboard retry must start a fresh run; the saved record remains.
  await page.keyboard.press('r');
  assert.equal(await state(() => state.jobs.completed.some(Boolean)), false);
  assert.equal(await state(() => state.jobs.haul), 0);
  await page.keyboard.press('q');
  assert.equal(await state(() => state.smoke.charges), 1);
  await page.keyboard.press('q');
  assert.equal(await state(() => state.smoke.charges), 1, 'Smoke cooldown prevents repeated deployment');
  assert.equal(await state(() => Records.table(Contracts[0].id).length), 1);
  await page.keyboard.press('Escape');
  const paused = await state(() => state.time);
  await advance(240);
  assert.equal(await state(() => state.time), paused);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await page.locator('#patrol').selectOption('1');
  assert.equal(await page.locator('#patrol').inputValue(), '1');
  await page.reload();
  assert.equal(await state(() => Records.table(Contracts[0].id).length), 1);
  // Repeated restarts must not stack inputs, retain mission flags or lose the record.
  for (let restart = 0; restart < 10; restart++) {
    await page.keyboard.press('r');
    assert.deepEqual(await state(() => ({
      completed: state.jobs.completed,
      haul: state.jobs.haul,
      stage: state.jobs.stage,
      outcome: pursuit.result,
    })), { completed: [false, false, false], haul: 0, stage: 0, outcome: null });
    assert.equal(await state(() => Records.table(Contracts[0].id).length), 1);
  }
    console.log(`${viewport.width}×${viewport.height}${normalClock?' normal clock':''}: three jobs, gate interaction, upgrades, ${result.outcome} in ${result.time.toFixed(1)}s, score record, retry, pause, contract selection and offline checks passed`);
  await page.close();
}

(async () => {
  const executablePath = process.env.REDLINE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath, headless: !process.env.REDLINE_HEADFUL });
  try {
    await play(browser, { width: 1280, height: 720 }, capture);
    if (!normalClock) await play(browser, { width: 1920, height: 1080 }, false);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
