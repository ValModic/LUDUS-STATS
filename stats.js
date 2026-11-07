/* Statistika parov (logika prenesena iz starega projekta) + novi izračuni za turnirski dan. */
let D = null;
const pc = (a, b) => b ? Math.round(100 * a / b) : null, F = v => v == null ? '–' : v + ' %';
const zm = n => n == 1 ? 'zmago' : n == 2 ? 'zmagi' : n < 5 && n > 0 ? 'zmage' : 'zmag';
const P = id => D.pairs.find(p => p.id === id);
const nm = id => (P(id) || { name: '?' }).name;
const lvl = l => 7 - parseInt(l);

const played = id => D.matches.filter(m => m.status === 'played' && m.sets.length && (m.a === id || m.b === id)).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : x.order - y.order);
const view = (m, id) => { const f = m.a === id; return { m, opp: f ? m.b : m.a, sets: m.sets.map(s => f ? s : [s[1], s[0]]), win: m.winner === id, draw: !m.winner }; };
function curLeague(id) { for (let i = D.tournaments.length - 1; i >= 0; i--) { const g = D.tournaments[i].groups.find(g => g.ids.includes(id)); if (g) return g.league; } return null; }

function stats(id) {
  const ms = played(id).map(m => view(m, id)), o = { n: ms.length, w: 0, l: 0, d: 0, sw: 0, sl: 0, ms, ps: [0, 1, 2].map(() => ({ n: 0, w: 0, pf: 0, d: 0 })), c: { w20: 0, w21: 0, l02: 0, l12: 0, comeW: 0, lostAfter: 0 } };
  let cur = 0, mw = 0, ml = 0;
  ms.forEach(v => {
    v.draw ? (o.d++, cur = 0) : v.win ? (o.w++, cur = cur > 0 ? cur + 1 : 1) : (o.l++, cur = cur < 0 ? cur - 1 : -1); mw = Math.max(mw, cur); ml = Math.max(ml, -cur);
    if (v.sets.length < 2) { const s1 = v.sets[0]; if (s1[0] > s1[1]) o.sw++; else o.sl++; return; } /* tekma za mesto (1 set): šteje v skupne sete, ne v 1./2./3. set */
    v.sets.forEach((s, i) => { const p = o.ps[i]; p.n++; p.pf += s[0]; p.d += s[0] - s[1]; s[0] > s[1] ? (p.w++, o.sw++) : o.sl++; });
    if (v.draw) return; const k = v.sets.length, f = v.sets[0];
    if (v.win) { k == 2 ? o.c.w20++ : o.c.w21++; if (f[0] < f[1]) o.c.comeW++; } else { k == 2 ? o.c.l02++ : o.c.l12++; if (f[0] > f[1]) o.c.lostAfter++; }
  });
  o.maxW = mw; o.maxL = ml; o.form = ms.slice(-5).map(v => v.draw ? null : v.win); o.pct = pc(o.w, o.n); o.setPct = pc(o.sw, o.sw + o.sl); return o;
}
function h2h(a, b) { const ms = played(a).filter(m => m.a === b || m.b === b).map(m => view(m, a)); return { n: ms.length, w: ms.filter(v => v.win).length, ms }; }
function moves(id) { return D.tournaments.filter(t => t.results[id]).map(t => t.results[id].move); }

function patterns(id) {
  const s = stats(id), r = []; if (s.n < 2) return ['Premalo odigranih tekem za analizo vzorcev.'];
  const f = s.form.filter(Boolean).length; r.push(`V zadnjih ${s.form.length} tekmah je zabeležil ${f} ${zm(f)}.`);
  const l10 = s.ms.filter(v => v.sets.length > 1).slice(-10); if (l10.length >= 5) { const x = l10.filter(v => v.sets[0][0] > v.sets[0][1]).length; r.push(`Dobil je ${x} od zadnjih ${l10.length} prvih setov.`); }
  if (s.ps[2].n >= 2) r.push(`V odločilnem tretjem setu je uspešen v ${pc(s.ps[2].w, s.ps[2].n)} % primerov (${s.ps[2].w} od ${s.ps[2].n}).`);
  if (s.c.lostAfter > 0) r.push(`Po dobljenem prvem setu je tekmo izgubil ${s.c.lostAfter}-krat.`);
  if (s.c.comeW > 0) r.push(`Po izgubljenem prvem setu je tekmo obrnil ${s.c.comeW}-krat.`);
  const mv = moves(id), up = mv.filter(x => x === 'up').length, dn = mv.filter(x => x === 'down').length;
  if (mv.length) r.push(`Na ${mv.length} ${mv.length == 1 ? 'turnirju' : 'turnirjih'} je napredoval ${up}-krat in izpadel ${dn}-krat.`);
  return r;
}

