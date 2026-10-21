/* LUDUS Elo – ocena moči parov. Računa se vsakič znova iz vseh odigranih tekem (deterministično). */
const LUDUS_ELO = {
  START: { 1: 1500, 2: 1400, 3: 1300, 4: 1200, 5: 1100, 6: 1000 }, // začetni Elo po nivoju lige (A/B je isti nivo)
  K: 48,
  W20: 1.2,   // zmaga 2:0, poraz 0:2 in tekma za mesto (en set) – obravnava kot 2:0 / 0:2
  W21: 0.8,   // zmaga 2:1, poraz 1:2
  WDRAW: 1,   // neodločeno 1:1 (6. liga, 2 seta): S = 0,5
  expected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); },
  // izid tekme z vidika para A: S (1 / 0,5 / 0) in utež M; null, če tekma ni odigrana
  outcome(m) {
    if (!m || m.status !== 'played' || !m.sets || !m.sets.length) return null;
    if (!m.winner) return m.sets.length === 2 ? { S: 0.5, M: this.WDRAW } : null;
    const S = m.winner === m.a ? 1 : 0;
    return { S, M: m.sets.length === 3 ? this.W21 : this.W20 };   // 1 ali 2 seta = 2:0 / 0:2, 3 seti = 2:1 / 1:2
  },
  // vrne { id: { start, now, games, hist:[{tid,date,name,league,elo}] } }
  compute(D) {
    const T = [...D.tournaments].sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : x.id < y.id ? -1 : 1);
    const byT = {}; D.matches.forEach((m, i) => (byT[m.tid] = byT[m.tid] || []).push([m, i]));
    const R = {};
    T.forEach(t => {
      t.groups.forEach(g => g.ids.forEach(id => {            // začetni Elo: liga prvega nastopa, samo enkrat
        if (!R[id]) { const s = this.START[parseInt(g.league)] || 1000; R[id] = { start: s, now: s, games: 0, hist: [{ tid: null, date: null, name: 'Začetek', elo: s }] }; }
      }));
      const touched = new Set();
      (byT[t.id] || []).filter(([m]) => this.outcome(m)).sort((p, q) => (p[0].order - q[0].order) || (p[1] - q[1])).forEach(([m]) => {
        const a = R[m.a], b = R[m.b], o = this.outcome(m); if (!a || !b) return;
        const d = this.K * o.M * (o.S - this.expected(a.now, b.now));   // oba Elo tik pred tekmo
        a.now += d; b.now -= d; a.games++; b.games++; touched.add(m.a); touched.add(m.b);
      });
      touched.forEach(id => R[id].hist.push({ tid: t.id, date: t.date, name: t.name, league: (t.groups.find(g => g.ids.includes(id)) || {}).league, elo: R[id].now }));
    });
    return R;
  }
};
if (typeof module !== 'undefined') module.exports = LUDUS_ELO;
