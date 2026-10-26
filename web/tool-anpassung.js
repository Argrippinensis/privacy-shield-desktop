// Laufzeit-Anpassung des Werkzeugs in der Browser-Huelle (privacy-shield.html selbst bleibt unveraendert).
// Die Huelle ruft anwenden(iframe.contentDocument) nach dem Laden auf. Drei Dinge:
//  1. Aussagen, die nur fuer die Desktop-Version gelten (Flugmodus, kein Serverkontakt, Installation), werden in den
//     Textknoten durch browser-taugliche Formulierungen ersetzt (auch fuer spaeter eingefuegte Texte).
//  2. Layoutregeln fuer schmale Breiten (Handy) und fuer den Browser (Update-Knopf, tote Testdokument-Links).
//  3. Der Update-Knopf der Fusszeile bleibt als Versionsanzeige, ist aber nicht bedienbar.
// Pflege: jedes "von" muss woertlich (Leerraum beliebig) im Werkzeug stehen; tests/web-beta.test.mjs prueft das.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PSWebAnpassung = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Reihenfolge zaehlt: laengere Saetze vor ihren Teilstuecken. dyn: Text steht im Werkzeug nur in einer JavaScript-Zeichenkette
  // und erscheint erst zur Laufzeit (der Test prueft ihn dort).
  var TEXTE = [
    { von: 'Alle Verarbeitung erfolgt ausschließlich im Arbeitsspeicher dieser App — kein Datenaustausch mit dem Internet, kein Tracking, keine Cloud. Beim Schließen der App sind alle Daten sofort weg.',
      nach: 'Alle Verarbeitung erfolgt ausschließlich im Arbeitsspeicher dieses Browser-Tabs — Ihre Dokumente werden nicht ins Internet gesendet, kein Tracking, keine Cloud. Beim Schließen der Seite sind die Dokumente sofort weg.' },
    { von: 'Kein Datenaustausch mit dem Internet — alles bleibt auf Ihrem Gerät',
      nach: 'Ihre Dokumente werden nicht ins Internet gesendet — alles bleibt in Ihrem Browser' },
    { von: 'Beim Schließen der App sind alle Daten sofort weg',
      nach: 'Beim Schließen der Seite sind die Dokumente sofort weg' },
    { von: 'Kein Tracking, keine Cloud, keine Server-Kontakte',
      nach: 'Kein Tracking, keine Cloud; nur das KI-Modell kommt einmalig von huggingface.co' },
    { von: 'Flugmodus-Betrieb möglich',
      nach: 'Offline nutzbar, sobald Seite und Modell einmal geladen sind' },
    { von: 'PrivacyShield arbeitet komplett auf Ihrem Rechner. Ihre Dokumente verlassen Ihr Gerät nicht — daher kann das Tool auch im Flugmodus oder ohne Internetverbindung genutzt werden.',
      nach: 'PrivacyShield arbeitet komplett in Ihrem Browser. Ihre Dokumente verlassen Ihr Gerät nicht — daher kann das Tool nach dem ersten Laden von Seite und Modell auch offline genutzt werden.' },
    { von: 'Alles geschieht lokal auf Ihrem Rechner. Kein Serverkontakt.',
      nach: 'Alles geschieht lokal in Ihrem Browser. Ihre Texte bleiben im Browser.' },
    { von: 'PrivacyShield — Deine Daten, dein Rechner. Null Serverkontakt.',
      nach: 'PrivacyShield — Deine Daten, dein Browser. Deine Texte bleiben bei dir.' },
    { von: 'Keine Datenspeicherung · Flugmodus-tauglich. Alle Verarbeitung erfolgt ausschließlich lokal auf diesem Rechner — ohne eine einzige Serveranfrage.',
      nach: 'Dokumente werden nicht gespeichert. Alle Verarbeitung erfolgt ausschließlich lokal in diesem Browser; nur das KI-Modell wird einmalig von huggingface.co geladen.' },
    { von: 'Flugmodus-tauglich', nach: 'Offline nach dem ersten Laden' },
    { von: 'Kein Serverkontakt', nach: 'Ihre Texte bleiben im Browser' },
    { von: 'Wird aus der Installation geladen · kein Download',
      nach: 'Wird einmalig von huggingface.co geladen (ca. 135 MB) und im Browser gespeichert' },
    { von: 'funktioniert ohne Internet.', nach: 'nach dem ersten Laden des Modells auch offline.' },
    { von: 'Das Modell startet bei der ersten Analyse (ca. 2 Sekunden)',
      nach: 'Das Modell wird bei der ersten Analyse geladen (ca. 135 MB, einmalig von huggingface.co)', dyn: true },
    { von: 'Bitte PrivacyShield neu installieren. Häufige Ursache: Ein Virenschutz hat die große Modelldatei (135 MB) blockiert oder in Quarantäne verschoben.',
      nach: 'Bitte die Seite neu laden und es erneut versuchen. Häufige Ursache: Ein Inhaltsblocker oder eine Firmen-Firewall blockiert huggingface.co, oder der Speicher des Browsers ist voll.', dyn: true },
    { von: 'Dateien der Installation fehlen oder sind unvollständig', nach: 'Dateien der Seite fehlen oder sind unvollständig', dyn: true },
  ];

  var CSS = [
    // Browser: Version bleibt sichtbar, ist aber kein Update-Knopf; tote Testdokument-Links (../tests/*.pdf) entfallen
    '#PS-VERSION-LABEL { text-decoration: none !important; cursor: default; opacity: 1 !important; color: var(--ps-muted) !important; }',
    'a[href^="../tests/"] { display: none !important; }',
    '@media (max-width: 960px) { .ws-grid { grid-template-columns: minmax(0, 1fr) !important; } }',
    // Handy (nur schmale Breiten): Schrittleiste 2x2, Kopfzeilen und Knopfreihen umbrechend, Knoepfe mindestens 40 px hoch,
    // zweispaltige Raster einspaltig, kleinere Seitenraender, Kopfzeile des Werkzeugs entfaellt (die Huelle hat eine).
    '@media (max-width: 600px) {',
    '  header > nav.nav-glass { display: none !important; }',
    '  #main { padding-top: 0 !important; }',
    '  #WS { padding-left: 12px !important; padding-right: 12px !important; }',
    '  .steps-bar { display: grid !important; grid-template-columns: 1fr 1fr; }',
    '  .step-tab { display: flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px !important; border-right: 0 !important; border-bottom: 1px solid #e5e5e5; }',
    '  .step-tab:nth-child(odd) { border-right: 1px solid #e5e5e5 !important; }',
    '  .step-tab:nth-child(n+3) { border-bottom: 0; }',
    '  .tool-panel-header { flex-wrap: wrap; gap: 8px 10px; }',
    '  .tool-panel-header > div { display: flex; flex-wrap: wrap; gap: 8px !important; }',
    '  [style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: minmax(0, 1fr) !important; }',
    '  .btn, .btn-accent, .btn-ghost, .btn-outline, .btn-primary { min-height: 40px !important; }',
    '}'
  ].join('\n');

  // Regulaerer Ausdruck pro Regel: jeder Leerraum im "von" passt auf beliebigen Leerraum (Zeilenumbrueche im Quelltext)
  var REGELN = TEXTE.map(function (r) {
    var rx = r.von.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '\\s+');
    return { rx: new RegExp(rx, 'g'), nach: r.nach };
  });

  function ersetzeText(text) {
    var t = text;
    for (var i = 0; i < REGELN.length; i++) {
      REGELN[i].rx.lastIndex = 0;
      t = t.replace(REGELN[i].rx, REGELN[i].nach);
    }
    return t;
  }

  function knoten(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'SCRIPT' || p === 'STYLE') return;
      var neu = ersetzeText(n.nodeValue);
      if (neu !== n.nodeValue) n.nodeValue = neu;
    } else if (n.nodeType === 1 && n.nodeName !== 'SCRIPT' && n.nodeName !== 'STYLE') {
      for (var c = n.firstChild; c; c = c.nextSibling) knoten(c);
    }
  }

  function anwenden(doc) {
    if (!doc || !doc.head || !doc.body || doc.getElementById('ps-beta-anpassung')) return;
    var st = doc.createElement('style');
    st.id = 'ps-beta-anpassung';
    st.textContent = CSS;
    doc.head.appendChild(st);
    // Update-Knopf: nur noch Versionsanzeige
    var v = doc.getElementById('PS-VERSION-LABEL');
    if (v) { v.disabled = true; v.removeAttribute('title'); v.removeAttribute('onclick'); }
    // Tote Links: ganze Zeile "PDF: Recht · Medizin" ausblenden
    var tote = doc.querySelectorAll('a[href^="../tests/"]');
    for (var i = 0; i < tote.length; i++) if (tote[i].parentElement) tote[i].parentElement.style.display = 'none';
    knoten(doc.body);
    var MO = doc.defaultView && doc.defaultView.MutationObserver;
    if (!MO) return;
    new MO(function (muts) {
      for (var j = 0; j < muts.length; j++) {
        var m = muts[j];
        if (m.type === 'characterData') knoten(m.target);
        else for (var k = 0; k < m.addedNodes.length; k++) knoten(m.addedNodes[k]);
      }
    }).observe(doc.body, { childList: true, subtree: true, characterData: true });
  }

  return { TEXTE: TEXTE, CSS: CSS, ersetzeText: ersetzeText, anwenden: anwenden };
});
