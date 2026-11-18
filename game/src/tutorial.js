// First-time player coaching based on the live mission state.
// This is gameplay truth, not tutorial-only objectives or scripted screenshots.
const Tutorial = (() => {
  const rules = typeof module === 'undefined' ? ContractRules : require('./contract-rules.js');
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function hint(run, police) {
    if (!run?.car || !run.jobs) return { key: 'DRIVE', text: 'WASD TO DRIVE · SPACE TO HANDBRAKE' };
    const stage = run.jobs.stage;
    const speed = Math.hypot(run.car.vx || 0, run.car.vy || 0);
    const ready = rules.required(run, stage);
    if (!ready.ready) return {
      key: run.contractId === 'switch' ? 'SHIFT' : run.contractId === 'iris' ? 'Q / ALLEY' : 'SIDE JOB',
      text: ready.task
    };
    if (stage === 0) return speed < 55
      ? { key: 'ACCELERATE', text: 'ROLLING PICKUP · DRIVE THROUGH THE MOVING MARKER AT 55+ SPEED' }
      : { key: 'DRIVE THROUGH', text: 'KEEP YOUR SPEED · CROSS THE GOLD PICKUP CIRCLE' };
    if (stage === 1) {
      if (run.sweep >= 0) return { key: 'DRILL TIMING', text: 'PRESS E AGAIN AS THE MOVING NEEDLE ENTERS THE GREEN BAND' };
      const goal = run.contractId === 'switch' ? { x: 430, y: 530 } :
        run.contractId === 'cash-depot' ? { x: 520, y: 400 } : { x: 690, y: 400 };
      if (distance(run.car, goal) >= 45) return { key: 'BANK', text: 'DRIVE INTO THE GOLD VAULT CIRCLE AND STOP' };
      return speed >= 36
        ? { key: 'BRAKE', text: 'STOP BELOW 36 SPEED TO ACCESS THE VAULT' }
        : { key: 'PRESS E', text: 'START THE DRILL · THEN HIT E AGAIN IN THE GREEN BAND' };
    }
    if (stage === 2) {
      const courier = run.jobs.courier;
      if (!courier || distance(run.car, courier) >= 65)
        return { key: 'CHASE', text: 'MATCH THE MOVING COURIER · GET WITHIN 65 METRES' };
      if (speed >= 75) return { key: 'SLOW DOWN', text: 'DROP BELOW 75 SPEED WHILE BESIDE THE COURIER' };
      return { key: 'HOLD E', text: 'STAY NEAR THE COURIER UNTIL THE TRANSFER COMPLETES' };
    }
    if (!rules.escapeReady(run, police || {}))
      return { key: 'CONTRACT', text: 'COMPLETE THE CONTRACT MASTERY TASK BEFORE EXTRACTION' };
    if (police?.seen) return { key: 'BREAK SIGHT', text: 'HIDE BEHIND BUILDINGS · Q SMOKE · F DECOY · SHIFT RELAY' };
    return { key: 'EXTRACT', text: 'STAY UNSEEN UNTIL SEARCH CLEARS · DRIVE INTO THE SELECTED DOCK GATE' };
  }
  return { hint };
})();
if (typeof module !== 'undefined') module.exports = Tutorial;
