// Shared mission prerequisites: strict for complete runs, optional on deliberate cashout.
const ContractRules = (() => {
  function required(run, stage) {
    if (!run.contractId || run.jobs?.earlyCashout) return {ready:true,task:''};
    if (run.contractId === 'switch' && stage === 1 && !(run.traffic?.successfulClosures > 0))
      return {ready:false,task:'HACK A LIVE RELAY (SHIFT) BEFORE THE VAULT'};
    if (run.contractId === 'iris' && stage === 2) {
      if (!(run.smoke?.used > 0)) return {ready:false,task:'DEPLOY SMOKE (Q) BEFORE THE COURIER'};
      if (!run.ghostAlley) return {ready:false,task:'CROSS THE COVERED SERVICE ALLEY'};
    }
    if (run.contractId === 'cash-depot' && stage === 2 && !run.bonus)
      return {ready:false,task:'RAID THE CASH DEPOT BEFORE THE COURIER'};
    return {ready:true,task:''};
  }
  function escapeReady(run,p) {
    if(!run.contractId || run.jobs?.earlyCashout)return true;
    if(!required(run,1).ready || !required(run,2).ready)return false;
    if(run.contractId==='iris')return (run.smoke?.used||0)>=1 && !!run.ghostAlley;
    if(run.contractId==='switch')return (run.traffic?.successfulClosures||0)>=1 && !!p.hadIntercept;
    if(run.contractId==='cash-depot')return !!run.bonus && run.lockdown?.choice===1;
    return true;
  }
  function nextAction(run,p) {
    if(!run.contractId || run.jobs?.earlyCashout)return '';
    const prerequisite=required(run,run.jobs?.stage);
    if(!prerequisite.ready)return prerequisite.task;
    if(run.contractId==='iris')return 'GHOST: SMOKE + ALLEY COMPLETE · BREAK CONTACT';
    if(run.contractId==='switch')return !p.hadIntercept?'GRID: BAIT A POLICE INTERCEPT (TAB)':'GRID: SABOTAGE COMPLETE · BREAK CONTACT';
    if(run.contractId==='cash-depot')return run.jobs?.stage===3?'PAYDAY: WEST QUAY EXTRACTION +1,750':'PAYDAY: CASH SECURED · REACH THE COURIER';
    return '';
  }
  return {required,escapeReady,nextAction};
})();
if(typeof module!=='undefined')module.exports=ContractRules;
