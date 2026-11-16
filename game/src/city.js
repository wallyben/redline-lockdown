const City = (() => {
  const xs = [130, 430, 690, 1010, 1290];
  const ys = [130, 400, 650, 910];
  const nodes = ys.flatMap(y => xs.map(x => ({ x, y })));
  const edges = nodes.map((_, i) => [
    i >= 5 && i - 5, i < 15 && i + 5,
    i % 5 > 0 && i - 1, i % 5 < 4 && i + 1,
  ].filter(n => n !== false));
  const widths = [53, 52, 42, 42, 57];
  const blocks = ys.slice(0, -1).flatMap((y, row) => xs.slice(0, -1).map((x, col) => ({
    x: x + widths[col], y: y + 49, right: xs[col + 1] - widths[col + 1],
    bottom: ys[row + 1] - 49, row, col,
  })));
  const alley = { x: 690, top: 485, bottom: 620, halfWidth: 28, coverTop: 467, coverBottom: 853 };
  const inCover = ({ x, y }) => (Math.abs(x - alley.x) < 43 && y > alley.coverTop && y < alley.coverBottom) || (x > 1160 && y > 860);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function wall(x, y, radius = 11) {
    return x < 78 + radius || x > 1346 - radius || y < 81 + radius || y > 959 - radius ||
      (y + radius > alley.top && y - radius < alley.bottom && Math.abs(x - alley.x) < 43 && Math.abs(x - alley.x) + radius > alley.halfWidth) ||
      blocks.some(b => x + radius > b.x && x - radius < b.right &&
        y + radius > b.y && y - radius < b.bottom);
  }
  function nearest(p) {
    return nodes.reduce((best, n, i) => distance(n, p) < distance(nodes[best], p) ? i : best, 0);
  }
  function route(start, end) {
    const queue = [start];
    const parents = new Map([[start, null]]);
    for (const n of queue) {
      if (n === end) {
        const path = [];
        for (let i = end; i !== null; i = parents.get(i)) path.unshift(i);
        return path;
      }
      for (const next of edges[n]) {
        if (parents.has(next)) continue;
        parents.set(next, n);
        queue.push(next);
      }
    }
    return [];
  }
  return { xs, ys, widths, blocks, nodes, edges, alley, inCover, distance, wall, nearest, route };
})();
if (typeof module !== 'undefined') module.exports = City;
