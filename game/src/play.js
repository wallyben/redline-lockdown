const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const cityArt = Art.buildCity();
const brief = document.querySelector('#brief');
const hud = document.querySelector('#hud');
const startButton = document.querySelector('#start');
const layoutInput = document.querySelector('#patrol');
const layoutChoice = document.querySelector('#patrol-choice');
const intermission = document.querySelector('#intermission');
const upgradeChoices = document.querySelector('#upgrade-choices');
const continueJob = document.querySelector('#continue-job');
const cashOut = document.querySelector('#cash-out');
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
  state.smoke = Smoke.reset();
  state.lockdown = Lockdown.reset();
  state.ghostAlley = false;
  state.jobs = Jobs.reset(Contracts[Number(layoutInput.value)].seed);
  state.civilians = CivilianTraffic.reset(Contracts[Number(layoutInput.value)].seed);
  // Contract identities alter resources and initial threat, not only the briefing.
  const contractId = Contracts[Number(layoutInput.value)].id;
  state.contractId = contractId;
  if (contractId === "iris") state.smoke.charges = 3;
  if (contractId === "switch") state.traffic.charges = 5;
  if (contractId === "cash-depot") state.jobs.heat = 1;
  state.smoke.maxCharges = state.smoke.charges;
  pursuit = Pursuit.reset(Contracts[Number(layoutInput.value)].layout);
  state.seed = Contracts[Number(layoutInput.value)].seed;
  pursuit.pressure = Contracts[Number(layoutInput.value)].pressure;
  if(contractId==='cash-depot')pursuit.refitGrace=2.4; // High-heat raid starts with a short lead, not an immediate capture.
  interact = false;
  mode = 'playing';
  brief.hidden = true;
  intermission.hidden = true;
  hud.hidden = false;
  startButton.blur();
}

function pause() {
  mode = 'paused';
  document.querySelector('#run-cards').innerHTML = '';
  layoutChoice.hidden = true;
  brief.querySelector('h1').innerHTML = 'REDLINE <span>LOCKDOWN</span>';
  brief.querySelector('p').textContent = 'Paused. Press Escape or Enter to resume.';
  startButton.textContent = 'Resume ↵';
  brief.hidden = false;
}

function finish() {
  mode = 'results';
  brief.dataset.mode = 'results';
  document.querySelector('#run-cards').innerHTML = '';
  hud.hidden = true;
  intermission.hidden = true;
  layoutChoice.hidden = false;

  const contract = Contracts[Number(layoutInput.value)];
  const score = Pursuit.score(state, pursuit);
  const record = Records.bank(state, pursuit, contract);
  const best = Records.table(contract.id)[0];
  const completed = state.jobs.completed.filter(Boolean).length;
  const intact = Math.max(0, Math.round(100 - state.car.damage));
  const won = score.total > 0;
  const medal = !won ? 'NO SCORE' : score.total >= contract.gold ? 'GOLD' :
    score.total >= contract.gold * .85 ? 'SILVER' : 'BRONZE';

  brief.querySelector('h1').innerHTML = won ?
    'ESCAPED<span>' + medal + ' GETAWAY</span>' :
    'BUSTED<span>' + pursuit.result + '</span>';
  brief.querySelector('p').textContent =
    completed + '/3 JOBS CLEARED  ·  ' + state.time.toFixed(1) + 's  ·  ' + intact + '% CAR\n' +
    'HAUL +' + score.recorder.toLocaleString() + '  ·  EXTRACTION +' + score.extraction.toLocaleString() + '\n' +
    'MASTERY +' + score.styleBonus.toLocaleString() + '  ·  ROUTE +' + score.routeBonus.toLocaleString() + '\n' +
    (best ? 'PERSONAL BEST ' + best.total.toLocaleString() + '  ·  ' + (record?.delta == null ? 'FIRST RECORD' : (record.delta >= 0 ? '+' : '') + record.delta + ' VS BEST') : 'NO SCORE BANKED') + '\n' +
    (won ? 'TAKE THE MONEY. OUTRUN THE LOCKDOWN.' : 'CAPTURE OR WRECK LOSES EVERYTHING.');
  document.querySelector('#run-cards').innerHTML =
    '<div class="score-hero">' + score.total.toLocaleString() +
    '<small>' + (won ? 'POINTS BANKED' : 'POINTS LOST') + '</small></div>';
  startButton.textContent = 'Retry ↵';
  brief.hidden = false;
}

