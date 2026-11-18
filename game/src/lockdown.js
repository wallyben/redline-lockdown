// Two genuine, connected extraction routes. State is owned by the run.
const Lockdown = (() => {
  const exits = [
    {id:'east',name:'EAST DOCK / SHADOW RUN',point:{x:1290,y:910},bonus:0,extraClear:0},
    {id:'west',name:'WEST QUAY / HIGH-RISK RUN',point:{x:130,y:910},bonus:1750,extraClear:1.2},
  ];
  function reset() {
    return {active:false,choice:0,elapsed:0,event:'',announced:false,finished:false};
  }
  function target(run) {
    return exits[run?.lockdown?.choice===1?1:0].point;
  }
  function select(run,which) {
    if(!run.lockdown?.active || (which!==0 && which!==1)) return false;
    if(run.contractId==='cash-depot' && which===0) {
      run.lockdown.event='PAYDAY REQUIRES THE WEST QUAY EXFIL';
      return false;
    }
    run.lockdown.choice=which;
    run.lockdown.event=which===0?'EAST: USE COVER TO BREAK LINE OF SIGHT':'WEST: +1,750 BONUS / MORE POLICE PRESSURE';
    return true;
  }
  function tick(run,p,dt=1/60) {
    const l=run.lockdown;
    if(!l) return;
    if(!l.active && run.jobs?.stage===3) {
      l.active=true;
      l.elapsed=0;
      l.choice=run.contractId==='cash-depot'?1:0;
      l.event='CITY LOCKDOWN / CHOOSE EAST OR WEST WITH 1 OR 2';
      l.announced=true;
      p.refresh=0;
    }
    if(l.active)l.elapsed+=dt;
  }
  return {exits,reset,target,select,tick};
})();
if(typeof module!=='undefined')module.exports=Lockdown;
