# Patch fuer src/tools/privacyshield-redesigned.html: Handy-App (PWA), Handy-Layout, keine Emojis am Update-Knopf.
import sys,os
P=os.environ.get('PSWEB','src/tools/privacyshield-redesigned.html')
s=open(P,encoding='utf-8').read()
def rep(old,new):
    global s
    n=s.count(old)
    if n!=1: print(f"FEHLER {n}!=1: {old[:80]!r}"); sys.exit(1)
    s=s.replace(old,new)

# ---- 1) Kopfzeile: Manifest, Farben, iOS/Android-Metadaten, Icons; Handy-CSS
rep('''    <script src="https://cdn.tailwindcss.com"></script>
    <style>''','''    <link rel="manifest" href="/tools/privacyshield-manifest.json" />
    <meta name="theme-color" content="#1a3a5c" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="PrivacyShield" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" href="/assets/privacyshield/apple-touch-icon-180.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/assets/privacyshield/icon-192.png" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Handy: das schwebende System-Monitor-Panel verdeckt sonst die Bedienung */
      @media (max-width: 768px) {
        #ps-sysmon {
          display: none !important;
        }
      }''')

# ---- 2) Update-Knopf ohne Emoji (flach, nur Text); Ladezustand ueber den Knopftext
rep('''              <span id="ps-check-icon">\U0001F504</span> Auf Updates prüfen''','''              Auf Updates prüfen''')
rep('''        const icon = document.getElementById("ps-check-icon");
        const status = document.getElementById("ps-check-status");

        if (!btn || !icon || !status) return;''','''        const status = document.getElementById("ps-check-status");

        if (!btn || !status) return;''')
rep('''        btn.disabled = true;
        icon.textContent = "\u23F3";''','''        btn.disabled = true;
        btn.textContent = "Prüfe …";''')
rep('''          btn.disabled = false;
          icon.textContent = "\U0001F504";''','''          btn.disabled = false;
          btn.textContent = "Auf Updates prüfen";''')

# ---- 3) Installationshinweis (Handy) + Service Worker
HINT='''
    <div id="ps-install-hint" role="dialog" aria-label="Als App installieren" hidden>
      <div class="ps-ih-head">
        <strong>PrivacyShield als App nutzen</strong>
        <button type="button" id="ps-ih-close" aria-label="Schließen">Schließen</button>
      </div>
      <div id="ps-ih-body"></div>
      <p class="ps-ih-note">
        Ihre Daten bleiben auf dem Gerät. Die KI-Erkennung braucht viel Arbeitsspeicher; auf dem Handy ist die
        Standard-Erkennung am zuverlässigsten, für große Dokumente empfehlen wir einen Computer.
      </p>
    </div>
    <style>
      #ps-install-hint {
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: 12px;
        z-index: 9990;
        background: #fff;
        border: 1px solid #d0dae8;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(26, 58, 92, 0.18);
        padding: 14px 16px;
        font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        font-size: 13px;
        color: #333;
        line-height: 1.5;
        max-width: 520px;
        margin: 0 auto;
      }
      #ps-install-hint[hidden] { display: none; }
      #ps-install-hint .ps-ih-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; color: #1a3a5c; }
      #ps-install-hint button { font: inherit; cursor: pointer; border-radius: 8px; }
      #ps-ih-close { background: none; border: 1px solid #d0dae8; color: #555; padding: 6px 12px; min-height: 36px; }
      #ps-install-hint ol { margin: 0 0 8px 20px; padding: 0; list-style: decimal; }
      #ps-install-hint li { margin: 4px 0; }
      #ps-install-hint .ps-ih-btn { background: #1a3a5c; color: #fff; border: 0; padding: 10px 16px; min-height: 44px; font-weight: 600; }
      #ps-install-hint .ps-ih-note { margin: 8px 0 0; font-size: 11px; color: #888; }
      #ps-install-hint svg { vertical-align: -3px; }
    </style>
    <script>
      // Hinweis "Als App installieren": nur auf Handys, nicht in der installierten App, 30 Tage Ruhe nach "Schließen".
      (function () {
        var KEY = "ps_install_hint_until";
        var ua = navigator.userAgent || "";
        var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        var isAndroid = /Android/.test(ua);
        var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
        if (standalone || !(isIOS || isAndroid)) return;
        try { if (Date.now() < Number(localStorage.getItem(KEY) || 0)) return; } catch (e) {}
        var deferred = null;
        var box = document.getElementById("ps-install-hint");
        var body = document.getElementById("ps-ih-body");
        var share = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
        function render() {
          if (isIOS) {
            var safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
            body.innerHTML = (safari ? "" : "<p>Am besten in <strong>Safari</strong> öffnen. Andere Browser bieten den Eintrag teils ebenfalls an.</p>") +
              "<ol><li><span style='white-space:nowrap'>" + share + " Unten (iPad: oben)</span> auf „<strong>Teilen</strong>“ tippen.</li>" +
              "<li>„<strong>Zum Home-Bildschirm</strong>“ wählen (ggf. nach unten scrollen).</li>" +
              "<li>Oben rechts auf „Hinzufügen“ tippen.</li></ol>" +
              "<p>PrivacyShield erscheint dann wie eine App auf dem Startbildschirm und startet ohne Browserleiste.</p>";
          } else if (deferred) {
            body.innerHTML = '<p>PrivacyShield wie eine App auf dem Startbildschirm speichern:</p><button type="button" class="ps-ih-btn" id="ps-ih-install">Als App installieren</button>';
            document.getElementById("ps-ih-install").onclick = function () {
              deferred.prompt();
              deferred.userChoice.then(function () { deferred = null; box.hidden = true; });
            };
          } else {
            body.innerHTML = "<ol><li>Menü des Browsers öffnen (drei Punkte oben rechts).</li>" +
              "<li>„<strong>App installieren</strong>“ oder „<strong>Zum Startbildschirm hinzufügen</strong>“ wählen.</li>" +
              "<li>Mit „Installieren“ bestätigen.</li></ol>";
          }
          box.hidden = false;
        }
        window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; render(); });
        window.addEventListener("appinstalled", function () { box.hidden = true; });
        document.getElementById("ps-ih-close").onclick = function () {
          box.hidden = true;
          try { localStorage.setItem(KEY, String(Date.now() + 30 * 24 * 3600 * 1000)); } catch (e) {}
        };
        setTimeout(render, 2500); // erst nach dem Start einblenden
      })();

      // Service Worker: macht die Seite als App offline startbar (nur ueber https bzw. localhost)
      if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/tools/privacyshield-sw.js", { scope: "/tools/" }).catch(function () {});
        });
      }
    </script>
'''
rep('''  </body>
</html>''','''    '''+HINT.strip('\n')+'''
  </body>
</html>''')
open(P,'w',encoding='utf-8').write(s)
print('PWA-Patch angewendet')
