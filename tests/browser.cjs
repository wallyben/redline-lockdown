const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { chromium } = require(process.env.REDLINE_PLAYWRIGHT || 'playwright-core');

async function play(browser, viewport, capture) {
  const page = await browser.newPage({ viewport, offline: true });
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('file:')) external.push(r.url()); });
  await page.clock.install();
  await page.goto(pathToFileURL(resolve('game/index.html')).href);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const shot = async name => {
    if (capture) await page.screenshot({ path: 'screenshots/' + name + '.jpg', quality: 82, timeout: 15000 });
  };
  const advance = ms => page.clock.runFor(ms);
  const press = key => page.keyboard.press(key);
  async function pickup() {
    await page.keyboard.down('w');
    await advance(2110);
    await page.keyboard.up('w');
    await page.keyboard.down('s');
    await advance(420);
    await page.keyboard.up('s');
    await advance(55);
    await press('e');
    await advance(950);
    await press('e');
    await advance(40);
    assert.equal(await page.evaluate(() => state.collected), true);
  }

  await shot('01-title');
  await press('Enter');
  await pickup();
  assert.equal(await page.evaluate(() => pursuit.intercept.node), 8);
  assert.match(await page.locator('#hud').textContent(), /INTERCEPT INBOUND/);
  await press('Escape');
  const pausedAt = await page.evaluate(() => state.time);
  await advance(240);
  assert.equal(await page.evaluate(() => state.time), pausedAt);
  await press('Escape');

  const waypoints = [[695, 485, 120], [690, 800, 245], [710, 910, 125], [840, 910, 210], [1290, 910, 325]];
  let target = 0, blockade = false;
  const held = new Set();
  for (let i = 0; i < 310; i++) {
    const { car, result, block } = await page.evaluate(() => ({
      car: state.car, result: pursuit.result, block: pursuit.block,
    }));
    if (result) break;
    if (i === 15) await shot('02-pursuit');
    if (block && !blockade) {
      blockade = true;
      await shot('03-lockdown');
    }
    const [x, y, limit] = waypoints[target];
    const distance = Math.hypot(x - car.x, y - car.y);
    if (distance < 38 && target < waypoints.length - 1) target++;
    const delta = Math.atan2(y - car.y, x - car.x) - car.angle;
    const error = Math.atan2(Math.sin(delta), Math.cos(delta));
    const speed = Math.hypot(car.vx, car.vy);
    const desire = target === 4 && distance < 100 ? Math.max(0, distance * 3 - 45) :
      Math.abs(error) > .5 ? Math.min(95, limit) : limit;
    const wanted = new Set();
    if (speed < desire - 7) wanted.add('w');
    if (speed > desire + 7) wanted.add('s');
    if (error > .08) wanted.add('d');
    if (error < -.08) wanted.add('a');
    for (const key of held) if (!wanted.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of wanted) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
    await advance(34);
  }
  for (const key of held) await page.keyboard.up(key);
  assert.equal(blockade, true);
  const outcome = await page.evaluate(() => ({ result: pursuit.result, x: state.car.x, y: state.car.y, lost: pursuit.lost }));
  assert.equal(outcome.result, 'Clean getaway', JSON.stringify(outcome));
  assert.match(await page.locator('#brief p').textContent(), /Extraction \+2500/);
  await shot('04-results');
  await press('Enter');
  assert.deepEqual(await page.evaluate(() => [state.car.x, state.car.y, state.collected, pursuit.result]), [130, 400, false, null]);
  await page.keyboard.down('w');
  await advance(5800);
  await page.keyboard.up('w');
  assert.ok(await page.evaluate(() => state.car.hits > 0));
  await press('r');
  await pickup();
  await advance(4400);
  assert.equal(await page.evaluate(() => pursuit.result), 'Intercepted');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(viewport.width + '×' + viewport.height + ' offline Chrome: recorder, pause, interception, alternate-route victory, replay, crash and capture passed');
  await page.close();
}

(async () => {
  const executablePath = process.env.REDLINE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath });
  try {
    await play(browser, { width: 1280, height: 720 }, process.argv.includes('--shots'));
    if (!process.argv.includes('--capture-only')) await play(browser, { width: 1920, height: 1080 }, false);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

