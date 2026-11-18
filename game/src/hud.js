const ChaseHUD = (() => {
  let previous = '';
  function update(element, state, pursuit, arrow, range) {
    const jobs = state.jobs, car = state.car;
    const stage = jobs?.stage || 0;
    const objectives = ['Hit the rolling pickup','Stop at the bank · E to drill','Match the courier · hold E','Extract before the lockdown tightens'];
    const prerequisite=ContractRules.required(state,stage);
    const objective = !prerequisite.ready ? prerequisite.task :
      stage===3&&state.lockdown?.active ? Lockdown.exits[state.lockdown.choice].name : objectives[stage];
    const threat = state.lockdown?.active ? 'CITY LOCKDOWN ACTIVE' :
      !state.collected?'THE JOB IS ON':pursuit.seen?'POLICE HAVE SIGHT':
      pursuit.lost>=Pursuit.clearDuration(state)?'CONTACT LOST':'BREAKING CONTACT';
    const detail = pursuit.contact>.1?`CAPTURE ${Math.min(100,Math.round(pursuit.contact/.87*100))}% · DRIVE AWAY`:
      state.lockdown?.active?'1: EAST SHADOW DOCK  /  2: WEST QUAY +1,750':
      !state.collected?'Three jobs. One getaway.':pursuit.seen?
      `${Math.round(pursuit.nearestRange)} m to nearest police`:
      `Hide for ${Math.max(0,Pursuit.clearDuration(state)-pursuit.lost).toFixed(1)}s`;
    const relay=Traffic.near(state);
    const route=state.traffic.phase==='closed'?'ROAD SEALED · INTERCEPTOR REROUTING':
      relay?`SHIFT · CLOSE ${relay.name} · ${state.traffic.charges} LEFT`:
      pursuit.intercept?`INTERCEPT ON NODE ${pursuit.intercept.node} · TAB MAP`:
      'TAB · LIVE NETWORK  /  F · RADIO DECOY';
    const mastery=ContractRules.nextAction(state,pursuit);
    const decoy=`F · RADIO DECOY ${pursuit.decoyCharges}/2 ${pursuit.decoyCooldown>0?'· '+pursuit.decoyCooldown.toFixed(0)+'s':'· READY'}`;
    const html = `<div class="chase-threat">${threat}<span>${detail}</span></div><div class="chase-objective"><small>${stage===3?'LOCKDOWN / EXTRACTION':'JOB '+(stage+1)+' / 3'}</small>${objective}<span>${arrow} ${range} m${stage===2?' · '+Math.round(jobs.transfer/.7*100)+'% transferred':''}</span></div><div class="chase-stats"><span>AT RISK<strong>${Math.round((jobs?.haul||0)*(jobs?.multiplier||1)).toLocaleString()} pts</strong></span><span>HEAT<strong>${Math.min(4,Math.ceil(jobs?.heat||0))}/4</strong></span><span>CAR<strong>${Math.max(0,100-Math.round(car.damage))}%</strong></span><span>TIME<strong>${Math.ceil(Math.max(0,180-state.time))}s</strong></span></div><div class="chase-route">${route}<span class="mastery-note">${mastery}</span></div><div class="ability-bar"><b>Q · SMOKE ${state.smoke?.charges??2}/${state.smoke?.maxCharges??2}</b><span>${decoy}</span></div><div class="win-rule">${state.lockdown?.event||'BREAK SIGHT · BANK SCORE AT EXTRACTION · CAPTURE LOSES IT'}</div>`;
    if (html !== previous) { element.innerHTML = html; previous = html; }
  }
  return { update };
})();
