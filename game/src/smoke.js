// Smoke occupies the street where it was released; it never follows the car.
const Smoke = (() => {
  function reset() { return { charges:2, cooldown:0, clouds:[], used:0 }; }
  function deploy(run) {
    const s=run.smoke;
    if(!s || !s.charges || s.cooldown>0) return false;
    s.charges--; s.used++; s.cooldown=7;
    s.clouds.push({x:run.car.x,y:run.car.y,age:0});
    return true;
  }
  function tick(run,dt) {
    run.smoke.cooldown=Math.max(0,run.smoke.cooldown-dt);
    for(const c of run.smoke.clouds)c.age+=dt;
    run.smoke.clouds=run.smoke.clouds.filter(c=>c.age<4.5);
  }
  function obscures(clouds,a,b) {
    if(Math.hypot(a.x-b.x,a.y-b.y)<48)return false;
    return clouds.some(c=>{
      const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy)/(dx*dx+dy*dy)));
      return Math.hypot(c.x-a.x-t*dx,c.y-a.y-t*dy)<Math.min(68,25+c.age*45);
    });
  }
  function draw(ctx,run) {
    for(const c of run.smoke.clouds)for(let i=0;i<9;i++){
      const angle=i*2.4,r=Math.min(68,25+c.age*45),x=c.x+Math.cos(angle)*r*.45,y=c.y+Math.sin(angle)*r*.45;
      const g=ctx.createRadialGradient(x,y,0,x,y,r*.7);
      g.addColorStop(0,`rgba(124,183,187,${Math.min(.36,(4.5-c.age)*.15)})`);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  }
  return {reset,deploy,tick,obscures,draw};
})();
if(typeof module!=='undefined')module.exports=Smoke;
