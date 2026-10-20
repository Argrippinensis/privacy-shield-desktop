# Patch fuer src/desktop/index.html (arcangeli-website): feste Download-Links (releases/latest/download/<Name>),
# macOS in zwei Varianten, ehrlichere Texte, keine Versionsnummer mehr im Text.
#   python3 -I desktop_page_patch.py [Pfad zu src/desktop/index.html]
import sys, re
P = sys.argv[1] if len(sys.argv) > 1 else 'src/desktop/index.html'
s = open(P, encoding='utf-8').read()
REPO = 'https://github.com/Argrippinensis/privacy-shield-desktop/releases'
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: print(f'FEHLER {n}!={count}: {old[:90]!r}'); sys.exit(1)
    s = s.replace(old, new)

# 1) Kein Versionslabel mehr (veraltet sonst bei jedem Release)
rep('PRIVACYSHIELD DESKTOP · v1.7.0</p>', 'PRIVACYSHIELD DESKTOP</p>')
# 2) Hero-Text: stimmt jetzt (alles lokal), "keine Installation" war falsch (es gibt einen Installer)
rep('Dokumente anonymisieren ohne jede Netzverbindung. Keine Cloud, kein Tracking, keine Installation im klassischen Sinne — das Programm läuft direkt aus dem Arbeitsspeicher.',
    'Dokumente anonymisieren ohne jede Netzverbindung. Keine Cloud, kein Tracking: Die gesamte Verarbeitung, auch KI-Erkennung und Texterkennung, läuft lokal auf Ihrem Rechner.')
# 3) Links
rep(f'{REPO}/download/v1.7.0/PrivacyShield-Setup-1.7.0.exe', f'{REPO}/latest/download/PrivacyShield-Setup.exe')
rep(f'{REPO}/download/v1.7.0/PrivacyShield-1.7.0.AppImage', f'{REPO}/latest/download/PrivacyShield.AppImage')
# macOS: ein Knopf -> zwei (Apple Silicon / Intel). Den vorhandenen Anker als Vorlage nehmen.
m = re.search(r'<a href="' + re.escape(f'{REPO}/download/v1.7.0/PrivacyShield-1.7.0.zip') + r'".*?</a>', s, re.S)
if not m: print('FEHLER: macOS-Anker nicht gefunden'); sys.exit(1)
anchor = m.group(0)
arm = anchor.replace(f'{REPO}/download/v1.7.0/PrivacyShield-1.7.0.zip', f'{REPO}/latest/download/PrivacyShield-mac-arm64.zip').replace('macOS (.zip)', 'macOS (Apple Silicon)').replace('title="macOS-Version herunterladen"', 'title="macOS-Version fuer Apple Silicon (M1 bis M5) herunterladen"')
intel = anchor.replace(f'{REPO}/download/v1.7.0/PrivacyShield-1.7.0.zip', f'{REPO}/latest/download/PrivacyShield-mac-x64.zip').replace('macOS (.zip)', 'macOS (Intel)').replace('title="macOS-Version herunterladen"', 'title="macOS-Version fuer Intel-Macs herunterladen"')
if 'macOS (.zip)' in arm or 'v1.7.0' in arm: print('FEHLER: macOS-Vorlage unerwartet'); sys.exit(1)
s = s.replace(anchor, arm + intel)
# Weitere Formate / Pruefsummen (Hero-Zeile) und Hinweis zum .deb-Paket: Links auf "latest" statt auf ein festes Tag
TAGLINK = f'<a href="{REPO}/tag/v1.7.0" style="color:#1a3a5c;text-decoration:none" target="_blank" rel="noopener">GitHub Releases ↗</a>'
rep('Alle Plattformen · Weitere Formate auf ' + TAGLINK, 'Alle Plattformen · Weitere Formate auf ' + TAGLINK.replace('/tag/v1.7.0', '/latest') + f' · <a href="{REPO}/latest/download/SHA256SUMS.txt" style="color:#1a3a5c;text-decoration:none">Prüfsummen</a>')
rep(f'{REPO}/tag/v1.7.0', f'{REPO}/latest', s.count(f'{REPO}/tag/v1.7.0'))
# 4) Dateinamen in den Anleitungen
rep('PrivacyShield-Setup-1.7.0.exe</code>', 'PrivacyShield-Setup.exe</code>')
rep('chmod +x PrivacyShield-1.7.0.AppImage', 'chmod +x PrivacyShield.AppImage')
rep('./PrivacyShield-1.7.0.AppImage', './PrivacyShield.AppImage')
# 5) macOS-Anleitung: richtige ZIP-Datei waehlen
rep('Die heruntergeladene <code style="font-size:11px;background:#f0f0f0;padding:1px 4px;border-radius:3px">.zip</code>-Datei per Doppelklick entpacken.',
    'Die heruntergeladene <code style="font-size:11px;background:#f0f0f0;padding:1px 4px;border-radius:3px">.zip</code>-Datei per Doppelklick entpacken. Welche Version? Apple-Menü → „Über diesen Mac“: „Chip Apple M…“ = Apple Silicon, „Prozessor Intel…“ = Intel.')
assert 'v1.7.0' not in s and '1.7.0' not in s, 'Versionsreste: ' + str(re.findall(r'.{30}1\.7\.0.{20}', s)[:3])
open(P, 'w', encoding='utf-8').write(s)
print('Download-Seite angepasst')
