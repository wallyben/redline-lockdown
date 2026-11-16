const Drive = ((city) => {
  const start = { x: 130, y: 400, angle: 0, vx: 0, vy: 0, damage: 0, hits: 0 };
  const pickup = { x: 690, y: 400 };
  function reset() {
    return { car: { ...start }, collected: false, time: 0, sweep: -1, impact: 0 };
  }
  function tick(state, input, dt = 1 / 60) {
    const c = state.car;
    state.time += dt;
    state.impact = Math.max(0, state.impact - dt);
    const speed = Math.hypot(c.vx, c.vy);
    const forward = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
    c.angle += input.turn * Math.min(speed / 55, 1) * (input.drift ? 3.4 : 2.65) * dt * (forward < -8 ? -1 : 1);
    const cos = Math.cos(c.angle);
    const sin = Math.sin(c.angle);
    const throttle = input.gas > 0 ? 370 : input.gas < 0 ? (forward > 10 ? -670 : -155) : 0;
    let along = c.vx * cos + c.vy * sin;
    let lateral = -c.vx * sin + c.vy * cos;
    along = Math.max(-90, Math.min(330, (along + throttle * dt) * Math.exp(-dt * (input.drift ? 2 : 0.85))));
    lateral *= Math.exp(-dt * (input.drift ? 1.5 : 12));
    c.vx = along * cos - lateral * sin;
    c.vy = along * sin + lateral * cos;
    const x = c.x + c.vx * dt;
    const y = c.y + c.vy * dt;
    let hit = false;
    if (city.wall(x, c.y)) { c.vx *= -0.3; hit = true; } else c.x = x;
    if (city.wall(c.x, y)) { c.vy *= -0.3; hit = true; } else c.y = y;
    if (hit && speed > 38 && state.impact === 0) {
      c.damage += speed / 13;
      c.hits++;
      state.impact = 0.22;
    }
    const atPickup = city.distance(c, pickup) < 45 && speed < 36;
    if (state.collected) return;
    if (!atPickup) state.sweep = -1;
    if (state.sweep >= 0) state.sweep += dt;
    if (input.interact && atPickup) {
      if (state.sweep >= 0.75 && state.sweep <= 1.45) state.collected = true;
      else state.sweep = 0;
    }
    if (state.sweep > 2.4) state.sweep = -1;
  }
  return { reset, tick, pickup };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Drive;
