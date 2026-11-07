/* LUDUS Stats v2 – prikaz */
const CFG = { REFRESH_MIN: 5, SHEETS_ENDPOINT: './data/sheets.json' };
const $ = s => document.querySelector(s);
const norm = LudusModel.norm;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

const IC = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 010 6.4M18.5 14.8c1.7.7 2.7 2.2 3 4.7"/>',
  scale: '<path d="M12 3v18M6 21h12M5 7h14M5 7l-3 7a3.5 3.5 0 006 0L5 7zM19 7l-3 7a3.5 3.5 0 006 0l-3-7z"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 01-8 0V4zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 21h8M10 18h4"/>',
  refresh: '<path d="M20 11a8 8 0 00-14.5-4M4 4v4h4M4 13a8 8 0 0014.5 4M20 20v-4h-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

/* ---------- stanje ---------- */
const S = { me: store.get('ludus_me'), route: { v: 'home' }, day: null, filter: 'all', upd: null, fetched: null, err: null, loading: true, fl: { lg: '', op: '', res: '' }, ca: null, cb: null, eq: '', el: '' };
let charts = [];
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- datumi ---------- */
const ld = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (iso, base) => Math.round((ld(iso) - ld(base)) / 864e5);
const fdLong = iso => ld(iso).toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' });
const fd = iso => ld(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });
const hhmm = d => d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
const sc = v => v.sets.map(s => s.join(':')).join(' | ');
const pl = (n, a, b, c, d) => n % 100 === 1 ? a : n % 100 === 2 ? b : (n % 100 === 3 || n % 100 === 4) ? c : d;
const lgName = lg => { const [n, g] = String(lg).split('.'); return `${n}. liga${g ? ' ' + g : ''}`; };

/* ---------- podatki ---------- */
const DataSource = {
  stale: false,
  async load() {
    try {
      const r = await fetch(CFG.SHEETS_ENDPOINT, { cache: 'no-store' }), j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Napaka strežnika ' + r.status + '.');
      const x = LudusModel.buildFromSheets(j.docs); if (!x.matches.length) throw new Error('V preglednicah ni najdenih tekem.');
      store.set('ludus_cache', JSON.stringify(j)); S.fetched = j.fetchedAt; return x;
    } catch (e) {
      let c = null; try { c = JSON.parse(store.get('ludus_cache')); } catch (_) { }
      if (c) { DataSource.stale = true; S.fetched = c.fetchedAt; return LudusModel.buildFromSheets(c.docs); } throw e;
    }
  }
};
async function refresh(manual) {
  const b = $('#rf'); if (b) b.classList.add('spin');
  try { DataSource.stale = false; D = await DataSource.load(); S.upd = new Date(); S.err = DataSource.stale ? 'Podatkov ni bilo mogoče osvežiti, prikazani so zadnji shranjeni.' : null; }
  catch (x) { S.err = x.message || 'Podatkov ni mogoče pridobiti.'; }
  S.loading = false; if (!S.shown) { S.anim = true; S.shown = true; } render(); if (manual) setTimeout(() => { const b = $('#rf'); b && b.classList.remove('spin'); }, 300);
}

/* ---------- usmerjanje (#/…) ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '').split('/'), v = h[0] || 'home';
  S.route = v === 'par' && h[1] ? { v: 'pair', id: decodeURIComponent(h[1]) } : { v: ({ pari: 'pairs', primerjava: 'compare', elo: 'elo' })[v] || 'home' };
}
const href = (v, id) => '#/' + ({ home: '', pairs: 'pari', compare: 'primerjava', elo: 'elo' }[v] ?? 'par/' + encodeURIComponent(id));
const go = (h) => { location.hash = h; };
addEventListener('hashchange', () => { parseHash(); S.anim = true; render(); scrollTo(0, 0); });

/* ---------- gradniki ---------- */
const pairBtn = id => `<button data-go="par/${esc(id)}" title="Odpri profil">${esc(nm(id))}</button>`;
const formPills = f => f.length ? `<span class="form">${f.map(w => w === null ? '<span class="f n">N</span>' : `<span class="f ${w ? '' : 'l'}">${w ? 'Z' : 'P'}</span>`).join('')}</span>` : '<span class="mut">Ni podatkov</span>';
const empty = (t, s = '') => `<div class="empty"><b>${t}</b>${s}</div>`;
const stat = (l, v, s = '') => `<div class="stat"><b>${v}</b><span>${l}${s ? ' · ' + s : ''}</span></div>`;
const sg = n => (n > 0 ? '+' : '') + n, eC = n => n > 0 ? 'var(--win)' : n < 0 ? 'var(--lose)' : 'var(--tx2)';

