const Pursuit = ((city) => {
  const exit = city.nodes[19];
  const unit = (node, role) => ({ ...city.nodes[node], node, role, angle: -Math.PI / 2, path: [] });
  const reset = () => ({
    units: [{ ...unit(2, 'chase'), y: 201, angle: Math.PI / 2 }, unit(13, 'intercept')],
    sighting: null, seen: false, lost: 0, elapsed: 0, refresh: 0,
    intercept: null, block: null, contact: 0, result: null,
  });

  function canSee(unit, car) {
    const d = city.distance(unit, car);
    if (d > 220) return false;
    const samples = Math.ceil(d / 18);
    for (let i = 1; i < samples; i++) {
      const f = i / samples;
      if (city.wall(unit.x + (car.x - unit.x) * f, unit.y + (car.y - unit.y) * f, 1)) return false;
    }
    return true;
  }

  function predict(sighting) {
    const origin = city.nearest(sighting);
    const point = { x: sighting.x + sighting.dx * 245, y: sighting.y + sighting.dy * 245 };
    return [origin, ...city.edges[origin]].reduce((best, i) =>
      city.distance(city.nodes[i], point) < city.distance(city.nodes[best], point) ? i : best, origin);
  }

  function dispatch(unit, target) {
    const first = unit.path[0] ?? city.nearest(unit);
    unit.path = city.route(first, target);
  }

  function advance(unit, speed, dt) {
    if (unit.path.length === 0) return;
    const target = city.nodes[unit.path[0]];
    const distance = city.distance(target, unit);
    const step = speed * dt;
    if (distance <= step) {
      unit.x = target.x;
      unit.y = target.y;
      unit.node = unit.path.shift();
      return;
    }
    unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
    unit.x += Math.cos(unit.angle) * step;
    unit.y += Math.sin(unit.angle) * step;
  }

  function tick(p, run, dt = 1 / 60) {
    const car = run.car;
    if (p.result) return;
    if (run.time >= 180 || car.damage >= 100) {
      p.result = car.damage >= 100 ? 'Wrecked' : 'Time expired';
      return;
    }
    if (!run.collected) return;
    p.elapsed += dt;
    p.refresh -= dt;
    p.seen = p.units.some(u => canSee(u, car));
    p.lost = p.seen ? 0 : p.lost + dt;
    if (p.seen) {
      const speed = Math.hypot(car.vx, car.vy);
      const dx = speed > 35 ? car.vx / speed : Math.cos(car.angle);
      const dy = speed > 35 ? car.vy / speed : Math.sin(car.angle);
      p.sighting = { x: car.x, y: car.y, dx, dy };
    }
    const [chaser, interceptor] = p.units;
    if (p.sighting && p.refresh <= 0) {
      p.refresh = .72;
      const last = city.nearest(p.sighting);
      const search = city.edges[last][Math.floor(p.lost / 3) % city.edges[last].length];
      dispatch(chaser, p.lost < 3 ? last : search);
      if (!p.intercept && p.seen) {
        const node = predict(p.sighting);
        if (node !== last) {
          p.intercept = { node, from: last, expires: p.elapsed + 12 };
          dispatch(interceptor, node);
        }
      }
    }
    advance(chaser, p.lost < 3 ? 145 : 110, dt);
    advance(interceptor, 225, dt);
    if (p.intercept && p.intercept.expires <= p.elapsed) {
      p.intercept = null;
      p.block = null;
    }
    if (p.intercept && interceptor.node === p.intercept.node && interceptor.path.length === 0 && !p.block) {
      p.block = p.intercept;
      const from = city.nodes[p.block.from];
      interceptor.angle = Math.atan2(from.y - interceptor.y, from.x - interceptor.x) + Math.PI / 2;
    }
    const near = p.units.some(u => city.distance(u, car) < 32);
    if (near) {
      p.contact += dt;
      car.vx *= .92;
      car.vy *= .92;
    } else p.contact = Math.max(0, p.contact - 2 * dt);
    if (p.contact > 1.1) p.result = 'Intercepted';
    else if (city.distance(car, exit) < 44 && p.lost >= 2.5) p.result = 'Clean getaway';
  }

  function score(run, pursuit) {
    const extraction = pursuit.result === 'Clean getaway' ? 2500 : 0;
    const recorder = run.collected ? 1000 : 0;
    const pace = extraction ? Math.max(0, 1000 - Math.round(run.time * 10)) : 0;
    const repairs = Math.round(run.car.damage * 12);
    return { extraction, recorder, pace, repairs, total: Math.max(0, extraction + recorder + pace - repairs) };
  }

  return { reset, tick, canSee, predict, score, exit };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Pursuit;
