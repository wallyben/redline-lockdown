// REDLINE OVERDRIVE: a deterministic, risk-earned speed mechanic.
// The player earns charge through observed high-speed pursuit and genuine close passes.
const Momentum = (() => {
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const reset = () => ({
    charge: .45, active: 0, cooldown: 0, used: 0, remoteUsed: 0,
    nearMisses: 0, streak: 0, bestStreak: 0, streakTimer: 0,
    nearCooldowns: [], nearArmed: [], message: '', messageTime: 0,
  });
  function activate(run) {
    const m = run?.momentum;
    if (!m || !run.collected || m.active > 0 || m.cooldown > 0 || m.charge < .7) return false;
    m.charge = clamp(m.charge - .7, 0, 1);
    m.active = 2.4;
    m.cooldown = 4.2;
    m.used++;
    m.message = 'OVERDRIVE ENGAGED / KEEP IT CLEAN';
    m.messageTime = 2.4;
    return true;
  }
  function tick(run, police, dt = 1/60) {
    const m = run?.momentum;
    if (!m || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    m.active = Math.max(0, m.active - dt);
    m.cooldown = Math.max(0, m.cooldown - dt);
    m.messageTime = Math.max(0, m.messageTime - dt);
    m.streakTimer = Math.max(0, m.streakTimer - dt);
    if (m.streakTimer <= 0) m.streak = 0;
    for (let i = 0; i < m.nearCooldowns.length; i++) m.nearCooldowns[i] = Math.max(0, m.nearCooldowns[i] - dt);
    if (!run.collected || police?.result) return;
    const car = run.car;
    const speed = Math.hypot(car.vx || 0, car.vy || 0);
    // Sustained dangerous pursuit charges slowly. Close passes are the fast route.
    if (police?.seen && speed > 145 && m.active <= 0)
      m.charge = clamp(m.charge + dt * .045, 0, 1);
    for (let i = 0; i < (police?.units?.length || 0); i++) {
      const unit = police.units[i];
      const gap = Math.hypot(car.x-unit.x, car.y-unit.y);
      const cd = m.nearCooldowns[i] || 0;
      // A near miss must be a new pass. Staying beside a cruiser for five seconds
      // cannot print another reward; a genuine separation rearms the sensor.
      if (gap > 100) m.nearArmed[i] = true;
      if (speed >= 115 && gap >= 30 && gap < 76 && cd <= 0 && m.nearArmed[i] !== false) {
        m.nearCooldowns[i] = 5;
        m.nearArmed[i] = false;
        m.nearMisses++;
        m.streak = m.streakTimer > 0 ? m.streak + 1 : 1;
        m.bestStreak = Math.max(m.bestStreak, m.streak);
        m.streakTimer = 7;
        m.charge = clamp(m.charge + .32, 0, 1);
        m.message = m.streak > 1 ? 'NEAR MISS CHAIN x' + m.streak + ' / CHARGE +' : 'POLICE NEAR MISS / CHARGE +';
        m.messageTime = 2.0;
      }
    }
  }
  function world(ctx, run, time, steady) {
    const m = run?.momentum;
    if (!m || m.active <= 0) return;
    const car = run.car, angle = car.angle;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#79fff1';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = steady ? .42 : .55 + .22 * Math.sin(time * 24);
    for (let i = 0; i < 5; i++) {
      const offset = i * 13 + (time * 85 % 15);
      ctx.beginPath();
      ctx.moveTo(-18 - offset, -11 - i * 4);
      ctx.lineTo(-43 - offset * 1.9, -11 - i * 6);
      ctx.moveTo(-18 - offset, 11 + i * 4);
      ctx.lineTo(-43 - offset * 1.9, 11 + i * 6);
      ctx.stroke();
    }
    ctx.setLineDash([8,7]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 23, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function screen(ctx, w, h, run) {
    const m = run?.momentum;
    if (!m) return;
    const width = Math.min(205, Math.max(170, w * .16));
    // Keep the meter beside the speedometer, clear of the bottom-right navigation map.
    const x = w - width - 25, y = h < 350 ? h - 58 : 182;
    ctx.save();
    ctx.fillStyle = '#081924e8'; ctx.fillRect(x, y, width, 41);
    ctx.fillStyle = '#273d4a'; ctx.fillRect(x + 10, y + 24, width - 20, 8);
    ctx.fillStyle = m.active > 0 ? '#fff0a1' : '#70ffe0';
    ctx.fillRect(x + 10, y + 24, (width - 20) * clamp(m.active > 0 ? m.active/2.4 : m.charge, 0, 1), 8);
    ctx.font = '900 12px system-ui';
    ctx.fillText(m.active > 0 ? 'OVERDRIVE / ' + m.active.toFixed(1) + 's' :
      m.cooldown > 0 ? 'B / COOLING ' + m.cooldown.toFixed(1) + 's' :
      m.charge >= .7 ? 'B / OVERDRIVE READY' : 'B / BUILD OVERDRIVE', x + 10, y + 17);
    if (m.messageTime > 0) {
      const text = m.message;
      ctx.font = '900 17px system-ui';
      const textWidth = ctx.measureText(text).width;
      const pad = 16, bx = (w - textWidth)/2 - pad, by = Math.max(95, h * .22);
      ctx.fillStyle = '#071c28e8'; ctx.fillRect(bx, by - 27, textWidth + pad*2, 43);
      ctx.strokeStyle = '#77ffdf'; ctx.strokeRect(bx, by - 27, textWidth + pad*2, 43);
      ctx.fillStyle = '#defff5'; ctx.fillText(text, bx + pad, by);
    }
    ctx.restore();
  }
  return { reset, activate, tick, world, screen };
})();
if (typeof module !== 'undefined') module.exports = Momentum;
