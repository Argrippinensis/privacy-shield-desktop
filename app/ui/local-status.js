// Local processing and offline availability are separate facts. Never infer airplane mode.
(function () {
  'use strict';
  const api = () => window.parent.electronAPI;
  const web = () => api()?.platform === 'web';
  const el = (tag, text) => { const n = document.createElement(tag); if (text) n.textContent = text; return n; };
  let trigger, title, subtitle, dialog, refreshTimer;
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
  document.head.append(style);
  function modal(name) {
    const d = el('dialog'); d.className = 'ps-local-dialog'; d.setAttribute('aria-label', name);
    d.append(el('h2', name)); document.body.append(d); return d;
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
      subtitle.textContent = (navigator.onLine ? 'Gerät meldet online' : 'Gerät meldet offline') + ' · ' + (s.core ? 'Offline vorbereitet' : 'Offline prüfen');
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
    dialog.append(el('p', 'PrivacyShield verarbeitet Dokumente lokal auf Ihrem Gerät. Dokumenttexte und Zuordnungen werden von PrivacyShield nicht an uns oder KI-Anbieter übertragen.'));
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
      const a=el('a','→ '+s.name); a.href=PSLib.aiServices.appURL(s.id,platform()); a.target='_blank'; a.rel='noopener noreferrer'; a.dataset.psService='true'; a.dataset.psAi=s.id; a.className='btn btn-ghost'; a.style.cssText='font-size:12px;min-height:44px;display:inline-flex;align-items:center'; a.onclick=e=>launch(e,s);
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
    const dot = el('span'); dot.className = 'ps-local-orbit'; dot.setAttribute('aria-hidden', 'true');
    const text = el('span'); title = el('strong', 'Verarbeitung auf diesem Gerät'); subtitle = el('small', 'Offline-Bereitschaft wird geprüft'); text.append(title, subtitle); trigger.append(dot, text); trigger.onclick = showStatus; document.body.append(trigger);
    refresh();
    // Check storage again after foregrounding; no polling/download while hidden or during an analysis.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    window.parent.addEventListener('ps-offline-change', refresh);
    refreshTimer = setInterval(() => { if (!document.hidden && dialog?.open) refresh(); }, 5000);
    window.addEventListener('pagehide', () => clearInterval(refreshTimer), { once: true });
  });
})();
