# Canvas Chrome-utvidelser

Fire utvidelser som effektiviserer vurderingsarbeidet i Canvas Speed Grader.

---

## Oversikt

| # | Mappe | Snarvei |
|---|-------|---------|
| 1 | `1_Innleveringer_Fullført_og_Status` | `⇧⌘Y` |
| 2 | `2_Start_stopp_Mediaopptak` | `⇧⌘U` |
| 3 | `3_Mal_fra_Kommentarbiblioteket` | `⇧⌘K` |
| 4 | `4_Mal_fra_Canvasside` | `⇧⌘M` |

---

## Installasjon

1. Opne `chrome://extensions` i Chrome
2. Slå på **Utviklermodus** øverst til høgre
3. Klikk **Last inn upakka utvidelse**
4. Vel ei av dei fire mappene
5. Gjenta for alle fire
6. Gå til `chrome://extensions/shortcuts` og sett alle snarveiar til **Overordnet**

> **Tips:** Sett snarveiane til **Overordnet** – elles fungerer dei berre når Chrome-vindauget er i fokus, ikkje når du er i andre program.

---

## 1 – Innleveringer Fullført og Status

Automatiserer vurdering av innleveringar i Speed Grader.

**Kva gjer den:**
- Set innleveringsstatus til **Ingen** på alle innleveringstypar (oppgåver, diskusjonar, New Quizzes)
- Set vurdering til **Fullført** på vanlege oppgåver og diskusjonar
- Finn og fyller tomme poengfelt i **essay-spørsmål i New Quizzes** automatisk
- Ventar på at Canvas bekreftar lagring før den melder ferdig

**Fungerer med:** Vanlege oppgåver, diskusjonar, New Quizzes

---

## 2 – Start/stopp Mediaopptak

Startar og stoppar skjermopptak i Canvas Speed Grader med éi og same snarvei.

**Kva gjer den:**
- **Éin snarvei** (`⇧⌘U`) både startar og stoppar opptaket
- Passar perfekt med **StreamDeck** – same knapp for start og stopp
- Opptaket køyrer i bakgrunnen og **kan dekkast til av andre vindauge** eller til og med minimaliserast utan at opptaket stoppar
- Når opptaket stoppar **spretter Chrome automatisk fram** på skjermen, slik at du er klar til å lagre og sende
- Utvidelsen opererer alltid i den **aktive fanen** – ikkje i gamle faner der opptak kan ha vorte avbrote

> **Tips for skjermfilming:** Du kan jobbe i andre vindauge medan opptaket går. Chrome treng ikkje vere synleg. Når du er ferdig – trykk snarveien så kjem Chrome fram av seg sjølv.

---

## 3 – Mal frå Kommentarbiblioteket

Set inn den øvste kommentarmalen frå Canvas sitt kommentarbibliotek i kommentarfeltet til eleven.

**Kva gjer den:**
- Hentar kommentar frå biblioteket via Canvas sitt GraphQL-API
- Byter automatisk ut `@fornavn` med elevens fornamn
- Ventar til editoren er heilt klar før innsetting – fungerer på alle innleveringstypar inkludert Studio-video og New Quizzes
- Set markøren i editoren automatisk – du treng ikkje klikke i feltet først

**Krev:** At du har kommentarmalar i kommentarbiblioteket i Canvas

---

## 4 – Mal frå Canvasside

Hentar tilpassa tilbakemeldingsmal frå ei Canvas-side og set den inn i kommentarfeltet.

**Kva gjer den:**
- Hentar mal frå ei Canvas-side du har laga med ei tabell (oppgåvetittel → maltekst)
- Finn rett mal basert på oppgåvetittelen automatisk
- Byter ut `@fornavn` med elevens fornamn
- Ventar til editoren er heilt klar – fungerer på alle innleveringstypar
- Set markøren i editoren automatisk

**Oppsett:**
1. Klikk på utvidelsesikonet
2. Lim inn URL til Canvas-sida med malane
3. Klikk **Lagre**

**Format på Canvas-sida:**
Lag ei tabell med to kolonnar – første kolonne er oppgåvetittel, andre kolonne er malen.

---

## Snarveisoversikt

Alle snarveiar må settast til **Overordnet** under `chrome://extensions/shortcuts`.

| Snarvei | Mac | Windows/Linux | Funksjon |
|---------|-----|---------------|----------|
| `⇧⌘Y` | ✓ | `Ctrl+Shift+Y` | Fullført og status |
| `⇧⌘U` | ✓ | `Ctrl+Shift+U` | Start/stopp opptak |
| `⇧⌘K` | ✓ | `Ctrl+Shift+K` | Sett inn kommentar |
| `⇧⌘M` | ✓ | `Ctrl+Shift+M` | Sett inn mal |

---

## Oppdatering

1. Last ned ny mappe frå GitHub
2. Slett eksisterande utvidelse i `chrome://extensions`
3. Last inn den nye mappa
4. Set snarveiar til **Overordnet** på nytt

---

## Krav

- Google Chrome
- Canvas LMS (instructure.com)
- Kommentarbibliotek-utvidelsen krev at du har oppretta kommentarmalar i Canvas
- Mal frå Canvasside krev at du har oppretta ei Canvas-side med malar i tabellformat
