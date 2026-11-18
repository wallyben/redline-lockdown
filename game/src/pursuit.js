const Pursuit = ((city) => {
  const exit = city.nodes[19];
  const clearTime = 3.8;
  const clearDuration = run => clearTime + Math.min(run.jobs?.heat||0,4)*.4 + (run.lockdown?.choice===1?1.2:0);
  const tailStart = { x: 452, y: 400, angle: 0, edge: [6, 7], path: [] };
  const patrol = node => ({ ...city.nodes[node], angle: -Math.PI / 2, edge: [node, node], path: [] });
  const layouts = [
    { name: 'South patrol', tailX: tailStart.x, interceptor: 13 },
    { name: 'North patrol', tailX: 475, interceptor: 3 },
    { name: 'Dock patrol', tailX: 430, interceptor: 14 },
  ];
  const reset = (layout = 0) => ({
    units: [layout===2 ? {...patrol(11),role:'tail',angle:0} : { ...tailStart, role: 'tail', x: layouts[layout].tailX, path: [] }, { ...patrol(layouts[layout].interceptor), role: 'interceptor', angle: layout === 1 ? Math.PI/2 : -Math.PI/2 }],
    sighting: null, seen: false, lost: 0, elapsed: 0, refresh: 0,
    intercept: null, block: null, contact: 0, result: null, nextInterceptId:1,
    bonusAlarm: false, feint: false, reacquired: 0, hadContact: false, hadIntercept:false, tailRange: Infinity, nearestRange: Infinity,
    decoyCharges:2,decoyCooldown:0,decoyTime:0,decoyTarget:null,decoyUsed:0,
    showdown:(typeof Showdown==='undefined'?require('./showdown.js'):Showdown).state(),routeBreak:null,
  });

  function canSee(unit, car, road = null) {
    const d = city.distance(unit, car);
    if(city.inDockShadow(car)&&!city.inDockShadow(unit))return false;
    if(city.inWestTunnel(car)&&!city.inWestTunnel(unit))return false;
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
    // Keep a useful order instead of rebuilding it at every radio update.
    const blocked=unit.path.some(q=>q.edge[0]!==q.edge[1]&&!city.edgeOpen(...q.edge,road));
    if(!blocked && unit.path.length && unit.destination && city.distance(unit.destination,target)<45)return;
    unit.destination={...target};
    const [a, b] = unit.edge;
    if (city.edgeOpen(a,b,road) && target.edge.includes(a) && target.edge.includes(b)) {
      const ahead=(target.x-unit.x)*Math.cos(unit.angle)+(target.y-unit.y)*Math.sin(unit.angle);
      if(ahead>=-20 || (unit.speed||0)<35){unit.path=[target];return;}
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
      const first=path.find(q=>city.distance(unit,q)>5)||target;
      const heading=Math.atan2(first.y-unit.y,first.x-unit.x);
      const turn=Math.abs(Math.atan2(Math.sin(heading-unit.angle),Math.cos(heading-unit.angle)));
      let length = (unit.speed||0)>45 && turn>2 ? 480 : turn*30;
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

  function advance(unit, cruise, dt, road=null) {
    while(unit.path.length && city.distance(unit,unit.path[0])<4){
      unit.edge=unit.path.shift().edge;
    }
    if(!unit.path.length){unit.speed=0;return;}
    let target=unit.path[0],distance=city.distance(unit,target);
    // Round a corner only where the actual vehicle footprint has room.
    if(distance<20 && unit.path.length>1){
      const next=unit.path[1],dx=next.x-unit.x,dy=next.y-unit.y,d=Math.hypot(dx,dy);
      if(Array.from({length:Math.ceil(d/8)},(_,i)=>(i+1)/Math.ceil(d/8)).every(t=>!city.wall(unit.x+dx*t,unit.y+dy*t,11,road))){
        unit.edge=target.edge;unit.path.shift();target=next;distance=d;
      }
    }
    const heading=Math.atan2(target.y-unit.y,target.x-unit.x);
    const error=Math.atan2(Math.sin(heading-unit.angle),Math.cos(heading-unit.angle));
    const bend=Math.abs(error);
    const desired=Math.min(cruise,unit.path.length===1?Math.sqrt(2*420*distance):cruise)*(bend>1.1?.16:bend>.35?.48:1);
    unit.speed=Math.max(0,(unit.speed||0)+Math.max(-480*dt,Math.min(210*dt,desired-(unit.speed||0))));
    unit.angle+=Math.max(-2.9*dt,Math.min(2.9*dt,error));
    const step=bend>1.5?0:Math.min(unit.speed*dt,distance);
    const x=unit.x+Math.cos(heading)*step,y=unit.y+Math.sin(heading)*step;
    if(!city.wall(x,y,11,road)){unit.x=x;unit.y=y;unit.edge=target.edge;}
    else {
      const rx=unit.x+Math.cos(heading)*Math.min(40*dt,distance),ry=unit.y+Math.sin(heading)*Math.min(40*dt,distance);
      if(!city.wall(rx,ry,11,road)){unit.x=rx;unit.y=ry;}
      unit.speed=0;unit.angle+=Math.max(-1.5*dt,Math.min(1.5*dt,error));
    }
  }

  function junction(node) {
    return { ...city.nodes[node], edge: [node, node] };
  }

  function searchTarget(p, offset) {
    const unit=p.units[offset]||p.units[0],last=p.sighting;
    const center=city.nearest(last),forward=predict(last);
    const options=[center,forward,...city.edges[center].filter(n=>n!==forward)];
    if(!unit.search || unit.search.x!==last.x || unit.search.y!==last.y){
      unit.search={x:last.x,y:last.y,index:offset===0?0:offset,goal:null,wait:0};
    }
    const search=unit.search;
    if(search.goal && city.distance(unit,search.goal)<28 && !unit.path.length){
      if(!search.wait)search.wait=p.elapsed+.7;
      if(p.elapsed>=search.wait){search.index++;search.goal=null;search.wait=0;}
    }
    if(!search.goal)search.goal=search.index===0?roadPoint(last):junction(options[search.index%options.length]);
    return search.goal;
  }

  function deployDecoy(p,run) {
    if(!run.collected || !p.sighting || p.decoyCharges<=0 || p.decoyCooldown>0)return false;
    // Fakes a pursuit radio packet on a genuinely reachable street.
    const anchor=city.nearest(run.car), choices=city.nodes.map((n,i)=>({n,i,d:city.distance(n,run.car)}))
      .filter(q=>q.d>190 && q.d<900 && city.route(anchor,q.i,run.traffic).length>0);
    if(!choices.length)return false;
    choices.sort((a,b)=>b.d-a.d);
    const chosen=choices[(p.decoyUsed*7+run.seed)%Math.min(choices.length,4)].n;
    p.decoyCharges--;p.decoyCooldown=12;p.decoyTime=run.lockdown?.active?12:3.5;p.decoyUsed++;
    p.decoyTarget={x:chosen.x,y:chosen.y,dx:1,dy:0};
    p.sighting={...p.decoyTarget};p.seen=false;p.refresh=0;p.intercept=null;p.block=null;
    return true;
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
    p.decoyCooldown=Math.max(0,p.decoyCooldown-dt);
    p.decoyTime=Math.max(0,p.decoyTime-dt);
    const wasSeen = p.seen;
    p.seen = p.units.some(u => canSee(u, car, run.traffic) && !(run.smoke && Smoke.obscures(run.smoke.clouds,u,car)));
    if(p.decoyTime>0) {p.seen=false;p.sighting={...p.decoyTarget};}
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
    // A physical lockdown vehicle stages near the chosen exit, with a clear
    // approach and no instant capture. West extraction receives faster pressure.
    if(run.lockdown?.active && !p.lockdownUnit) {
      const west=run.lockdown.choice===1;
      p.lockdownUnit={...patrol(west?5:9),role:'commander',speed:0};
      p.units.push(p.lockdownUnit);p.lockdownTarget=west?11:13;
      dispatch(p.lockdownUnit,junction(p.lockdownTarget),run.traffic);
    }
    if(run.lockdown?.active && p.lockdownUnit) {
      const target=p.decoyTime>0&&p.decoyTarget ? 'decoy' : run.lockdown.choice===1?11:13;
      if(target!==p.lockdownTarget) {
        p.lockdownTarget=target;
        dispatch(p.lockdownUnit,target==='decoy'?roadPoint(p.decoyTarget,run.traffic):junction(target),run.traffic);
      }
    }
    if(run.jobs?.heat>=2&&!p.extraSpawned){
      p.extra={...patrol(14),role:'reinforcement'};p.units.push(p.extra);p.extraSpawned=true;
      if(p.sighting)dispatch(p.extra,searchTarget(p,2),run.traffic);
    }
    if (run.traffic?.phase === 'closed' && !p.rerouteEdgeKey) {
      const latest=run.traffic.latestGate||run.traffic.selected;
      p.rerouteEdgeKey = latest?city.edgeKey(...latest.edge):[...run.traffic.closedEdges][0];
      const old=[tail,interceptor,p.lockdownUnit].filter(Boolean).map(u=>({unit:u,path:[{x:u.x,y:u.y},...u.path.map(q=>({x:q.x,y:q.y,edge:q.edge}))]}));
      const diverted=p.intercept&&interceptor.path.some(point=>point.edge?.length===2&&
        city.edgeKey(...point.edge)===p.rerouteEdgeKey);
      if(diverted)p.intercept.diverted=true;
      if (p.sighting) {
        dispatch(tail, p.seen ? roadPoint(p.sighting, run.traffic) : searchTarget(p,0), run.traffic);
        dispatch(interceptor, p.intercept ? junction(p.intercept.node) : searchTarget(p,1), run.traffic);
        if(p.lockdownUnit)dispatch(p.lockdownUnit,p.lockdownTarget==='decoy'?roadPoint(p.decoyTarget,run.traffic):junction(run.lockdown.choice===1?11:13),run.traffic);
        const changed=old.find(o=>o.unit.path.some(q=>q.edge?.length===2 &&
          !city.edgeOpen(...q.edge,run.traffic)) && o.unit.path.length>1);
        p.routeBreak={old:changed?.path||[],next:changed?[{x:changed.unit.x,y:changed.unit.y},...changed.unit.path]:[],
          at:latest?.console||run.car,real:!!changed,until:p.elapsed+5};
        if(changed)p.feint=true;
      }
    } else if (run.traffic?.phase !== 'closed') p.rerouteEdgeKey = null;
    if (p.intercept && p.elapsed >= p.intercept.expires) {
      p.intercept = null;
      p.block = null;
      p.refresh = 0;
    }
    if (p.sighting && p.refresh <= 0) {
      p.refresh = .65;
      dispatch(tail, p.seen ? roadPoint(p.sighting, run.traffic) : searchTarget(p, 0), run.traffic);
      if (!p.intercept && p.seen) {
        const node = predict(p.sighting);
        const from = city.nearest(p.sighting);
        if (node !== from) {
          p.intercept = { id:p.nextInterceptId++,node, from, expires: p.elapsed + 9,diverted:false,rewarded:false };
          p.hadIntercept=true;
          dispatch(interceptor, junction(node), run.traffic);
        }
      } else if (!p.intercept && !p.seen) {
        dispatch(interceptor, searchTarget(p, 1), run.traffic);
      }
      if(p.extra&&p.sighting)dispatch(p.extra,p.seen?junction(predict(p.sighting)):searchTarget(p,2),run.traffic);
    }
    const heatScale=(1+Math.min(run.jobs?.heat||0,4)*.045)*(run.lockdown?.active&&run.lockdown.choice===1?1.12:1);
    advance(tail, (p.seen ? (p.bonusAlarm ? 235 : 220) * (p.pressure || 1) : 106)*heatScale, dt, run.traffic);
    advance(interceptor, (p.intercept ? 255 : 157)*heatScale, dt, run.traffic);
    if(p.extra)advance(p.extra,(p.seen?175:112)*heatScale,dt,run.traffic);
    if(p.lockdownUnit)advance(p.lockdownUnit,(run.lockdown?.choice===1?205:150)*heatScale,dt,run.traffic);
    (typeof Showdown==='undefined'?require('./showdown.js'):Showdown).tick(p,run,dt);
    if (p.intercept && !p.block && city.distance(interceptor, city.nodes[p.intercept.node]) < 8 && !interceptor.path.length) {
      p.block = p.intercept;
      if(p.intercept.diverted&&!p.intercept.rewarded&&city.distance(car,city.nodes[p.intercept.node])>150){
        p.intercept.rewarded=true;p.feint=true;
      }
      interceptor.speed=0;
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
    // Required precision minigames cannot become unwinnable simply because a
    // cruiser parks on the stationary player. Contact resumes after completion.
    const vault=run.contractId==='switch'?{x:430,y:530}:run.contractId==='cash-depot'?{x:520,y:400}:{x:690,y:400};
    const drilling=run.jobs?.stage===1&&run.sweep>=0&&city.distance(car,vault)<45;
    if(p.refitGrace>0) p.contact=0;
    else if(handoff||drilling)p.contact=Math.min(p.contact,.16);
    else if (contactBlockade || (p.seen && p.nearestRange < 24)) {
      p.contact += dt * (contactBlockade ? 1 : speedNow > 60 ? .12 : .38);
      car.vx *= contactBlockade ? .81 : speedNow > 60 ? .99 : .93;
      car.vy *= contactBlockade ? .81 : speedNow > 60 ? .99 : .93;
    } else p.contact = Math.max(0, p.contact - dt * (speedNow > 60 ? .65 : 1));
    const escape = run.lockdown?.active ? (run.lockdown.choice===1?city.nodes[15]:exit) : exit;
    // East Dock includes the physically accessible loading-bay apron; the
    // cargo containers make a 44-unit centre-only trigger unreliable.
    const escapeRadius=run.lockdown?.active&&run.lockdown.choice===0?56:44;
    if (p.contact > .87) p.result = 'Intercepted';
    else if (run.jobs?.stage < 3 && city.distance(car, escape) < escapeRadius) p.result = null;
    else if (run.jobs?.stage >= 3 && city.distance(car, escape) < escapeRadius && p.lost >= clearDuration(run) &&
      (typeof ContractRules==='undefined' || ContractRules.escapeReady(run,p)))
      p.result = run.jobs?.earlyCashout ? 'Partial cashout' : run.car.damage <= 5 ? 'Clean getaway' : 'Escaped';
  }

  function score(run, pursuit) {
    const success = ['Clean getaway','Escaped','Partial cashout'].includes(pursuit.result);
    const extraction = success ? (pursuit.result==='Partial cashout'?1200:2500) : 0;
    const recorder = success && run.collected ? (run.jobs ? Math.round(run.jobs.haul*run.jobs.multiplier) : 1000) : 0;
    const bonus = success && run.bonus ? 1600 : 0;
    const pace = success ? Math.max(0, 800 - Math.round(run.time * 8)) : 0;
    const condition = success ? Math.round(Math.max(0,100-run.car.damage)*5) : 0;
    const feint = success && pursuit.feint ? 500+(run.jobs?.modifiers.feint||0) : 0;
    // Skill mastery is specific to the contract, not just its patrol arrangement.
    const styleBonus = !success ? 0 : run.contractId === 'iris' && run.smoke?.used>0 && run.ghostAlley && run.car.damage < 35 ? Math.max(400,1200-Math.min(4,pursuit.reacquired)*200) :
      run.contractId === 'switch' && (run.traffic?.successfulClosures || 0) >= 1 ? 1200 :
      run.contractId === 'cash-depot' && run.bonus ? 1400 : 0;
    const routeBonus=success && !run.jobs?.earlyCashout && run.lockdown?.choice===1 ? 1750 : 0;
    const commanderBonus=success && !run.jobs?.earlyCashout && pursuit.showdown?.countered ? 750 : 0;
    const gridfallBonus=success && !run.jobs?.earlyCashout && run.traffic?.gridfallCompleted?900:0;
    const redlineBonus=success && !run.jobs?.earlyCashout ? Math.min(1000,(run.momentum?.nearMisses||0)*175+(run.momentum?.used||0)*125) : 0;
    return { extraction, recorder, bonus, pace, condition, feint, styleBonus, routeBonus, commanderBonus, gridfallBonus, redlineBonus,
      total: extraction+recorder+bonus+pace+condition+feint+styleBonus+routeBonus+commanderBonus+gridfallBonus+redlineBonus };
  }
  return { reset, tick, deployDecoy, canSee, predict, score, exit, clearTime, clearDuration, layouts };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Pursuit;
