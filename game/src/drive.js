const Drive = ((city) => {
  const start = { x: 130, y: 400, angle: 0, vx: 0, vy: 0, damage: 0, hits: 0 };
  const pickup = { x: 690, y: 400 }; // Port Meridian bank vault
  function reset() {
    return { car: { ...start }, collected: false, bonus: false, banked: false, time: 0, sweep: -1, impact: 0 };
  }
  function tick(state, input, dt = 1 / 60) {
    const c = state.car;
    state.time += dt;
    state.impact = Math.max(0, state.impact - dt);
    c.braking = input.gas < 0 || input.drift;
    const speed = Math.hypot(c.vx, c.vy);
    const forward = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
    const reverse = forward < -8 ? -1 : 1;
    const steering = Math.min(speed / 42, 1);
    c.angle += input.turn * steering * (input.drift ? 2.8 : 2.25) * dt * reverse;
    const cos = Math.cos(c.angle);
    const sin = Math.sin(c.angle);
    const throttle = input.gas > 0 ? 420 : input.gas < 0 ? (forward > 8 ? -780 : -230) : 0;
    let along = c.vx * cos + c.vy * sin;
    let lateral = -c.vx * sin + c.vy * cos;
    along = Math.max(-90, Math.min(360, (along + throttle * dt) * Math.exp(-dt * (input.drift ? 1.15 : 0.62))));
    lateral *= Math.exp(-dt * (input.drift ? 2.4 : 7.5));
    c.vx = along * cos - lateral * sin;
    c.vy = along * sin + lateral * cos;
    const x = c.x + c.vx * dt;
    const y = c.y + c.vy * dt;
    let hit = false;
    let impactSpeed = 0;
    if (city.wall(x, c.y)) { impactSpeed = Math.max(impactSpeed, Math.abs(c.vx)); c.vx *= -0.3; hit = true; } else c.x = x;
    if (city.wall(c.x, y)) { impactSpeed = Math.max(impactSpeed, Math.abs(c.vy)); c.vy *= -0.3; hit = true; } else c.y = y;
    if (hit && impactSpeed > 38 && state.impact === 0) {
      c.damage = Math.min(100, c.damage + Math.min(22, (impactSpeed - 30) / 16));
      c.hits++;
      state.impact = 0.65;
    }
    const target = state.collected ? { x: 1010, y: 650 } : pickup;
    const atPickup = city.distance(c, target) < 45 && speed < 36;
    if (state.bonus) return;
    if (!atPickup) state.sweep = -1;
    if (state.sweep >= 0) state.sweep += dt;
    if (input.interact && atPickup) {
      if (state.sweep >= 0.75 && state.sweep <= 1.45) {
        if (state.collected) state.bonus = true; else state.collected = true;
        state.sweep = -1;
      }
      else state.sweep = 0;
    }
    if (state.sweep > 2.4) state.sweep = -1;
  }
  return { reset, tick, pickup };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Drive;
