// Original Canvas effects. Simulation-time animation stays still when paused.
const Cinematic = (() => {
  let tracks=[],last=null,runTime=-1,event=null,previousStage=0,previousSmoke=0;
  function tick(run){
    if(run.time<runTime){tracks=[];last=null;event=null;previousStage=0;previousSmoke=0;}runTime=run.time;
    if(run.jobs.stage!==previousStage){event={text:run.jobs.stage===3?'FINAL RUN / REACH THE DOCKS':'NEXT JOB / KEEP MOVING',time:run.time};previousStage=run.jobs.stage;}
    if((run.smoke?.used||0)>previousSmoke){previousSmoke=run.smoke.used;event={text:'SMOKE DEPLOYED / CHANGE COURSE',time:run.time};}
    const c=run.car,speed=Math.hypot(c.vx,c.vy);
    const slip=Math.abs(-c.vx*Math.sin(c.angle)+c.vy*Math.cos(c.angle));
    if(last&&speed>60&&(c.braking||slip>30)){
      for(const side of [-1,1])tracks.push({x:last.x-Math.sin(last.angle)*side*8,y:last.y+Math.cos(last.angle)*side*8,
        tx:c.x-Math.sin(c.angle)*side*8,ty:c.y+Math.cos(c.angle)*side*8,t:run.time});
    }
    tracks=tracks.filter(t=>run.time-t.t<7).slice(-420);last={...c};
  }
  function streets(ctx,time){
    ctx.save();
    ctx.beginPath();ctx.rect(78,81,1268,878);for(const b of City.blocks)ctx.rect(b.x,b.y,b.right-b.x,b.bottom-b.y);ctx.clip('evenodd');
    // Pools of coloured light break across wet asphalt, never over the roofs.
    for(const lamp of [{x:840,y:385,c:'213,72,242'},{x:565,y:386,c:'255,193,95'},{x:690,y:545,c:'65,240,191'},{x:1275,y:905,c:'58,185,241'}]){
      const glow=ctx.createRadialGradient(lamp.x,lamp.y,0,lamp.x,lamp.y,150);
      glow.addColorStop(0,`rgba(${lamp.c},.24)`);glow.addColorStop(1,`rgba(${lamp.c},0)`);ctx.fillStyle=glow;ctx.fillRect(lamp.x-150,lamp.y-150,300,300);
      for(let i=0;i<23;i++){const y=lamp.y-33+i*5,x=lamp.x+Math.sin(i*7.13)*25;
        ctx.fillStyle=`rgba(${lamp.c},${.025+.06*(1+Math.sin(time*.9+i))*0.5})`;ctx.fillRect(x-40,y,35+(i*17)%70,1.5);}
    }
    for(const t of tracks){ctx.strokeStyle=`rgba(2,8,15,${.5*(1-(runTime-t.t)/7)})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.tx,t.ty);ctx.stroke();}
    for(let i=0;i<30;i++){
      const x=90+(i*173)%1230,y=100+(i*271)%820,age=(time*.8+i*.37)%1;
      if(City.wall(x,y,1))continue;
      ctx.strokeStyle=`rgba(143,208,230,${(1-age)*.16})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,y,age*10+1,age*4+1,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  function steam(ctx,time){
    ctx.save();
    for(const vent of [{x:735,y:465},{x:1070,y:680},{x:385,y:185}]){
      for(let i=0;i<7;i++){const age=(time*.35+i/7)%1,x=vent.x+age*35,y=vent.y-age*55,r=9+age*20;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(157,199,212,${(1-age)*.1})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
    }ctx.restore();
  }
  function screen(ctx,w,h,run,p,reduced){
    const speed=Math.hypot(run.car.vx,run.car.vy),strength=Math.max(0,(speed-150)/210);
    ctx.save();
    if(!reduced&&strength>0){
      ctx.lineWidth=1;ctx.strokeStyle=`rgba(166,226,247,${strength*.28})`;
      for(let i=0;i<28;i++){
        const a=i*2.399,phase=(run.time*1.7+i*.173)%1,r=.65+phase*.3;
        const x=w*.5+Math.cos(a)*w*r,y=h*.5+Math.sin(a)*h*r;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*60*strength,y+Math.sin(a)*45*strength);ctx.stroke();
      }
    }
    const danger=Math.max(p.contact/.87,run.impact>0?run.impact*.65:0);
    if(danger>.02){const g=ctx.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,w*.65);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(255,46,62,${Math.min(.45,danger*.5)})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
    if(event&&run.time-event.time<2.2){
      const age=run.time-event.time;ctx.globalAlpha=Math.min(1,age*5,(2.2-age)*3);
      ctx.font='italic 900 20px system-ui';const width=ctx.measureText(event.text).width;
      ctx.fillStyle='#09232ee8';ctx.fillRect(w/2-width/2-20,h-80,width+40,46);
      ctx.fillStyle='#83ffe0';ctx.fillText(event.text,w/2-width/2,h-50);ctx.globalAlpha=1;
    }
    // Instrument cluster remains anchored while the city moves.
    const x=w-215,y=86;
    ctx.fillStyle='#091821df';ctx.fillRect(x,y,190,85);ctx.strokeStyle='#5ee5d24d';ctx.strokeRect(x,y,190,85);
    ctx.fillStyle='#e3fbff';ctx.font='italic 900 39px system-ui';ctx.fillText(String(Math.round(speed*.55)).padStart(3,'0'),x+14,y+45);
    ctx.font='bold 10px system-ui';ctx.fillStyle='#6fe9d2';ctx.fillText('KM/H  /  REDLINE',x+14,y+64);
    for(let i=0;i<15;i++){ctx.fillStyle=i<speed/360*15?(i>11?'#ff6a65':'#70efd2'):'#273d48';ctx.fillRect(x+14+i*11,y+72,8,4);}
    ctx.restore();
  }
  return {tick,streets,steam,screen};
})();