/* ---- Elo (predpomnjen, preračuna se ob novih podatkih) ---- */
let EC = null;
const eloOf = id => { if (!EC || EC.d !== D) EC = { d: D, r: LUDUS_ELO.compute(D) }; return EC.r[id]; };

function predict(a, b) {
  const A = stats(a), B = stats(b), H = h2h(a, b); if (A.n < 3 || B.n < 3) return null;
  const fm = s => (s.form.filter(Boolean).length + 1) / (s.form.length + 2);
  const dF = fm(A) - fm(B), dL = lvl(curLeague(a)) - lvl(curLeague(b));
  const p = Math.round(100 * LUDUS_ELO.expected(eloOf(a).now, eloOf(b).now));
  const why = [];
  why.push(dF > .1 ? `${nm(a)} ima boljšo formo.` : dF < -.1 ? `${nm(b)} ima boljšo formo.` : 'Oba para imata primerljivo formo.');
  const t3 = s => s.ps[2].n >= 2 ? s.ps[2].w / s.ps[2].n : null, ta = t3(A), tb = t3(B);
  if (ta != null && tb != null && Math.abs(ta - tb) > .2) why.push(`${ta > tb ? nm(a) : nm(b)} je uspešnejši v odločilnih tretjih setih.`);
  if (dL) why.push(`${dL > 0 ? nm(a) : nm(b)} igra v višji ligi.`);
  if (H.n) why.push(`Medsebojni izid: ${H.w}:${H.n - H.w}.`);
  return { p, why: why.join(' '), basis: Math.min(A.n, B.n) };
}

/* ---- Turnirski dan ---- */
const EXPECTED_TOTAL = t => parseInt(t.lg) === 6 ? 27 : 20; /* 2×6 skupinskih + 8 izločilnih; 6. liga 2×10 + 7 */
const tourMatches = t => D.matches.filter(m => m.tid === t.id);

/* lestvica skupine iz odigranih skupinskih tekem: zmage, razlika setov, razlika točk */
function standings(t, grp) {
  const g = t.groups.find(x => x.grp === grp); if (!g) return [];
  const st = {}; g.ids.forEach(id => st[id] = { id, n: 0, w: 0, l: 0, d: 0, sd: 0, pd: 0, pts: 0 });
  tourMatches(t).filter(m => m.kind === 'g' && m.grp === grp && m.status === 'played').forEach(m => {
    const A = st[m.a], B = st[m.b]; if (!A || !B) return; A.n++; B.n++;
    if (m.draw) { A.d++; B.d++; A.pts++; B.pts++; } else { const w = m.winner === m.a ? A : B, l = w === A ? B : A; w.w++; l.l++; w.pts += 2; }
    m.sets.forEach(([x, y]) => { A.pd += x - y; B.pd += y - x; A.sd += x > y ? 1 : -1; B.sd += x > y ? -1 : 1; });
  });
  return Object.values(st).sort((x, y) => y.pts - x.pts || y.sd - x.sd || y.pd - x.pd);
}

/* napredek turnirja: faza + odigrane / vse */
function progress(t) {
  const ms = tourMatches(t), done = ms.filter(m => m.status === 'played').length, total = Math.max(EXPECTED_TOTAL(t), ms.length);
  const grpM = ms.filter(m => m.kind === 'g'), grpDone = grpM.filter(m => m.status === 'played').length;
  const knM = ms.filter(m => m.kind !== 'g'), knDone = knM.filter(m => m.status === 'played').length;
  let phase = 'Čaka na začetek', step = 0;
  if (done === 0) { phase = 'Čaka na začetek'; step = 0; }
  else if (t.played) { phase = 'Zaključeno'; step = 3; }
  else if (grpM.length && grpDone < grpM.length) { phase = 'Skupinski del'; step = 1; }
  else { phase = 'Izločilni del'; step = 2; }
  return { done, total, pct: Math.round(100 * done / total), grpDone, grpTotal: grpM.length, knDone, knTotal: Math.max(total - grpM.length, knM.length), phase, step };
}

const todayISO = () => { const q = new URLSearchParams(location.search).get('date'); if (q && /^\d{4}-\d\d-\d\d$/.test(q)) return q; const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const minutes = s => { const m = /^(\d{1,2}):(\d\d)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
