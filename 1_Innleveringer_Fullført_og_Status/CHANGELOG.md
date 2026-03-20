# Endringslogg

## v3.2 – 2026-03-18

### ✨ Nye funksjoner
- **Smart venting på "Oppdatert resultater"** Canvas-meldingen
  - Venter til Canvas registrerer dataene på serveren
  - Returnerer umiddelbart når boksen vises
  - 15 sekunders timeout (sikkerhet)
- Læreren kan navigere trygt til neste elev etter return

### 🔧 Tekniske endringer
- Ny `venteOppOpdatertResultater()` funksjon
- Poll-basert deteksjon hver 200ms
- Søker etter teksten "Oppdatert resultater" i både DOM og iFrames
- Async/await støtte for venting

### 📝 Fordeler
- ✅ Trygt å navigere bort etter utvidelsen returnerer
- ✅ Canvas jobber videre på serveren uavhengig
- ✅ Robust mot variabel prosesserings-tid
- ✅ Ingen unødvendig ventetid på UI-oppdateringer

---

## v3.1 – 2026-03-18

### ✨ Nye funksjoner
- Søk i iFrames for poengfelt
- Bedre kompatibilitet med Canvas' struktur

### 🐛 Bugfiks
- Poengfelt i iFrames ble nå funnet

---

## v3.0 – 2026-03-18

### ✨ Nye funksjoner
- Essayfiltrering basert på teksteditor-størrelse
- Ignorerer MC (radio/checkbox)
- Ignorerer "Fyll inn de blanke feltene"

### 🔧 Tekniske endringer
- Ny `erEssaySporsmal()` funksjon
- Sjekker tekstEditor-høyde (> 80px = Essay)
- Sikker fallback-logikk

---

## v2.0 – (utgangspunkt)

- Innledende funksjonell versjon
- Fyller alle tomme poengfelt
- Status og vurderingshandling