function matchStatus(m, today) {
  if (m.status === 'played') return 'played';
  if (m.date === today) { const mm = minutes(m.time), n = new Date(), now = n.getHours() * 60 + n.getMinutes(); return mm != null && mm <= now ? 'due' : 'soon'; }
  return m.date < today ? 'missing' : 'soon';
}
function matchCard(m, today, isNext) {
  const st = matchStatus(m, today), played = m.status === 'played', mine = S.me && (m.a === S.me || m.b === S.me);
  const sets = m.sets, n = Math.max(sets.length, 0);
  const sa = m.winner === m.a, sb = m.winner === m.b;
  const kind = m.kind === 'g' ? `Skupina ${m.grp}` : m.kind === 'x' ? 'Križni boj' : m.kind === 'o' ? 'Obstanek' : (m.lab ? m.lab.replace(/^za/i, 'Za') : 'Za mesto');
  const pill = st === 'played' ? (m.draw ? '<span class="pill blue">Neodločeno</span>' : '<span class="pill win">Odigrano</span>')
    : isNext ? '<span class="pill ac">Na vrsti</span>' : st === 'due' ? '<span class="pill warn">Čaka rezultat</span>' : st === 'missing' ? '<span class="pill">Brez rezultata</span>' : '<span class="pill">Prihaja</span>';
  const res = played ? (sets.length > 1 ? `${sets.filter(s => s[0] > s[1]).length}:${sets.filter(s => s[0] < s[1]).length}` : '') : '';
  return `<article class="match${isNext ? ' next' : ''}${mine ? ' mine' : ''}">
    <div class="mtime"><b>${esc(m.time || '–')}</b><span>${m.time ? 'ura' : 'ura n/a'}</span></div>
    <div><div class="teams">
      <div class="team ${sa ? 'w' : ''}">${pairBtn(m.a)}</div>
      <div class="team ${sb ? 'w' : ''}">${pairBtn(m.b)}</div></div>
      <div class="mmeta"><span>${esc(kind)}</span>${mine ? '<span style="color:var(--ac-text)">★ Moj par</span>' : ''}</div></div>
    <div class="mright">${played ? `<div class="msets">${res}</div>` : ''}${played ? `<div class="scores" style="grid-template-columns:repeat(${sets.length},auto);grid-auto-flow:row">${sets.map(s => `<b class="${s[0] > s[1] ? 'w' : ''}">${s[0]}</b>`).join('')}${sets.map(s => `<b class="${s[1] > s[0] ? 'w' : ''}">${s[1]}</b>`).join('')}</div>` : ''}${pill}</div>
  </article>`;
}

function groupTable(t, grp) {
  const rows = standings(t, grp); if (!rows.length) return '';
  const any = rows.some(r => r.n);
  return `<div class="card flat"><div class="sec-h" style="margin-bottom:8px"><h2 style="font-size:16px">Skupina ${grp}</h2><span class="xs mut3">${any ? 'Zmage · razlika setov' : 'Tekme se še niso začele'}</span></div>
  <table class="tbl"><thead><tr><th></th><th>Par</th><th class="r hm">T</th><th class="r">Z</th><th class="r">P</th><th class="r">±S</th><th class="r hm">±T</th></tr></thead><tbody>
  ${rows.map((r, i) => { const mv = (t.results[r.id] || {}).move, tag = mv === 'up' ? '<span class="mv up">▲ Napreduje</span>' : mv === 'down' ? '<span class="mv down">▼ Izpada</span>' : ''; return `<tr class="trow ${any && i < 2 ? 'top2' : ''} ${S.me === r.id ? 'me' : ''} ${mv === 'up' ? 'mup' : mv === 'down' ? 'mdown' : ''}" data-go="par/${esc(r.id)}"><td class="rk">${i + 1}</td><td class="gname">${esc(nm(r.id))}${tag}<small>${r.n ? `${r.n} ${pl(r.n, 'tekma', 'tekmi', 'tekme', 'tekem')}` : 'še brez tekem'}</small></td><td class="r hm">${r.n}</td><td class="r"><b>${r.w}</b></td><td class="r">${r.l}</td><td class="r" style="color:${eC(r.sd)}">${any ? sg(r.sd) : '–'}</td><td class="r mut hm">${any ? sg(r.pd) : '–'}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}

