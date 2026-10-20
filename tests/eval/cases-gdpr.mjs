// Breiter DSGVO-Testsatz (Art. 4 Identifikatoren, Art. 9 besondere Kategorien, Art. 10 Strafdaten, Formatierungs- und
// Zeichenvarianten, europaeische Sprachen, Zugangsdaten). Eintrag: [id, Gruppe, Text, [Fragmente die NICHT bleiben duerfen], Profil].
// Gruppen mit "ART9"/"ART10" werden im Profil "Maximal" geprueft (Begriffslisten sind im Standardprofil bewusst aus).
// Neue Fehler immer zuerst hier als Fall anlegen (rot), dann beheben (gruen).
export const GDPR_RAW = [
  // ---- A: direkte Identifikatoren, Varianten
  ['a01','NAME-Reihenfolge','Müller, Hans (geb. Schmidt) wurde am Montag befragt.',['Müller','Hans','Schmidt']],
  ['a02','NAME-Reihenfolge','Von: Müller, Hans <hans.mueller@firma.de>\nAn: Weber, Anna',['Müller','Hans','Weber','Anna','hans.mueller@firma.de']],
  ['a03','NAME-Reihenfolge','MÜLLER, HANS\nGeschäftsführer der Beispiel GmbH',['MÜLLER','HANS']],
  ['a04','NAME-Titel','Dr. med. univ. Katharina Freifrau von und zu Hohenberg-Lindenau hat unterschrieben.',['Katharina','Hohenberg']],
  ['a05','NAME-Rufname','Alle nennen ihn nur "Hotte", eigentlich Horst Kleinschmidt aus Dortmund.',['Hotte','Kleinschmidt','Horst']],
  ['a06','NAME-Beziehung','Die Tochter von Herrn Lehmann, Sophie, besucht die 3b der Grundschule Am Park.',['Lehmann','Sophie']],
  ['a07','NAME-Anrede','Hallo Frau Schröder, danke für Ihre Nachricht. Gruß, Michael',['Schröder','Michael']],
  ['a08','NAME-Anrede','Lieber Thomas, anbei die Unterlagen. Viele Grüße Sabine',['Thomas','Sabine']],
  ['a09','NAME-Zeilenumbruch','Antragsteller: Maximilian\nFriedrich-Wilhelm Graf',['Maximilian','Graf']],
  ['a10','KONTAKT-Handle','Instagram: @max_mustermann, X: @mmustermann85, Telegram t.me/maxmuster',['max_mustermann','mmustermann85','maxmuster']],
  ['a11','KONTAKT-Obfuskation','Mail an max (at) firma (dot) de oder max[at]firma.de bitte.',['max (at) firma (dot) de','max[at]firma.de']],
  ['a12','KONTAKT-Obfuskation','Rufen Sie an: null eins sieben eins, eins zwei drei vier fünf sechs sieben.',['eins zwei drei vier']],
  ['a13','KONTAKT-Telefon','Handy privat: 0171-1234567 (nur WhatsApp), dienstl. +49 (89) 99 88 77-0',['1234567','99 88 77']],
  ['a14','KONTAKT-Telefon','Tel: 0 89 / 12 34 56 78 · Mobil 0049 171 7654321',['12 34 56 78','7654321']],
  ['a15','GERAET-ID','MAC 00:1A:2B:3C:4D:5E, IMEI 35-209900-176148-1, UUID 123e4567-e89b-12d3-a456-426614174000',['00:1A:2B:3C:4D:5E','35-209900-176148-1','123e4567-e89b-12d3-a456-426614174000']],
  ['a16','GERAET-ID','Seriennummer SN-2024-00417, Gerät-ID: AB12CD34EF56',['00417','AB12CD34EF56']],
  ['a17','STANDORT','Standort laut GPS: 48.137154, 11.576124 (Marienplatz).',['48.137154','11.576124']],
  ['a18','STANDORT','Koordinaten 48°08\'13.7"N 11°34\'34.0"E wurden gespeichert.',['48°08\'13.7"N']],
  ['a19','NUMMER-Kunde','Kundennummer: 4711-0815, Vertragsnummer VN-2024/009981, Mitarbeiter-Nr. 100245',['4711-0815','009981','100245']],
  ['a20','NUMMER-Kunde','Matrikelnummer 2019-345678, Versicherungsnummer 12-3456789-A-001',['345678','3456789']],
  ['a21','NUMMER-Ausweis','Reisepass C01X00T47, Führerschein B072RRE2I55, Personalausweis T22000129',['C01X00T47','B072RRE2I55','T22000129']],
  ['a22','NUMMER-Ausweis','Pass-Nr. 123456789 gültig bis 03.05.2031, ausgestellt in Hannover',['123456789']],
  ['a23','NUMMER-Steuer','Steuer-IdNr. 86095742719 und SV-Nr. 65 170839 J 008',['86095742719','170839']],
  ['a24','GEBURT','Max wurde am 3. Mai 1980 in Hannover geboren, 44 Jahre alt.',['3. Mai 1980','Hannover']],
  ['a25','GEBURT','Geburtsort: Bad Homburg v. d. Höhe, Geburtsname: Fröhlich',['Homburg','Fröhlich']],
  ['a26','GEHALT','Bruttogehalt: 4.250,00 EUR monatlich, Bonus 1.500 €, Pfändung 320,50 EUR',['4.250,00','1.500','320,50']],
  ['a27','FAMILIE','Verheiratet mit Petra, zwei Kinder (Luca, 7 und Mia, 4), ledig geboren Neumann.',['Petra','Luca','Mia','Neumann']],
  ['a28','NATION','Staatsangehörigkeit: türkisch, Aufenthaltstitel gültig bis 12.2026 (Nr. 12345678)',['12345678']],
  // ---- B: besondere Kategorien (Art. 9)
  ['b01','ART9-Gesundheit','Diagnose: Multiple Sklerose (G35), seit 2019 in Behandlung mit Ocrelizumab.',['G35','Ocrelizumab','Multiple Sklerose'],'strict'],
  ['b02','ART9-Gesundheit','Herr Becker ist vom 12.03. bis 26.03.2024 arbeitsunfähig (AU) wegen Bandscheibenvorfall.',['Becker','Bandscheibenvorfall'],'strict'],
  ['b03','ART9-Gesundheit','Schwerbehinderung GdB 60, Merkzeichen G, HIV-positiv seit 2015.',['GdB 60','HIV'],'strict'],
  ['b04','ART9-Gesundheit','Medikation: Metformin 1000 mg 1-0-1, Ramipril 5 mg, Sertralin 50 mg.',['Metformin','Ramipril','Sertralin'],'strict'],
  ['b05','ART9-Gesundheit','Die Patientin ist schwanger (12. SSW), Rhesusfaktor negativ.',['schwanger','12. SSW'],'strict'],
  ['b06','ART9-Religion','Konfession: römisch-katholisch, Kirchenaustritt am 01.02.2020.',['katholisch','Kirchenaustritt'],'strict'],
  ['b07','ART9-Religion','Er ist Mitglied der Zeugen Jehovas und lehnt Bluttransfusionen ab.',['Zeugen Jehovas'],'strict'],
  ['b08','ART9-Politik','Mitglied der Partei Die Linke seit 2012, Gewerkschaft ver.di Mitgliedsnr. 884422.',['Die Linke','ver.di','884422'],'strict'],
  ['b09','ART9-Herkunft','Herkunft: Roma aus Rumänien; ethnische Zugehörigkeit: kurdisch.',['Roma','kurdisch'],'strict'],
  ['b10','ART9-Sexualitaet','Er lebt in einer gleichgeschlechtlichen Partnerschaft mit Jonas.',['Jonas','gleichgeschlechtlichen'],'strict'],
  ['b11','ART9-Biometrie','Fingerabdruck-Hash 9f86d081884c7d659a2feaa0c55ad015 und DNA-Profil D3S1358.',['9f86d081884c7d659a2feaa0c55ad015'],'strict'],
  // ---- C: Strafdaten (Art. 10)
  ['c01','ART10-Straf','Verurteilt wegen Betrugs (Az. 12 Ds 345/23), Bewährung bis 2026.',['345/23','Betrugs'],'strict'],
  ['c02','ART10-Straf','Ermittlungsverfahren der Staatsanwaltschaft München I, Js 12345/24, gegen Herrn Aydin.',['12345/24','Aydin'],'strict'],
  ['c03','ART10-Straf','Bußgeldbescheid: 120 EUR und 2 Punkte in Flensburg, Tatzeit 14.05.2024 um 08:12 Uhr.',['2 Punkte'],'strict'],
  // ---- D: Formatierung / Zeichenvarianten
  ['d01','FORM-NBSP','IBAN DE89 3704 0044 0532 0130 00 bitte nutzen.',['3704']],
  ['d02','FORM-NBSP','Tel. +49 89 1234567 und E-Mail max@firma.de',['1234567','max@firma.de']],
  ['d03','FORM-Unicode','Müller wohnt in der Hauptstraße 5, 10115 Berlin',['Müller']],
  ['d04','FORM-Zeilenumbruch','IBAN: DE89 3704 0044\n0532 0130 00',['0532 0130']],
  ['d05','FORM-Tabelle','Name\tGeburtsdatum\tIBAN\nAnna Weber\t12.03.1985\tDE89 3704 0044 0532 0130 00\nPeter Klein\t01.07.1990\tAT61 1904 3002 3457 3201',['Anna Weber','Peter Klein','12.03.1985','01.07.1990','3704 0044','1904 3002']],
  ['d06','FORM-Tabelle','| Name | E-Mail | Telefon |\n| Lisa Braun | lisa.braun@x.de | 0151 2345678 |',['Lisa Braun','lisa.braun@x.de','2345678']],
  ['d07','FORM-OCR','IBAN DE89 37O4 OO44 O532 O13O OO und Tel. O17I 234567O',['37O4']],
  ['d08','FORM-Tippfehler','Hr. Mueler, wohnhaft Berlinn, Hauptsr. 5',['Mueler']],
  ['d09','FORM-Fussnote','Seite 2 von 5 | Müller GmbH | Vertraulich | Geschäftsführer: Dieter Hahn',['Hahn']],
  ['d10','FORM-Zitat','Er sagte: "Rufen Sie Frau Dr. Ellen Vogel unter 030 5551234 an."',['Vogel','5551234']],
  // ---- E: Fremdsprachen / EU
  ['e01','EN','Mr. John Smith, 12 Main Street, London SW1A 1AA, +44 20 7946 0958, NI number QQ 12 34 56 C.',['Smith','12 Main Street','SW1A 1AA','7946 0958','QQ 12 34 56 C']],
  ['e02','FR','Madame Claire Dubois, 15 rue de la Paix, 75002 Paris, tél. +33 1 42 68 53 00.',['Dubois','15 rue de la Paix','75002','42 68 53 00']],
  ['e03','IT','Sig. Marco Rossi, codice fiscale RSSMRC85T10A562S, via Roma 10, 00184 Roma.',['Rossi','RSSMRC85T10A562S','via Roma 10']],
  ['e04','PL','Jan Kowalski, PESEL 44051401359, ul. Marszałkowska 12, 00-001 Warszawa.',['Kowalski','44051401359','Marszałkowska 12']],
  ['e05','ES','Carlos García, DNI 12345678Z, calle Mayor 5, 28013 Madrid.',['García','12345678Z','calle Mayor 5']],
  // ---- F: Passwoerter / Geheimnisse
  ['f01','SECRET','Zugangsdaten: Benutzer: mmustermann, Passwort: Hund#2024!x, API-Key sk-live-4f8a9c2b1d7e',['mmustermann','Hund#2024!x','sk-live-4f8a9c2b1d7e']],
  ['f02','SECRET','Link zum Zurücksetzen: https://portal.firma.de/reset?token=a8f5f167f44f4964e6c998dee827110c',['a8f5f167f44f4964e6c998dee827110c']],
  // ---- G: Negativfaelle (nichts maskieren)
  ['n01','NEG','Die Sitzung dauerte 90 Minuten; es wurden 12 Tagesordnungspunkte behandelt.',[]],
  ['n02','NEG','Version 2.4.1 wurde am Freitag veröffentlicht (Build 20240315).',[]],
  ['n03','NEG','Gemäß Art. 9 Abs. 2 lit. a DSGVO ist eine ausdrückliche Einwilligung erforderlich.',[]],
  ['n04','NEG','Der Umsatz stieg um 12,5 Prozent auf 3,2 Millionen Euro.',[]],
  ['n05','NEG','Bitte beachten: Die Hotline ist montags bis freitags von 8 bis 18 Uhr erreichbar.',[]],
];

// Einheitliches Format wie cases.mjs: Kategorie "G-<Gruppe>", Id mit "g" davor (keine Kollision mit cases.mjs)
export const GDPR = GDPR_RAW.map(([id, grp, text, frags, profile]) => {
  const head = grp.split('-')[0];
  const cat = grp === 'NEG' ? 'NEG' : 'G-' + (['EN', 'FR', 'IT', 'PL', 'ES'].includes(head) ? 'AUSLAND' : head);
  return ['g' + id, cat, text, frags, profile];
});
