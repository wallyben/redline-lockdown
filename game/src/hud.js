const ChaseHUD = (() => {
  let previous = '';
  function update(element, state, pursuit, arrow, range) {
    const jobs = state.jobs, car = state.car;
    const stage = jobs?.stage || 0;
    const objectives = ['Intercept the rolling pickup', 'Stop at the bank • E to drill', 'Match the courier • hold E', 'Reach the dock canopy'];
    const threat = !state.collected ? 'THE JOB IS ON' : pursuit.seen ? 'POLICE HAVE SIGHT' : pursuit.lost>=Pursuit.clearDuration(state)?'CONTACT LOST':'BREAKING CONTACT';
    const detail = pursuit.contact > .1 ? `CAPTURE ${Math.min(100,Math.round(pursuit.contact/.87*100))}% • drive away now` : !state.collected ? 'Three jobs. One getaway.' : pursuit.seen ? `${Math.round(pursuit.nearestRange)} m to nearest cruiser` : pursuit.lost>=Pursuit.clearDuration(state)?'Patrols searching / keep moving':`Stay hidden ${Math.max(0,Pursuit.clearDuration(state)-pursuit.lost).toFixed(1)} s`;
    const relay = Traffic.near(state);
    const route = state.traffic.phase === 'closed' ? 'GATE CLOSED • police must reroute' : relay ? `SHIFT • close ${relay.name} • ${state.traffic.charges} left` : pursuit.block ? 'ROADBLOCK SET • change streets' : pursuit.intercept ? 'INTERCEPT INBOUND • alley breaks sight' : 'Boulevard: speed / Alley: cover';
    const html = `<div class="chase-threat">${threat}<span>${detail}</span></div><div class="chase-objective"><small>JOB ${Math.min(stage+1,3)} / 3 ${stage===3?'• EXTRACT':''}</small>${objectives[stage]}<span>${arrow} ${range} m${stage===2?' • '+Math.round(jobs.transfer/.7*100)+'% transferred':''}</span></div><div class="chase-stats"><span>AT RISK<strong>${Math.round((jobs?.haul||0)*(jobs?.multiplier||1)).toLocaleString()} pts</strong></span><span>HEAT<strong>${Math.min(4,Math.ceil(jobs?.heat||0))} / 4</strong></span><span>CAR<strong>${Math.max(0,100-Math.round(car.damage))}%</strong></span><span>TIME<strong>${Math.ceil(Math.max(0,180-state.time))}s</strong></span></div><div class="chase-route">${route}</div><div class="ability-bar"><b>Q · SMOKE ${state.smoke?.charges??2}/${state.smoke?.maxCharges??2}</b><span>${state.smoke?.cooldown>0?state.smoke.cooldown.toFixed(1)+"s cooldown":"Break sight • 4.5s cloud"}</span></div><div class="win-rule">ESCAPE TO BANK YOUR SCORE · CAPTURE OR WRECK LOSES IT</div>`;
    if (html !== previous) { element.innerHTML = html; previous = html; }
  }
  return { update };
})();
