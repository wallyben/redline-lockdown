const Jobs = ((city) => {
  const upgrades = [
    { id:'grip', name:'Rally tyres', effect:'+18% corner grip', apply:m=>m.grip*=1.18 },
    { id:'armour', name:'Reinforced panels', effect:'−25% collision damage', apply:m=>m.damage*=.75 },
    { id:'gate-time', name:'Long-cycle relay', effect:'Gates stay shut +2 seconds', apply:m=>m.gateDuration+=2 },
    { id:'relay', name:'Signal booster', effect:'Relay consoles work from 30% farther away', apply:m=>m.relayRange*=1.3 },
    { id:'cooldown', name:'Fast reset', effect:'Relay cooldown −2 seconds', apply:m=>m.cooldown=Math.max(3,m.cooldown-2) },
    { id:'feint', name:'Decoy beacon', effect:'Successful interceptor feint +250 points', apply:m=>m.feint+=250 },
  ];
  const courierRoutes = {
    1701:[13,18,19,14,9,8,13], // Ghost: waterfront loop.
    1702:[11,16,17,12,7,6,11], // Grid: western service-road courier avoids committed police blockade.
    1703:[18,19,14,9,8,13,18], // Payday: freight route starts at the southern wharf.
  };
  const courierRoute = jobs => courierRoutes[jobs.seed] || courierRoutes[1701];
  const reset = (seed=1701) => ({ seed:seed>>>0, stage:0, nextStage:0, pending:false, transfer:0,heat:0,multiplier:1,
    completed:[false,false,false], earlyCashout:false, haul:0, pendingTitle:'', modifiers:{grip:1,damage:1,gateDuration:5,relayRange:1,cooldown:8,feint:0},
    choices:[], chosen:[], courier:{x:1010,y:650,leg:0,progress:0}, event:'' });
  function pickup(jobs,time) { return {x:250+Math.sin(time*.7+(jobs.seed%17)) * 40,y:400}; }
  function courierPoint(jobs) {
    const route=courierRoute(jobs), a=city.nodes[route[jobs.courier.leg]], b=city.nodes[route[jobs.courier.leg+1]];
    const t=jobs.courier.progress; return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)};
  }
  function updateCourier(jobs,dt,traffic,player) {
    const route=courierRoute(jobs), from=route[jobs.courier.leg], to=route[jobs.courier.leg+1];
    // A sealed road is a physical obstacle. Stop on the current segment and
    // continue once the relay reopens; never teleport to the next street.
    if (!city.edgeOpen(from,to,traffic)) {
      Object.assign(jobs.courier,courierPoint(jobs));
      return;
    }
    const pressure=player&&city.distance(player,jobs.courier)<180?.045:.1;
    jobs.courier.progress += dt*pressure;
    if(jobs.courier.progress>=1){jobs.courier.progress-=1;jobs.courier.leg=(jobs.courier.leg+1)%6;}
    Object.assign(jobs.courier,courierPoint(jobs));
  }
  function tick(jobs,run,input,dt=1/60) {
    jobs.event='';
    if(jobs.pending)return jobs.event;
    if(jobs.stage===0){
      jobs.target=pickup(jobs,run.time);
      if(Math.hypot(run.car.vx,run.car.vy)>55&&city.distance(run.car,jobs.target)<38){
        jobs.completed[0]=true;jobs.haul+=700;jobs.heat+=1;jobs.pending=true;jobs.nextStage=1;jobs.event='Rolling pickup secured';jobs.pendingTitle=jobs.event;
      }
    } else if(jobs.stage===2){
      updateCourier(jobs,dt,run.traffic,run.car); jobs.target={x:jobs.courier.x,y:jobs.courier.y};
      const near=city.distance(run.car,jobs.target)<65, speed=Math.hypot(run.car.vx,run.car.vy);
      const gate = typeof ContractRules==='undefined'
        ? (typeof module==='undefined' ? {ready:true} : require('./contract-rules.js').required(run,2))
        : ContractRules.required(run,2);
      jobs.transfer=gate.ready&&near&&speed<75&&input.interactHeld ? jobs.transfer+dt : Math.max(0,jobs.transfer-dt*1.6);
      if(!gate.ready && near && input.interactHeld)jobs.event=gate.task;
      if(jobs.transfer>=.7){jobs.completed[2]=true;jobs.haul+=900;jobs.heat+=1;jobs.stage=3;jobs.target={...city.nodes[19]};jobs.event='Courier transfer complete · reach the docks';}
    } else if(jobs.stage===3) jobs.target={...city.nodes[19]};
    return jobs.event;
  }
  function completeVault(jobs){ if(jobs.stage!==1||jobs.pending)return false;jobs.completed[1]=true;jobs.haul+=1200;jobs.heat+=1;jobs.pending=true;jobs.nextStage=2;jobs.event=jobs.seed===1702?'Signal cache extracted':'Vault drill complete';jobs.pendingTitle=jobs.event;return true; }
  function offer(jobs){
    let value=jobs.seed ^ ((jobs.stage+1)*0x9e3779b9);
    const pool=upgrades.slice();
    for(let i=pool.length-1;i>0;i--){value=(Math.imul(value,1664525)+1013904223)>>>0;const j=value%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
    jobs.choices=pool.filter(u=>!jobs.chosen.includes(u.id)).slice(0,3);jobs.pending=true;
    return jobs.choices;
  }
  function choose(jobs,id){const upgrade=jobs.choices.find(u=>u.id===id);if(!upgrade)return false;upgrade.apply(jobs.modifiers);jobs.chosen.push(id);jobs.multiplier=+(jobs.multiplier+.25).toFixed(2);jobs.heat+=1;jobs.pending=false;jobs.choices=[];jobs.stage=jobs.nextStage;return true;}
  function cashOut(jobs){jobs.pending=false;jobs.earlyCashout=true;jobs.stage=3;jobs.target={...city.nodes[19]};}
  return {reset,pickup,courierPoint,courierRoute,tick,completeVault,offer,choose,cashOut,upgrades};
})(typeof module==='undefined'?City:require('./city.js'));
if(typeof module!=='undefined')module.exports=Jobs;