function tournamentBlock(t, today) {
  const pr = progress(t), ms = tourMatches(t).slice();
  const steps = ['Skupinski del', 'Izločilni del', 'Zaključeno'];
  const tm = m => minutes(m.time) ?? 9999;
  ms.sort((a, b) => (a.kind === 'g' ? 0 : 1) - (b.kind === 'g' ? 0 : 1) || tm(a) - tm(b) || a.order - b.order);
  const f = S.filter, mine = x => S.me && (x.a === S.me || x.b === S.me);
  const list = ms.filter(m => f === 'all' || (f === 'played' && m.status === 'played') || (f === 'todo' && m.status !== 'played') || (f === 'mine' && mine(m)));
  const open = ms.filter(m => m.status !== 'played'), minT = open.length ? Math.min(...open.map(tm)) : null, nextIds = new Set(t.date === today && open.length ? open.filter(m => tm(m) === minT).map(m => m.id) : []);
  const body = list.length ? `<div class="mlist">${list.map(m => matchCard(m, today, nextIds.has(m.id))).join('')}</div>` : empty('Ni tekem za izbrani filter', f === 'mine' ? 'Za ta turnir tvoj par nima tekem. Par izbereš v zavihku Pari.' : '');
  const knockoutNote = pr.knDone === 0 && pr.step <= 1 && t.date >= today ? `<p class="xs mut3" style="margin-top:10px">Izločilne tekme (križni boji, tekme za mesta) se prikažejo, ko so znani pari.</p>` : '';
  return `<section class="sec">
    <div class="tour-h"><h2>${esc(lgName(t.lg))} <span class="pill ${pr.step === 3 ? 'win' : pr.step === 0 ? '' : 'ac'}">${pr.phase}</span></h2><span class="mut sm">${esc(t.name)} · ${fd(t.date)}</span></div>
    <div class="card" style="margin-top:12px">
      <div class="stepper">${steps.map((s, i) => `<div class="step ${pr.step > i + 1 || pr.step === 3 ? 'done' : pr.step === i + 1 ? 'cur' : ''}"><i>${pr.step > i + 1 || pr.step === 3 ? '✓' : i + 1}</i>${s}</div>`).join('')}</div>
      <div class="bar" role="progressbar" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pr.pct}%"></i></div>
      <div class="prog-meta"><span><b class="num" style="color:var(--tx)">${pr.done}</b> od ${pr.total} tekem odigranih</span><span class="num">${pr.pct} %</span></div>${knockoutNote}
    </div>
    <div class="split" style="margin-top:14px">${groupTable(t, 'A')}${groupTable(t, 'B')}</div>
    <div class="sec-h" style="margin-top:22px"><h2 style="font-size:16px">Tekme</h2></div>${body}
  </section>`;
}

/* ---------- pogled: domov ---------- */
function vHome() {
  const today = todayISO(), days = [...new Set(D.tournaments.map(t => t.date))].sort();
  if (!S.day || !days.includes(S.day)) S.day = days.includes(today) ? today : (days.find(d => d > today) || days[days.length - 1]);
  const day = S.day, isToday = day === today, ts = D.tournaments.filter(t => t.date === day);
  const ms = ts.flatMap(tourMatches), done = ms.filter(m => m.status === 'played').length;
  const total = ts.reduce((n, t) => n + progress(t).total, 0), left = total - done, diff = dayDiff(day, today);
  const when = isToday ? 'Danes' : diff > 0 ? (diff === 1 ? 'Jutri' : `Čez ${diff} ${pl(diff, 'dan', 'dneva', 'dni', 'dni')}`) : diff === -1 ? 'Včeraj' : `Pred ${-diff} ${pl(-diff, 'dnevom', 'dnevoma', 'dnevi', 'dnevi')}`;
  const strip = `<div class="days" role="tablist" aria-label="Turnirski dnevi">${days.map(d => {
    const o = ld(d), n = D.tournaments.filter(t => t.date === d), all = n.flatMap(tourMatches), full = n.every(t => t.played);
    return `<button class="day ${d === day ? 'on' : ''} ${d === today ? 'today' : ''}" data-day="${d}" role="tab" aria-selected="${d === day}"><small>${o.toLocaleDateString('sl-SI', { weekday: 'short' })}</small><b>${o.getDate()}. ${o.getMonth() + 1}.</b><em>${d === today ? 'danes' : full ? 'odigrano' : n.length + ' ' + pl(n.length, 'turnir', 'turnirja', 'turnirji', 'turnirjev')}</em></button>`;
  }).join('')}</div>`;
  const live = isToday && left > 0;
  let h = `<div class="hero"><span class="eyebrow"><span class="dot ${live ? '' : 'off'}"></span>${when}${live ? ' · turnir poteka' : ''}</span>
    <h1>${fdLong(day)}</h1>
    <p class="mut">${ts.length ? ts.map(t => esc(lgName(t.lg))).join(' · ') : 'Ta dan ni turnirja.'}</p>
    <div class="kpis"><div class="kpi"><b>${ts.length}</b><span>${pl(ts.length, 'turnir', 'turnirja', 'turnirji', 'turnirjev')}</span></div><div class="kpi ac"><b>${done}</b><span>odigranih tekem</span></div><div class="kpi"><b>${left}</b><span>preostalih tekem</span></div><div class="kpi"><b>${total ? Math.round(100 * done / total) : 0} %</b><span>napredek dneva</span></div></div>
  </div>${strip}
  <div class="flt" style="margin-top:14px"><div class="chips" role="group" aria-label="Filter tekem">${[['all', 'Vse tekme'], ['played', 'Odigrane'], ['todo', 'Prihajajoče'], ['mine', '★ Moj par']].map(([k, l]) => `<button class="chip ${S.filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}</div></div>`;
  h += ts.length ? ts.map(t => tournamentBlock(t, today)).join('') : empty('Ni turnirjev', 'Izberi drug dan v pregledu zgoraj.');
  return h;
}

