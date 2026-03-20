chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'kjor-godkjenn') await kjorGodkjenn();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'kjor-godkjenn') {
    kjorGodkjenn().then(sendResponse);
    return true;
  }
});

async function kjorGodkjenn() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes('speed_grader')) return { feil: 'Ikke Speed Grader' };

  const erNQ = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => !!document.querySelector('input[data-automation="sdk-grading-edit-score-input"]')
  });

  const harNQ = erNQ.some(r => r.result === true);

  if (harNQ) {
    // NQ-flyt: Status først, deretter fyll og oppdater
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: settStatusOgVent
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fyllOgOppdaterMedVenting
    });
  } else {
    // Vanlig oppgave/diskusjon-flyt: Status først, deretter Vurdering
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: settStatusOgVent
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      func: settVurderingOgVent
    });
  }

  return { ok: true };
}

function settVurderingOgVent() {
  return new Promise(resolve => {
    const forsok = (nr) => {
      if (nr > 5) return resolve(false);

      const input = document.querySelector('input[data-testid="pass-fail-select"]');
      if (!input) return setTimeout(() => forsok(nr + 1), 400);
      if (['Fullfort', 'Fullført', 'Complete'].includes(input.value)) return resolve(true);

      const observer = new MutationObserver(() => {
        if (['Fullfort', 'Fullført', 'Complete'].includes(input.value)) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(input, { attributes: true, attributeFilter: ['value'] });

      input.click();
      setTimeout(() => {
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        const valgt = options.find(o =>
          ['Fullført', 'Complete', 'Complet', 'Completado', 'Completo'].includes(o.textContent.trim())
        );
        if (valgt) {
          valgt.click();
        } else {
          observer.disconnect();
          setTimeout(() => forsok(nr + 1), 400);
        }
        setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
      }, 350);
    };
    forsok(0);
  });
}

function settStatusOgVent() {
  return new Promise(resolve => {
    const forsok = (nr) => {
      if (nr > 5) return resolve(false);

      const input = document.querySelector('input[data-testid="assignment-submission-status-select"]');
      if (!input) return setTimeout(() => forsok(nr + 1), 400);
      if (['Ingen', 'None'].includes(input.value)) return resolve(true);

      const observer = new MutationObserver(() => {
        if (['Ingen', 'None'].includes(input.value)) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(input, { attributes: true, attributeFilter: ['value'] });

      input.click();
      setTimeout(() => {
        const options = Array.from(document.querySelectorAll('[role="option"]'));
        const valgt = options.find(o =>
          ['Ingen', 'None', 'Aucun', 'Ninguno', 'Keiner', 'Nessuno', 'Geen'].includes(o.textContent.trim())
        );
        if (valgt) {
          valgt.click();
        } else {
          observer.disconnect();
          setTimeout(() => forsok(nr + 1), 400);
        }
        setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
      }, 350);
    };
    forsok(0);
  });
}

// Sjekk om et input-felt tilhører et essayspørsmål
function erEssaySporsmal(inputElement, dokumentKontekst = document) {
  let current = inputElement.parentElement;
  let depth = 0;
  const maxDepth = 20;
  let debugInfo = [];

  while (current && depth < maxDepth) {
    // AVVIS: Radio/Checkbox = Multiple Choice
    const hasRadio = current.querySelector('input[type="radio"]');
    const hasCheckbox = current.querySelector('input[type="checkbox"]');
    if (hasRadio || hasCheckbox) {
      debugInfo.push(`Level ${depth}: ✗ Radio/Checkbox funnet (MC)`);
      console.log(`       → ${debugInfo[debugInfo.length - 1]}`);
      return false;
    }

    // AKSEPTER: Stor teksteditor = Essay
    const textarea = current.querySelector('textarea');
    if (textarea) {
      const height = textarea.offsetHeight || 0;
      debugInfo.push(`Level ${depth}: Textarea høyde ${height}px`);
      if (height > 80) {
        console.log(`       → ✓ ESSAY: Stor textarea (${height}px)`);
        return true;
      }
    }

    const contenteditable = current.querySelector('[contenteditable="true"]');
    if (contenteditable) {
      const height = contenteditable.offsetHeight || 0;
      debugInfo.push(`Level ${depth}: Contenteditable høyde ${height}px`);
      if (height > 80) {
        console.log(`       → ✓ ESSAY: Stor contenteditable (${height}px)`);
        return true;
      }
    }

    // Sjekk klassifiseringer
    const className = current.className || '';
    if (typeof className === 'string') {
      const classStr = className.toLowerCase();
      
      if (classStr.includes('essay') && !classStr.includes('fill')) {
        console.log(`       → ✓ ESSAY: class inneholder "essay"`);
        return true;
      }
      
      if (classStr.includes('fill-in') || classStr.includes('fillins') || 
          classStr.includes('multiple-choice') || classStr.includes('multiple_choice') ||
          classStr.includes('true-false') || classStr.includes('true_false')) {
        console.log(`       → ✗ IKKE essay: class="${classStr}"`);
        return false;
      }
    }

    // Sjekk data-attributes
    const questionType = current.getAttribute('data-question-type');
    if (questionType) {
      if (questionType.includes('essay') || questionType.includes('essay_question')) {
        console.log(`       → ✓ ESSAY: data-question-type="${questionType}"`);
        return true;
      }
      if (questionType.includes('fill') || questionType.includes('blank') || 
          questionType.includes('choice') || questionType.includes('true_false')) {
        console.log(`       → ✗ IKKE essay: data-question-type="${questionType}"`);
        return false;
      }
    }

    current = current.parentElement;
    depth++;
  }

  console.log(`       → ✗ Usikker: Ingen detektor matched`);
  return false;
}

// Vent på "Oppdatert resultater"-meldingen
function venteOppOpdatertResultater() {
  return new Promise((resolve) => {
    const maxVentetid = 15000; // 15 sekunder timeout
    const startTid = Date.now();

    const sjekkResultat = () => {
      // Søk etter "Oppdatert resultater"-teksten
      const allText = document.body.innerText;
      if (allText.includes('Oppdatert resultater')) {
        resolve(true);
        return;
      }

      // Søk også i iFrames
      const iframes = document.querySelectorAll('iframe');
      for (let iframe of iframes) {
        try {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc && iframeDoc.body.innerText.includes('Oppdatert resultater')) {
            resolve(true);
            return;
          }
        } catch (e) {
          // Ignorer cross-origin iFrames
        }
      }

      // Timeout sjekk
      if (Date.now() - startTid > maxVentetid) {
        resolve(false); // Timeout, men returner OK uansett
        return;
      }

      // Poll hver 200ms
      setTimeout(sjekkResultat, 200);
    };

    sjekkResultat();
  });
}

function fyllOgOppdaterMedVenting() {
  console.log('\n===== FYLL OG OPPDATER v3.2 - START =====');
  
  // DEFINER erEssaySporsmal - TEKST-BASERT DETEKSJON
  const erEssaySporsmal = function(inputElement, dokumentKontekst = document) {
    let current = inputElement.parentElement;
    let depth = 0;
    const maxDepth = 25;

    while (current && depth < maxDepth) {
      const tekstIElement = current.textContent.toLowerCase();
      
      // HVIS ESSAY - GI POENG
      if (tekstIElement.includes('essay')) {
        console.log(`       Level ${depth}: ✓ ESSAY FUNNET`);
        return true;
      }
      
      // HVIS IKKE HÅNDGRADERT - SKIP
      if (tekstIElement.includes('flere valgmuligheter') ||
          tekstIElement.includes('fyll inn de blanke') ||
          tekstIElement.includes('sant eller usant') ||
          tekstIElement.includes('matching') ||
          tekstIElement.includes('kategorisering') ||
          tekstIElement.includes('formel') ||
          tekstIElement.includes('numerisk') ||
          tekstIElement.includes('rekkefølge')) {
        console.log(`       Level ${depth}: ✗ IKKE ESSAY`);
        return false;
      }

      current = current.parentElement;
      depth++;
    }

    console.log(`       ✗ Usikker - ingen spørsmålstype funnet`);
    return false;
  };
  
  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;

  let count = 0;
  let essayInputsFound = 0;
  let totalInputsFunnet = 0;

  // METODE 1: Søk i hoveddokumentet
  console.log('1. Søker i hoveddokumentet...');
  const alle = document.querySelectorAll(
    'input[data-automation="sdk-grading-edit-score-input"][placeholder="--"]'
  );
  console.log(`   Poengfelt funnet i hoveddokumentet: ${alle.length}`);
  totalInputsFunnet += alle.length;

  const essayInputs = Array.from(alle).filter(input => {
    const erEssay = erEssaySporsmal(input, document);
    console.log(`   - Felt detektert som essay: ${erEssay}`);
    return erEssay;
  });
  essayInputsFound += essayInputs.length;
  console.log(`   Essay-felt i hoveddokumentet: ${essayInputs.length}`);
  
  const inputs = essayInputs.filter(i => i.value === '0' || i.value === '');
  console.log(`   Tomme essay-felt: ${inputs.length}`);
  
  inputs.forEach((input, idx) => {
    console.log(`   Fyller felt ${idx}...`);
    nativeInputSetter.call(input, '1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`   ✓ Felt ${idx} fyllt`);
    count++;
  });

  // METODE 2: Søk i alle iFrames
  console.log('\n2. Søker i iFrames...');
  const iframes = document.querySelectorAll('iframe');
  console.log(`   iFrames funnet: ${iframes.length}`);
  
  iframes.forEach((iframe, frameIdx) => {
    console.log(`\n   --- iFrame ${frameIdx} ---`);
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        console.log(`   Kan ikke aksessere iframe (cross-origin)`);
        return;
      }

      const iframeInputs = iframeDoc.querySelectorAll(
        'input[data-automation="sdk-grading-edit-score-input"][placeholder="--"]'
      );
      console.log(`   Poengfelt i iframe: ${iframeInputs.length}`);
      totalInputsFunnet += iframeInputs.length;

      const essayIframeInputs = Array.from(iframeInputs).filter(input => {
        const erEssay = erEssaySporsmal(input, iframeDoc);
        if (erEssay) console.log(`   ✓ Essay-felt detektert`);
        else console.log(`   ✗ IKKE essay (hopper over)`);
        return erEssay;
      });
      
      essayInputsFound += essayIframeInputs.length;
      console.log(`   Essay-felt i iframe: ${essayIframeInputs.length}`);

      essayIframeInputs.forEach((input, inputIdx) => {
        const isEmpty = input.value === '0' || input.value === '';
        console.log(`   Felt ${inputIdx}: value="${input.value}", tomt=${isEmpty}`);
        
        if (isEmpty) {
          const iframeInputSetter = Object.getOwnPropertyDescriptor(
            iframe.contentWindow.HTMLInputElement.prototype, 'value'
          ).set;
          
          console.log(`   Fyller felt ${inputIdx}...`);
          iframeInputSetter.call(input, '1');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`   ✓ Felt ${inputIdx} fyllt`);
          count++;
        }
      });
    } catch (e) {
      console.log(`   ERROR i iframe ${frameIdx}: ${e.message}`);
    }
  });

  console.log(`\n3. OPPSUMMERING`);
  console.log(`   Totalt poengfelt funnet: ${totalInputsFunnet}`);
  console.log(`   Essay-felt funnet: ${essayInputsFound}`);
  console.log(`   Felt fylt: ${count}`);

  // Klikk Oppdater hvis vi gjorde endringer
  if (count > 0) {
    console.log(`\n4. KLIKKER OPPDATER...`);
    const updateTexts = ['Oppdater', 'Update', 'Uppdatera', 'Opdater'];
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => updateTexts.includes(b.textContent.trim()));
    
    if (btn) {
      console.log(`   ✓ Oppdater-knapp funnet og klikket`);
      btn.click();
      
      // VENT på "Oppdatert resultater" før return
      console.log(`\n5. VENTER PÅ "Oppdatert resultater"...`);
      return venteOppOpdatertResultater().then(oppdatertVises => {
        console.log(`   ${oppdatertVises ? '✓' : '✗'} Oppdatert resultater vises`);
        console.log(`\n===== FYLL OG OPPDATER - FERDIG =====\n`);
        return { count, clicked: true, essayFunnet: essayInputsFound, oppdatertVises };
      });
    } else {
      console.log(`   ✗ Oppdater-knapp IKKE funnet!`);
    }
  } else {
    console.log(`\n4. INGEN FELT Å FYLLE - hopper over Oppdater`);
    console.log(`\n===== FYLL OG OPPDATER - FERDIG (ingenting gjort) =====\n`);
  }

  return { count, clicked: false, essayFunnet: essayInputsFound, oppdatertVises: false };
}
