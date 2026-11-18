const Records = (() => {
  const version = 2;
  const key = 'redline-records-v2';
  let rows = [];
  let persistent = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) rows = saved.filter(r => r.version === version &&
      Number.isFinite(r.total) && r.total >= 0 && Number.isFinite(r.time) &&
      Number.isFinite(r.integrity) && typeof r.contract === 'string');
  } catch { persistent = false; }
  const table = contract => rows.filter(r => r.contract === contract).sort((a,b) =>
    b.total-a.total || a.time-b.time || b.integrity-a.integrity).slice(0,5);
  function bank(run, pursuit, contract) {
    if (run.banked || !['Clean getaway','Escaped','Partial cashout'].includes(pursuit.result)) return null;
    run.banked = true;
    const score = Pursuit.score(run,pursuit);
    const old = table(contract.id)[0];
    const row = {version,contract:contract.id,total:score.total,time:run.time,
      integrity:Math.max(0,100-run.car.damage)};
    rows.push(row);
    rows = rows.filter(r => r.contract !== contract.id).concat(table(contract.id));
    try { localStorage.setItem(key,JSON.stringify(rows)); } catch { persistent=false; }
    return { ...row,delta:old ? row.total-old.total : null };
  }
  return {table,bank,get persistent(){return persistent;}};
})();
