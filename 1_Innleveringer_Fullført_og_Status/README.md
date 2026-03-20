# Canvas Speed Grader v3.2

**Fyll tomme essayspørsmål + vent på Canvas-registrering**

## Hva er nytt i v3.2?

### 🎯 Hovedfunksjon
✅ Fyller essayspørsmål med 1 poeng  
✅ Ignorerer "Fyll inn de blanke feltene" og andre autorette oppgaver  
✅ **VENTER på "Oppdatert resultater"-meldingen før return** ← NY!

### ⏳ Smart venting
- Klikker "Oppdater"
- Venter til Canvas viser "Oppdatert resultater" (=data er registrert på serveren)
- Returnerer umiddelbart → læreren kan navigere til neste elev
- Timeout på 15 sekunder (sikkerhet)

### 🔍 Essaydeteksjon
- **FYLLER:** Spørsmål med stor teksteditor (textarea/contenteditable høy > 80px)
- **IGNORERER:** Spørsmål med radio-knapper (MC)
- **IGNORERER:** Spørsmål med mange små tekstbokser ("Fyll inn de blanke")

## Installering

1. Åpne `chrome://extensions/`
2. Slå på "Utviklermodus"
3. Klikk "Last inn upakket utvidelse"
4. Velg mappen `v3.2_AktuellVersjon`

## Bruk

**Via tastatursnarvei:**
- Windows/Linux: `Ctrl+Shift+Y`
- Mac: `Command+Shift+Y`

**Via StreamDeck eller ikon:**
- Klikk ikonet og trykk "Fyll tomme felt og godkjenn"

## Prosess

1. Lærer åpner Speed Grader for en elev
2. Kjører utvidelsen (tastatur/StreamDeck/ikon)
3. Utvidelsen:
   - Setter Status → Ingen
   - Fyller essayspørsmål med 1 poeng
   - Klikker "Oppdater"
   - **VENTER på "Oppdatert resultater"**
   - Returnerer → "Klart for neste elev!"
4. Lærer navigerer til neste elev
5. Canvas fortsetter å prosessere i bakgrunnen

## Versjonhistorikk

### v3.2 (nå)
- ✨ Venter på "Oppdatert resultater" før return
- 🔄 Canvas registrerer data før utvidelsen sier ferdig
- ⚡ Læreren kan navigere trygt til neste elev

### v3.1
- Søk i iFrames for poengfelt

### v3.0
- Essayfiltrering (skip MC, "Fyll inn blank", osv.)

## Teknisk

- Bruker `venteOppOpdatertResultater()` for å poll "Oppdatert resultater"-teksten
- 200ms polling interval
- 15 sekunders timeout
- Søker i både hoveddokument og iFrames