/* ---------- pogled: pari ---------- */
function searchList(q) {
  const t = norm(q).split(' ').filter(Boolean), r = t.length ? D.pairs.filter(p => t.every(x => norm(p.name).includes(x))) : D.pairs.slice().sort((a, b) => (eloOf(b.id)?.now || 0) - (eloOf(a.id)?.now || 0));
  return r.length ? r.slice(0, 12).map(p => `<button class="sug" data-go="par/${esc(p.id)}"><span><b>${esc(p.name)}</b></span><span class="pill">${esc(lgName(curLeague(p.id) || '?'))}</span></button>`).join('') : empty('Ni zadetkov', 'Poskusi z drugim vnosom.');
}
function vPairs() {
  return `<h1>Pari</h1><p class="mut" style="margin:6px 0 18px">Poišči par in odpri njegov profil, statistiko in Elo.</p>
  ${S.me && P(S.me) ? `<div class="card flat" style="margin-bottom:16px"><div class="sec-h" style="margin:0"><div><span class="eyebrow">★ Moj par</span><div style="font-weight:700;font-size:17px;margin-top:2px">${esc(nm(S.me))}</div></div><button class="btn pri" data-go="par/${esc(S.me)}">Odpri profil</button></div></div>` : ''}
  <input class="inp" id="q" data-q="pairs" placeholder="Vnesi ime para …" autocomplete="off" aria-label="Iskanje parov" value="${esc(S.eq)}"><div class="sugs" id="sugs">${searchList(S.eq)}</div>`;
}

