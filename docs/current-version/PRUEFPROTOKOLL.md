# Aktuelle Online-Fassung und Versionsanzeige

Anschluss an #11 und Website-PR #9. Abgleich: Source main a16ca4001c3c3c5cf5490ae289b0f2a456a59bd0, Website main 74a10b6993ee67107d84d2549cab6c785b693ec8. Nur die Browser-Hülle und deren Prüfungen geändert; die installierbare App entspricht weiterhin dem unveränderten Tag v2.0.2.

Die Online-Beta ist die aktuelle Browser-Fassung. Titel und sichtbare Überschrift übernehmen die echte Paketversion aus package.json; keine unabhängig gepflegte Versionszahl. Sichtbarer Hinweis: Beta, Fehler möglich, Ergebnisse vor Weitergabe prüfen. Die frühere Webfassung bleibt nachrangig erreichbar.

Prüfung: web-beta.test.mjs und version-label.test.mjs, 16/16 bestanden. Die Browser-Hülle, der Werkzeug-Fußbereich und die echte Electron-App zeigen die Paketversion 2.0.2. Der Verarbeitungsnachweis meldet dieselbe Version. Erstbesuch, Mobilbreiten 360/390, KI-Startzustand, Netzpolitik und Browser-Verarbeitung bleiben geprüft. Rohprotokoll im Unterordner.

Windows- und Linux-Paketprüfungen für v2.0.2 bestanden. Der erste Mac-Lauf erhielt wegen GitHub-Kapazitätsmangel keinen Runner und wurde unverändert erneut gestartet. Veröffentlichung erst nach erfolgreicher vollständiger Paketprüfung; keine Teilveröffentlichung und kein Verschieben des Tags.
