// Deterministic ambient traffic: road-bound vehicles, small fixed pool, no external assets.
const CivilianTraffic = ((city) => {
  const routes = [
    [1, 2, 3, 4, 9, 14, 13, 12, 11, 10, 5, 0, 1],
    [6, 7, 8, 13, 12, 11, 6],
    [2, 7, 12, 17, 18, 13, 8, 3, 2],
    [10, 11, 12, 13, 14, 9, 8, 7, 6, 5, 10],
    [0, 5, 6, 1, 0],
  ];
  const palette = ['#e3b258', '#87d1c6', '#bd8ecf', '#c5d2da', '#9bba6e'];
  function reset(seed = 1701) {
    return routes.map((route, i) => {
      const start = (i * 2 + seed % 3) % (route.length - 1);
      const a = city.nodes[route[start]];
      const b = city.nodes[route[start + 1]];
      return {
        x: a.x, y: a.y,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        route, step: start, speed: 0,
        cruise: 49 + ((seed + i * 31) % 32),
        color: palette[i], type: i === 3 ? 'van' : i === 1 ? 'taxi' : 'car',
        contactTimer: 0
      };
    });
  }
  function advance(v, run, dt) {
    const a = city.nodes[v.route[v.step]];
    const b = city.nodes[v.route[v.step + 1]];
    const blocked = !city.edgeOpen(v.route[v.step], v.route[v.step + 1], run.traffic);
    // Give way at closed relays and when the player's car is directly ahead.
    const dx = b.x - v.x, dy = b.y - v.y, remain = Math.hypot(dx, dy);
    const clear = city.distance(v, run.car);
    const yielding = clear < 48 && clear > 20 &&
      (run.car.x - v.x) * dx + (run.car.y - v.y) * dy > 0;
    const desired = blocked || yielding ? 0 : v.cruise;
    v.speed += Math.max(-180 * dt, Math.min(125 * dt, desired - v.speed));
    if (remain <= Math.max(3, v.speed * dt)) {
      if (!blocked) {
        v.step = (v.step + 1) % (v.route.length - 1);
        const node = city.nodes[v.route[v.step]];
        v.x = node.x; v.y = node.y;
      }
    } else if (remain > 0) {
      const angle = Math.atan2(dy, dx);
      v.angle = angle;
      const step = Math.min(remain, v.speed * dt);
      v.x += Math.cos(angle) * step;
      v.y += Math.sin(angle) * step;
    }
    v.contactTimer = Math.max(0, v.contactTimer - dt);
    const playerSpeed = Math.hypot(run.car.vx, run.car.vy);
    if (city.distance(v, run.car) < (v.type === 'van' ? 31 : 27) && v.contactTimer === 0) {
      v.contactTimer = 1.2;
      // A readable, bounded bump: this never teleports the player or traps a route.
      if (playerSpeed > 40) {
        run.car.damage = Math.min(100, run.car.damage + Math.min(13, playerSpeed / 24) * (run.jobs?.modifiers.damage || 1));
        run.car.vx *= 0.76; run.car.vy *= 0.76;
        run.impact = Math.max(run.impact, 0.44);
        run.car.hits++;
        if (run.jobs) run.jobs.heat = Math.min(4, run.jobs.heat + 0.3);
      }
    }
  }
  function tick(vehicles, run, dt = 1 / 60) {
    if (!vehicles) return;
    for (const v of vehicles) advance(v, run, dt);
  }
  function draw(ctx, vehicles) {
    if (!vehicles) return;
    for (const v of vehicles) {
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);
      const van = v.type === 'van';
      const length = van ? 55 : 37, width = van ? 22 : 17;
      ctx.fillStyle = '#030b13bb';
      ctx.fillRect(-length / 2 - 3, -width / 2 - 3, length + 6, width + 6);
      for (const x of [-length / 3, length / 3])
        for (const y of [-width / 2 - 2, width / 2 - 2]) {
          ctx.fillStyle = '#0c1117'; ctx.fillRect(x - 5, y, 10, 4);
        }
      ctx.fillStyle = v.color;
      ctx.fillRect(-length / 2, -width / 2, length, width);
      ctx.fillStyle = '#163445'; ctx.fillRect(-length * .13, -width / 2 + 2, length * .36, width - 4);
      ctx.fillStyle = '#ffffff65'; ctx.fillRect(-length * .12, -width / 2 + 2, 3, width - 4);
      if (v.type === 'taxi') {
        ctx.fillStyle = '#fff1a0'; ctx.fillRect(-3, -3, 10, 6);
      }
      ctx.fillStyle = '#f5f7d3';
      ctx.fillRect(length / 2 - 3, -width / 2 + 2, 3, 4);
      ctx.fillRect(length / 2 - 3, width / 2 - 6, 3, 4);
      ctx.fillStyle = '#ef5362';
      ctx.fillRect(-length / 2, -width / 2 + 2, 3, 4);
      ctx.fillRect(-length / 2, width / 2 - 6, 3, 4);
      ctx.restore();
    }
  }
  return { reset, tick, draw, routes };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = CivilianTraffic;