function confirm() {
  if (mode === 'intermission') {
    continueAfterUpgrade();
  } else if (mode === 'paused') {
    mode = 'playing';
    brief.hidden = true;
    startButton.blur();
  } else if (mode !== 'playing') start();
}

function showContract() {
  mode = 'title'; brief.dataset.mode='title';
  brief.hidden = false;
  hud.hidden = true;
  intermission.hidden = true;
  layoutChoice.hidden = false;
  const c = Contracts[Number(layoutInput.value)];
  const best = Records.table(c.id)[0];
  brief.querySelector('h1').innerHTML = 'REDLINE <span>LOCKDOWN</span>';
  brief.querySelector('p').innerHTML = '<strong>ROB THE BANK. CUT THE GRID. VANISH.</strong><br>Close roads behind you. Smoke the tail. Risk one more job — or escape with what you have.';
  const cards=Contracts.map((contract,index) =>
    `<button type="button" class="contract-card ${index===Number(layoutInput.value)?'selected':''}" data-contract="${index}">
      <b>0${index+1} / ${contract.name}</b><span>${contract.beats.map(beat=>beat[0]).join(' · ')}</span>
    </button>`).join('');
  document.querySelector('#run-cards').innerHTML =
    `<div class="contract-picker">${cards}</div><div class="contract-goal"><b>MISSION OBJECTIVES</b><br>
     ${c.beats.map((beat,i)=>`0${i+1} / ${beat[1]}`).join(' · ')}<br>
     ${c.goal}<br>GOLD ${c.gold.toLocaleString()} · PERSONAL BEST ${best?best.total.toLocaleString():'—'} ·
     ${Contracts.filter(item=>(Records.table(item.id)[0]?.total||0)>=item.gold).length}/3 MASTERED</div>`;
  for(const card of document.querySelectorAll('#run-cards [data-contract]'))
    card.onclick=()=>{layoutInput.value=card.dataset.contract;showContract();};

  const rows=Records.table(c.id);
  if(rows.length) brief.querySelector('p').textContent += rows.length ? '\n\nPERSONAL RECORDS\n' +
    rows.map(r=>r.total+' pts · '+r.time.toFixed(1)+' s · '+r.integrity.toFixed(0)+'%').join('\n') : '';
  startButton.textContent = 'Drive ↵';
}
layoutInput.onchange = showContract;
showContract();
startButton.onclick = confirm;

