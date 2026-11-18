// Contract-specific compulsory skills: no extra UI-only labels.
const ContractRules = (() => {
  function escapeReady(run,p) {
    if(!run.contractId) return true; // Preserve core simulation tests.
    if(run.jobs?.earlyCashout) return true;
    if(run.contractId==='iris')return (run.smoke?.used||0)>=1 && !!run.ghostAlley;
    if(run.contractId==='switch')return (run.traffic?.successfulClosures||0)>=1 && !!p.hadIntercept;
    if(run.contractId==='cash-depot')return !!run.bonus && run.lockdown?.choice===1;
    return true;
  }
  function nextAction(run,p) {
    if(!run.contractId || run.jobs?.earlyCashout)return '';
    if(run.contractId==='iris')return !(run.smoke?.used>0)?'GHOST: DEPLOY SMOKE (Q)' : !run.ghostAlley?'GHOST: PASS THROUGH THE COVERED ALLEY':'GHOST CLEAR / BREAK CONTACT';
    if(run.contractId==='switch')return !(run.traffic?.successfulClosures>0)?'GRID: CLOSE A RELAY (SHIFT)' : !p.hadIntercept?'GRID: BAIT A POLICE INTERCEPT':'GRID CLEAR / BREAK CONTACT';
    if(run.contractId==='cash-depot')return !run.bonus?'PAYDAY: COLLECT THE CASH DEPOT':'PAYDAY: EXTRACT FROM WEST QUAY';
    return '';
  }
  return {escapeReady,nextAction};
})();
if(typeof module!=='undefined')module.exports=ContractRules;
