# LUDUS Stats

Spletna aplikacija za statistiko lige odbojke na mivki LUDUS (HTML, CSS, JavaScript, Chart.js).

## Stanje
- `index.html` – celotna aplikacija (razdelki: config, snapshot podatkov, sheets, statistics, app).
- Podatki so zdaj **posnetek preglednic (19. 10. 2026)**: 1. krog vseh lig, 2. krog 1. in 2. lige.
- `netlify/functions/sheets.js` – funkcija za žive podatke (še ni povezana z aplikacijo).

## Lokalni zagon
V mapi zaženi `python3 -m http.server 8000` in odpri http://localhost:8000.

## Objava na Netlify
1. Vsebino mape povleci na https://app.netlify.com/drop (ali jo poveži z GitHub repozitorijem).
2. Aplikacija že deluje s posnetkom podatkov.

## Žive podatke iz Google Sheets
1. Preglednice morajo biti deljene z »Vsak, ki ima povezavo, si lahko ogleda«.
2. Google Cloud Console → nov projekt → omogoči **Google Sheets API** → Credentials → **API key** (omeji ga na Sheets API).
3. Netlify → Site configuration → Environment variables:
   - `GOOGLE_API_KEY` = ključ
   - `SHEET_IDS` = `1QQPWH7mWrXT3Ps5hj54lgqTwiOK2XcDL6GjuTlIysSk,1sme5933ryXPOz0WtMZi9EerWJIfTpMeGTkVLIihL97k,1MkmzV9qkxEVx2uX-zlMdLhQSYCcST2YdOlTVieNriXE,1i9ZybmQahRQLGwn8k07fx83JyQT46dR684n9318zXgI,1Zm8WaBjK1eB6csZhS1A5hbrHM8ichMj0YpmKU-qe-SE,1Xl62gC_dKISsLtHoEtLr2L_kwp-AwnwdvZNY9cA5reQ`
     (po vrsti 1., 2., 3., 4., 5., 6. liga)
4. Ponovno objavi. Preizkus: `https://TVOJA-STRAN.netlify.app/.netlify/functions/sheets` mora vrniti JSON z vsemi zavihki.
5. Aplikacija na naslovu `*.netlify.app` sama preklopi na žive podatke (`CFG.SOURCE='sheets'`), razčlenjevalnik je `buildFromSheets` v `index.html`. Pri lastni domeni nastavi `SOURCE:'sheets'` v `CFG`.
6. Če je funkcija nedosegljiva, aplikacija prikaže zadnje uspešno pridobljene podatke (shranjene v brskalniku) z opozorilom.
7. Leto sezone (datumi zavihkov nimajo leta) je v `CFG.SEASON_YEAR` (zdaj 2026; septembri–decembri = to leto, januar–maj = naslednje).