function openIntermission() {
  mode='intermission'; hud.hidden=true; brief.hidden=true; intermission.hidden=false;
  Jobs.offer(state.jobs); state.selectedUpgrade=null; continueJob.disabled=true;
  document.querySelector('#job-summary').textContent = `${state.jobs.pendingTitle}. Current haul at risk: $${Math.round(state.jobs.haul*state.jobs.multiplier).toLocaleString()}. Hull ${Math.max(0,100-state.car.damage).toFixed(0)}%. Heat ${state.jobs.heat}/4; continuing adds 0.25× and more heat brings more patrols.`;
  upgradeChoices.replaceChildren();
  state.jobs.choices.forEach((upgrade,index)=>{
    const button=document.createElement('button'); button.type='button'; button.innerHTML=`<strong>${index+1}. ${upgrade.name}</strong><span>${upgrade.effect}</span>`;
    button.onclick=()=>{state.selectedUpgrade=upgrade.id;for(const child of upgradeChoices.children)child.classList.toggle('selected',child===button);continueJob.disabled=false;};
    upgradeChoices.append(button);
  });
}
function continueAfterUpgrade(){
  if(!state.selectedUpgrade||!Jobs.choose(state.jobs,state.selectedUpgrade))return;
  pursuit.contact=0; pursuit.refitGrace=3.2;
  intermission.hidden=true;hud.hidden=false;mode='playing';
}
continueJob.onclick=continueAfterUpgrade;
cashOut.onclick=()=>{Jobs.cashOut(state.jobs);intermission.hidden=true;hud.hidden=false;mode='playing';};
function pickUpgrade(index){const button=upgradeChoices.children[index];if(button)button.click();}
function targetForRun(){
  if(!state.jobs)return state.collected?Pursuit.exit:Drive.pickup;
  if(state.jobs.stage===0)return Jobs.pickup(state.jobs,state.time);
  if(state.jobs.stage===1){
    if(state.contractId==='switch' && !ContractRules.required(state,1).ready){
      return Traffic.gates.reduce((best,g)=>City.distance(g.console,state.car)<City.distance(best.console,state.car)?g:best,Traffic.gates[0]).console;
    }
    return Drive.vaultFor(state);
  }
  if(state.jobs.stage===2){
    if(!ContractRules.required(state,2).ready){
      if(state.contractId==='iris')return {x:690,y:595};
      if(state.contractId==='cash-depot')return {x:1010,y:650};
    }
    return {x:state.jobs.courier.x,y:state.jobs.courier.y};
  }
  if(state.jobs.stage===3 && !ContractRules.escapeReady(state,pursuit)) {
    if(state.contractId==='iris')return {x:690,y:595};
    if(state.contractId==='switch') {
      if(!(state.traffic.successfulClosures>0))return Traffic.gates.reduce((best,g)=>City.distance(g.console,state.car)<City.distance(best.console,state.car)?g:best,Traffic.gates[0]).console;
      if(!pursuit.hadIntercept)return City.nodes[City.nearest(pursuit.units[1])];
    }
    if(state.contractId==='cash-depot'&&!state.bonus)return {x:1010,y:650};
  }
  return state.lockdown?.active ? Lockdown.target(state) : Pursuit.exit;
}
function targetLabel(){
  if(!state.jobs)return state.collected?'DOCK EXIT':'BANK VAULT';
  if(state.jobs.stage===3 && state.lockdown?.active) return Lockdown.exits[state.lockdown.choice].name;
  if(!ContractRules.required(state,state.jobs.stage).ready){
    if(state.jobs.stage===1 && state.contractId==='switch')return 'RELAY SABOTAGE · SHIFT TO SEAL';
    if(state.jobs.stage===2 && state.contractId==='cash-depot')return 'HIGH-VALUE DEPOT CASH';
    if(state.jobs.stage===2 && state.contractId==='iris')return 'GHOST · SMOKE & COVER';
  }
  return ['ROLLING PICKUP',state.contractId==='switch'?'SIGNAL CACHE RAID':'PORT MERIDIAN VAULT','COURIER TRANSFER','DOCK EXTRACTION'][state.jobs.stage];
}
window.addEventListener('keydown', e => {
  if (e.target === layoutInput) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Enter') confirm();
  if (mode==='intermission' && ['Digit1','Digit2','Digit3'].includes(e.code)) pickUpgrade(Number(e.code.slice(-1))-1);
  if (mode==='intermission' && e.code==='KeyX') cashOut.click();
  if (e.code === 'KeyC' && mode !== 'playing') showContract();
  if (e.code === 'KeyR' && mode !== 'title') start();
  if (e.code === 'Escape') {
    if (mode === 'playing') pause();
    else if (mode === 'paused') confirm();
  }
  if (e.code === 'KeyE') interact = true;
  if (e.code === 'KeyQ' && mode === 'playing') Smoke.deploy(state);
  if (e.code === 'KeyF' && mode === 'playing') Pursuit.deployDecoy(pursuit,state);
  if (mode === 'playing' && state.lockdown?.active && e.code==='Digit1') Lockdown.select(state,0);
  if (mode === 'playing' && state.lockdown?.active && e.code==='Digit2') Lockdown.select(state,1);
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

function marker(p, name, color, radius=26) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius + 3 * Math.sin(state.time * 5), 0, 2 * Math.PI);
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
  const base = Math.max(.75, Math.min(1.8, h / 440));
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
  if(!title&&!reducedFlash&&state.impact>0)ctx.translate(Math.sin(time*81)*state.impact*5,Math.cos(time*67)*state.impact*4);
  ctx.scale(zoom, zoom);
  ctx.drawImage(cityArt, 0, 0);
  Cinematic.streets(ctx,time);
  if (!title) CivilianTraffic.draw(ctx, state.civilians);
  if (!title) drawTraffic();
  Art.weather(ctx, c, time, w / zoom, h / zoom);
  if (!title && state.jobs?.stage !== 3) marker(targetForRun(), targetLabel(), state.jobs?.stage===2?'#6be7ff':'#f4c468');
  if (state.collected) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(78,81,1268,878);
    for(const b of City.blocks) ctx.rect(b.x,b.y,b.right-b.x,b.bottom-b.y);
    ctx.clip('evenodd');
    pursuit.units.forEach((unit, i) => Art.reflections(ctx, unit, reducedFlash ? 0 : time, i));
    ctx.restore();
    if (!state.bonus && state.jobs?.stage<3) marker({x:1010,y:650}, 'OPTIONAL CASH · EXTRA ALARM', '#ffcf75');
    if(mode!=='results'&&state.jobs?.stage===3)marker(targetForRun(), !ContractRules.escapeReady(state,pursuit)?'COMPLETE CONTRACT TASK':pursuit.lost >= Pursuit.clearDuration(state) ? 'BANK SCORE' : 'BREAK CONTACT', '#82ffbf',state.lockdown?.choice===0?56:44);
    if (pursuit.intercept && mode!=='results') {
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
  if(!title&&state.jobs?.stage===2)Art.car(ctx,state.jobs.courier,false,time,true);
  Art.spray(ctx, c, time);
  Art.car(ctx, c, false, time);
  Cinematic.steam(ctx,time);
  if(!title && state.smoke){Smoke.draw(ctx,state);StreetDetail.motion(ctx,state,pursuit,time);}
  ctx.restore();
  const destination = targetForRun();
  const near = state.jobs?.stage===1 && City.distance(c, Drive.vaultFor(state)) < 45;
  const range = Math.round(City.distance(c, destination));
  const driveAngle = Math.atan2(destination.y - c.y, destination.x - c.x);
  const arrow = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(driveAngle / (Math.PI / 4)) + 8) % 8];
  const shade = ctx.createRadialGradient(w * .56, h * .52, h * .23, w * .56, h * .52, w * .68);
  shade.addColorStop(0, '#0b142000');
  shade.addColorStop(1, '#050916a8');
  rect(0, 0, w, h, shade);
  if (mode === 'playing' || mode === 'paused' || mode === 'intermission') {Cinematic.screen(ctx,w,h,state,pursuit,reducedFlash);Art.minimap(ctx, w, h, state, pursuit);}
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
  ChaseHUD.update(hud, state, pursuit, arrow, range);
  if(mode==='playing' && keys.has('Tab'))TacticalMap.draw(ctx,w,h,state,pursuit);

}

