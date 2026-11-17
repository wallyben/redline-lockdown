const Pursuit = ((city) => {
  const exit = city.nodes[19];
  const clearTime = 3.8;
  const clearDuration = run => clearTime + Math.min(run.jobs?.heat||0,4)*.4;
  const tailStart = { x: 452, y: 400, angle: 0, edge: [6, 7], path: [] };
  const patrol = node => ({ ...city.nodes[node], angle: -Math.PI / 2, edge: [node, node], path: [] });
  const layouts = [
    { name: 'South patrol', tailX: tailStart.x, interceptor: 13 },
    { name: 'North patrol', tailX: 475, interceptor: 3 },
    { name: 'Dock patrol', tailX: 430, interceptor: 14 },
  ];
  const reset = (layout = 0) => ({
    units: [{ ...tailStart, x: layouts[layout].tailX, path: [] }, { ...patrol(layouts[layout].interceptor), angle: layout === 1 ? Math.PI/2 : -Math.PI/2 }],
    sighting: null, seen: false, lost: 0, elapsed: 0, refresh: 0,
    intercept: null, block: null, contact: 0, result: null, nextInterceptId:1,
    bonusAlarm: false, feint: false, reacquired: 0, hadContact: false, tailRange: Infinity, nearestRange: Infinity,
  });

  function canSee(unit, car, road = null) {
    const d = city.distance(unit, car);
    if(city.inDockShadow(car)&&!city.inDockShadow(unit))return false;
    if (d > 260 || (d > 54 && city.inCover(unit) !== city.inCover(car))) return false;
    const samples = Math.ceil(d / 11);
    for (let i = 1; i < samples; i++) {
      const f = i / samples;
      const x=unit.x+(car.x-unit.x)*f,y=unit.y+(car.y-unit.y)*f;
      if (city.wall(x,y,1,road)||city.sightWall(x,y)) return false;
    }
    return true;
  }

  function predict(sighting) {
    const origin = city.nearest(sighting);
    const point = { x: sighting.x + sighting.dx * 245, y: sighting.y + sighting.dy * 245 };
    return [origin, ...city.edges[origin]].reduce((best, i) =>
      city.distance(city.nodes[i], point) < city.distance(city.nodes[best], point) ? i : best, origin);
  }

  function roadPoint(point, road = null) {
    let best = null;
    let distance = Infinity;
    for (let a = 0; a < city.nodes.length; a++) {
      const start = city.nodes[a];
      for (const b of city.edges[a]) {
        if (b <= a || !city.edgeOpen(a,b,road)) continue;
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

  function dispatch(unit, target, road = null) {
    const [a, b] = unit.edge;
    if (city.edgeOpen(a,b,road) && target.edge.includes(a) && target.edge.includes(b)) {
      unit.path = [target];
      return;
    }
    let bestLength = Infinity;
    const starts=road&&!city.edgeOpen(a,b,road)
      ? [city.distance(unit,city.nodes[a])<=city.distance(unit,city.nodes[b])?a:b]
      : [...new Set(unit.edge)];
    for (const from of starts) for (const to of new Set(target.edge)) {
      const nodes = city.route(from, to, road);
      if (!nodes.length && from !== to) continue;
      let previous = unit;
      const path = nodes.map((node, i) => ({
        ...city.nodes[node], edge: i ? [nodes[i - 1], node] : city.edgeOpen(a,b,road) ? unit.edge : [node,node],
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
      if (distance > .01) {
        const heading = Math.atan2(target.y-unit.y,target.x-unit.x);
        const error = Math.atan2(Math.sin(heading-unit.angle),Math.cos(heading-unit.angle));
        if (Math.abs(error) > .15) {
          unit.angle += Math.sign(error)*Math.min(Math.abs(error),3.2*dt);
          return;
        }
        unit.angle = heading;
      }
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
    const center = city.nearest(last);
    if (p.lost < 3.5) return city.inCover(last) ? junction(center) : roadPoint(last);
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
    p.refitGrace = Math.max(0,(p.refitGrace||0)-dt);
    if (run.bonus && !p.bonusAlarm) {
      p.bonusAlarm = true;
      p.sighting = { x: 1010, y: 650, dx: 0, dy: 1 };
      p.lost = 0;
      p.intercept = null;
      p.block = null;
      p.refresh = 0;
      dispatch(p.units[0], roadPoint(p.sighting, run.traffic), run.traffic);
      dispatch(p.units[1], junction(13), run.traffic);
    }
    p.refresh -= dt;
    const wasSeen = p.seen;
    p.seen = p.units.some(u => canSee(u, car, run.traffic));
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
    if(run.jobs?.heat>=2&&!p.extraSpawned){
      p.extra=patrol(14);p.units.push(p.extra);p.extraSpawned=true;
      if(p.sighting)dispatch(p.extra,searchTarget(p,2),run.traffic);
    }
    if (run.traffic?.phase === 'closed' && !p.rerouteEdgeKey) {
      p.rerouteEdgeKey = [...run.traffic.closedEdges][0];
      const diverted=p.intercept&&interceptor.path.some(point=>point.edge?.length===2&&
        city.edgeKey(...point.edge)===p.rerouteEdgeKey);
      if(diverted)p.intercept.diverted=true;
      if (p.sighting) {
        dispatch(tail, p.seen ? roadPoint(p.sighting, run.traffic) : searchTarget(p,0), run.traffic);
        dispatch(interceptor, p.intercept ? junction(p.intercept.node) : searchTarget(p,1), run.traffic);
      }
    } else if (run.traffic?.phase !== 'closed') p.rerouteEdgeKey = null;
    if (p.intercept && p.elapsed >= p.intercept.expires) {
      p.intercept = null;
      p.block = null;
      p.refresh = 0;
    }
    if (p.sighting && p.refresh <= 0) {
      p.refresh = .22;
      dispatch(tail, p.seen ? roadPoint(p.sighting, run.traffic) : searchTarget(p, 0), run.traffic);
      if (!p.intercept && p.seen) {
        const node = predict(p.sighting);
        const from = city.nearest(p.sighting);
        if (node !== from) {
          p.intercept = { id:p.nextInterceptId++,node, from, expires: p.elapsed + 9,diverted:false,rewarded:false };
          dispatch(interceptor, junction(node), run.traffic);
        }
      } else if (!p.intercept && !p.seen) {
        dispatch(interceptor, searchTarget(p, 1), run.traffic);
      }
      if(p.extra&&p.sighting)dispatch(p.extra,p.seen?roadPoint(p.sighting,run.traffic):searchTarget(p,2),run.traffic);
    }
    const heatScale=1+Math.min(run.jobs?.heat||0,4)*.045;
    advance(tail, (p.seen ? (p.bonusAlarm ? 185 : 220) * (p.pressure || 1) : 106)*heatScale, dt);
    advance(interceptor, (p.intercept ? 255 : 157)*heatScale, dt);
    if(p.extra)advance(p.extra,(p.seen?175:112)*heatScale,dt);
    if (p.intercept && !p.block && city.distance(interceptor, city.nodes[p.intercept.node]) < .01 && !interceptor.path.length) {
      p.block = p.intercept;
      if(p.intercept.diverted&&!p.intercept.rewarded&&city.distance(car,city.nodes[p.intercept.node])>150){
        p.intercept.rewarded=true;p.feint=true;
      }
      const from = city.nodes[p.block.from];
      interceptor.angle = Math.atan2(from.y - interceptor.y, from.x - interceptor.x) + Math.PI / 2;
    }
    p.tailRange = city.distance(tail, car);
    p.nearestRange = Math.min(...p.units.map(unit=>city.distance(unit,car)));
    const blockDistance = city.distance(interceptor, car);
    const blockade = p.block && blockDistance < 46;
    const contactBlockade = blockade && (p.seen || blockDistance < 18);
    if (blockade && blockDistance > 0 && blockDistance < 30) {
      const scale = 30 / blockDistance;
      const x = interceptor.x + (car.x - interceptor.x) * scale;
      const y = interceptor.y + (car.y - interceptor.y) * scale;
      if (!city.wall(x, y, 11, run.traffic)) Object.assign(car, { x, y });
    }
    const speedNow=Math.hypot(car.vx,car.vy);
    const handoff=run.jobs?.stage===2&&run.jobs.transfer>0&&city.distance(car,run.jobs.courier)<65;
    if(p.refitGrace>0) p.contact=0;
    else if(handoff)p.contact=Math.min(p.contact,.16);
    else if (contactBlockade || (p.seen && p.nearestRange < 24)) {
      p.contact += dt * (contactBlockade ? 1 : speedNow > 60 ? .12 : .38);
      car.vx *= contactBlockade ? .81 : speedNow > 60 ? .99 : .93;
      car.vy *= contactBlockade ? .81 : speedNow > 60 ? .99 : .93;
    } else p.contact = Math.max(0, p.contact - dt * (speedNow > 60 ? .65 : 1));
    if (p.contact > .87) p.result = 'Intercepted';
    else if (run.jobs?.stage < 3 && city.distance(car, exit) < 44) p.result = null;
    else if (city.distance(car, exit) < 44 && p.lost >= clearDuration(run)) p.result = run.jobs?.earlyCashout ? 'Partial cashout' : run.car.damage <= 5 ? 'Clean getaway' : 'Escaped';
  }

  function score(run, pursuit) {
    const success = ['Clean getaway','Escaped','Partial cashout'].includes(pursuit.result);
    const extraction = success ? (pursuit.result==='Partial cashout'?1200:2500) : 0;
    const recorder = success && run.collected ? (run.jobs ? Math.round(run.jobs.haul*run.jobs.multiplier) : 1000) : 0;
    const bonus = success && run.bonus ? 1600 : 0;
    const pace = success ? Math.max(0, 800 - Math.round(run.time * 8)) : 0;
    const condition = success ? Math.round(Math.max(0,100-run.car.damage)*5) : 0;
    const feint = success && pursuit.feint ? 500+(run.jobs?.modifiers.feint||0) : 0;
    return { extraction, recorder, bonus, pace, condition, feint,
      total: extraction+recorder+bonus+pace+condition+feint };
  }
  return { reset, tick, canSee, predict, score, exit, clearTime, clearDuration, layouts };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Pursuit;
