const StreetDetail = (() => {
  function paint(ctx) {
    let seed=451;
    const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(const b of City.blocks){
      // Roof machinery, brick courses and pavement gardens have fixed positions.
      for(let i=0;i<24;i++){
        const x=b.x+8+random()*(b.right-b.x-16),y=b.y+8+random()*(b.bottom-b.y-16);
        ctx.fillStyle=i%3?'#819ca315':'#e5bea61a';ctx.fillRect(x,y,9+random()*18,2);
      }
      for(let x=b.x+14;x<b.right-15;x+=30){
        ctx.fillStyle='#090f16';ctx.fillRect(x+3,b.y+17,19,14);
        ctx.fillStyle='#526675';ctx.fillRect(x,b.y+14,19,12);
        ctx.strokeStyle='#20303d';for(let q=3;q<16;q+=4){ctx.beginPath();ctx.moveTo(x+q,b.y+15);ctx.lineTo(x+q,b.y+24);ctx.stroke();}
      }
      for(let y=b.y+34;y<b.bottom-15;y+=25){
        ctx.fillStyle='#142c28';ctx.beginPath();ctx.arc(b.x+8,y,7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#39736a';ctx.beginPath();ctx.arc(b.x+6,y-2,4,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.save();ctx.font='900 18px system-ui';ctx.fillStyle='#9db8be28';
    ctx.fillText('IRIS BOULEVARD',780,425);ctx.fillText('PORT MERIDIAN / 09',860,935);
    ctx.restore();
  }
  function motion(ctx,run,pursuit,time){
    if(pursuit.intercept){
      const unit=pursuit.units[1],target=City.nodes[pursuit.intercept.node];
      ctx.save();ctx.strokeStyle='#ffae6370';ctx.lineWidth=3;ctx.setLineDash([7,9]);ctx.lineDashOffset=-time*24;
      ctx.beginPath();ctx.moveTo(unit.x,unit.y);for(const point of unit.path)ctx.lineTo(point.x,point.y);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='#ff8d62';ctx.lineWidth=2;ctx.strokeRect(target.x-34,target.y-34,68,68);ctx.restore();
    }
    if(run.impact>0){ctx.save();ctx.strokeStyle='#ffd39a';ctx.lineWidth=2;const c=run.car;
      for(let i=0;i<12;i++){const a=i*2.399,reach=(.65-run.impact)*100;ctx.beginPath();ctx.moveTo(c.x+Math.cos(a)*reach,c.y+Math.sin(a)*reach);ctx.lineTo(c.x+Math.cos(a)*(reach+8),c.y+Math.sin(a)*(reach+8));ctx.stroke();}ctx.restore();}
  }
  return {paint,motion};
})();