/* ---------- pogled: profil para ---------- */
function eloCard(id, vs) {
  const e = eloOf(id); if (!e) return '';
  const now = Math.round(e.now), d = now - Math.round(e.start), v = vs && eloOf(vs);
  return `<div class="card"><div class="vs"><div><div class="big">${now}</div><div class="sm mut">Trenutni Elo</div></div><span></span><div><div class="big" style="color:${eC(d)}">${sg(d)}</div><div class="sm mut">od začetka (${Math.round(e.start)})</div></div></div>
  ${v ? `<p class="sm" style="margin-top:12px">Razlika glede na ${esc(nm(vs))}: <b style="color:${eC(now - Math.round(v.now))}">${sg(now - Math.round(v.now))}</b></p>` : ''}
  ${e.games && e.hist.length > 1 ? '<div class="cv" style="height:180px;margin-top:12px"><canvas id="eloc"></canvas></div>' : '<p class="mut sm" style="margin-top:10px">Par še nima odigranih tekem, prikazan je začetni Elo.</p>'}
  <p class="xs mut3" style="margin-top:10px">Elo se računa iz odigranih tekem in se ob napredovanju ali izpadu ne ponastavi.</p></div>`;
}
function setsTable(id) {
  const s = stats(id);
  return `<table class="tbl"><thead><tr><th>Set</th><th class="r">Dobljeni</th><th class="r">Pov. točke</th><th class="r">Pov. razlika</th></tr></thead><tbody>${s.ps.map((p, i) => `<tr><td>${i == 2 ? '3. (odločilni)' : i + 1 + '.'}</td><td class="r">${F(pc(p.w, p.n))} <span class="mut3 xs">(${p.w}/${p.n})</span></td><td class="r">${p.n ? (p.pf / p.n).toFixed(1) : '–'}</td><td class="r">${p.n ? (p.d / p.n > 0 ? '+' : '') + (p.d / p.n).toFixed(1) : '–'}</td></tr>`).join('')}</tbody></table>`;
}
function rowM(v, id) {
  return `<div class="row"><div><div style="font-weight:600">${pairBtn(v.opp)}</div><div class="xs mut3">${sc(v)} · ${fd(v.m.date)} · ${esc(lgName(v.m.league))}</div></div><span class="pill ${v.draw ? 'blue' : v.win ? 'win' : 'lose'}">${v.draw ? 'Neodločeno' : v.win ? 'Zmaga' : 'Poraz'} ${v.sets.filter(s => s[0] > s[1]).length}:${v.sets.filter(s => s[0] < s[1]).length}</span></div>`;
}
function predCard(a, b, pr) {
  if (!pr) return `<div class="card">${empty('Premalo podatkov', 'Za zanesljivo napoved sta potrebni vsaj 3 odigrani tekmi vsakega para.')}</div>`;
  return `<div class="card"><div class="vs"><div><div class="big">${pr.p} %</div><div class="sm">${esc(nm(a))}</div></div><span class="mut">:</span><div><div class="big" style="color:var(--tx)">${100 - pr.p} %</div><div class="sm">${esc(nm(b))}</div></div></div>
  <div class="bar" style="margin-top:14px"><i style="width:${pr.p}%"></i></div><p style="margin-top:12px">${esc(pr.why)}</p><p class="xs mut3" style="margin-top:8px">Napoved temelji na Elo ratingu obeh parov in je informativne narave (osnova: ${pr.basis}+ tekem). Ni zagotovljen izid.</p></div>`;
}
function vPair() {
  const id = S.route.id; if (!P(id)) return empty('Par ni najden', '<a class="lnk" href="#/pari">Nazaj na iskanje</a>');
  const s = stats(id), me = S.me && P(S.me) ? S.me : null, isMe = id === me, f = S.fl;
  const lgs = [...new Set(D.matches.filter(m => m.a === id || m.b === id).map(m => m.league))], opps = [...new Set(s.ms.map(v => v.opp))];
  const ok = v => (!f.lg || v.m.league === f.lg) && (!f.op || v.opp === f.op) && (!f.res || (f.res === 'w') === v.win);
  const nx = D.tournaments.filter(t => !t.played && t.groups.some(g => g.ids.includes(id))).sort((a, b) => a.date < b.date ? -1 : 1)[0];
  const nxM = nx ? D.matches.filter(m => m.tid === nx.id && (m.a === id || m.b === id)).sort((a, b) => a.order - b.order) : [];
  const ts = D.tournaments.filter(t => t.played && t.results[id]).reverse(), c = s.c;
  let h = `<a class="mut sm" href="#/pari">← Vsi pari</a><div class="phead" style="margin-top:10px"><div><span class="pill ac">${esc(lgName(curLeague(id) || '?'))}</span><h1>${esc(nm(id))}</h1></div>
    <button class="btn ${isMe ? 'pri' : ''}" data-fav="${esc(id)}">${ic('star')}${isMe ? 'Moj par' : 'Nastavi kot moj par'}</button></div>`;
  h += `<div class="grid g6" style="margin-top:20px">${stat('Tekme', s.n)}${stat('Zmage', s.w)}${stat('Porazi', s.l)}${stat('Zmag', F(s.pct))}${stat('Seti', s.sw + ':' + s.sl)}${stat('Elo', eloOf(id) ? Math.round(eloOf(id).now) : '–')}</div>`;
  h += `<div class="split sec"><div><div class="sec-h"><h2>Naslednji turnir</h2></div><div class="card">${nx ? `<div class="eyebrow">${fd(nx.date)} · ${esc(lgName(nx.lg))}</div>${nxM.length ? nxM.map(m => `<div class="row"><div>proti <b>${pairBtn(m.a === id ? m.b : m.a)}</b></div><span class="pill">${esc(m.time || '–')}</span></div>`).join('') : '<p class="mut sm" style="margin-top:8px">Razpored tekem še ni objavljen.</p>'}` : '<p class="mut">Naslednji turnir še ni objavljen.</p>'}</div></div>
   <div><div class="sec-h"><h2>Forma</h2></div><div class="card">${formPills(s.form)}<p class="xs mut3" style="margin-top:10px">Zadnjih 5 tekem · Z = zmaga, P = poraz</p><div class="row" style="margin-top:10px"><span class="mut">Najdaljši niz zmag</span><b>${s.maxW}</b></div><div class="row"><span class="mut">Najdaljši niz porazov</span><b>${s.maxL}</b></div></div></div></div>`;
  h += `<div class="sec"><div class="sec-h"><h2>LUDUS Elo</h2></div>${eloCard(id, me && !isMe ? me : null)}</div>`;
  h += `<div class="sec"><div class="sec-h"><h2>Tekme</h2></div><div class="flt"><select data-fl="lg" aria-label="Liga"><option value="">Vse lige</option>${lgs.map(l => `<option value="${esc(l)}" ${f.lg === l ? 'selected' : ''}>${esc(lgName(l))}</option>`).join('')}</select><select data-fl="op" aria-label="Nasprotnik"><option value="">Vsi nasprotniki</option>${opps.map(o => `<option value="${esc(o)}" ${f.op === o ? 'selected' : ''}>${esc(nm(o))}</option>`).join('')}</select><select data-fl="res" aria-label="Izid"><option value="">Zmage in porazi</option><option value="w" ${f.res === 'w' ? 'selected' : ''}>Samo zmage</option><option value="l" ${f.res === 'l' ? 'selected' : ''}>Samo porazi</option></select></div>
   <div class="card">${ts.map(t => { const vs = s.ms.filter(v => v.m.tid === t.id && ok(v)), r = t.results[id]; if (!vs.length) return ''; return `<details><summary><span>${fd(t.date)} · ${esc(lgName(r.league))}</span><span class="pill ${r.move === 'up' ? 'win' : r.move === 'down' ? 'lose' : ''}">${r.rank}. mesto ${r.move === 'up' ? '▲' : r.move === 'down' ? '▼' : ''}</span></summary>${vs.map(v => rowM(v, id)).join('')}</details>`; }).join('') || (s.ms.filter(ok).length ? s.ms.filter(ok).slice().reverse().map(v => rowM(v, id)).join('') : empty('Ni tekem', 'Za izbrane filtre ni rezultatov.'))}</div></div>`;
  h += `<div class="split sec"><div><div class="sec-h"><h2>Po setih</h2></div><div class="card">${setsTable(id)}<div class="cv" style="height:170px;margin-top:12px"><canvas id="setc"></canvas></div></div></div>
   <div><div class="sec-h"><h2>Zanimivosti</h2></div><div class="card"><table class="tbl"><tbody><tr><td>Zmaga 2:0</td><td class="r">${F(pc(c.w20, s.n))} (${c.w20})</td></tr><tr><td>Zmaga 2:1</td><td class="r">${F(pc(c.w21, s.n))} (${c.w21})</td></tr><tr><td>Poraz 0:2</td><td class="r">${F(pc(c.l02, s.n))} (${c.l02})</td></tr><tr><td>Poraz 1:2</td><td class="r">${F(pc(c.l12, s.n))} (${c.l12})</td></tr><tr><td>Zmaga po izgubljenem 1. setu</td><td class="r">${c.comeW}</td></tr><tr><td>Poraz po dobljenem 1. setu</td><td class="r">${c.lostAfter}</td></tr></tbody></table></div></div></div>`;
  h += `<div class="sec"><div class="sec-h"><h2>Opažanja</h2></div><div class="card">${patterns(id).map(x => `<p style="margin:6px 0">• ${esc(x)}</p>`).join('')}</div></div>`;
  h += `<div class="sec"><div class="sec-h"><h2>Pot skozi lige</h2></div><div class="card"><div class="cv"><canvas id="prog"></canvas></div><div id="pd" class="sm mut" style="margin-top:10px">Tapni na točko za podrobnosti turnirja.</div></div></div>`;
  if (me && !isMe) {
    const H = h2h(me, id);
    h += `<div class="sec"><div class="sec-h"><h2>Medsebojni dvoboji z ${esc(nm(me))}</h2></div><div class="card">${H.n ? `<p>Pomerila sta se <b>${H.n}×</b>: ${esc(nm(me))} ${H.w}, ${esc(nm(id))} ${H.n - H.w}. Zadnje srečanje: ${fd(H.ms[H.n - 1].m.date)}.</p>` + H.ms.slice().reverse().map(v => `<div class="row"><div>${fd(v.m.date)} · ${sc(v)}</div><span class="${v.win ? 'W' : 'L'}">${v.win ? 'ZMAGA' : 'PORAZ'}</span></div>`).join('') : '<p class="mut">Para se v razpoložljivih podatkih še nista pomerila.</p>'}</div></div>
    <div class="sec"><div class="sec-h"><h2>Statistična napoved</h2></div>${predCard(me, id, predict(me, id))}</div>`;
  }
  return h;
}

