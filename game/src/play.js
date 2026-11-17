const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const cityArt = Art.buildCity();
const brief = document.querySelector('#brief');
const hud = document.querySelector('#hud');
const startButton = document.querySelector('#start');
const layoutInput = document.querySelector('#patrol');
const layoutChoice = document.querySelector('#patrol-choice');
Contracts.forEach(({ name }, index) => layoutInput.add(new Option(name, index)));
const keys = new Set();
let state = Drive.reset();
let pursuit = Pursuit.reset();
let mode = 'title';
let interact = false;
let previous = performance.now();
let accumulator = 0;
let banner = '';
let camera = null;
let muted = false, reducedFlash = false;
document.querySelector('#mute').onclick = e => {
  muted = !muted;
  e.target.textContent = muted ? 'Sound off' : 'Sound on';
};
document.querySelector('#flash').onclick = e => {
  reducedFlash = !reducedFlash;
  e.target.textContent = reducedFlash ? 'Steady lights' : 'Full lights';
};

function start() {
  Siren.enable();
  camera = null;
  state = Drive.reset();
  pursuit = Pursuit.reset(Contracts[Number(layoutInput.value)].layout);
  state.seed = Contracts[Number(layoutInput.value)].seed;
  pursuit.pressure = Contracts[Number(layoutInput.value)].pressure;
  interact = false;
  mode = 'playing';
  brief.hidden = true;
  hud.hidden = false;
  startButton.blur();
}

function pause() {
  mode = 'paused';
  layoutChoice.hidden = true;
  brief.querySelector('h1').innerHTML = 'REDLINE <span>LOCKDOWN</span>';
  brief.querySelector('p').textContent = 'Paused. Press Escape or Enter to resume.';
  startButton.textContent = 'Resume ↵';
  brief.hidden = false;
}

function finish() {
  mode = 'results';
  hud.hidden = true;
  layoutChoice.hidden = false;
  const s = Pursuit.score(state, pursuit);
  const record = Records.bank(state, pursuit, Contracts[Number(layoutInput.value)]);
  brief.querySelector('h1').innerHTML = 'RUN <span>REPORT</span>';
  brief.querySelector('p').textContent = pursuit.result + '  /  ' + s.total.toLocaleString() + ' pts\n' +
    'Vault cash +' + s.recorder + '  ·  Escape +' + s.extraction +
    '  ·  Optional cash +' + s.bonus + '  ·  Time +' + s.pace + '\nCar condition +' + s.condition + '  ·  Interceptor feint +' + s.feint + '\n' + (record ? 'Personal best ' + Records.table(Contracts[Number(layoutInput.value)].id)[0].total + ' · ' + (record.delta === null ? 'First record' : (record.delta >= 0 ? '+' : '') + record.delta + ' vs best') : 'No score banked');
  const contract = Contracts[Number(layoutInput.value)];
  const medal = s.total >= contract.gold ? 'GOLD' : s.total >= contract.gold*.85 ? 'SILVER' : s.total ? 'BRONZE' : 'NO SCORE BANKED';
  brief.querySelector('p').textContent += '\nPoints bank only on escape. Capture or wreck: 0 points.\n' + (s.total > 0 && state.car.damage <= 5 ? 'CLEAN ESCAPE · ' : s.total > 0 ? 'ESCAPED · ' : '') + medal + (s.total ? ' · ' + Math.abs(s.total-contract.gold) + (s.total >= contract.gold ? ' above Gold target' : ' to Gold target') : '') +
    '\n' + state.time.toFixed(1) + ' seconds · ' + Math.max(0,100-state.car.damage).toFixed(0) + '% integrity';
  startButton.textContent = 'Retry ↵';
  brief.querySelector('p').textContent += '\nC · contract select';
  brief.hidden = false;
}

function confirm() {
  if (mode === 'paused') {
    mode = 'playing';
    brief.hidden = true;
    startButton.blur();
  } else if (mode !== 'playing') start();
}

