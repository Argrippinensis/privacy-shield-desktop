// Local processing and offline availability are separate facts. Never infer airplane mode.
(function () {
  'use strict';
  const api = () => window.parent.electronAPI;
  const web = () => api()?.platform === 'web';
  const el = (tag, text) => { const n = document.createElement(tag); if (text) n.textContent = text; return n; };
  let trigger, title, subtitle, flightHint, dialog, refreshTimer, motionPaused = false;
  const style = el('style');
  style.textContent = `
    .ps-local-pill{position:fixed;bottom:max(14px,env(safe-area-inset-bottom));left:max(14px,env(safe-area-inset-left));z-index:80;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);min-height:48px;padding:9px 15px;border:1px solid #d5e3db;border-radius:24px;background:rgba(250,253,251,.96);box-shadow:0 4px 20px #163c2412;color:#18352a;text-align:left;font:12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;backdrop-filter:blur(14px)}
    .ps-local-pill strong,.ps-local-pill small{display:block}.ps-local-pill strong{font-size:12px;font-weight:600}.ps-local-pill small{font-size:11px;color:#475c51}.ps-local-orbit{width:9px;height:9px;flex:none;border-radius:50%;background:#21824d;box-shadow:0 0 0 4px #21824d15;animation:ps-breathe 4s ease-in-out infinite}
    @keyframes ps-breathe{50%{box-shadow:0 0 0 7px #21824d08;opacity:.65}}
    .ps-local-dialog{padding:24px;border:1px solid #dce3e0;border-radius:20px;width:min(480px,calc(100vw - 24px));max-height:85dvh;overflow:auto;color:#1d2924;background:#fcfdfc;box-shadow:0 20px 80px #10291d26;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .ps-local-dialog::backdrop{background:#152a2266;backdrop-filter:blur(4px)}.ps-local-dialog h2{font-size:21px;line-height:1.3;margin:0 0 12px;font-weight:600;letter-spacing:-.025em}.ps-local-dialog p{margin:10px 0}.ps-local-dialog button,.ps-local-dialog a.ps-service-link{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 14px;margin:6px 6px 0 0;border:1px solid #d3deda;border-radius:12px;background:#fff;color:#174e37;font:inherit;cursor:pointer;text-decoration:none}.ps-local-dialog button:disabled{opacity:.65;cursor:wait}.ps-local-dialog .ps-local-primary{background:#195b40;color:white;border-color:#195b40}.ps-local-dialog a:not(.ps-service-link){color:#174e37;text-decoration:underline}.ps-local-dialog :focus-visible,.ps-local-pill:focus-visible{outline:3px solid #267954;outline-offset:3px}.ps-local-note{font-size:12px;color:#526159}.ps-local-row{padding:9px 0;border-bottom:1px solid #e4eae6}.ps-local-dialog output{display:block;overflow-wrap:anywhere}
    body{padding-bottom:88px!important}html{scroll-padding-bottom:88px}
    @media(prefers-reduced-motion:reduce){.ps-local-orbit{animation:none}}
    @media print{.ps-local-pill{display:none!important}}
  `;
  style.textContent += `
    body{padding-bottom:144px!important}html{scroll-padding-bottom:144px}.ps-local-pill{gap:13px;border-radius:24px;background:rgba(249,251,253,.94);border-color:#dce2e8}.ps-flight-symbol{position:relative;width:39px;height:68px;flex:none;display:block}.ps-flight-symbol svg{width:39px;height:68px;overflow:visible}.ps-flight-symbol .ps-local-orbit{position:absolute;right:-1px;bottom:1px;width:6px;height:6px}.ps-flight-caption{font-size:10px!important;color:#365849!important;margin:2px 0}
    .ps-flight-guide{display:flex;gap:18px;align-items:center;padding:16px;background:linear-gradient(145deg,#f4f6fa,#e9eef6);border:1px solid #e0e5ed;border-radius:22px;margin:14px 0}.ps-flight-guide svg{width:112px;height:212px;flex:none;filter:drop-shadow(0 8px 9px #12234425)}.ps-flight-guide p{font-size:12px;margin:7px 0}.ps-flight-guide small{display:block;color:#526159;font-size:10px}.ps-flight-guide strong{font-size:14px;letter-spacing:-.025em}
    .ps-flight-panel{animation:ps-ios-panel 12s ease-in-out infinite;transform-origin:72px 40px}.ps-flight-tile{animation:ps-ios-airplane 12s linear infinite}.ps-ios-wifi{animation:ps-ios-wifi 12s linear infinite}.ps-ios-mobile{animation:ps-ios-mobile 12s linear infinite}.ps-ios-finger{animation:ps-ios-finger 12s ease-in-out infinite}.ps-ios-swipe{animation:ps-ios-swipe 12s ease-in-out infinite}.ps-ios-tap{animation:ps-ios-tap 12s linear infinite}
    @keyframes ps-ios-panel{0%,8%,95%,100%{opacity:0;transform:translateY(-45px) scale(.96)}20%,88%{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes ps-ios-airplane{0%,32%,96%,100%{fill:#596477}36%,92%{fill:#ff9f0a}}
    @keyframes ps-ios-mobile{0%,32%,96%,100%{fill:#30d158}36%,92%{fill:#596477}}
    @keyframes ps-ios-wifi{0%,56%,96%,100%{fill:#0a84ff}60%,92%{fill:#596477}}
    @keyframes ps-ios-swipe{0%,4%,24%,100%{opacity:0;transform:translateY(0)}8%{opacity:.9;transform:translateY(0)}20%{opacity:.2;transform:translateY(43px)}}
    @keyframes ps-ios-finger{0%,23%,70%,100%{opacity:0;transform:translate(0,0)}28%,39%{opacity:.85;transform:translate(-85px,34px)}50%,64%{opacity:.85;transform:translate(-85px,59px)}}
    @keyframes ps-ios-tap{0%,30%,40%,54%,65%,100%{opacity:0;r:5px}34%,58%{opacity:.6;r:13px}}
    .ps-motion-paused .ps-local-orbit,.ps-motion-paused .ps-flight-panel,.ps-motion-paused .ps-flight-tile,.ps-motion-paused .ps-ios-wifi,.ps-motion-paused .ps-ios-mobile,.ps-motion-paused .ps-ios-finger,.ps-motion-paused .ps-ios-swipe,.ps-motion-paused .ps-ios-tap{animation:none!important}.ps-motion-paused .ps-flight-panel{opacity:1;transform:none}.ps-motion-paused .ps-flight-tile{fill:#ff9f0a}.ps-motion-paused .ps-ios-wifi,.ps-motion-paused .ps-ios-mobile{fill:#596477}.ps-motion-paused .ps-ios-finger,.ps-motion-paused .ps-ios-swipe{opacity:0}
    @media(prefers-reduced-motion:reduce){.ps-flight-panel,.ps-flight-tile,.ps-ios-wifi,.ps-ios-mobile,.ps-ios-finger,.ps-ios-swipe,.ps-ios-tap{animation:none!important}.ps-flight-panel{opacity:1;transform:none}.ps-flight-tile{fill:#ff9f0a}.ps-ios-wifi,.ps-ios-mobile{fill:#596477}.ps-ios-finger,.ps-ios-swipe,.ps-ios-tap{opacity:0}}
    @media(max-width:520px){.ps-flight-guide{gap:12px;padding:12px}.ps-flight-guide svg{width:94px;height:179px}.ps-flight-guide p{font-size:11px;line-height:1.5}}
    #ANOVERLAY [role=button]:focus-visible{outline:2px solid #1a3a5c;outline-offset:2px}
  `;
  function iosPhone(id) {
    return `<svg viewBox="0 0 144 268" aria-hidden="true"><defs><linearGradient id="ps-ios-bg-${id}" x2="1" y2="1"><stop stop-color="#6c80c9"/><stop offset=".5" stop-color="#b6a5d1"/><stop offset="1" stop-color="#f0b29e"/></linearGradient></defs><rect x="3" y="1" width="138" height="266" rx="30" fill="#17202d"/><rect x="7" y="5" width="130" height="258" rx="27" fill="url(#ps-ios-bg-${id})"/><rect x="51" y="12" width="42" height="10" rx="5" fill="#111827"/><text x="17" y="22" font-size="7" fill="#fff" font-family="system-ui">9:41</text><path d="M111 16h13v6h-13z" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M125 18v2" stroke="#fff"/><path d="M116 29l3 4 3-4" fill="none" stroke="#fff" stroke-width="1.5"/><circle class="ps-ios-swipe" cx="119" cy="28" r="6" fill="#fff" fill-opacity=".8"/>
      <g class="ps-flight-panel"><rect x="13" y="34" width="118" height="207" rx="23" fill="#1c2742" fill-opacity=".63"/><text x="20" y="45" font-size="6" fill="#fff" font-family="system-ui">Kontrollzentrum</text><rect x="19" y="51" width="55" height="65" rx="15" fill="#26354d" fill-opacity=".8"/>
      <circle class="ps-flight-tile" cx="33" cy="68" r="11" fill="#596477"/><path d="m26 67 5-1v-6l2-1 2 7 5 2v2l-5-1-2 7-2-1v-6l-5-1Z" fill="#fff"/>
      <circle class="ps-ios-mobile" cx="59" cy="68" r="11" fill="#30d158"/><path d="M53 72v-3m4 3v-6m4 6v-9m4 9v-12" stroke="#fff" stroke-width="2"/>
      <circle class="ps-ios-wifi" cx="33" cy="93" r="11" fill="#0a84ff"/><path d="M26 91q7-6 14 0m-11 3q4-4 8 0m-5 3h2" stroke="#fff" stroke-width="1.7" fill="none"/>
      <circle cx="59" cy="93" r="11" fill="#0a84ff"/><path d="m57 86 7 5-9 7m2-12v14l7-5-9-7" stroke="#fff" stroke-width="1.2" fill="none"/>
      <rect x="80" y="51" width="45" height="65" rx="15" fill="#26354d" fill-opacity=".8"/><path d="m98 77 10 6-10 6Z" fill="#fff"/><text x="87" y="103" font-size="5.5" fill="#e5e9f3" font-family="system-ui">Keine Wiedergabe</text>
      <rect x="19" y="123" width="25" height="26" rx="9" fill="#e9edf7" fill-opacity=".85"/><path d="M27 136a6 6 0 1 1 5 6m-1-10v6h-4v-6z" fill="none" stroke="#53647d"/>
      <rect x="49" y="123" width="25" height="26" rx="9" fill="#e9edf7" fill-opacity=".85"/><path d="M65 130a7 7 0 1 0 2 11 6 6 0 0 1-2-11Z" fill="#53647d"/>
      <rect x="80" y="123" width="20" height="65" rx="9" fill="#e9edf7" fill-opacity=".35"/><rect x="80" y="154" width="20" height="34" rx="8" fill="#f7f9ff" fill-opacity=".9"/><circle cx="90" cy="174" r="4" fill="none" stroke="#55617a"/>
      <rect x="105" y="123" width="20" height="65" rx="9" fill="#e9edf7" fill-opacity=".35"/><rect x="105" y="163" width="20" height="25" rx="8" fill="#f7f9ff" fill-opacity=".9"/><path d="m111 175 4-3v8l-4-3h-2v-2Z" fill="#55617a"/>
      <rect x="19" y="155" width="55" height="33" rx="12" fill="#26354d" fill-opacity=".7"/><text x="30" y="175" font-size="7" fill="#fff" font-family="system-ui">☾  Fokus</text>
      <g fill="#e9edf7" fill-opacity=".8"><rect x="19" y="195" width="22" height="25" rx="8"/><rect x="47" y="195" width="22" height="25" rx="8"/><rect x="75" y="195" width="22" height="25" rx="8"/><rect x="103" y="195" width="22" height="25" rx="8"/></g><g fill="none" stroke="#53647d" stroke-width="1.5"><path d="M26 201h8l-2 5v8h-4v-8z"/><circle cx="58" cy="208" r="6"/><path d="M58 204v4l3 2M81 201h9v13h-9zM107 204h14v9h-14z"/><circle cx="114" cy="208" r="3"/></g></g>
      <g class="ps-ios-finger"><circle cx="118" cy="34" r="6" fill="#fff" fill-opacity=".9"/><circle class="ps-ios-tap" cx="118" cy="34" r="12" fill="none" stroke="#fff" stroke-width="1.5"/></g><rect x="53" y="253" width="38" height="3" rx="2" fill="#fff" fill-opacity=".8"/></svg>`;
  }
  document.head.append(style);
  function modal(name) {
    const d = el('dialog'); d.className = 'ps-local-dialog'; d.setAttribute('aria-label', name);
    const heading=el('h2',name);heading.tabIndex=-1;heading.autofocus=true;d.append(heading); document.body.append(d); return d;
  }
  function button(d, text, action) { const b = el('button', text); b.type = 'button'; b.onclick = action; d.append(b); return b; }
  async function status() {
    if (web()) {
      if (!window.parent.PSOffline) return { core: false, model: false, detail: 'Offline-Vorbereitung ist hier nicht verfügbar.' };
      return window.parent.PSOffline.status();
    }
    const a = await api()?.checkAssets(false);
    return { core: !!(a?.manifest && a.ok), model: !!(a?.manifest && a.ok), detail: a?.manifest && a.ok ? 'Programm, PDF/OCR und KI-Modell sind mitgeliefert. Die Dokumentverarbeitung ist technisch vom Netz gesperrt. Die separate Update-Prüfung benötigt bei verfügbarer Verbindung Internet.' : 'Installationsdateien konnten nicht vollständig bestätigt werden. Bitte Installation prüfen.' };
  }
  async function refresh() {
    try {
      const s = await status();
      title.textContent = 'Verarbeitung auf diesem Gerät';
      if (flightHint) flightHint.textContent = s.core ? 'Flugmodus jederzeit selbst einschalten' : 'Erst offline vorbereiten · dann Flugmodus';
      subtitle.textContent = (navigator.onLine ? 'Gerät meldet online' : 'Gerät meldet offline') + ' · ' + (s.core ? (s.model ? 'Inkl. KI offline vorbereitet' : 'Basis offline vorbereitet') : 'Offline prüfen');
      if (dialog?.open) {
        dialog.querySelector('[data-core]').textContent = 'Text, PDF/OCR, Word & Nachweis: ' + (s.core ? 'offline vorbereitet' : 'noch nicht vollständig vorbereitet');
        dialog.querySelector('[data-model]').textContent = 'Lokale KI-Erkennung: ' + (s.model ? 'offline vorbereitet' : 'Modell noch nicht vollständig im Cache');
        dialog.querySelector('[data-detail]').textContent = s.detail;
      }
    } catch {
      subtitle.textContent = 'Offline-Bereitschaft nicht bestätigt';
    }
  }
  function showStatus() {
    if (dialog?.open) return;
    dialog = modal('Ihre Daten bleiben hier');
    const introduction=el('p', 'PrivacyShield verarbeitet Dokumente lokal auf Ihrem Gerät. Dokumenttexte und Zuordnungen werden von PrivacyShield nicht an uns oder KI-Anbieter übertragen.');
    const guide=el('section');guide.className='ps-flight-guide';guide.setAttribute('aria-label','Flugmodus-Anleitung');
    guide.innerHTML=iosPhone('guide');
    const instructions=el('div');instructions.append(el('strong','Kontrollzentrum'),el('p','1. Oben rechts nach unten wischen.'),el('p','2. Flugmodus antippen.'),el('p','3. WLAN zusätzlich ausschalten.'),el('small','iPhone · Illustration · kein Gerätestatus. Browser zuerst offline vorbereiten.'));guide.append(instructions);dialog.append(guide);
    function pauseLabel(){const label=motionPaused?'Animation abspielen':'Animation anhalten';pause.setAttribute('aria-label',label);pause.title=label;pause.innerHTML=motionPaused?'<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="m5 3 8 5-8 5Z" fill="currentColor"/></svg>':'<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor"/></svg>';pause.setAttribute('aria-pressed',String(motionPaused));}
    const pause=button(dialog,'',()=>{motionPaused=!motionPaused;document.body.classList.toggle('ps-motion-paused',motionPaused);pauseLabel();});pause.style.cssText='width:44px;min-width:44px;margin:0;padding:8px';pauseLabel();
    const heading=dialog.querySelector('h2'),toolbar=el('div');toolbar.className='ps-flight-toolbar';toolbar.style.cssText='display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px';heading.style.margin='0';heading.before(toolbar);toolbar.append(heading,pause);
    dialog.append(introduction,el('p','Android/Windows: Flugmodus in den Schnelleinstellungen. Mac: WLAN und weitere Netzverbindungen ausschalten.'));
    for (const key of ['core', 'model', 'detail']) { const p = el('p', 'Wird geprüft …'); p.dataset[key] = ''; if (key !== 'detail') p.className = 'ps-local-row'; dialog.append(p); }
    dialog.append(el('p', 'Flugmodus ist ein zusätzlicher Schutz: Schalten Sie auch WLAN und mobile Daten aus. PrivacyShield kann den Flugmodus weder erkennen noch einschalten. ChatGPT, Claude und Gemini sind separate Online-Dienste; erst Ihr bewusstes Einfügen oder Teilen übergibt ihnen den Text.'));
    const out = el('output'); out.setAttribute('role', 'status'); dialog.append(out);
    if (web()) {
      dialog.append(el('p', 'Vorbereiten lädt nur Programmdateien (ca. 40 MB), keine Dokumente. Das optionale KI-Modell benötigt zusätzlich ca. 135 MB Download und deutlich mehr Arbeitsspeicher. Browser können gespeicherte Dateien später löschen.'));
      const prep = button(dialog, 'Offline vorbereiten', async () => {
        prep.disabled = true; out.textContent = 'Programm und PDF/OCR werden lokal gespeichert …';
        try { await window.parent.PSOffline.prepare(); out.textContent = 'Vorbereitung abgeschlossen. Bitte ohne Netz neu öffnen und mit einem Testdokument prüfen.'; }
        catch (e) { out.textContent = 'Vorbereitung nicht vollständig: ' + e.message; }
        finally { prep.disabled = false; await refresh(); }
      });
      const model = button(dialog, 'KI offline vorbereiten · 135 MB', async () => {
        model.disabled = true; out.textContent = 'Modell wird geladen; bitte geöffnet lassen. Es werden keine Dokumenttexte verwendet.';
        try {
          await window.parent.PSOffline.prepareModel();
          out.textContent = 'Modell gespeichert und Prüfsummen bestätigt. Der KI-Modus bleibt unverändert; das Modell belegt erst bei Verwendung Arbeitsspeicher.';
        } catch (e) { out.textContent = e.message; }
        finally { model.disabled = false; await refresh(); }
      });
      prep.className = 'ps-local-primary';
      dialog.appendChild(el('p', 'iPhone/iPad: nach der Vorbereitung in Safari „Teilen → Zum Home-Bildschirm“ wählen und dort offline testen. Privater Modus und knapper Gerätespeicher können die Verfügbarkeit einschränken.')).className = 'ps-local-note';
    }
    button(dialog, 'Schließen', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); dialog = null; trigger.focus(); }, { once: true });
    dialog.showModal(); refresh();
  }
  // Two deliberate steps preserve user activation for mobile Universal/App Links and clipboard permissions.
  window.psServiceDialog = async function (url) {
    const s = PSLib.aiServices.get(url); if (!s || !psCurrent()) return;
    const d = modal(s.name + ' öffnen');
    const run = psRun;
    const p = el('p', 'Bereinigter Text wird kopiert …'); p.setAttribute('role', 'status'); d.append(p);
    const valid = () => psCurrent() && psRun === run;
    try { await psCopy(document.getElementById('AT').value); p.textContent = valid() ? 'Bereinigter Text kopiert. In der KI-App selbst einfügen.' : 'Ergebnis inzwischen geändert. Bitte neu verarbeiten.'; }
    catch { p.textContent = 'Kopieren nicht möglich. Bitte bereinigten Text selbst kopieren und einfügen.'; }
    d.append(el('p', 'Bevorzugt wird die installierte App. Gerät, Browser, zugeordnete Links und Anbieter entscheiden, ob sie sich öffnet. Ohne passende App nutzen Sie den Webzugang.'));
    d.appendChild(el('p', 'Diese KI arbeitet online. Öffnen überträgt keinen Dokumenttext; Einfügen, Absenden oder Teilen an den Dienst ist Ihre Entscheidung.')).className = 'ps-local-note';
    const guard = (e) => { if (!valid()) { e.preventDefault(); p.textContent = 'Ergebnis veraltet. Bitte neu verarbeiten.'; return false; } return true; };
    const link = (label, href) => {
      const a = el('a', label); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.psService = 'true'; a.className = 'ps-service-link'; a.onclick = guard; d.append(a); return a;
    };
    if (web()) {
      const android = /Android/i.test(navigator.userAgent);
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const appURL = PSLib.aiServices.appURL(s.id, android ? 'android' : ios ? 'ios' : 'web');
      link('App bevorzugen', appURL).classList.add('ps-local-primary');
      link('Webversion öffnen', s.web);
      if (navigator.share) button(d, 'Über „Teilen“ an App …', async () => {
        if (!valid()) { p.textContent = 'Ergebnis veraltet. Bitte neu verarbeiten.'; return; }
        try { await navigator.share({ text: document.getElementById('AT').value }); }
        catch (e) { if (e.name !== 'AbortError') p.textContent = 'Teilen nicht möglich. Bitte kopieren und in der App einfügen.'; }
      });
    } else {
      for (const [label, prefer] of [['App bevorzugen', true], ['Webversion öffnen', false]]) button(d, label, async () => {
        if (!guard({ preventDefault() {} })) return;
        try { const r = await api().openAIService(s.id, prefer); p.textContent = r.destination === 'app' ? 'Öffnen der App angefordert. Dort den Text selbst einfügen.' : 'Webzugang geöffnet. Keine passende App-Verknüpfung verfügbar oder Webzugang gewählt.'; }
        catch { p.textContent = 'Öffnen fehlgeschlagen. Bitte den Dienst selbst starten.'; }
      });
    }
    button(d, 'Schließen', () => d.close()); d.addEventListener('close', () => d.remove(), { once: true }); d.showModal();
  };
  function platform() {
    if (/Android/i.test(navigator.userAgent)) return 'android';
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ? 'ios' : 'web';
  }
  function installServices() {
    const box = document.getElementById('ps-ai-services'); if (!box) return;
    box.replaceChildren();
    const note = el('p'); note.id = 'ps-handoff-status'; note.setAttribute('role','status'); note.style.cssText='font-size:12px;line-height:1.5;margin-top:10px'; box.after(note);
    const fallbacks = el('span'); note.after(fallbacks);
    const more = el('details'), summary = el('summary','Weitere KI-Dienste'); summary.style.cssText='cursor:pointer;font-size:12px;padding:10px 0'; more.append(summary); box.after(more);
    function current(e) { if (psCurrent()) return true; e.preventDefault(); toast('Ergebnis veraltet; erneut verarbeiten','e'); return false; }
    function launch(e,s) {
      if (!current(e)) return;
      const run = psRun, text = document.getElementById('AT').value;
      if (!text.trim()) { e.preventDefault(); return; }
      note.textContent = 'App-Öffnung für '+s.name+' angefordert. Bereinigten Text selbst einfügen; die KI arbeitet online.';
      fallbacks.replaceChildren();
      const fallback = el('a',s.name+' im Web öffnen'); fallback.href=s.web; fallback.target='_blank'; fallback.rel='noopener noreferrer'; fallback.dataset.psService='true'; fallback.className='btn btn-ghost'; fallback.onclick=current; fallbacks.append(fallback);
      // Do not await the clipboard before the direct link: iOS/Android need this user gesture.
      psCopy(text).then(()=>{
        if (psCurrent() && psRun===run) note.textContent='Bereinigter Text kopiert. In '+s.name+' selbst einfügen. Falls die App nicht öffnet, den Webzugang unten verwenden.';
        else note.textContent='Ergebnis inzwischen geändert. Vor weiterer Übergabe erneut verarbeiten.';
      }).catch(()=>{note.textContent='Kopieren nicht möglich. Bitte bereinigten Text selbst kopieren und in '+s.name+' einfügen.';});
      if (!web()) {
        e.preventDefault();
        api().openAIService(s.id,true).catch(()=>{note.textContent='App konnte nicht geöffnet werden. Webzugang unten verwenden oder App selbst starten.';});
      }
      // Browser: the anchor's own default action opens the app in the original click.
    }
    for (const s of PSLib.aiServices.services) {
      const a=el('a',s.name), logo=PSLib.brand.icon(s.id);if(logo){logo.dataset.psProviderLogo=s.id;a.prepend(logo);} a.href=PSLib.aiServices.appURL(s.id,platform()); a.target='_blank'; a.rel='noopener noreferrer'; a.dataset.psService='true'; a.dataset.psAi=s.id; a.className='btn btn-ghost'; a.style.cssText='font-size:12px;min-height:44px;display:inline-flex;align-items:center;gap:8px'; a.onclick=e=>launch(e,s);
      (s.more?more:box).append(a);
    }
    if (navigator.share) {
      const b=el('button','Bereinigten Text teilen …'); b.type='button'; b.className='btn btn-ghost'; b.onclick=async()=>{
        if (!psCurrent()) return toast('Ergebnis veraltet; erneut verarbeiten','e');
        try {await navigator.share({text:document.getElementById('AT').value});}
        catch(e){if(e.name!=='AbortError')toast('Teilen nicht möglich; Text kopieren','e');}
      }; more.append(b);
    }
  }
  function installContractReview() {
    const input=document.getElementById('IT');if(!input)return;
    const d=el('details');d.id='ps-contract-review';d.style.cssText='font-size:12px;line-height:1.5;margin:8px 0';
    d.append(el('summary','Arbeitsvertrag: indirekte Hinweise und Originaldatei prüfen'));
    d.append(el('p','Tarifgruppe und Berufsjahr können das Gehalt verraten. Auch Team, Arbeitszeit, Urlaub, Probezeit, Befristungsdauer, Anrede und Abschluss können zusammen identifizieren. Das Profil „Arbeitsvertrag“ maskiert diese Angaben zusätzlich.'));
    button(d,'Profil Arbeitsvertrag verwenden',()=>{document.querySelector('.profile-card[data-pid="employment"]').click();initEL();toast('Profil Arbeitsvertrag gewählt; bitte neu verarbeiten','s');});
    d.append(el('p','Arbeitgeber-Kurzformen, Slogans und interne Marken prüfen; bekannte Aliaslisten sind nicht vollständig. Weitere Begriffe über eigene Regeln oder Markierungen ergänzen.'));
    d.append(el('p','Dateiname, Metadaten, Logos und Unterschriftsbilder der Originaldatei separat prüfen. PrivacyShield erzeugt bereinigten Text und entfernt solche Inhalte nicht aus der Original-PDF. Ergebnis vor Weitergabe selbst prüfen.'));
    input.before(d);
  }
  window.addEventListener('DOMContentLoaded', () => {
    installServices(); installContractReview();
    trigger = el('button'); trigger.type = 'button'; trigger.className = 'ps-local-pill'; trigger.setAttribute('aria-haspopup', 'dialog'); trigger.title = 'Offline-Status und Ressourcen anzeigen'; if (!web()) trigger.style.bottom = 'max(52px, env(safe-area-inset-bottom))';
    const dot = el('span'); dot.className = 'ps-flight-symbol'; dot.setAttribute('aria-hidden', 'true');dot.innerHTML=iosPhone('mini')+'<span class="ps-local-orbit"></span>';
    const text = el('span'); title = el('strong', 'Verarbeitung auf diesem Gerät');flightHint=el('small','Flugmodus · Anleitung & Vorbereitung');flightHint.className='ps-flight-caption'; subtitle = el('small', 'Offline-Bereitschaft wird geprüft'); text.append(title,flightHint,subtitle); trigger.append(dot, text); trigger.onclick = showStatus; document.body.append(trigger);
    refresh();
    // Check storage again after foregrounding; no polling/download while hidden or during an analysis.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    window.parent.addEventListener('ps-offline-change', refresh);
    refreshTimer = setInterval(() => { if (!document.hidden && dialog?.open) refresh(); }, 5000);
    window.addEventListener('pagehide', () => clearInterval(refreshTimer), { once: true });
  });
})();