/* ---------- pogled: primerjava ---------- */
function vCompare() {
  const a = S.ca || (S.me && P(S.me) ? S.me : D.pairs[0].id), b = S.cb || D.pairs.find(p => p.id !== a).id, sa = stats(a), sb = stats(b), H = h2h(a, b);
  const sel = (k, v) => `<select data-cmp="${k}" aria-label="Par ${k.toUpperCase()}">${D.pairs.slice().sort((x, y) => x.name.localeCompare(y.name, 'sl')).map(p => `<option value="${esc(p.id)}" ${p.id === v ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
  const bar = (l, x, y, fx, fy) => { const t = (x || 0) + (y || 0), w = t ? Math.round(100 * (x || 0) / t) : 50; return `<div class="cmp"><div style="text-align:right"><b>${fx}</b></div><div><div class="xs mut3" style="text-align:center;margin-bottom:5px">${l}</div><div class="t"><i style="width:${w}%;background:var(--ac)"></i><i style="width:${100 - w}%;background:var(--blue)"></i></div></div><div><b>${fy}</b></div></div>`; };
  const B = (l, f) => bar(l, f(sa), f(sb), F(f(sa)), F(f(sb)));
  const ups = id => moves(id).filter(x => x === 'up').length, ea = eloOf(a), eb = eloOf(b);
  let h = `<h1>Primerjava parov</h1><div class="flt" style="margin-top:16px">${sel('a', a)}<span class="mut" style="align-self:center">vs.</span>${sel('b', b)}</div>`;
  if (a === b) return h + empty('Izberi dva različna para');
  h += `<div class="card"><div class="vs" style="margin-bottom:14px"><div><b>${esc(nm(a))}</b><br><span class="pill ac">${esc(lgName(curLeague(a)))}</span></div><span class="mut">VS</span><div><b>${esc(nm(b))}</b><br><span class="pill blue">${esc(lgName(curLeague(b)))}</span></div></div>
   ${bar('Elo', ea && Math.round(ea.now), eb && Math.round(eb.now), ea ? Math.round(ea.now) : '–', eb ? Math.round(eb.now) : '–')}${bar('Odigrane tekme', sa.n, sb.n, sa.n, sb.n)}${bar('Zmage', sa.w, sb.w, sa.w, sb.w)}${B('Odstotek zmag', s => s.pct)}${B('1. set', s => pc(s.ps[0].w, s.ps[0].n))}${B('2. set', s => pc(s.ps[1].w, s.ps[1].n))}${B('3. set', s => pc(s.ps[2].w, s.ps[2].n))}${bar('Forma (zadnjih 5)', sa.form.filter(Boolean).length, sb.form.filter(Boolean).length, formPills(sa.form), formPills(sb.form))}${bar('Napredovanja', ups(a), ups(b), ups(a), ups(b))}</div>`;
  h += `<div class="sec"><div class="sec-h"><h2>Medsebojni dvoboji</h2></div><div class="card">${H.n ? `<p>Pomerila sta se ${H.n}×: ${H.w} : ${H.n - H.w}. Zadnje srečanje: ${fd(H.ms[H.n - 1].m.date)}.</p>` + H.ms.map(v => `<div class="row"><div>${fd(v.m.date)} · ${sc(v)}</div><span class="${v.win ? 'W' : 'L'}">${esc(v.win ? nm(a) : nm(b))}</span></div>`).join('') : '<p class="mut">Para se v razpoložljivih podatkih še nista pomerila.</p>'}</div></div>
   <div class="sec"><div class="sec-h"><h2>Statistična napoved</h2></div>${predCard(a, b, predict(a, b))}</div>`;
  return h;
}

/* ---------- pogled: Elo lestvica ---------- */
function vElo() {
  const lgs = [...new Set(D.pairs.map(p => curLeague(p.id)).filter(Boolean))].sort();
  const rows = D.pairs.map(p => ({ p, e: eloOf(p.id), lg: curLeague(p.id) })).filter(r => r.e && (!S.el || r.lg === S.el)).sort((x, y) => y.e.now - x.e.now);
  return `<h1>Elo lestvica</h1><p class="mut" style="margin:6px 0 18px">Moč parov, preračunana iz vseh odigranih tekem sezone.</p>
  <div class="flt"><select data-el aria-label="Liga"><option value="">Vse lige</option>${lgs.map(l => `<option value="${esc(l)}" ${S.el === l ? 'selected' : ''}>${esc(lgName(l))}</option>`).join('')}</select></div>
  <div class="card" style="padding:8px 8px 4px"><table class="tbl"><thead><tr><th style="padding-left:14px"></th><th>Par</th><th>Liga</th><th class="r">Tekme</th><th class="r">±</th><th class="r" style="padding-right:14px">Elo</th></tr></thead><tbody>
  ${rows.map((r, i) => { const d = Math.round(r.e.now - r.e.start); return `<tr class="trow ${S.me === r.p.id ? 'me' : ''}" data-go="par/${esc(r.p.id)}"><td class="rk" style="padding-left:14px">${i + 1}</td><td class="gname">${esc(r.p.name)}</td><td><span class="pill">${esc(lgName(r.lg))}</span></td><td class="r">${r.e.games}</td><td class="r" style="color:${eC(d)}">${sg(d)}</td><td class="r num" style="padding-right:14px"><b>${Math.round(r.e.now)}</b></td></tr>`; }).join('')}</tbody></table></div>`;
}

/* ---------- ogrodje ---------- */
const TABS = [['home', 'home', 'Domov'], ['pairs', 'users', 'Pari'], ['compare', 'scale', 'Primerjava'], ['elo', 'trophy', 'Elo']];
function chrome() {
  const on = S.route.v === 'pair' ? 'pairs' : S.route.v, th = document.documentElement.dataset.theme;
  const tab = t => `<a class="tab ${on === t[0] ? 'on' : ''}" href="${href(t[0])}" ${on === t[0] ? 'aria-current="page"' : ''}>${ic(t[1])}<span>${t[2]}</span></a>`;
  $('#top').innerHTML = `<a class="logo" href="#/"><i>🏐</i><span>LUDUS <b>Stats</b></span></a><nav class="tabs" aria-label="Glavna navigacija">${TABS.map(tab).join('')}</nav><div class="sp"></div>
   <button class="ibtn" id="rf" data-act="refresh" title="Osveži podatke" aria-label="Osveži podatke">${ic('refresh')}<span class="lbl">${S.upd ? hhmm(S.upd) : 'Osveži'}</span></button>
   <button class="ibtn" data-act="theme" title="Zamenjaj temo" aria-label="Zamenjaj temo">${ic(th === 'dark' ? 'sun' : 'moon')}</button>`;
  $('#bnav').innerHTML = TABS.map(tab).join('');
}
function render() {
  charts.forEach(c => c.destroy()); charts = []; chrome();
  const app = $('#app');
  if (!D) { app.innerHTML = S.loading ? '<div class="skel"></div><div class="skel"></div><div class="skel"></div>' : `<div class="view">${empty('Podatkov ni mogoče pridobiti', esc(S.err || '') + '<br><br><button class="btn pri" data-act="refresh">Poskusi znova</button>')}</div>`; return; }
  const err = S.err ? `<div class="banner" role="alert">⚠️ ${esc(S.err)}</div>` : '';
  const f = S.fetched ? `Podatki iz preglednic: ${new Date(S.fetched).toLocaleString('sl-SI', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} · osvežitev vsakih ${CFG.REFRESH_MIN} min` : '';
  app.innerHTML = `<div class="view${S.anim ? ' anim' : ''}">${err}${({ home: vHome, pairs: vPairs, pair: vPair, compare: vCompare, elo: vElo })[S.route.v]()}<footer>${f}</footer></div>`;
  S.anim = false; after();
}

/* ---------- grafi ---------- */
function after() {
  const id = S.route.id, tx = cssv('--tx3'), gr = cssv('--line'), ac = cssv('--ac-text'), win = cssv('--win'), lose = cssv('--lose');
  Chart.defaults.font.family = cssv('--font'); Chart.defaults.color = tx;
  const ax = { ticks: { color: tx }, grid: { color: gr }, border: { display: false } }, axx = { ticks: { color: tx }, grid: { display: false }, border: { display: false } };
  if ($('#eloc')) { const e = eloOf(id); charts.push(new Chart($('#eloc'), { type: 'line', data: { labels: e.hist.map(h => h.date ? ld(h.date).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' }) : 'Začetek'), datasets: [{ data: e.hist.map(h => Math.round(h.elo)), borderColor: ac, backgroundColor: cssv('--ac-soft'), fill: true, pointBackgroundColor: ac, pointRadius: 5, borderWidth: 2.5, tension: .3 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: ax, x: axx } } })); }
  if ($('#setc')) { const s = stats(id); charts.push(new Chart($('#setc'), { type: 'bar', data: { labels: ['1. set', '2. set', '3. set'], datasets: [{ data: s.ps.map(p => pc(p.w, p.n)), backgroundColor: ac, borderRadius: 8, maxBarThickness: 46 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ...ax, min: 0, max: 100, ticks: { color: tx, callback: v => v + ' %' } }, x: axx } } })); }
  if ($('#prog')) {
    const ts = D.tournaments, ys = ts.map(t => { const g = t.groups.find(g => g.ids.includes(id)); return g ? lvl(g.league) : null; }), v = ys.filter(y => y != null);
    if (!v.length) { $('#prog').closest('.card').innerHTML = '<p class="mut">Ni podatkov o ligah.</p>'; return; }
    const col = ts.map(t => !t.played ? tx : t.results[id]?.move === 'up' ? win : t.results[id]?.move === 'down' ? lose : ac);
    charts.push(new Chart($('#prog'), { type: 'line', data: { labels: ts.map(t => ld(t.date).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric' })), datasets: [{ data: ys, stepped: true, borderColor: ac, pointBackgroundColor: col, pointRadius: 7, pointHoverRadius: 9, borderWidth: 2.5, spanGaps: true }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => (7 - c.raw) + '. liga' } } }, scales: { y: { ...ax, min: Math.min(...v) - 1, max: Math.max(...v) + 1, ticks: { stepSize: 1, color: tx, callback: x => x >= 1 && x <= 6 ? (7 - x) + '. liga' : '' } }, x: axx },
        onClick: (e, el) => { if (!el.length) return; const t = ts[el[0].index], r = t.results[id], ms = D.matches.filter(m => m.tid === t.id && m.status === 'played' && (m.a === id || m.b === id)).map(m => view(m, id)); $('#pd').innerHTML = `<b style="color:var(--tx)">${fd(t.date)}</b> · ${esc(lgName((t.groups.find(g => g.ids.includes(id)) || {}).league))}` + (t.played && r ? ` · ${r.rank}. mesto · ${r.move === 'up' ? 'napredovanje' : r.move === 'down' ? 'izpad' : 'obstanek'}<br>` + ms.map(v => `${esc(nm(v.opp))}: ${sc(v)} (${v.win ? 'Z' : 'P'})`).join('<br>') : '<br>Turnir še ni odigran.'); } } }));
  }
}

/* ---------- dogodki ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-day],[data-filter],[data-act],[data-fav]'); if (!t) return;
  if (t.dataset.go) go('/' + t.dataset.go);
  else if (t.dataset.day) { S.day = t.dataset.day; render(); }
  else if (t.dataset.filter) { S.filter = t.dataset.filter; render(); }
  else if (t.dataset.fav) { if (S.me === t.dataset.fav) { S.me = null; store.del('ludus_me'); } else { S.me = t.dataset.fav; store.set('ludus_me', S.me); } render(); }
  else if (t.dataset.act === 'refresh') refresh(true);
  else if (t.dataset.act === 'theme') { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; store.set('ludus_theme', n); render(); }
});
document.addEventListener('input', e => { if (e.target.dataset.q) { S.eq = e.target.value; $('#sugs').innerHTML = searchList(S.eq); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.fl) { S.fl[t.dataset.fl] = t.value; render(); }
  if (t.dataset.cmp) { S[t.dataset.cmp === 'a' ? 'ca' : 'cb'] = t.value; render(); }
  if (t.dataset.el !== undefined) { S.el = t.value; render(); }
});

parseHash(); render(); refresh(); setInterval(refresh, CFG.REFRESH_MIN * 60000);
