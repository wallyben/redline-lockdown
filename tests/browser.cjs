const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { chromium } = require(process.env.REDLINE_PLAYWRIGHT || 'playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, offline: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.goto(pathToFileURL(resolve('game/index.html')).href);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.keyboard.press('Enter');
    await page.keyboard.down('w');
    await page.clock.runFor(2110);
    await page.keyboard.up('w');
    await page.keyboard.down('s');
    await page.clock.runFor(420);
    await page.keyboard.up('s');
    await page.clock.runFor(55);
    await page.keyboard.press('e');
    await page.clock.runFor(950);
    await page.keyboard.press('e');
    await page.clock.runFor(40);
    assert.equal(await page.evaluate(() => state.collected), true);
    await page.keyboard.press('r');
    await page.clock.runFor(30);
    assert.deepEqual(await page.evaluate(() => [state.car.x, state.car.y, state.collected]), [130, 400, false]);
    await page.keyboard.down('w');
    await page.clock.runFor(5800);
    await page.keyboard.up('w');
    assert.ok(await page.evaluate(() => state.car.hits > 0));
    assert.deepEqual(errors, []);
    console.log('Offline Chrome: keyboard drive, scan, restart and wall collision passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

