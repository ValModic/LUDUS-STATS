// Strežniška funkcija: prebere VSE zavihke krogov iz Google Sheets in vrne surove vrednosti.
// API ključ je samo v okoljskih spremenljivkah Netlify, nikoli v brskalniku.
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const isRound = t => /\d+\.\s*KROG/i.test(t) && !/^(X\.|PRAZNO|TEST)/i.test(t); // preskoči predloge in pomožne zavihke

exports.handler = async () => {
  const key = process.env.GOOGLE_API_KEY;
  const ids = (process.env.SHEET_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!key || !ids.length) return { statusCode: 500, body: JSON.stringify({ error: 'Manjka GOOGLE_API_KEY ali SHEET_IDS.' }) };
  try {
    const docs = await Promise.all(ids.map(async id => {
      const meta = await (await fetch(`${API}/${id}?fields=properties.title,sheets.properties.title&key=${key}`)).json();
      if (meta.error) throw new Error(meta.error.message);
      const tabs = meta.sheets.map(s => s.properties.title).filter(isRound);
      const q = tabs.map(t => 'ranges=' + encodeURIComponent(t)).join('&');
      const v = await (await fetch(`${API}/${id}/values:batchGet?${q}&key=${key}`)).json();
      if (v.error) throw new Error(v.error.message);
      return { id, title: meta.properties.title, tabs: v.valueRanges.map((r, i) => ({ name: tabs[i], rows: r.values || [] })) };
    }));
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify({ fetchedAt: new Date().toISOString(), docs }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
