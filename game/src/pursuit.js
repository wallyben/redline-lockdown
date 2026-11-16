const Pursuit = ((city) => {
  const exit = city.nodes[19];
  const clearTime = 3.8;
  const tailStart = { x: 452, y: 400, angle: 0, edge: [6, 7], path: [] };
  const patrol = node => ({ ...city.nodes[node], angle: -Math.PI / 2, edge: [node, node], path: [] });
  const layouts = [
    { name: 'South patrol', tailX: tailStart.x, interceptor: 13 },
    { name: 'North patrol', tailX: 475, interceptor: 3 },
  ];
  const reset = (layout = 0) => ({
    units: [{ ...tailStart, x: layouts[layout].tailX, path: [] }, patrol(layouts[layout].interceptor)],
    sighting: null, seen: false, lost: 0, elapsed: 0, refresh: 0,
    intercept: null, block: null, contact: 0, result: null,
    reacquired: 0, hadContact: false, tailRange: Infinity, nearestRange: Infinity,
  });

  function canSee(unit, car) {
    const d = city.distance(unit, car);
    if (d > 260 || (d > 54 && city.inCover(unit) !== city.inCover(car))) return false;
    const samples = Math.ceil(d / 11);
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

  function roadPoint(point) {
    let best = null;
    let distance = Infinity;
    for (let a = 0; a < city.nodes.length; a++) {
      const start = city.nodes[a];
      for (const b of city.edges[a]) {
        if (b <= a) continue;
        const end = city.nodes[b];
        const dx = end.x - start.x, dy = end.y - start.y;
        const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
        const next = { x: start.x + dx * t, y: start.y + dy * t, edge: [a, b] };
        const gap = city.distance(next, point);
        if (gap < distance) { best = next; distance = gap; }
      }
    }
    return best;
  }

  function dispatch(unit, target) {
    const [a, b] = unit.edge;
    if (target.edge.includes(a) && target.edge.includes(b)) {
      unit.path = [target];
      return;
    }
    let bestLength = Infinity;
    for (const from of new Set(unit.edge)) for (const to of new Set(target.edge)) {
      const nodes = city.route(from, to);
      let previous = unit;
      const path = nodes.map((node, i) => ({
        ...city.nodes[node], edge: i ? [nodes[i - 1], node] : unit.edge,
      }));
      let length = 0;
      for (const point of [...path, target]) {
        length += city.distance(previous, point);
        previous = point;
      }
      if (length < bestLength) {
        bestLength = length;
        unit.path = [...path, target];
      }
    }
  }

  function advance(unit, speed, dt) {
    let remaining = speed * dt;
    while (remaining > 0 && unit.path.length) {
      const target = unit.path[0];
      const distance = city.distance(target, unit);
      if (distance > .01) unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      unit.edge = target.edge;
      if (distance <= remaining) {
        unit.x = target.x;
        unit.y = target.y;
        remaining -= distance;
        unit.path.shift();
      } else {
        unit.x += Math.cos(unit.angle) * remaining;
        unit.y += Math.sin(unit.angle) * remaining;
        return;
      }
    }
  }

  function junction(node) {
    return { ...city.nodes[node], edge: [node, node] };
  }

  function searchTarget(p, offset) {
    const last = p.sighting;
    if (p.lost < 3.5) return roadPoint(last);
    const center = city.nearest(last);
    const forward = predict(last);
    const options = [forward, ...city.edges[center].filter(n => n !== forward), center];
    return junction(options[(Math.floor((p.lost - 3.5) / 2.8) + offset) % options.length]);
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
    const wasSeen = p.seen;
    p.seen = p.units.some(u => canSee(u, car));
    if (p.seen) {
      if (!wasSeen && p.hadContact && p.lost > .25) p.reacquired++;
      if (!wasSeen) p.refresh = 0;
      p.hadContact = true;
      const speed = Math.hypot(car.vx, car.vy);
      p.sighting = {
        x: car.x, y: car.y,
        dx: speed > 35 ? car.vx / speed : Math.cos(car.angle),
        dy: speed > 35 ? car.vy / speed : Math.sin(car.angle),
      };
    }
    p.lost = p.seen ? 0 : p.lost + dt;
    const [tail, interceptor] = p.units;
    if (p.intercept && p.elapsed >= p.intercept.expires) {
      p.intercept = null;
      p.block = null;
      p.refresh = 0;
    }
    if (p.sighting && p.refresh <= 0) {
      p.refresh = .22;
      dispatch(tail, p.seen ? roadPoint(p.sighting) : searchTarget(p, 0));
      if (!p.intercept && p.seen) {
        const node = predict(p.sighting);
        const from = city.nearest(p.sighting);
        if (node !== from) {
          p.intercept = { node, from, expires: p.elapsed + 9 };
          dispatch(interceptor, junction(node));
        }
      } else if (!p.intercept && !p.seen) {
        dispatch(interceptor, searchTarget(p, 1));
      }
    }
    advance(tail, p.seen ? 220 : 106, dt);
    advance(interceptor, p.intercept ? 255 : 157, dt);
    if (p.intercept && !p.block && city.distance(interceptor, city.nodes[p.intercept.node]) < .01 && !interceptor.path.length) {
      p.block = p.intercept;
      const from = city.nodes[p.block.from];
      interceptor.angle = Math.atan2(from.y - interceptor.y, from.x - interceptor.x) + Math.PI / 2;
    }
    p.tailRange = city.distance(tail, car);
    p.nearestRange = Math.min(p.tailRange, city.distance(interceptor, car));
    const blockDistance = city.distance(interceptor, car);
    const blockade = p.block && blockDistance < 46;
    if (blockade && blockDistance > 0 && blockDistance < 30) {
      const scale = 30 / blockDistance;
      const x = interceptor.x + (car.x - interceptor.x) * scale;
      const y = interceptor.y + (car.y - interceptor.y) * scale;
      if (!city.wall(x, y)) Object.assign(car, { x, y });
    }
    if (blockade || p.nearestRange < 35) {
      p.contact += dt;
      car.vx *= blockade ? .81 : .91;
      car.vy *= blockade ? .81 : .91;
    } else p.contact = Math.max(0, p.contact - dt);
    if (p.contact > .87) p.result = 'Intercepted';
    else if (city.distance(car, exit) < 44 && p.lost >= clearTime) p.result = 'Clean getaway';
  }

  function score(run, pursuit) {
    const extraction = pursuit.result === 'Clean getaway' ? 2500 : 0;
    const recorder = run.collected ? 1000 : 0;
    const pace = extraction ? Math.max(0, 1000 - Math.round(run.time * 10)) : 0;
    const repairs = Math.round(run.car.damage * 12);
    return { extraction, recorder, pace, repairs, total: Math.max(0, extraction + recorder + pace - repairs) };
  }

  return { reset, tick, canSee, predict, score, exit, clearTime, layouts };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Pursuit;
