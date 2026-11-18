// Read-only operational map of live pursuit orders, player position, relays and exits.
const TacticalMap = (() => {
  function layout(w,h) {
    const desktop=w>=1060, width=Math.min(820,w-(desktop?440:40));
    const height=Math.min(540,h-40);
    const x=desktop?Math.max(390,(w-width)/2):(w-width)/2;
    return {x,y:(h-height)/2,width,height};
  }
  function draw(ctx,w,h,run,p) {
    const {x,y,width,height}=layout(w,h);
    ctx.save();
    ctx.fillStyle='#020710ee';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#091d2bf8';ctx.fillRect(x,y,width,height);
    ctx.strokeStyle='#55f2c0';ctx.lineWidth=2;ctx.strokeRect(x,y,width,height);
    ctx.font='900 22px system-ui';ctx.fillStyle='#aaffdf';
    ctx.fillText('CONTROL THE GRID / LIVE POLICE NETWORK',x+22,y+33);
    ctx.font='12px system-ui';ctx.fillStyle='#c7d8e4';
    ctx.fillText('TAB: CLOSE MAP    SHIFT near relay: CUT ROAD    F: DECOY    1/2 during lockdown: EXIT',x+22,y+55);
    const ox=x+32,oy=y+78,mw=width-64,mh=height-138;
    const scale=Math.min(mw/1270,mh/880);
    const tx=ox+(mw-1268*scale)/2-78*scale,ty=oy+(mh-878*scale)/2-81*scale;
    ctx.save();ctx.translate(tx,ty);ctx.scale(scale,scale);
    ctx.fillStyle='#132838';ctx.fillRect(78,81,1268,878);
    for(const b of City.blocks) {
      ctx.fillStyle=b.row===2?'#445c5a':b.col>=2?'#55445e':'#37485f';
      ctx.fillRect(b.x,b.y,b.right-b.x,b.bottom-b.y);
    }
    const edgeDrawn=new Set();
    for(let i=0;i<City.nodes.length;i++)for(const j of City.edges[i]) {
      const key=City.edgeKey(i,j);
      if(edgeDrawn.has(key))continue;edgeDrawn.add(key);
      const a=City.nodes[i],b=City.nodes[j];
      ctx.strokeStyle=run.traffic.closedEdges.has(key)?'#ff516e':'#748ea2';
      ctx.lineWidth=run.traffic.closedEdges.has(key)?14:8;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    if(p.showdown?.active && p.lockdownUnit){
      ctx.strokeStyle=p.showdown.countered?'#64ffc5':'#ffab76';ctx.lineWidth=12;
      ctx.beginPath();ctx.arc(p.lockdownUnit.x,p.lockdownUnit.y,32,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#ffdb9a';ctx.font='900 20px system-ui';
      ctx.fillText('OMEGA',p.lockdownUnit.x+39,p.lockdownUnit.y-15);
    }
    const interceptor=p.units[1];
    if(interceptor?.path?.length) {
      ctx.beginPath();ctx.moveTo(interceptor.x,interceptor.y);
      for(const waypoint of interceptor.path)ctx.lineTo(waypoint.x,waypoint.y);
      ctx.setLineDash([16,11]);ctx.lineWidth=7;ctx.strokeStyle='#fc8bd7';ctx.stroke();ctx.setLineDash([]);
    }
    if(p.intercept) {
      const q=City.nodes[p.intercept.node];
      ctx.strokeStyle='#ff6889';ctx.lineWidth=9;ctx.beginPath();ctx.arc(q.x,q.y,32,0,Math.PI*2);ctx.stroke();
      ctx.font='900 21px system-ui';ctx.fillStyle='#ffd5e6';ctx.fillText('INTERCEPT',q.x+35,q.y-15);
    }
    if(p.routeBreak?.real && p.elapsed<p.routeBreak.until){
      for(const [path,color] of [[p.routeBreak.old,'#ff647e'],[p.routeBreak.next,'#63ffd5']]){
        ctx.strokeStyle=color;ctx.lineWidth=12;ctx.setLineDash([16,12]);
        ctx.beginPath();path.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if(run.traffic?.cascade?.phase==='warning'){
      const a=run.traffic.selected?.console,b=run.traffic.cascade.gate?.console;
      if(a&&b){ctx.strokeStyle='#ffe095';ctx.lineWidth=13;ctx.setLineDash([12,12]);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
    }
    for(const gate of Traffic.gates){
      const q=gate.console,closed=run.traffic.closedEdges.has(City.edgeKey(...gate.edge));
      ctx.fillStyle=closed?'#ff667c':'#5fffd0';
      ctx.fillRect(q.x-13,q.y-13,26,26);
      ctx.font='800 19px system-ui';ctx.fillText(closed?'X':'R',q.x+19,q.y+8);
    }
    for(const exit of Lockdown.exits) {
      ctx.strokeStyle=exit.id==='east'?'#81ffd1':'#ffcb75';
      ctx.lineWidth=7;ctx.beginPath();ctx.arc(exit.point.x,exit.point.y,30,0,Math.PI*2);ctx.stroke();
    }
    for(const unit of p.units){
      ctx.fillStyle=unit.role==='interceptor'?'#df9afc':'#ff7181';
      ctx.beginPath();ctx.arc(unit.x,unit.y,14,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(run.car.x,run.car.y,18,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b0ffe8';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(run.car.x,run.car.y);
    ctx.lineTo(run.car.x+Math.cos(run.car.angle)*48,run.car.y+Math.sin(run.car.angle)*48);ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#cde5ef';ctx.font='bold 13px system-ui';
    const status=p.intercept?'INTERCEPTOR COMMITTED TO JUNCTION '+p.intercept.node:'NO ACTIVE INTERCEPT';
    const gateStatus=run.traffic.gridfallCompleted?'GRIDFALL · 2 ROADS SEALED':run.traffic.phase==='closed'?'ROAD SEALED':run.traffic.phase==='warning'?'CLOSURE INBOUND':'RELAY READY';
    ctx.fillText('WEST QUAY: RISK +1,750    /    EAST DOCK: COVER ROUTE',x+22,y+height-61);
    ctx.fillText(status+'  /  '+gateStatus,x+22,y+height-39);
    const objective=run.lockdown?.active?Lockdown.exits[run.lockdown.choice].name:'COMPLETE THE HEIST / ESCAPE THE CITY';
    ctx.fillStyle='#84ffc9';ctx.fillText(objective,x+22,y+height-17);
    ctx.restore();
  }
  return {draw,layout};
})();
