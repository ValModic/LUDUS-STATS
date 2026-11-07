/* Podatkovni model: razčlenjevalnik surovih vrstic Google Sheets (en zavihek = en krog lige).
   Logika je prenesena iz LUDUS-STATS-main/index.html (buildFromSheets) brez spremembe pravil. */
(function (root) {
  const SEASON_YEAR = 2026;
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[‐-―−-]/g, ' ').replace(/\s+/g, ' ').trim();

  function buildFromSheets(docs) {
    const PM = {}, pairs = [], matches = [], tournaments = [];
    const cap = s => s.toLowerCase().replace(/(^|\s|-)\S/g, x => x.toUpperCase());
    const pid = n => {
      const k = String(n).split('=')[0].replace(/\*/g, '').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim(), id = norm(k).replace(/[^a-z0-9]+/g, '_');
      if (!PM[id]) { PM[id] = { id, name: k.split(' / ').map(cap).join(' – ') }; pairs.push(PM[id]); }
      return id;
    };
    const isP = s => typeof s === 'string' && s.includes('/'), num = v => v === '' || v == null || isNaN(+v) ? null : +v;
    docs.forEach(doc => doc.tabs.forEach(tab => {
      const R = tab.rows, hd = R.slice(0, 4).map(r => (r && r[2]) || '').find(x => /LIGA/i.test(x)) || '';
      const h = /(\d)(?:\.([AB]))?\.?\s*LIGA\s*_\s*(\d+)\.\s*KROG/i.exec(hd), d = /\((\d+)\.\s*(\d+)\.\)/.exec(tab.name);
      if (!h || !d) return; /* preskoči predloge (X. LIGA) in pomožne zavihke */
      const lg = h[1] + (h[2] ? '.' + h[2].toUpperCase() : ''), lv = +h[1], mo = +d[2], date = `${mo >= 9 ? SEASON_YEAR : SEASON_YEAR + 1}-${String(mo).padStart(2, '0')}-${String(+d[1]).padStart(2, '0')}`;
      const t = { id: lg + '_' + h[3], lg, date, name: h[3] + '. krog', played: false, groups: [], results: {} }, gid = { A: new Set(), B: new Set() }, ms = [];
      R.slice(2, 9).forEach(r => { if (!r) return; if (isP(r[2])) gid.A.add(pid(r[2])); if (isP(r[9])) gid.B.add(pid(r[9])); });
      let grp = 'A', k = 0;
      R.forEach(r => {
        if (!r) return;
        const g = /^SKUPINA\s+([AB])\b/i.exec(String(r[2] || '')); if (g) { grp = g[1].toUpperCase(); return; }
        const lab = String(r[4] || '').trim(), kind = /^\(\d\)-\(\d\)$/.test(lab) ? 'g' : /^\(A\d\):\(B\d\)$/.test(lab) ? 'x' : /^za\s*\d+/i.test(lab) ? 'p' : /^obstanek/i.test(lab) ? 'o' : null;
        if (!kind || !isP(r[5]) || r.findIndex((c, i) => i > 5 && isP(c)) < 0) return; /* tekme z neznanim parom (A1, B2 …) še ne obstajajo */
        const bi = r.findIndex((c, i) => i > 5 && isP(c)), a = pid(r[5]), b = pid(r[bi]); let st = [], wa = 0, wb = 0, win = null, draw = false;
        if (kind === 'p') { const x = num(r[6]), y = num(r[9]); if (x != null && y != null && x !== y) { st = [[x, y]]; win = x > y ? a : b; } }
        else {
          [[6, 7], [8, 9], [10, 11]].forEach(([i, j]) => { const x = num(r[i]), y = num(r[j]); if (x != null && y != null && x !== y) { st.push([x, y]); if (x > y) wa++; else wb++; } });
          if (wa > 1 || wb > 1) win = wa > wb ? a : b; else if (lv === 6 && kind === 'g' && wa === 1 && wb === 1) draw = true; else st = [];
        } /* prazna celica ni 0; nedokončana tekma ni rezultat */
        if (kind === 'g') { gid[grp].add(a); gid[grp].add(b); }
        const m = { id: t.id + '_' + k, tid: t.id, date, league: lg, grp, a, b, order: k++, time: String(r[1] || ''), sets: st, status: win || draw ? 'played' : 'scheduled', winner: win, draw, kind, lab }; ms.push(m); matches.push(m);
      });
      t.groups = ['A', 'B'].map(g => ({ league: lg, grp: g, ids: [...gid[g]], ordered: null }));
      const mv = r => lv > 1 && r <= 2 ? 'up' : lv < 6 && (r >= 7 || (lv === 1 && r >= 5)) ? 'down' : 'same', pm = ms.filter(m => m.kind === 'p' || m.kind === 'o');
      pm.filter(m => m.winner).forEach(m => { const l = m.winner === m.a ? m.b : m.a, n = m.kind === 'o' ? 3 : +/\d+/.exec(m.lab)[0], ln = m.kind === 'o' ? 5 : n + 1; t.results[m.winner] = { league: lg, rank: n, move: mv(n) }; t.results[l] = { league: lg, rank: ln, move: mv(ln) }; });
      t.played = pm.length > 0 && pm.every(m => m.winner);
      if (t.groups.some(g => g.ids.length)) tournaments.push(t);
    }));
    tournaments.sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
    return { pairs, tournaments, matches };
  }

  const api = { buildFromSheets, norm };
  if (typeof module !== 'undefined') module.exports = api; else root.LudusModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
