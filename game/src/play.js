const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const brief = document.querySelector('#brief');
const hud = document.querySelector('#hud');
const startButton = document.querySelector('#start');
const keys = new Set();
let state = Drive.reset();
let mode = 'title';
let interact = false;
let previous = performance.now();
let accumulator = 0;

function start() {
  state = Drive.reset();
  interact = false;
  mode = 'playing';
  brief.hidden = true;
  hud.hidden = false;
  startButton.blur();
}

function pause() {
  mode = 'paused';
  brief.querySelector('p').textContent = 'Paused. Press Escape or Enter to resume.';
  startButton.textContent = 'Resume ↵';
  brief.hidden = false;
}

function confirm() {
  if (mode === 'paused') {
    mode = 'playing';
    brief.hidden = true;
    startButton.blur();
  } else if (mode !== 'playing') start();
}

startButton.onclick = confirm;
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Enter') confirm();
  if (e.code === 'KeyR' && mode !== 'title') start();
  if (e.code === 'Escape') {
    if (mode === 'playing') pause();
    else if (mode === 'paused') confirm();
  }
  if (e.code === 'KeyE') interact = true;
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (mode === 'playing') pause();
});
const down = (a, b) => Number(keys.has(a) || keys.has(b));

function rect(x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function marker(p, name, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 26 + 3 * Math.sin(state.time * 5), 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 12px system-ui';
  ctx.fillText(name, p.x - 24, p.y - 36);
}

function car(c, color) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  rect(-19, -9, 38, 18, color);
  rect(-8, -7, 15, 14, '#172b3a');
  rect(16, -7, 4, 4, '#e6f7ff');
  rect(16, 3, 4, 4, '#e6f7ff');
  rect(-19, -7, 3, 4, '#ff4c4f');
  rect(-19, 3, 3, 4, '#ff4c4f');
  ctx.restore();
}

function render() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio, 1.5);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rect(0, 0, w, h, '#09111a');
  const c = state.car;
  const zoom = Math.max(0.75, Math.min(1.3, h / 665));
  ctx.save();
  ctx.translate(w * .5 - (c.x + c.vx * .32) * zoom, h * .54 - (c.y + c.vy * .32) * zoom);
  ctx.scale(zoom, zoom);
  rect(78, 81, 1268, 878, '#263545');
  for (const y of City.ys) for (let x = 90; x < 1330; x += 35) rect(x, y, 16, 2, '#637384');
  for (const x of City.xs) for (let y = 90; y < 940; y += 35) rect(x, y, 2, 16, '#637384');
  for (const b of City.blocks) {
    rect(b.x, b.y, b.right - b.x, b.bottom - b.y, '#4a5666');
    rect(b.x + 7, b.y + 7, b.right - b.x - 14, b.bottom - b.y - 14, '#192435');
  }
  if (!state.collected) marker(Drive.pickup, 'RECORDER', '#f4c468');
  car(c, '#ef5b5e');
  ctx.restore();
  const near = City.distance(c, Drive.pickup) < 45;
  hud.textContent = (state.collected ? 'Recorder secured' : state.sweep >= 0
    ? 'Signal sweep  ' + state.sweep.toFixed(2) + ' / 2.40 s · press E between 0.75 and 1.45 s'
    : near ? 'Stop at the recorder and press E' : 'Find the recorder  →') +
    '\n' + Math.round(Math.hypot(c.vx, c.vy) * .55) + ' km/h · ' + Math.max(0, 100 - Math.round(c.damage)) + '% integrity';
}

function frame(now) {
  accumulator += Math.min((now - previous) / 1000, .1);
  previous = now;
  while (accumulator >= 1 / 60) {
    if (mode === 'playing') {
      Drive.tick(state, {
        gas: down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown'),
        turn: down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft'),
        drift: keys.has('Space'), interact,
      });
      interact = false;
    }
    accumulator -= 1 / 60;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
