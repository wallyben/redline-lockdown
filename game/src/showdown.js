// Final-act commander and truthful road-control visualization.
// It reads actual pursuit paths; it never creates a screenshot-only state.
const Showdown = (() => {
  const state = () => ({active:false,elapsed:0,countered:false,event:'',until:0});
  function tick(p,run,dt=1/60){
    const s=p.showdown;
    if(!s)return;
    if(run.lockdown?.active){s.active=true;s.elapsed+=dt;}
    if(s.active && p.decoyTime>0 && !s.countered){
      s.countered=true;s.event='COMMAND UNIT SPOOFED / +750';s.until=p.elapsed+4;
    }
    if(s.active && p.routeBreak?.real && !s.countered){
      s.countered=true;s.event='COMMAND ROUTE SEVERED / +750';s.until=p.elapsed+4;
    }
  }
  function route(ctx,points,color,width,dashes=[]){
    if(!points?.length)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashes);
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(const q of points.slice(1))ctx.lineTo(q.x,q.y);
    ctx.stroke();ctx.restore();
  }
  function world(ctx,run,p,time){
    ctx.save();
    const breakEvent=p.routeBreak;
    if(breakEvent && p.elapsed<breakEvent.until){
      const alpha=Math.max(0,Math.min(1,(breakEvent.until-p.elapsed)/2));
      ctx.globalAlpha=alpha;
      route(ctx,breakEvent.old,'#ff5266',11,[15,12]);
      route(ctx,breakEvent.next,'#64ffd7',10,[12,8]);
      const q=breakEvent.at;
      ctx.fillStyle='#082630e8';ctx.fillRect(q.x-108,q.y-99,216,54);
      ctx.strokeStyle='#69ffce';ctx.lineWidth=3;ctx.strokeRect(q.x-108,q.y-99,216,54);
      ctx.font='900 17px system-ui';ctx.fillStyle='#a9ffe1';
      ctx.fillText(breakEvent.real?'POLICE DIVERTED':'STREET SEALED',q.x-94,q.y-76);
      ctx.font='bold 11px system-ui';ctx.fillText(breakEvent.real?'NEW ROUTE / OPEN ESCAPE':'POLICE RECOMPUTING',q.x-93,q.y-60);
      ctx.globalAlpha=1;
    }
    if(p.showdown?.active && p.lockdownUnit){
      const unit=p.lockdownUnit,r=40+6*Math.sin(time*5);
      ctx.strokeStyle=p.showdown.countered?'#75ffe0':'#ffb06b';ctx.lineWidth=3;
      ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(unit.x,unit.y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#101b2be0';ctx.fillRect(unit.x-87,unit.y-69,174,21);
      ctx.font='900 12px system-ui';ctx.fillStyle=p.showdown.countered?'#7bffe1':'#ffbb80';
      ctx.fillText('UNIT OMEGA / COMMAND',unit.x-78,unit.y-54);
    }
    ctx.restore();
  }
  function screen(ctx,w,h,run,p){
    const cut=p.routeBreak&&p.elapsed<p.routeBreak.until?p.routeBreak:null;
    if(!p.showdown?.active&&!cut)return;
    const s=p.showdown,diverted=!!cut?.real;
    const width=Math.min(530,w-460),x=Math.max(398,(w-width)/2),y=16;
    if(width<190)return;
    const headline=cut?(diverted?'POLICE INTERCEPT BROKEN':'RELAY ACTIVATED / ROAD SEALED'):
      s.countered?'UNIT OMEGA / SIGNAL DISRUPTED':'FINAL LOCKDOWN / UNIT OMEGA';
    const detail=cut?(diverted?'RED ROUTE BLOCKED · GREEN ROUTE CONFIRMED':'STREET CLOSED · DISPATCH RECALCULATING'):
      s.countered?'COMMANDER OUTSMARTED · +750 BANKED':'LAST INTERCEPT · F RADIO SPOOF OR SHIFT RELAY';
    ctx.save();
    ctx.fillStyle='#081725f5';ctx.fillRect(x,y,width,62);
    ctx.strokeStyle=cut?(diverted?'#66ffcb':'#ffbd77'):s.countered?'#6affc5':'#ff936f';
    ctx.lineWidth=3;ctx.strokeRect(x,y,width,62);
    ctx.font='900 18px system-ui';ctx.fillStyle='#fff';ctx.fillText(headline,x+15,y+27);
    ctx.font='bold 11px system-ui';ctx.fillStyle='#a6ffe1';ctx.fillText(detail,x+15,y+48);
    ctx.restore();
  }
  return {state,tick,world,screen};
})();
if(typeof module!=='undefined')module.exports=Showdown;
