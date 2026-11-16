const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const cityArt = Art.buildCity();
const brief = document.querySelector('#brief');
const hud = document.querySelector('#hud');
const startButton = document.querySelector('#start');
const keys = new Set();
let state = Drive.reset();
let pursuit = Pursuit.reset();
let mode = 'title';
let interact = false;
let previous = performance.now();
let accumulator = 0;
let banner = '';

function start() {
  state = Drive.reset();
  pursuit = Pursuit.reset();
  interact = false;
  mode = 'playing';
  brief.hidden = true;
  hud.hidden = false;
  startButton.blur();
}

function pause() {
  mode = 'paused';
  brief.querySelector('h1').innerHTML = 'REDLINE <span>LOCKDOWN</span>';
  brief.querySelector('p').textContent = 'Paused. Press Escape or Enter to resume.';
  startButton.textContent = 'Resume ↵';
  brief.hidden = false;
}

function finish() {
  mode = 'results';
  const s = Pursuit.score(state, pursuit);
  brief.querySelector('h1').innerHTML = 'RUN <span>REPORT</span>';
  brief.querySelector('p').textContent = pursuit.result + '  /  ' + s.total.toLocaleString() + ' pts\n' +
    'Recorder +' + s.recorder + '  ·  Extraction +' + s.extraction +
    '  ·  Pace +' + s.pace + '  ·  Damage −' + s.repairs;
  startButton.textContent = 'Drive again ↵';
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

function render() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio, 1.5);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rect(0, 0, w, h, '#09111a');
  const title = mode === 'title';
  const c = title ? { x: 690, y: 400, angle: -.11, vx: 0, vy: 0 } : state.car;
  const time = title ? performance.now() / 1000 : state.time;
  const zoom = title ? Math.max(1.7, h / 335) : Math.max(0.75, Math.min(1.3, h / 665));
  ctx.save();
  ctx.translate(w * (mode === 'title' ? .72 : .5) - (c.x + c.vx * .32) * zoom, h * .54 - (c.y + c.vy * .32) * zoom);
  ctx.scale(zoom, zoom);
  ctx.drawImage(cityArt, 0, 0);
  Art.weather(ctx, c, time, w / zoom, h / zoom);
  if (!title && !state.collected) marker(Drive.pickup, 'RECORDER', '#f4c468');
  if (state.collected) {
    marker(Pursuit.exit, pursuit.lost >= 2.5 ? 'EXTRACT' : 'BREAK CONTACT', '#82ffbf');
    if (pursuit.intercept) {
      const target = City.nodes[pursuit.intercept.node];
      marker(target, pursuit.block ? 'ROADBLOCK' : 'INTERCEPT INBOUND', '#ff657f');
      if (pursuit.block) {
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.rotate(pursuit.units[1].angle);
        for (let x = -38; x <= 37; x += 10) rect(x, -2, 7, 4, '#ffba7d');
        ctx.restore();
      }
    }
    for (const unit of pursuit.units) Art.car(ctx, unit, true, state.time);
  }
  Art.car(ctx, c, false, time);
  ctx.restore();
  const destination = state.collected ? Pursuit.exit : Drive.pickup;
  const near = City.distance(c, Drive.pickup) < 45;
  const range = Math.round(City.distance(c, destination));
  const driveAngle = Math.atan2(destination.y - c.y, destination.x - c.x);
  const arrow = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(driveAngle / (Math.PI / 4)) + 8) % 8];
  const shade = ctx.createRadialGradient(w * .56, h * .52, h * .23, w * .56, h * .52, w * .68);
  shade.addColorStop(0, '#0b142000');
  shade.addColorStop(1, '#050916a8');
  rect(0, 0, w, h, shade);
  if (mode !== 'title') Art.minimap(ctx, w, h, state, pursuit);
  if (state.sweep >= 0 && !state.collected) {
    const x = w / 2 - 105;
    const y = h - 66;
    rect(x - 12, y - 31, 234, 56, '#0b121be8');
    rect(x, y, 210, 7, '#374554');
    rect(x + 65.6, y, 61.3, 7, '#55efaa');
    rect(x + Math.min(210, state.sweep / 2.4 * 210), y - 4, 3, 15, '#ffffff');
    ctx.fillStyle = '#f8ead3';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText('PRESS E IN THE GREEN BAND', x, y - 12);
  }
  const nextBanner = (state.collected ? (pursuit.block ? 'ROADBLOCK ACTIVE' : pursuit.intercept ? 'INTERCEPT INBOUND' : 'RECORDER SECURED') +
    '\n' + (pursuit.seen ? 'Spotted · take a side street' : pursuit.lost < 2.5 ?
      'Breaking contact · ' + pursuit.lost.toFixed(1) + ' s' : 'Contact lost · extraction ' + arrow + ' ' + range + ' m') : state.sweep >= 0
    ? 'Tuning recorder'
    : near ? 'Stop at the recorder and press E' : 'Recorder ' + arrow + ' ' + range + ' m') +
    '\n' + Math.ceil(Math.max(0, 180 - state.time)) + ' s · ' + Math.round(Math.hypot(c.vx, c.vy) * .55) + ' km/h · ' + Math.max(0, 100 - Math.round(c.damage)) + '% integrity';
  if (nextBanner !== banner) { hud.textContent = nextBanner; banner = nextBanner; }
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
      Pursuit.tick(pursuit, state);
      if (pursuit.result) finish();
    }
    accumulator -= 1 / 60;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
