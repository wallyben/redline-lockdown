const Traffic = ((city) => {
  const gates = [
    { id: 'hotel-cut', name: 'Hotel Boulevard', edge: [6, 7], console: { x: 560, y: 443 } },
    { id: 'yard-cut', name: 'Service Yard', edge: [11, 12], console: { x: 560, y: 693 } },
    { id: 'dock-cut', name: 'Dock Approach', edge: [13, 18], console: { x: 971, y: 780 } },
  ];
  const reset = () => ({ closedEdges: new Set(), barrier: null, selected: null,
    phase: 'ready', timer: 0, waiting: 0, radioJam:0, cooldown: 0, charges: 3, successfulClosures: 0, message: 'Relay gates ready',
    gridfallUsed:false,gridfallCompleted:0,gridfallFlash:0,latestGate:null,remotePending:null,remoteSealed:0,cascade:{phase:'idle',gate:null,timer:0,waiting:0,barrier:null} });
  function segmentDistance(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((point.x-a.x)*dx + (point.y-a.y)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(point.x-(a.x+t*dx), point.y-(a.y+t*dy));
  }
  function vehicles(run, pursuit) {
    return [run.car,...(run.civilians||[]),...(pursuit?.units||[]),
      ...(run.jobs?.stage===2&&run.jobs.courier?[run.jobs.courier]:[])];
  }
  function occupied(gate, run, pursuit) {
    const [a, b] = gate.edge;
    const center={x:(city.nodes[a].x+city.nodes[b].x)/2,y:(city.nodes[a].y+city.nodes[b].y)/2};
    return vehicles(run, pursuit).some(v => city.distance(v,center) < 34);
  }
  function barrierFor(gate) {
    const [a,b] = gate.edge, first = city.nodes[a], last = city.nodes[b];
    const horizontal = first.y === last.y;
    return { x:(first.x+last.x)/2, y:(first.y+last.y)/2,
      orientation: horizontal ? 'h' : 'v', span: horizontal ? 36 : 36 };
  }
  function connected(run,edge,extra=null) {
    const road={closedEdges:new Set([edge,extra].filter(Boolean).map(e=>city.edgeKey(...e)))};
    const destinations=extra?[15,19]:[run.lockdown?.active&&run.lockdown.choice===1?15:19];
    return destinations.every(destination=>city.route(city.nearest(run.car),destination,road).length>0);
  }
  // Every local or remote request goes through the SAME physical-road safety checks.
  function request(state, run, pursuit, gate) {
    if (state.phase !== 'ready' || state.cooldown > 0 || state.charges <= 0) {
      state.message = state.charges <= 0 ? 'Relay charges depleted' : `Relay unavailable · ${Math.max(state.timer,state.cooldown).toFixed(1)}s`;
      return false;
    }
    // A gate request is queued if a vehicle is crossing the barrier. Never snap it shut on traffic.
    if (!connected(run, gate.edge)) { state.message = 'Gate rejected · keep an escape road open'; return false; }
    state.selected = gate;
    state.phase = 'warning';
    state.timer = .8;
    state.waiting = 0;
    state.charges--;
    state.message = occupied(gate,run,pursuit) ? `${gate.name} staged · waiting for clear lane` : `${gate.name} closing · clear the lane`;
    return true;
  }
  function activate(state, run, pursuit) {
    const range=90*(run.jobs?.modifiers.relayRange||1);
    const gate=gates.filter(g=>city.distance(run.car,g.console)<range)
      .sort((a,b)=>city.distance(run.car,a.console)-city.distance(run.car,b.console))[0];
    if(!gate){state.message='Move beside a relay console to close a gate';return false;}
    return request(state,run,pursuit,gate);
  }
  // A one-use remote road hack costs the SAME charge the player can spend on B/Overdrive.
  // No free activation: charge is earned in actual visible, dangerous police pursuits.
  function override(state, run, pursuit, gateId) {
    const meter=run?.momentum,gate=gates.find(g=>g.id===gateId);
    if(!gate){state.message='Select one of the three marked relay nodes';return false;}
    if(!run?.collected||!run.jobs||run.jobs.stage<1||pursuit?.result){
      state.message='Secure the first pickup to unlock tactical overrides';return false;
    }
    if(!meter||meter.remoteUsed||meter.active>0||meter.cooldown>0||meter.charge<.7){
      state.message=meter?.remoteUsed?'Remote grid override already spent':
        'Need 70% earned charge and no Overdrive cooldown for remote override';
      return false;
    }
    if(!request(state,run,pursuit,gate))return false;
    meter.charge=Math.max(0,meter.charge-.7);
    meter.remoteUsed=1;
    state.remotePending=gate.id;
    meter.message='GRID OVERRIDE / '+gate.name.toUpperCase();
    meter.messageTime=2.9;
    state.message=gate.name+' / REMOTE CLOSURE ARMED · POLICE MUST REROUTE';
    return true;
  }
  function tick(state, run, pursuit, dt=1/60) {
    state.cooldown = Math.max(0,state.cooldown-dt);
    state.radioJam=Math.max(0,(state.radioJam||0)-dt);
    if (state.phase === 'warning') {
      state.timer -= dt;
      if (state.timer <= 0) {
        const gate = state.selected;
        const blocked = occupied(gate,run,pursuit);
        const viable = connected(run,gate.edge);
        state.waiting += dt;
        if (!viable || (blocked && state.waiting >= 3.0)) {
          state.phase='ready';state.timer=0;state.waiting=0;state.selected=null;state.charges++;
          // No charge is lost if the one-use remote command could not physically
          // close its road. Refund the SAME 70% meter and re-arm its one-use token.
          if(state.remotePending===gate.id && run.momentum){
            run.momentum.charge=Math.min(1,run.momentum.charge+.7);
            run.momentum.remoteUsed=0;
            run.momentum.message='GRID OVERRIDE REFUNDED / ROAD NOT SAFE';
            run.momentum.messageTime=2.4;
            state.remotePending=null;
          }
          state.message = !viable ? 'Gate aborted · escape route blocked, charge restored' :
            'Gate aborted · lane occupied too long, charge restored';
        } else if (blocked) {
          state.timer = 0;
          state.message = `${gate.name} queued · waiting for lane to clear`;
        } else {
          state.closedEdges = new Set([city.edgeKey(...gate.edge)]);
          state.barrier = barrierFor(gate);
          if(state.remotePending===gate.id){state.remoteSealed++;state.remotePending=null;}
          state.latestGate=gate;
          state.phase='closed'; state.waiting=0;state.successfulClosures++; state.timer=run.jobs?.modifiers.gateDuration||5;
          // GRIDFALL: a single genuine relay hack chains to one nearby
          // physically safe second closure; both extraction paths stay open.
          if(!state.gridfallUsed && run.collected && run.jobs?.stage>=1){
            const second=gates.filter(g=>g!==gate).sort((a,b)=>
              city.distance(a.console,gate.console)-city.distance(b.console,gate.console))
              .find(g=>connected(run,gate.edge,g.edge));
            if(second){
              state.gridfallUsed=true;
              state.cascade={phase:'warning',gate:second,timer:.8,waiting:0,barrier:null};
            }
          }
          state.cooldown=run.jobs?.modifiers.cooldown||8;
          // Grid's successful first relay sabotage temporarily jams city
          // police communications. Units keep physically moving and routing.
          if(run.contractId==='switch' && state.successfulClosures===1 && pursuit){
            pursuit.refitGrace=Math.max(pursuit.refitGrace||0,5.0);
            pursuit.contact=0;state.radioJam=5.0;
            state.message=`${gate.name} SEALED · GRID RADIO BLACKOUT 5.0s`;
          } else state.message=`${gate.name} sealed · ${state.timer.toFixed(1)}s`;
        }
      }
    } else if (state.phase === 'closed') {
      const chain=state.cascade;
      if(chain.phase==='warning'){
        chain.timer-=dt;
        if(chain.timer<=0){
          chain.waiting+=dt;
          if(!connected(run,state.selected.edge,chain.gate.edge) || chain.waiting>2){
            chain.phase='aborted';
          } else if(!occupied(chain.gate,run,pursuit)){
            chain.phase='closed';chain.barrier=barrierFor(chain.gate);
            state.closedEdges.add(city.edgeKey(...chain.gate.edge));
            state.latestGate=chain.gate;state.gridfallCompleted++;state.gridfallFlash=run.time+3.4;
            if(pursuit){pursuit.rerouteEdgeKey=null;pursuit.refresh=0;
              pursuit.refitGrace=Math.max(pursuit.refitGrace||0,1.4);}
          }
        }
      }
      state.timer -= dt;
      if (state.timer <= 0) {
        state.closedEdges.clear(); state.barrier=null;state.cascade={phase:'idle',gate:null,timer:0,waiting:0,barrier:null};
        state.phase='ready'; state.timer=0; state.selected=null;
        state.message='Gate open · relay cooling';
      } else state.message=chain.phase==='closed' ? 'GRIDFALL · TWO ROADS SEALED / POLICE DIVERTED':
        chain.phase==='warning'?'GRIDFALL · SECOND RELAY ARMING':
        state.radioJam>0?`GRID RADIO JAM ${state.radioJam.toFixed(1)}s · STREET SEALED`:
        `${state.selected.name} sealed · ${state.timer.toFixed(1)}s`;
    }
  }
  function near(run) {
    const range=90*(run.jobs?.modifiers.relayRange||1);
    return gates.map(g=>({ ...g, distance:city.distance(run.car,g.console) }))
      .filter(g=>g.distance<range).sort((a,b)=>a.distance-b.distance)[0] || null;
  }
  return { gates, reset, activate, override, tick, near, occupied, segmentDistance };
})(typeof module === 'undefined' ? City : require('./city.js'));
if (typeof module !== 'undefined') module.exports = Traffic;
