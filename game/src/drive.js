const Drive = ((city, jobs) => {
  const start = { x: 130, y: 400, angle: 0, vx: 0, vy: 0, damage: 0, hits: 0 };
  const pickup = { x: 690, y: 400 }; // Port Meridian bank vault
  const signalCache = { x: 430, y: 530 }; // Grid contract field-side relay vault.
  const armoredLockbox = { x: 520, y: 400 }; // Payday: armored transfer safe, ahead of the junction blockade.
  const vaultFor = run => run?.contractId==='switch' ? signalCache : run?.contractId==='cash-depot' ? armoredLockbox : pickup;
  function reset() {
    return { car: { ...start }, collected: false, bonus: false, banked: false, time: 0, sweep: -1, impact: 0,
      traffic: typeof Traffic === 'undefined' ? null : Traffic.reset(),
      jobs: jobs.reset() };
  }
  function tick(state, input, dt = 1 / 60) {
    const c = state.car;
    state.time += dt;
    state.impact = Math.max(0, state.impact - dt);
    c.braking = input.gas < 0 || input.drift;
    const speed = Math.hypot(c.vx, c.vy);
    const forward = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
    const reverse = forward < -8 ? -1 : 1;
    const steering = Math.min(.25 + speed / 55, 1);
    c.angle += input.turn * steering * (input.drift ? 2.8 : 2.25) * dt * reverse;
    const cos = Math.cos(c.angle);
    const sin = Math.sin(c.angle);
    const throttle = input.gas > 0 ? 420 : input.gas < 0 ? (forward > 8 ? -780 : -230) : 0;
    const grip = state.jobs?.modifiers.grip || 1;
    let along = c.vx * cos + c.vy * sin;
    let lateral = -c.vx * sin + c.vy * cos;
    along = Math.max(-90, Math.min(360, (along + throttle * dt) * Math.exp(-dt * (input.drift ? 2.6 : 0.62))));
    lateral *= Math.exp(-dt * (input.drift ? 2.4 : 7.5 * grip));
    c.vx = along * cos - lateral * sin;
    c.vy = along * sin + lateral * cos;
    const x = c.x + c.vx * dt;
    const y = c.y + c.vy * dt;
    let hit = false;
    let impactSpeed = 0;
    if (city.wall(x, c.y, 11, state.traffic)) { impactSpeed = Math.max(impactSpeed, Math.abs(c.vx)); c.vx *= -0.3; hit = true; } else c.x = x;
    if (city.wall(c.x, y, 11, state.traffic)) { impactSpeed = Math.max(impactSpeed, Math.abs(c.vy)); c.vy *= -0.3; hit = true; } else c.y = y;
    if (hit && impactSpeed > 38 && state.impact === 0) {
      c.damage = Math.min(100, c.damage + Math.min(22, (impactSpeed - 30) / 16) * (state.jobs?.modifiers.damage || 1));
      c.hits++;
      state.impact = 0.65;
    }
    const jobStage = state.jobs?.stage ?? (state.collected ? 1 : 0);
    const target = jobStage === 0 ? jobs.pickup(state.jobs,state.time) : jobStage === 1 ? vaultFor(state) :
      jobStage === 2 ? { x:state.jobs.courier.x,y:state.jobs.courier.y } : {x:1290,y:910};
    const atPickup = jobStage === 1 && city.distance(c, target) < 45 && speed < 36;
    const atBonus = state.collected && jobStage >= 1 && !state.bonus && city.distance(c,{x:1010,y:650})<45 && speed<36;
    if (!atPickup && !atBonus) state.sweep = -1;
    // Engaging a stationary drill holds the vehicle's brakes, rather than
    // letting a tiny residual velocity drift it out of the interaction bay.
    if(state.sweep>=0&&(atPickup||atBonus)){
      c.vx*=Math.exp(-10*dt);
      c.vy*=Math.exp(-10*dt);
    }
    if (state.sweep >= 0) state.sweep += dt;
    if (input.interact && atPickup) {
      if (state.sweep >= 0.75 && state.sweep <= 1.45) {
        const gate = typeof ContractRules === 'undefined'
          ? (typeof module === 'undefined' ? {ready:true} : require('./contract-rules.js').required(state,1))
          : ContractRules.required(state,1);
        if(gate.ready)jobs.completeVault(state.jobs);
        else state.jobs.event = gate.task;
        state.sweep = -1;
      }
      else state.sweep = 0;
    }
    if (input.interact && atBonus) {
      if(state.sweep>=.75&&state.sweep<=1.45){state.bonus=true;if(state.jobs)state.jobs.heat+=1;state.sweep=-1;}else if(state.sweep<0)state.sweep=0;
    }
    if (state.sweep > 2.4) state.sweep = -1;
    if(state.jobs){
      state.jobs.time=state.time;
      const prior=state.jobs.stage;
      jobs.tick(state.jobs,state,{interactHeld:input.interactHeld},dt);
      if(prior===0&&state.jobs.stage===0&&state.jobs.pending)state.collected=true;
    }
  }
  return { reset, tick, pickup, signalCache, armoredLockbox, vaultFor };
})(typeof module === 'undefined' ? City : require('./city.js'), typeof module === 'undefined' ? Jobs : require('./jobs.js'));
if (typeof module !== 'undefined') module.exports = Drive;