function showContract() {
  mode = 'title';
  brief.hidden = false;
  hud.hidden = true;
  layoutChoice.hidden = false;
  const c = Contracts[Number(layoutInput.value)];
  const best = Records.table(c.id)[0];
  brief.querySelector('h1').innerHTML = 'REDLINE <span>LOCKDOWN</span>';
  brief.querySelector('p').textContent = 'Take the vault cash and escape to the docks. The optional cash depot pays +1,600 and starts another alarm.\n' +
    c.goal + '\nGold target ' + c.gold + ' · Personal best ' + (best ? best.total : '—') +
    '\nEarn Gold on all three contracts · ' +
    Contracts.filter(c => (Records.table(c.id)[0]?.total || 0) >= c.gold).length + '/3' +
    '\nPoints: vault 1,000 · escape 2,500 · optional cash 1,600 · time up to 800 · condition up to 500 · interceptor feint 500.' +
    (Records.persistent ? '' : '\nRecords available for this session only');
  const rows=Records.table(c.id);
  brief.querySelector('p').textContent += rows.length ? '\n\nPERSONAL RECORDS\n' +
    rows.map(r=>r.total+' pts · '+r.time.toFixed(1)+' s · '+r.integrity.toFixed(0)+'%').join('\n') : '';
  startButton.textContent = 'Drive ↵';
}
layoutInput.onchange = showContract;
showContract();
startButton.onclick = confirm;
window.addEventListener('keydown', e => {
  if (e.target === layoutInput) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Enter') confirm();
  if (e.code === 'KeyC' && mode !== 'playing') showContract();
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

function drawTraffic() {
  for (const gate of Traffic.gates) {
    const console = gate.console;
    ctx.fillStyle = state.traffic.selected?.id === gate.id && state.traffic.phase === 'warning' ? '#ffe89c' : '#54ffca';
    ctx.fillRect(console.x - 9, console.y - 9, 18, 18);
    ctx.strokeStyle = '#07151c'; ctx.lineWidth = 2; ctx.strokeRect(console.x - 5, console.y - 5, 10, 10);
    ctx.fillStyle = '#e3fff8'; ctx.font = 'bold 8px system-ui'; ctx.fillText('RELAY', console.x - 15, console.y - 13);
  }
  if (state.traffic.barrier) {
    const b = state.traffic.barrier;
    ctx.save(); ctx.translate(b.x,b.y);
    if (b.orientation === 'h') {
      ctx.fillStyle = '#141a20'; ctx.fillRect(-5,-b.span,10,b.span*2);
      for(let y=-b.span;y<b.span;y+=12){ctx.fillStyle=Math.floor((y+b.span)/12)%2?'#ffe091':'#ff5267';ctx.fillRect(-6,y,12,7);}
    } else {
      ctx.fillStyle = '#141a20'; ctx.fillRect(-b.span,-5,b.span*2,10);
      for(let x=-b.span;x<b.span;x+=12){ctx.fillStyle=Math.floor((x+b.span)/12)%2?'#ffe091':'#ff5267';ctx.fillRect(x,-6,7,12);}
    }
    ctx.restore();
  }
  if (state.traffic.phase === 'warning' && state.traffic.barrier === null && state.traffic.selected) {
    const gate = state.traffic.selected, [a,b] = gate.edge, p=City.nodes[a], q=City.nodes[b];
    ctx.strokeStyle = '#ff6b62'; ctx.lineWidth = 7; ctx.setLineDash([11,8]);
    const x=(p.x+q.x)/2,y=(p.y+q.y)/2;
    ctx.beginPath();
    if(p.y===q.y){ctx.moveTo(x,y-36);ctx.lineTo(x,y+36);}else{ctx.moveTo(x-36,y);ctx.lineTo(x+36,y);}
    ctx.stroke(); ctx.setLineDash([]);
  }
}

function chaseCamera(car, w, h, title) {
  const base = Math.max(.75, Math.min(1.45, h / 535));
  if (title) return { x: 600, y: car.y, zoom: Math.max(1.5, Math.min(1.8, h / 450)) };
  const point = { x: car.x + Math.cos(car.angle) * 250, y: car.y + Math.sin(car.angle) * 250 };
  const junction = City.nodes[City.nearest(point)];
  const tail = pursuit.units[0];
  const subjects = state.collected && pursuit.tailRange < 380 ? [car, junction, tail] : [car, junction];
  const left = Math.min(...subjects.map(p => p.x)), right = Math.max(...subjects.map(p => p.x));
  const top = Math.min(...subjects.map(p => p.y)), bottom = Math.max(...subjects.map(p => p.y));
  const zoom = Math.min(base, w / (right - left + 180), h / (bottom - top + 160));
  const next = { x: (left + right) / 2, y: (top + bottom) / 2, zoom };
  if (!camera) camera = next;
  for (const key of ['x', 'y', 'zoom']) camera[key] += (next[key] - camera[key]) * .11;
  const halfW = w / camera.zoom / 2;
  const halfH = h / camera.zoom / 2;
  camera.x = Math.max(halfW, Math.min(1430-halfW, camera.x));
  camera.y = Math.max(halfH, Math.min(1040-halfH, camera.y));
  return camera;
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
  const view = chaseCamera(c, w, h, title);
  const { zoom } = view;
  ctx.save();
  ctx.translate(w * (title ? .72 : .5) - view.x * zoom, h * .53 - view.y * zoom);
  ctx.scale(zoom, zoom);
  ctx.drawImage(cityArt, 0, 0);
  if (!title) drawTraffic();
  Art.weather(ctx, c, time, w / zoom, h / zoom);
  if (!title && !state.collected) marker(Drive.pickup, 'BANK VAULT', '#f4c468');
  if (state.collected) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(78,81,1268,878);
    for(const b of City.blocks) ctx.rect(b.x,b.y,b.right-b.x,b.bottom-b.y);
    ctx.clip('evenodd');
    pursuit.units.forEach((unit, i) => Art.reflections(ctx, unit, reducedFlash ? 0 : time, i));
    ctx.restore();
    if (!state.bonus) marker({x:1010,y:650}, 'CASH DEPOT +1600 · ALARM', '#ffcf75');
    marker(Pursuit.exit, pursuit.lost >= Pursuit.clearTime ? 'BANK SCORE' : 'BREAK CONTACT', '#82ffbf');
    if (pursuit.intercept) {
      const target = City.nodes[pursuit.intercept.node];
      marker(target, pursuit.block ? 'ROADBLOCK' : 'BLOCKADE INBOUND', '#ff657f');
      if (pursuit.block) {
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.rotate(pursuit.units[1].angle);
        for (let x = -38; x <= 37; x += 10) rect(x, -2, 7, 4, '#ffba7d');
        ctx.restore();
      }
    }
    for (const unit of pursuit.units) Art.car(ctx, unit, true, reducedFlash ? 0 : state.time);
  }
  Art.spray(ctx, c, time);
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
  if (state.sweep >= 0 && !state.bonus) {
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
  let nextBanner = (state.collected ? (pursuit.block ? 'ROADBLOCK ACTIVE' : pursuit.intercept ? 'INTERCEPT INBOUND' : 'VAULT CASH SECURED') +
    '\n' + (pursuit.seen ? (pursuit.reacquired ? 'Police reacquired you' : 'Police spotted you') + ' · nearest cruiser ' + Math.round(pursuit.nearestRange) + ' m' : pursuit.lost < Pursuit.clearTime ?
      'Patrols searching · stay hidden ' + (Pursuit.clearTime - pursuit.lost).toFixed(1) + ' s more' : 'Police lost · dock gate ' + arrow + ' ' + range + ' m') : state.sweep >= 0
    ? 'Vault drilling · press E in the green band to take the cash'
    : near ? 'Stop at the bank, press E to start drilling, then press E in the green band' : 'First target ' + arrow + ' ' + range + ' m') +
    '\n' + (state.collected ? (state.bonus ? 'Cash secured · reach the dock gate to score' : 'Reach the dock gate to score or risk +1,600 at the cash depot') + '\n' : '') + Math.ceil(Math.max(0, 180 - state.time)) + ' s · ' + Math.round(Math.hypot(c.vx, c.vy) * .55) + ' km/h · ' + Math.max(0, 100 - Math.round(c.damage)) + '% integrity';
  const relay = Traffic.near(state);
  const gateLine = relay ? `\n${state.traffic.message} · ${relay.name} console nearby · Shift to trigger · ${state.traffic.charges} charge${state.traffic.charges===1?'':'s'}` : `\n${state.traffic.message} · ${state.traffic.charges} gate charges`;
  nextBanner += gateLine;
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
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) {
        if (!state.gateKeyDown) Traffic.activate(state.traffic, state, pursuit);
        state.gateKeyDown = true;
      } else state.gateKeyDown = false;
      interact = false;
      Traffic.tick(state.traffic, state, pursuit);
      Pursuit.tick(pursuit, state);
      if (pursuit.result) finish();
    }
    accumulator -= 1 / 60;
  }
  Siren.update(mode === 'playing' && !muted ? pursuit.tailRange : Infinity, state.time, City.inCover(state.car), (pursuit.units[0].x-state.car.x)/300);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
