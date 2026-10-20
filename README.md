# LUDUS Stats

Spletna aplikacija za statistiko odbojke na mivki (HTML, CSS, JavaScript, Chart.js).

## Objava na GitHub Pages

- `index.html` je obstoječa aplikacija. Spremenjeni sta le dve vrstici konfiguracije vira podatkov.
- `scripts/update-sheets.js` prebere zavihke vseh šestih Google preglednic prek Google Sheets API.
- `.github/workflows/update-sheets.yml` posodobi `data/sheets.json` približno vsakih 15 minut (GitHub urnik lahko zamuja).
- `netlify/functions/sheets.js` in `netlify.toml` sta ohranjena, vendar za GitHub Pages nista v uporabi.

### Enkratna nastavitev

1. Google Cloud Console: omogoči **Google Sheets API** in ustvari **API key**. Vseh šest preglednic mora biti dostopnih za branje s tem ključem (npr. »Vsak, ki ima povezavo, si lahko ogleda«).
2. GitHub repozitorij **LUDUS-STATS**: Settings > Secrets and variables > Actions > New repository secret. Ime: `GOOGLE_API_KEY`; vrednost: tvoj Google API ključ. Nikoli ga ne vpisuj v javni JavaScript ali GitHub commit.
3. GitHub > Settings > Actions > General > Workflow permissions: omogoči **Read and write permissions**, če so potisni zapisi workflowa zavrnjeni (workflow ima tudi `contents: write`).
4. GitHub > Actions > **Posodobi rezultate LUDUS** > Run workflow. Po uspešnem zagonu se v repozitoriju pojavi `data/sheets.json`.
5. GitHub > Settings > Pages: objavi iz veje `main`, mape `/ (root)`, če še ni nastavljeno. Po posodobitvi objave preveri `https://valmodic.github.io/LUDUS-STATS/data/sheets.json`.

### Podatki

Aplikacija med uporabo preveri `./data/sheets.json` na 5 minut. Datoteko v ozadju obnavlja GitHub Actions na približno 15 minut; to ni neposreden 5-minutni dostop do Google Sheets. Razčlenjevalnik `buildFromSheets` je ostal nespremenjen.

Če se začetno branje ne posreči, aplikacija zaradi obstoječe logike preklopi na stare vgrajene podatke in prikaže opozorilo. To **niso** živi rezultati.