function frame(now) {
  accumulator += Math.min((now - previous) / 1000, .1);
  previous = now;
  while (accumulator >= 1 / 60) {
    if (mode === 'playing') {
      const previousJobStage=state.jobs?.stage;
      Drive.tick(state, {
        gas: down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown'),
        turn: down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft'),
        drift: keys.has('Space'), interact, interactHeld: keys.has('KeyE'),
      });
      if(previousJobStage===2&&state.jobs.stage===3){pursuit.contact=0;pursuit.refitGrace=3.5;}
      if(City.inCover(state.car) && state.car.y < 850)state.ghostAlley=true;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) {
        if (!state.gateKeyDown) Traffic.activate(state.traffic, state, pursuit);
        state.gateKeyDown = true;
      } else state.gateKeyDown = false;
      interact = false;
      Traffic.tick(state.traffic, state, pursuit);
      CivilianTraffic.tick(state.civilians, state, 1/60);
      Smoke.tick(state,1/60);
      Lockdown.tick(state,pursuit,1/60);
      Cinematic.tick(state);
      Pursuit.tick(pursuit, state);
      if (pursuit.result) finish();
    }
    accumulator -= 1 / 60;
  }
  if(mode==='playing'&&state.jobs?.pending&&!state.jobs.choices.length)openIntermission();
  Siren.engine(mode==='playing'&&!muted, Math.hypot(state.car.vx,state.car.vy), state.impact);
  Siren.update(mode === 'playing' && !muted ? pursuit.tailRange : Infinity, state.time, City.inCover(state.car), (pursuit.units[0].x-state.car.x)/300);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
