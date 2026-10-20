// GitHub Actions: pridobi javno berljive Google preglednice in shrani podatke v data/sheets.json.
// GOOGLE_API_KEY je GitHub Actions secret; nikoli se ne zapiše v objavljeno datoteko.
const fs = require('node:fs/promises');
const path = require('node:path');
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const IDS = [
  '1QQPWH7mWrXT3Ps5hj54lgqTwiOK2XcDL6GjuTlIysSk',
  '1sme5933ryXPOz0WtMZi9EerWJIfTpMeGTkVLIihL97k',
  '1MkmzV9qkxEVx2uX-zlMdLhQSYCcST2YdOlTVieNriXE',
  '1i9ZybmQahRQLGwn8k07fx83JyQT46dR684n9318zXgI',
  '1Zm8WaBjK1eB6csZhS1A5hbrHM8ichMj0YpmKU-qe-SE',
  '1Xl62gC_dKISsLtHoEtLr2L_kwp-AwnwdvZNY9cA5reQ'
];
const isRound = t => /\d+\.\s*KROG/i.test(t) && !/^(X\.|PRAZNO|TEST)/i.test(t);
const key = process.env.GOOGLE_API_KEY;
if (!key) throw Error('Manjka GitHub Actions secret GOOGLE_API_KEY.');

async function getJson(url) {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.error) throw Error(json.error?.message || `Google API HTTP ${response.status}`);
  return json;
}

async function main() {
  const docs = await Promise.all(IDS.map(async id => {
    const meta = await getJson(`${API}/${id}?fields=properties.title,sheets.properties.title&key=${encodeURIComponent(key)}`);
    const tabs = (meta.sheets || []).map(s => s.properties.title).filter(isRound);
    if (!tabs.length) throw Error(`V preglednici ${id} ni zavihkov za kroge.`);
    const query = new URLSearchParams();
    for (const tab of tabs) query.append('ranges', `'${tab.replace(/'/g, "''")}'`);
    query.set('key', key);
    const values = await getJson(`${API}/${id}/values:batchGet?${query.toString()}`);
    if (values.valueRanges?.length !== tabs.length) throw Error(`Neujemanje zavihkov v ${id}.`);
    return {id, title:meta.properties.title, tabs:values.valueRanges.map((range,i) => ({name:tabs[i],rows:range.values||[]}))};
  }));
  const out=path.join(process.cwd(),'data','sheets.json');
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out,JSON.stringify({fetchedAt:new Date().toISOString(),docs}));
  console.log(`Posodobljenih ${docs.length} preglednic in ${docs.reduce((n,d)=>n+d.tabs.length,0)} zavihkov.`);
}
main().catch(err=>{console.error(err.message);process.exitCode=1});
