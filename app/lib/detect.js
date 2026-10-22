// Erkennungskern von PrivacyShield (F1.a): reines Modul ohne Oberflaechenzugriff.
// Die Bloecke Daten/Regeln/Profile, Wortlisten-Erkennung, Kern und Platzhaltervergabe sind aus app/privacy-shield.html (1.8.0)
// kopiert; Funktionskoerper unveraendert. Parametrisiert wird nur ueber opts (siehe detect/anonymize unten).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.detect = root.PSDetect = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Kontext des laufenden (synchronen) Aufrufs; wird in detect()/anonymize() gesetzt und danach geleert
  let store = {},
    cnt = {},
    cvars = [],
    whitelist = [],
    extraSpans = [],
    activeEnts = new Set(),
    aiCache = { key: null, spans: [] };

      const SENSITIVE_WORDS = [
        // Gesundheit: Krankheiten und Zustaende
        "Diabetes", "Krebs", "Karzinom", "Tumor", "Leukämie", "Lymphom", "Melanom", "Metastase", "Multiple Sklerose", "Parkinson",
        "Alzheimer", "Demenz", "Epilepsie", "Depression", "Burnout", "Angststörung", "Panikattacke", "Schizophreni", "Psychose",
        "Posttraumatische", "Autismus", "Hepatitis", "Tuberkulose", "Herzinfarkt", "Schlaganfall", "Herzinsuffizienz", "Bluthochdruck",
        "Asthma", "Rheuma", "Arthrose", "Bandscheibenvorfall", "Osteoporose", "Migräne", "Chemotherapie", "Strahlentherapie",
        "Dialyse", "Fehlgeburt", "Abtreibung", "Schwangerschaftsabbruch", "Unfruchtbarkeit", "Alkoholismus", "Alkoholabhängigkeit",
        "Drogenabhängigkeit", "Suchterkrankung", "Suizid", "Selbstmord", "Essstörung", "Anorexie", "Bulimie", "Schwerbehinderung",
        "Pflegegrad", "Arbeitsunfähigkeit", "arbeitsunfähig", "Krankschreibung", "Neurodermitis", "Endometriose", "Mukoviszidose",
        "Hämophilie", "Morbus", "schwanger", "Schwangerschaft",
        // Gesundheit: Wirkstoffe und Praeparate (Auswahl)
        "Metformin", "Insulin", "Ramipril", "Sertralin", "Citalopram", "Escitalopram", "Fluoxetin", "Venlafaxin", "Duloxetin",
        "Amitriptylin", "Mirtazapin", "Quetiapin", "Olanzapin", "Risperidon", "Aripiprazol", "Clozapin", "Haloperidol", "Lithium",
        "Methylphenidat", "Ritalin", "Lorazepam", "Diazepam", "Tavor", "Valium", "Zolpidem", "Oxycodon", "Morphin", "Fentanyl",
        "Methadon", "Tramadol", "Levothyroxin", "Bisoprolol", "Metoprolol", "Amlodipin", "Simvastatin", "Atorvastatin", "Pantoprazol",
        "Omeprazol", "Marcumar", "Phenprocoumon", "Xarelto", "Rivaroxaban", "Eliquis", "Apixaban", "Prednisolon", "Cortison",
        "Humira", "Adalimumab", "Ocrelizumab", "Interferon", "Truvada", "Biktarvy", "Tamoxifen", "Letrozol", "Cisplatin",
        "Methotrexat", "Gabapentin", "Pregabalin", "Levodopa", "Donepezil", "Lamotrigin", "Valproat", "Carbamazepin",
        "Levetiracetam", "Naltrexon", "Buprenorphin",
        // Religion und Weltanschauung
        "katholisch", "evangelisch", "evangelisch-lutherisch", "ev.-luth.", "muslimisch", "Muslim", "islamisch", "jüdisch",
        "Judentum", "buddhistisch", "hinduistisch", "Zeugen Jehovas", "Mormonen", "Freikirche", "Konfession", "Kirchenaustritt",
        "Kirchenmitglied", "Atheist", "konfessionslos",
        // Politik und Gewerkschaft
        "Die Linke", "Die Grünen", "Bündnis 90", "Freie Wähler", "Piratenpartei", "Parteimitglied", "Parteieintritt", "ver.di",
        "IG Metall", "IG BCE", "IG BAU", "Gewerkschaftsmitglied", "Gewerkschaftszugehörigkeit",
        // Herkunft
        "kurdisch", "türkischstämmig", "Migrationshintergrund", "Hautfarbe", "Asylbewerber", "Spätaussiedler", "Sinti",
        // Sexualleben
        "homosexuell", "schwul", "lesbisch", "bisexuell", "transgender", "transsexuell", "gleichgeschlechtlich", "Sexualleben",
        "sexuelle Orientierung", "intersexuell",
        // Strafdaten
        "verurteilt", "Verurteilung", "vorbestraft", "Vorstrafe", "Straftat", "Ermittlungsverfahren", "Strafverfahren",
        "Strafbefehl", "Haftstrafe", "Freiheitsstrafe", "Bewährung", "Untersuchungshaft", "Inhaftierung", "Strafanzeige",
        "Betrug", "Diebstahl", "Körperverletzung", "Unterschlagung", "Steuerhinterziehung", "Bußgeldbescheid", "Führungszeugnis",
        "Strafregister",
        // Biometrie und Genetik
        "Fingerabdruck", "Gentest", "genetisch", "Iris-Scan", "Gesichtserkennung", "Stimmprofil", "biometrisch",
      ];
      // Kurzformen: nur exakt (Grossschreibung), ohne Endungen
      const SENSITIVE_EXACT = ["HIV", "AIDS", "ADHS", "PTBS", "COPD", "DNA", "CDU", "CSU", "SPD", "FDP", "AfD", "BSW", "GEW", "EVG", "NGG", "DGB", "GdP"];
      const SENSITIVE_RX = [
        new RegExp(
          "(?<![A-Za-z0-9_\\u00C0-\\u024F])(?:" +
            SENSITIVE_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ \\t]+")).join("|") +
            ")[A-Za-zäöüß]*",
          "gi",
        ),
        new RegExp("(?<![A-Za-z0-9_\\u00C0-\\u024F])(?:" + SENSITIVE_EXACT.join("|") + ")(?![A-Za-z0-9_\\u00C0-\\u024F])", "g"),
        /\bGdB[ \t]?\d{2,3}\b/g,
        /\b\d{1,2}\.[ \t]?SSW\b/g,
        /\b\d{1,2}[ \t]+Punkte?[ \t]+in[ \t]+Flensburg\b/gi,
      ];
      const ENTS = [
        {
          id: "email",
          lbl: "E-Mail-Adressen",
          desc: "Alle Formate",
          col: "#06b6d4",
          on: true,
          pfx: "EMAIL",
          rx: [
            /(?<![a-zA-Z0-9._%+\-])([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
            /(?<![a-zA-Z0-9._%+\-])([a-zA-Z0-9._%+\-]+[ \t]*(?:\(at\)|\[at\]|\{at\}|\(ät\)|\[ät\])[ \t]*[a-zA-Z0-9\-]+(?:[ \t]*(?:\(dot\)|\[dot\]|\(punkt\)|\.)[ \t]*[a-zA-Z0-9\-]+)*[ \t]*(?:\(dot\)|\[dot\]|\(punkt\)|\.)[ \t]*[a-zA-Z]{2,})/g,
          ],
        },
        {
          id: "iban",
          lbl: "IBAN / Bankdaten",
          desc: "IBAN, Kontonummer, BLZ",
          col: "#10b981",
          on: true,
          pfx: "IBAN",
          rx: [
            /\b([A-Za-z]{2}\d{2}[ \t]{1,3}[A-Za-z0-9]{4}(?![A-Za-z0-9])(?:[ \t]{1,3}(?=[A-Za-z0-9]{0,3}\d)[A-Za-z0-9]{4}(?![A-Za-z0-9])){1,6}(?:[ \t]{1,3}[\dO]{1,4}(?![A-Za-z0-9]))?)/g,
            /\b([A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30})\b/g,
            /(Konto(?:nummer|nr\.?)?[\s:]+[\d\s]{6,18}\d)/gi,
            /((?:BLZ|Bankleitzahl)[\s:]+\d{8})/gi,
          ],
        },
        {
          id: "card",
          lbl: "Kreditkartennummern",
          desc: "Visa, Mastercard, Amex u. a. (Prüfziffer wird geprüft)",
          col: "#059669",
          on: true,
          pfx: "KARTE",
          rx: [/\b((?:\d{4}[ \-]){3}\d{1,7}|\d{4}[ \-]\d{6}[ \-]\d{5}|\d{13,19})\b/g],
        },
        {
          id: "device",
          lbl: "Geräte-Kennungen",
          desc: "MAC-Adresse, IMEI, UUID, Seriennummern",
          col: "#475569",
          on: true,
          pfx: "GERAET",
          rx: [
            /(?<![0-9A-Fa-f:\-])((?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2})(?![0-9A-Fa-f:\-])/g,
            /(?<![\d\-])(\d{2}[ \-]?\d{6}[ \-]?\d{6}[ \-]?\d)(?![\d\-])/g,
            /\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/g,
            /(?=[A-Za-z0-9])(?<=(?:Seriennummer|Serien-?Nr\.?|Gerät(?:e)?-?ID|Device-?ID|Geräte-?Nr\.?|IMEI|Chassis-?Nr\.?)[ \t:#]{0,1000})([A-Za-z0-9][A-Za-z0-9\-\/\.]{3,24})/g,
          ],
        },
        {
          id: "account",
          lbl: "Benutzerkonten & Zugangsdaten",
          desc: "Benutzernamen, @-Handles, Passwörter, API-Schlüssel, Token",
          col: "#dc2626",
          on: true,
          pfx: "KONTO",
          rx: [
            /(?<![\w@.\/])(@[A-Za-z0-9_]{3,30})(?![\w@])/g,
            /(?<![\w@.\/-])((?:t\.me|wa\.me|linkedin\.com\/in|instagram\.com|facebook\.com|x\.com|twitter\.com|xing\.com\/profile|tiktok\.com\/@)\/[A-Za-z0-9_.\-\/]{2,60})/gi,
            /(?=[A-Za-z0-9._\-@])(?<=(?:Benutzer(?:name)?|User(?:name)?|Login|Nutzername|Account|Kennung)[ \t]{0,1000}[:=][ \t]{0,1000})([A-Za-z0-9._\-@]{3,40})/g,
            /(?=\S)(?<=(?:Passwort|Kennwort|Password|Passphrase|PIN|TAN|Zugangscode|Zugangsnummer)[ \t]{0,1000}[:=]?[ \t]{0,1000})(\S{4,64})/gi,
            /\b((?:sk|pk|rk|api|key|tok|secret|ghp|gho|xox[abp])[-_][A-Za-z0-9_\-]{12,64})\b/g,
            /\b(eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,})\b/g,
            /\b([0-9a-fA-F]{32}|[0-9a-fA-F]{40}|[0-9a-fA-F]{64})\b/g,
          ],
        },
        {
          id: "geo",
          lbl: "Standortdaten",
          desc: "GPS-Koordinaten (Dezimalgrad, Grad/Minuten/Sekunden)",
          col: "#0d9488",
          on: true,
          pfx: "STANDORT",
          rx: [
            /(?<![\d.])(-?\d{1,2}\.\d{4,8}[ \t]*[,;][ \t]*-?\d{1,3}\.\d{4,8})(?![\d.])/g,
            /(\d{1,3}°[ \t]?\d{1,2}['′][ \t]?\d{1,2}(?:[.,]\d+)?["″]?[ \t]?[NSOEW][ \t,;]*\d{1,3}°[ \t]?\d{1,2}['′][ \t]?\d{1,2}(?:[.,]\d+)?["″]?[ \t]?[NSOEW])/g,
          ],
        },
        {
          id: "intlid",
          lbl: "Ausländische Kennungen",
          desc: "Codice fiscale, PESEL, DNI/NIE, UK National Insurance, AHV, Postleitzahlen (UK, PL, NL)",
          col: "#7c3aed",
          on: true,
          pfx: "KENNNR",
          rx: [
            /\b([A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z])\b/g,
            /(?=\d)(?<=PESEL[ \t:]{0,1000})(\d{11})\b/gi,
            /\b(\d{8}[A-HJ-NP-TV-Z]|[XYZ]\d{7}[A-HJ-NP-TV-Z])\b/g,
            /\b([A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z][ ]?\d{2}[ ]?\d{2}[ ]?\d{2}[ ]?[A-D])\b/g,
            /\b(756\.\d{4}\.\d{4}\.\d{2})\b/g,
            /\b([A-Z]{1,2}\d[A-Z\d]?[ ]?\d[A-Z]{2})\b/g,
            /(?=[A-Z0-9])(?<=(?:NIE|DNI|NIF|BSN|Burgerservicenummer|AHV-?Nr\.?|Sozialversicherungsnummer)[ \t:]{0,1000})([A-Z0-9][A-Z0-9.\- ]{6,16})/g,
          ],
        },
        {
          id: "bic",
          lbl: "BIC / SWIFT-Codes",
          desc: "Bankidentifikationscodes (8–11 Zeichen)",
          col: "#0ea5e9",
          on: true,
          pfx: "BIC",
          rx: [
            /(?=[A-Z])(?<=\b(?:BIC|SWIFT(?:-?Code)?|Bankkennung|Bankidentifikationscode)\s{0,1000}[:\-]?\s{0,1000})([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g,
            /\b([A-Z]{4}(?:AD|AE|AT|AU|BE|BG|BR|CA|CH|CY|CZ|DE|DK|EE|EG|ES|FI|FR|GB|GR|HR|HU|ID|IE|IL|IN|IS|IT|JP|KR|LI|LT|LU|LV|MT|MX|MY|NL|NO|NZ|PL|PT|RO|RS|RU|SA|SE|SG|SI|SK|TH|TR|TW|UA|US|ZA)[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g,
          ],
        },
        {
          id: "phone",
          lbl: "Telefonnummern",
          desc: "Tel., Fax, Mobil — alle deutschen Formate",
          col: "#f97316",
          on: true,
          pfx: "TEL",
          rx: [
            /((?:Tel(?:efon)?\.?(?:[ \-]?(?:Nr|Nummer)\.?)?|Fon|Fax|Mobil(?:e|funk)?|Handy|Rufnummer|Durchwahl|Zentrale)[\s:\.]*(?:\+|00)?\d[\d\s\-\(\)\/\.]{6,24})/gi,
            /(?<![\d\w])((?:\+|00(?=[1-9]))\d{1,3}[ \t\-\.]?(?:\(0\)[ \t\-\.]?)?\(?\d{1,5}\)?(?:[ \t\-\.\/]?\d{2,8}){1,3})(?!\d)/g,
            /(?<![\d\/\-\.])(\(?0[1-9]\d{1,4}\)?[ \t\/\-\.]?\d{2,10}(?:[ \t\-\.]\d{1,6}){0,3})(?!\d)/g,
            /\b((?:(?:null|eins|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)[ ,\-]+){6,}(?:null|eins|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun))\b/gi,
          ],
        },
        {
          id: "money",
          lbl: "Geldbeträge",
          desc: "EUR, USD, CHF, GBP",
          col: "#14b8a6",
          on: true,
          pfx: "BETRAG",
          rx: [
            /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:EUR|Euro|€|USD|\$|CHF|GBP|£))/g,
            /((?:EUR|€|USD|\$|CHF|GBP|£)\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,
          ],
        },
        {
          id: "date",
          lbl: "Geburts- & Vertragsdaten",
          desc: "Geburtstag, Vertragsdatum, Fristen",
          col: "#ec4899",
          on: true,
          pfx: "DATUM",
          rx: [
            /((?:geb(?:oren)?\.?|Geburtsdatum|geboren am|geb\. am)[\s:]*\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})/gi,
            /\b(\d{1,2}\.\d{1,2}\.(?:19|20)\d{2})\b/g,
            /\b(\d{4}-\d{2}-\d{2})\b/g,
            /\b(\d{1,2}\/\d{1,2}\/(?:19|20)\d{2})\b/g,
            /\b(\d{1,2}\.?[ \t]+(?:Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan\.|Feb\.|Mär\.|Apr\.|Jun\.|Jul\.|Aug\.|Sept?\.|Okt\.|Nov\.|Dez\.|January|February|March|May|June|July|October|December)[ \t]+(?:19|20)\d{2})\b/g,
          ],
        },
        {
          id: "taxid",
          lbl: "Steuer-, Ausweis- & Wertpapiernummern",
          desc: "StNr, USt-ID, WKN, ISIN, Aktenzeichen, HR",
          col: "#84cc16",
          on: true,
          pfx: "KENNNR",
          rx: [
            /((?:Steuer(?:nummer|-?nr\.?|-?id(?:nr\.?)?|liche[rn]?[ \t]+Identifikationsnummer)|Identifikationsnummer|IdNr\.?|StNr\.?|St\.-?Nr\.?|TIN)(?:[ \t]+(?:lautet|ist|war))?[ \t:]*[\d \t\/\-]{8,18})/gi,
            /((?:USt\.?-?Id(?:Nr\.?)?|Umsatzsteuer-?ID|VAT)[\s:]*[A-Z]{0,2}\d{7,12})/gi,
            /((?:Personalausweis(?:nummer)?|Reisepass(?:nummer)?|Ausweis(?:nummer)?|Pass-?Nr\.?|Führerschein(?:nummer)?|FS-?Nr\.?|Aufenthaltstitel(?:-?Nr\.?)?)[ \t:]*[A-Z0-9]{6,14})/gi,
            /(?=[A-Za-z0-9])(?!(?:lautet|ist|war|sind)\b)(?<=(?:Kunden|Vertrags|Mitarbeiter|Personal|Matrikel|Versicherungs|Policen|Mandanten|Patienten|Fall|Antrags|Referenz|Bestell|Konto|Teilnehmer|Mitglieds|Lizenz|Buchungs|Sendungs|Ticket)-?(?:nummer|nr\.?|no\.?|id)(?:[ \t]{1,1000}(?:lautet|ist|war))?[ \t:#]{0,1000})([A-Za-z0-9][A-Za-z0-9\-\/\.]{3,24})/gi,
            /(HR[AB]\s*(?:Nr\.?\s*)?\d{3,8})/g,
            /((?:Aktenzeichen|Az\.?)[\s:]+(?:\d{1,4}\s+[A-Z]{1,5}\s+)?[\w\/\.\-]{2,30})/g,
            /\b(\d{1,3}\s+[A-Z]{1,5}\s+\d{3,6}\/\d{2,4})\b/g,
            /\b(\d{1,3}[ \t]?(?:Js|Ds|Cs|Gs|Ls|Ns|OWi|StVK|KLs|VRs)[ \t]?\d{1,6}\/\d{2})\b/g,
            /\b((?:Js|Ds)[ \t]?\d{1,6}\/\d{2})\b/g,
            /((?:Sozialversicherungs(?:nummer|nr\.?)?|SV-?(?:Nr|Nummer)\.?|Rentenversicherungs(?:nummer|nr\.?)|RVNR|SVNR)[ \t:]*\d{2}[ \t\-]?\d{6}[ \t\-]?[A-Z][ \t]?\d{3})/gi,
            /((?:ISIN|WKN)[\s:]+[A-Z0-9]{6,12})/gi,
            /(Steuerberater(?:-?Nr\.?|nummer)[\s:]*[\d\/\-]{5,15})/gi,
            /(PZN[ \t:]*\d{7,8})/gi,
            /((?:Versicherten(?:nummer|-Nr\.?)|Versicherten-?Nr\.?|Mitglieds-?Nr\.?|KV-Karte-Nr\.?|Betriebsstätten-?Nr\.?)[ \t:]*[A-Z0-9\-]{5,20})/gi,
            /\b(SN-\d{4}-\d{4,5})\b/g,
            /\b([A-Z]{3,4}-\d{4,5}-\d{4,5})\b/g,
            /\b([A-Z]{2,4}-[A-Z]{2}-\d{5}-\d{4})\b/g,
          ],
        },
        {
          id: "org",
          lbl: "Firmen & Organisationen",
          desc: "GmbH, AG, KG, Kanzleien, Praxen",
          col: "#8b5cf6",
          on: true,
          pfx: "ORG",
          rx: [
            /(?<![A-Za-z0-9_À-ɏ])([A-ZÜÄÖ][A-Za-züäöÄÖÜß&\.\-]{1,30}(?:[ \t]+[A-Za-züäöÄÖÜß&\.\-]{1,30}){0,4}[ \t]+(?:GmbH(?:[ \t]*&[ \t]*Co\.?[ \t]*KG)?|AG|KGaA|KG|OHG|GbR|UG(?:[ \t]*\(haftungsbeschränkt\))?|e\.V\.|eG|SE|Stiftung|Ltd\.?|Inc\.?|Corp\.?|PartG|PartGmbB|Partnerschaft))\b/g,
            /((?:Kanzlei|Rechtsanwaltskanzlei|Steuerberatung|Wirtschaftsprüfung|Notariat|Notarkanzlei|Praxis|Arztpraxis)[ \t]+[A-ZÜÄÖ][A-Za-züäöß &\.\-]{2,50})/g,
            /((?:Amtsgericht|Landgericht|Oberlandesgericht|Bundesgerichtshof|Verwaltungsgericht|Finanzgericht|Sozialgericht|Arbeitsgericht)[ \t]+[A-ZÜÄÖ][a-züäöß \-]{2,35})/g,
            /((?:Finanzamt|Bundesministerium|Bundesamt|Landesamt|Stadtverwaltung)[ \t]+(?:der|des|für|von)?[ \t]*[A-ZÜÄÖ][A-Za-züäöß \-]{2,40})/g,
            /((?:Universität|Fachhochschule|Klinikum|Krankenhaus|Stadtsparkasse|Kreissparkasse|Sparkasse|Volksbank|Raiffeisenbank|IHK|Rechtsanwaltskammer|Ärztekammer|Reha-Klinik|Apotheke|Sanitätshaus)[ \t]+[A-ZÜÄÖ][A-Za-züäöß \-]{3,40})/g,
          ],
        },
        {
          id: "addr",
          lbl: "Adressen",
          desc: "Straße, Hausnummer, PLZ, Ort",
          col: "#3b82f6",
          on: true,
          pfx: "ADRESSE",
          rx: [
            /(?=[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ])(?<=(?:Geburtsort|Wohnort|Standort|Einsatzort|Tatort)[ \t]{0,1000}[:=][ \t]{0,1000})([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ.\- ]{2,40}?)(?=[,;\n]|$)/g,
            /(\b\d{1,4}[a-z]?,?[ \t]+(?:rue|avenue|boulevard|av\.|bd|impasse|chemin)[ \t]+(?:de[ \t]+(?:la[ \t]+)?|du[ \t]+|des[ \t]+)?[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ' \-]{2,30})/g,
            /(\b(?:via|viale|piazza|corso|vicolo)[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ' \-]{2,30}?[ \t]+\d{1,4}[a-z]?)/g,
            /(\b(?:calle|avenida|paseo|plaza|c\/)[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ' \-]{2,30}?[ \t]+\d{1,4})/g,
            /(\bul\.[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ' \-]{2,30}?[ \t]+\d{1,4}[a-z]?)/g,
            /(\b\d{1,4}[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)?[ \t]+(?:Street|Road|Lane|Avenue|Drive|Way|Close|Square|Gardens)\b)/g,
            /(\b\d{2}-\d{3}[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}|(?=\d)(?<=,[ \t]{0,1000})\d{5}[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?=[ \t]*(?:\.|$)))/g,
            /(?:(?![A-Za-zäöüß\.\-])|(?<![A-ZÄÖÜ][A-Za-zäöüß\.\-]{0,100}))([A-ZÄÖÜ][A-Za-zäöüß\.\-]+(?:[ \t]+[A-Za-zäöüß\.\-]+){0,3}[ \t]+\d+\s*[a-z]?(?:\s*[\-–\/]\s*\d+[a-z]?)?\s*,\s*(?:[A-Z]{1,2}-)?\d{4,5}[ \t]+[A-ZÄÖÜ][a-zäöüß\-]+(?:[ \t]+[A-ZÄÖÜ][a-zäöüß\-]+)?)/g,
            /(?<![a-zA-ZüäöÜÄÖ][a-züäöß \-]{0,100})([A-ZÜÄÖ][a-züäöß \-]+(?:stra(?:ß|ss)e|str\.|gasse|weg|allee|platz|ring|damm|chaussee|ufer|promenade|pfad|steig)[ \t]+\d+[a-z]?(?:[ \t]*[\-–\/][ \t]*\d+[a-z]?)?)/gi,
            /(\b\d{5}[ \t]+[A-ZÜÄÖ][a-züäöß \-]{2,28})\b/g,
            /(\b[A-Z]{1,2}-\d{4}[ \t]+[A-ZÜÄÖ][a-züäöß\-]{2,25})\b/g,
          ],
        },
        {
          id: "vehicle",
          lbl: "Kfz-Kennzeichen & Fahrgestellnummern",
          desc: "Amtliche Kennzeichen, FIN/VIN",
          col: "#64748b",
          on: true,
          pfx: "KFZ",
          rx: [
            /(?=[A-ZÄÖÜ])(?<=(?:Kennzeichen|Kfz-Kennzeichen|Fahrzeug|Pkw|PKW|Lkw|LKW)[ \t:]{0,1000})([A-ZÄÖÜ]{1,3}[ \t\-]{1,2}[A-Z]{1,2}[ \t\-]?\d{1,4}[EH]?)\b/g,
            /\b((?!DIN|ISO|ENV|SAE|TÜV|ICD|ITU|RFC|BGB|SGB|StGB|ZPO|HGB|AEO|EN)[A-ZÄÖÜ]{1,3}-[A-Z]{1,2}[ \t]?\d{1,4}[EH]?)\b/g,
            /(?=[A-HJ-NPR-Z0-9])(?<=(?:Fahrgestellnummer|FIN|VIN)[ \t:\.]{0,1000})([A-HJ-NPR-Z0-9]{17})\b/g,
            /\b([A-HJ-NPR-Z][A-HJ-NPR-Z0-9]{10}\d{6})\b/g,
          ],
        },
        {
          id: "name",
          lbl: "Personen-Namen",
          desc: "Vor-/Nachname, Titel, Anrede",
          col: "#f59e0b",
          on: true,
          pfx: "NAME",
          rx: [
            /(?:Herr|Frau|Hr\.|Fr\.)[ \t]+((?:(?:Dr|Prof|Ing|Mag|med|jur|habil|dent|vet|rer|nat|Dipl(?:\.-?(?:Ing|Kfm|Jur|Phys|Math|Biol|Chem|Psych|Soz|Päd|Theol|Arch|Inform))?|LL\.M|MBA|MSc|M\.Sc\.|MA|M\.A\.|BSc|B\.Sc\.|BA|B\.A\.|PhD|MD|RA|RAin|StB|WP|Notar(?:in)?)\.?[ \t]+)*(?:(?:von|van|de|zu|zur|vom|ter|ten|di|da|le|la|bin|ibn)(?:[ \t]+(?:der|den|dem|la|los))?[ \t]+)?[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]?[a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)*(?:[ \t]+[A-Z]\.)?(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]?[a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)*){0,3})/g,
            /((?:(?:Dr|Prof|Ing|Mag|med|jur|habil|dent|vet|rer|nat|Dipl(?:\.-?(?:Ing|Kfm|Jur|Math|Phys|Biol|Chem|Psych|Soz|Päd|Theol|Arch|Inform))?|LL\.M|MBA|MSc|M\.Sc\.|MA|PhD|MD)\.?[ \t]+){1,3}[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]?[a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)*(?:[ \t]+[A-Z]\.)?(?:(?:[ \t]+(?:von|van|de|zu|zur|vom|ter|ten|di|da|le|la|bin|ibn)(?:[ \t]+(?:der|den|dem|la|los))?)?[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]?[a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)*){0,2})/g,
            /(?<![A-Za-z0-9_À-ɏ])([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]{2,}[ \t]+[A-Z]\.[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]{2,})(?![A-Za-z0-9_À-ɏ])/g,
            /(?<![A-Za-z0-9_À-ɏ])([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)(?![A-Za-z0-9_À-ɏ])/g,
            /(?:(?:von|bei|durch|für|an|mit|als|gezeichnet|unterzeichnet|unterschrieben|verantwortlich|zuständig|bearbeitet|gesendet|erstellt|geprüft|genehmigt|kontaktiere(?:n|n Sie)?)\s+)([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}){0,2})/g,
            /(?:(?:Mit freundlichen Grüßen|Mit freundlichem Gruß|Hochachtungsvoll|Viele Grüße|Liebe Grüße|Beste Grüße|Herzliche Grüße|Freundliche Grüße|Mit besten Grüßen|MfG|LG|VG|Best regards|Sincerely|Yours sincerely)\s*\n*\s*)([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}){0,2})/g,
            /(?:Sehr geehrte(?:r)?\s+(?:Herr|Frau|Hr\.|Fr\.)\s+(?:(?:Dr|Prof|Ing|Mag)\.?\s+)*([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:[ \t]+(?:[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})){0,2}))/g,
            /(?<=[^\n\s][ \t])((?:[A-HJ-UWYZ]\.[ \t]?){1,2}[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:-[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)/g,
            /(?:^|\n)[ \t]*((?:[J-UWYZ]\.[ \t]?){1,2}[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:-[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)/g,
            /(?<![A-Za-z0-9_À-ɏ])([A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]{2,}(?:-[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]{2,})?[ \t]+[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]{2,}(?:-[A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ]{2,})?)(?![A-Za-z0-9_À-ɏ])/g,
            /(?=[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ])(?<=\b(?:Vorname|Nachname|Familienname|Geburtsname|Mädchenname|Rufname|Künstlername|Name|Namen|Unterzeichner|Antragsteller(?:in)?|Patient(?:in)?|Versicherte[rn]?)[ \t]{0,1000}[:=][ \t]{0,1000})([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]{2,}(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]{2,})?)/g,
            /(?=[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ])(?<=\b(?:geboren|geb\.)[ \t]{1,1000})([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)(?![\w.])/g,
            /(?:i\.(?:A|V)\.?\s+([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}){0,2})|ppa\.?\s+([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}){0,2}))/g,
            /(?<![A-Za-z0-9_À-ɏ])([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{3,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)(?![A-Za-z0-9_À-ɏ])/g,
            /(?<=(?:^|\n|[:;])[ \t]{0,5})([A-ZÄÖÜ][A-ZÄÖÜß]{2,}(?:-[A-ZÄÖÜ][A-ZÄÖÜß]{2,})?,[ \t]+(?:[A-ZÄÖÜ][A-ZÄÖÜß]{2,}|[A-ZÄÖÜ][a-zäöüß]{2,})(?:-[A-ZÄÖÜ][A-Za-zäöüß]{2,})?)(?=[ \t]*(?:[;,(<\n]|$))/g,
            /(?:(?<=,[ \t]{0,3})genannt|alias|a\.k\.a\.|auch bekannt als|Spitznamen?|Rufname|Künstlername|(?:nennen|nennt|rufen|ruft) (?:ihn|sie)(?: nur)?)[ \t:]{0,3}["„»“'‚‹]([A-ZÄÖÜ][A-Za-zäöüßÄÖÜ\-]{2,}(?:[ \t]+[A-ZÄÖÜ][A-Za-zäöüßÄÖÜ\-]{2,})?)["“«”'‘›]/g,
          ],
        },
        {
          id: "paragraf",
          lbl: "§-Paragraphen & Gesetze",
          desc: "Gesetzliche Referenzen: § 288 BGB, § 14 RVG",
          col: "#6366f1",
          on: false,
          pfx: "PARAGRAF",
          rx: [/(§+[ \t]*\d+[a-z]?(?:[ \t]+Abs\.?[ \t]*\d+)?(?:[ \t]+[A-Z][A-Za-z]{1,15}\.?){0,3})/g],
        },
        {
          id: "role",
          lbl: "Funktionen & Rollen",
          desc: "Vorstand, Geschäftsführer, Abteilungen",
          col: "#a855f7",
          on: false,
          pfx: "ROLLE",
          rx: [
            /((?:Vorstand(?:svorsitzende[rm]?)?|Geschäftsführer(?:in)?|GF|Abteilungsleiter(?:in)?|Bereichsleiter(?:in)?|Teamleiter(?:in)?|Prokurist(?:in)?|Direktor(?:in)?|Präsident(?:in)?|Justiziar(?:in)?|Syndikusanwalt|Rechtsanwalt|Rechtsanwältin|Fachanwalt|Fachanwältin|Notar|Notarin|Richter(?:in)?|Staatsanwalt(?:in)?|Bevollmächtigte[rm]?|Inhaber(?:in)?|Eigentümer(?:in)?|Gesellschafter(?:in)?|Managing Director|CEO|CFO|COO|CTO|Head of)[ \t]+(?:der|des|von)?[ \t]*[A-ZÜÄÖ][a-züäöß\-]{2,}(?:[ \t]+[A-ZÜÄÖ][a-züäöß\-]{2,})?)/g,
            /((?:Abteilung|Bereich|Referat|Stabsstelle|Geschäftsbereich|Fachbereich|Sachgebiet|Team|Büro|Sekretariat)[ \t]+[A-ZÜÄÖ][A-Za-züäöß \-\.]{3,50})/g,
          ],
        },
        {
          id: "ip",
          lbl: "IP-Adressen & Weblinks",
          desc: "IPv4, IPv6, Weblinks mit Pfad oder Parametern",
          col: "#6366f1",
          on: false,
          pfx: "IP",
          rx: [
            /(?=\d)(?<![\d.])(?<!(?:Version|Ver\.|Build|Release|Rev\.?|v|V)[ \t]{0,1000})((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})(?!\d|\.\d)/g,
            /(?<![\w:])((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:(?:[0-9a-fA-F]{1,4})?|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})(?![\w:])/g,
            /(https?:\/\/[^\s<>"{}|\\^`\[\]\)\(,;]{4,}[^\s<>"{}|\\^`\[\]\)\(,;.:!?])/g,
            /(?<![\w@.\/-])(www\.[a-z0-9\-]+(?:\.[a-z0-9\-]+)+(?:\/[^\s<>"{}|\\^`\[\]\)\(,;]*[^\s<>"{}|\\^`\[\]\)\(,;.:!?])?)/gi,
          ],
        },
        {
          id: "sensitive",
          lbl: "Besondere Kategorien (Art. 9/10 DSGVO)",
          desc: "Gesundheit, Medikamente, Religion, Gewerkschaft, Partei, Herkunft, Sexualleben, Strafdaten (Begriffslisten)",
          col: "#be123c",
          on: false,
          pfx: "SENSIBEL",
          rx: SENSITIVE_RX,
        },
        {
          id: "med",
          lbl: "Medizinische Daten",
          desc: "Diagnosen, ICD-Codes, Patientendaten",
          col: "#f43f5e",
          on: false,
          pfx: "MEDIZIN",
          rx: [
            /((?:Diagnose|Befund|ICD-1[01]|Erkrankung|Symptom|Medikation|Therapie)[\s:][^\n]{5,80})/gi,
            /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g,
            /((?:Patient(?:in)?|Pat\.?)[ \t:]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:[ \t]+[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]+){0,3})/g,
          ],
        },
      ];
      const SW = new Set([
        "Millionen",
        "Milliarden",
        "Euro",
        "Prozent",
        "Deutschland",
        "Deutschlands",
        "Österreich",
        "Schweiz",
        "Europa",
        "Zentrale",
        "Die",
        "Der",
        "Das",
        "Ein",
        "Eine",
        "Und",
        "Oder",
        "Aber",
        "Mit",
        "Bei",
        "Von",
        "Zu",
        "Zur",
        "Zum",
        "Sehr",
        "Gerne",
        "Bitte",
        "Danke",
        "Herr",
        "Frau",
        "Liebe",
        "Lieber",
        "Geehrte",
        "Geehrter",
        "Hiermit",
        "Bezug",
        "Anlage",
        "Betreff",
        "Datum",
        "Ort",
        "Ihre",
        "Ihrer",
        "Ihrem",
        "Ihren",
        "Nach",
        "Vor",
        "Auf",
        "Aus",
        "Sie",
        "Wir",
        "Ich",
        "Er",
        "Es",
        "An",
        "Im",
        "In",
        "Am",
        "Bis",
        "Dem",
        "Den",
        "Des",
        "Wert",
        "Tag",
        "Monat",
        "GmbH",
        "AG",
        "KG",
        "OHG",
        "UG",
        "eV",
        "SE",
        "Inc",
        "Ltd",
        "Corp",
        "Seite",
        "Anlage",
        "Hochachtungsvoll",
        "Freundlichen",
        "Sehr",
        "Guten",
        "Januar",
        "Februar",
        "März",
        "April",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
        "Sonntag",
        "Diese",
        "Dieser",
        "Dieses",
        "Diesem",
        "Diesen",
        "Solche",
        "Solcher",
        "Solches",
        "Welche",
        "Welcher",
        "Welches",
        "Alle",
        "Alles",
        "Allen",
        "Aller",
        "Beide",
        "Kein",
        "Keine",
        "Keiner",
        "Keines",
        "Keinem",
        "Keinen",
        "Mein",
        "Meine",
        "Meiner",
        "Meines",
        "Dein",
        "Deine",
        "Sein",
        "Seine",
        "Ihr",
        "Ihnen",
        "Unser",
        "Unsere",
        "Schon",
        "Noch",
        "Nur",
        "Auch",
        "Immer",
        "Nie",
        "Niemals",
        "Jeder",
        "Jedes",
        "Jeden",
        "Jede",
        "Dies",
        "Sage",
        "Sagen",
        "Erste",
        "Zweite",
        "Dritte",
        "Vierte",
        "Fünfte",
        "Sechste",
        "Siebte",
        "Achte",
        "Neunte",
        "Zehnte",
        "Etwas",
        "Nichts",
        "Viel",
        "Wenig",
        "Viele",
        "Wenige",
        "Manche",
        "Mancher",
        "Manches",
        "Finden",
        "Suchen",
        "Haben",
        "Sein",
        "Werden",
        "Können",
        "Müssen",
        "Wollen",
        "Dürfen",
        "Sollen",
        "Mögen",
        "Tun",
        "Machen",
        "Weil",
        "Denn",
        "Obwohl",
        "Während",
        "Seitdem",
        "Sobald",
        "Solange",
        "Bevor",
        "Nachdem",
        "Sodass",
        "Weiter",
        "Weitere",
        "Weiterer",
        "Weiteres",
        "Folgende",
        "Folgender",
        "Folgendes",
        "Folgen",
        "Nachfolgend",
        "Durch",
        "Gegen",
        "Ohne",
        "Um",
        "Entlang",
        "Laut",
        "Wegen",
        "Trotz",
        "Statt",
        "Innerhalb",
        "Außerhalb",
        "Oben",
        "Unten",
        "Links",
        "Rechts",
        "Hinten",
        "Vorn",
        "Vorne",
        "Mitte",
        "Neben",
        "Zwischen",
        "Hinter",
        "Über",
        "Unter",
        "Gut",
        "Gute",
        "Guter",
        "Gutes",
        "Schlecht",
        "Schlechte",
        "Groß",
        "Große",
        "Klein",
        "Kleine",
        "Hoch",
        "Hohe",
        "Niedrig",
        "Niedrige",
        "Neu",
        "Neue",
        "Neuer",
        "Neues",
        "Alt",
        "Alte",
        "Alter",
        "Jung",
        "Junge",
        "Junger",
        "Aktuell",
        "Aktuelle",
        "Wichtig",
        "Wichtige",
        "Wichtiger",
        "Möglich",
        "Mögliche",
        "Möglicher",
        "Verschieden",
        "Verschiedene",
        "Sowie",
        "Einschließlich",
        "Exklusive",
        "Inklusive",
        "Beispielsweise",
        "Zusätzlich",
        "Grundsätzlich",
        "Insbesondere",
        "Hinsichtlich",
        "Bezüglich",
        "Betreffend",
        "Stand",
        "Gemäß",
        "Anhand",
        "Mithilfe",
        "Zugunsten",
        "Zulasten",
        "Mittels",
        "Kraft",
        "Mangels",
        "Seitens",
        "Seit",
        "Ab",
        "Außer",
        "Zahlung",
        "Leistung",
        "Lieferung",
        "Rechnung",
        "Auftrag",
        "Bestellung",
        "Vertrag",
        "Vereinbarung",
        "Firma",
        "Unternehmen",
        "Abteilung",
        "Bereich",
        "Projekt",
        "Kunde",
        "Kunden",
        "Lieferant",
        "Partner",
        "Mitarbeiter",
        "Sollte",
        "Könnte",
        "Würde",
        "Hätte",
        "Müsste",
        "Dürfte",
        "Bereits",
        "Bisher",
        "Bislang",
        "Zuvor",
        "Danach",
        "Darauf",
        "Davor",
        "Seither",
        "Fortan",
        "Künftig",
        "Deshalb",
        "Deswegen",
        "Daher",
        "Folglich",
        "Somit",
        "Also",
        "Nämlich",
        "Schließlich",
        "Letztlich",
        "Zwar",
        "Allerdings",
        "Jedoch",
        "Dennoch",
        "Trotzdem",
        "Gleichwohl",
        "Indessen",
        "Eher",
        "Eben",
        "Genau",
        "Gerade",
        "Ausdrücklich",
        "Explizit",
        "Implizit",
        "Ergebnis",
        "Ergebnisse",
        "Zusammenfassung",
        "Fazit",
        "Resümee",
        "Ziel",
        "Ziele",
        "Mindestens",
        "Maximal",
        "Circa",
        "Etwa",
        "Rund",
        "Knapp",
        "Bitte",
        "Danke",
        "Vielen",
        "Dank",
        "Gruß",
        "Grüße",
        "Telefon",
        "Telefonisch",
        "Mündlich",
        "Schriftlich",
        "Persönlich",
        "Elektronisch",
        "Digital",
        "Bank",
        "Konto",
        "Kredit",
        "Darlehen",
        "Hypothek",
        "Sparplan",
        "Investition",
        "Portfolio",
        "Produkt",
        "Dienstleistung",
        "Service",
        "Support",
        "Hilfe",
        "Kontakt",
        "Adresse",
        "Woche",
        "Monat",
        "Jahr",
        "Jahre",
        "Jahren",
        "Heute",
        "Morgen",
        "Gestern",
        "Übermorgen",
        "Vorgestern",
        "Nächste",
        "Nächster",
        "Nächstes",
        "Letzte",
        "Letzter",
        "Letztes",
        "Menge",
        "Summe",
        "Gesamt",
        "Teil",
        "Teilbetrag",
        "Raten",
        "Rate",
        "Zins",
        "Zinsen",
        "Tilgung",
        "Bekannt",
        "Bekannte",
        "Bekannter",
        "Öffentlich",
        "Privat",
        "Vertraulich",
        "Geheim",
        "Intern",
        "Technische",
        "Technischer",
        "Technisches",
        "Rechtliche",
        "Rechtlicher",
        "Rechtliches",
        "Steuerliche",
        "Steuerlicher",
        "Gegenstand",
        "Umfang",
        "Dauer",
        "Laufzeit",
        "Beginn",
        "Ende",
        "Frist",
        "Fristen",
        "Termin",
        "Termine",
        "Kosten",
        "Preis",
        "Preise",
        "Gebühr",
        "Gebühren",
        "Honorar",
        "Vergütung",
        "Entgelt",
        "Sachverhalt",
        "Schreiben",
        "Partei",
        "Parteien",
        "Person",
        "Personen",
        "Vorstand",
        "Compliance",
        "Global",
        "Mandant",
        "Mandantin",
        "Geburtsdatum",
        "Kapitalanlage",
        "Kapitalanlagen",
        "Wertpapierabrechnung",
        "Steuerbescheinigung",
        "Korrespondenz",
        "Vermögensverwaltung",
        "Investment",
        "Fachanwalt",
        "Fachanwältin",
        "Vertraulichkeitshinweis",
        "Vertraulichkeit",
        "Sachbearbeiter",
        "Sachbearbeiterin",
        "Prozessvertreter",
        "Zeuge",
        "Zeugin",
        "Rahmen",
        "Höhe",
        "Aussicht",
        "Folgenden",
        "Vertragsschluss",
        "Rahm",
        "Umstand",
        "Umstände",
        "Hinsicht",
        "Grundlage",
        "Grundlagen",
        "Anlass",
        "Zusammenhang",
        "Zusammenhänge",
        "Name",
        "Namen",
        "Nummer",
        "Nummern",
        "Bezeichnung",
        "Funktion",
        "Funktionen",
        "Klasse",
        "Klassen",
        "Wert",
        "Werte",
        "Status",
        "Einheit",
        "Einheiten",
        "Beschreibung",
        "Kategorie",
        "Kategorien",
        "Bemerkung",
        "Bemerkungen",
        "Position",
        "Positionen",
        "Summe",
        "Betrag",
        "Beträge",
        "Antrag",
        "Anträge",
        "Klage",
        "Klagen",
        "Recht",
        "Rechte",
        "Pflicht",
        "Pflichten",
        "Anspruch",
        "Ansprüche",
        "Vereinbarung",
        "Vereinbarungen",
        "Regelung",
        "Regelungen",
        "Bestimmung",
        "Bestimmungen",
        "Verpflichtung",
        "Verpflichtungen",
        "Leistungspflicht",
        "Leistung",
        "Leistungen",
        "Schadensersatz",
        "Schadenersatz",
        "Schaden",
        "Schäden",
        "Haftung",
        "Haftungen",
        "Verfahren",
        "Verfahrens",
        "Verhandlung",
        "Verhandlungen",
        "Urteil",
        "Urteile",
        "Beschluss",
        "Beschlüsse",
        "Entscheidung",
        "Entscheidungen",
        "Bescheid",
        "Bescheide",
        "Einspruch",
        "Einsprüche",
        "Widerspruch",
        "Widersprüche",
        "Berufung",
        "Revision",
        "Kläger",
        "Klägerin",
        "Beklagte",
        "Beklagter",
        "Klägerseite",
        "Beklagtenseite",
        "Erstattung",
        "Erstattungen",
        "Rückzahlung",
        "Rückzahlungen",
        "Rückforderung",
        "Abrechnung",
        "Abrechnungen",
        "Aufstellung",
        "Aufstellungen",
        "Vollmacht",
        "Vollmachten",
        "Bestellung",
        "Bestellungen",
        "Auftrag",
        "Aufträge",
        "Geschäftsjahr",
        "Geschäftsjahre",
        "Haushaltsjahr",
        "Wirtschaftsjahr",
        "Gesellschaft",
        "Gesellschaften",
        "Gesellschafter",
        "Gesellschafterin",
        "Kapital",
        "Kapitalerhöhung",
        "Kapitalherabsetzung",
        "Stammkapital",
        "Grundkapital",
        "Gewinn",
        "Verlust",
        "Dividende",
        "Ausschüttung",
        "Rücklage",
        "Rücklagen",
        "Protokoll",
        "Protokolle",
        "Bericht",
        "Berichte",
        "Gutachten",
        "Stellungnahme",
        "Rechtsanwalt",
        "Rechtsanwältin",
        "Notar",
        "Notarin",
        "Richter",
        "Richterin",
        "Kanzlei",
        "Sozietät",
        "Praxis",
        "Institut",
        "Verein",
        "Verband",
        "Verbände",
        "Bundesrepublik",
        "Freistaat",
        "Bundesland",
        "Bundesrat",
        "Bundestag",
        "Sitz",
        "Gesellschaftsrecht",
        "Kapitalmarktrecht",
        "Steuerrecht",
        "Arbeitsrecht",
        "Familienrecht",
        "Erbrecht",
        "Mietrecht",
        "Strafrecht",
        "Handelsrecht",
        "Verwaltungsrecht",
        "Sozialrecht",
        "Insolvenzrecht",
        "Baurecht",
        "Medizinrecht",
        "Versicherungsrecht",
        "Wettbewerbsrecht",
        "Urheberrecht",
        "Markenrecht",
        "Patentrecht",
        "Vergaberecht",
        "Datenschutzrecht",
        "Wirtschaftsrecht",
        "Bankrecht",
        "Vertragsrecht",
        "Zivilrecht",
        "Prozessrecht",
        "Station",
        "Zimmer",
        "Hauptdiagnose",
        "Nebendiagnose",
        "Nebendiagnosen",
        "Diagnose",
        "Diagnosen",
        "Allergien",
        "Allergie",
        "Medikation",
        "Entlassung",
        "Aufnahme",
        "Befund",
        "Befunde",
        "Epikrise",
        "Anamnese",
        "Sozialanamnese",
        "Pflegebericht",
        "Pflegegrad",
        "Verteiler",
        "Original",
        "Kopie",
        "Laborwerte",
        "Referenzbereich",
        "Parameter",
        "Blutgruppe",
        "Rhesus",
        "Verschluss",
        "Stenose",
        "Implantation",
        "Echokardiographie",
        "Sinusrhythmus",
        "Empfehlung",
        "Überweisung",
        "Kontrolle",
        "Patient",
        "Patientin",
        "Hausarzt",
        "Hausärztin",
        "Oberarzt",
        "Oberärztin",
        "Chefarzt",
        "Chefärztin",
        "Notarzt",
        "Notärztin",
        "Facharzt",
        "Fachärztin",
        "Internist",
        "Internistin",
        "Kardiologie",
        "Psychosomatik",
        "Diätassistentin",
        "Diätassistent",
        "Pflegefachkraft",
        "Ehefrau",
        "Ehemann",
        "Arterielle",
        "Reaktive",
        "Sofortige",
        "Regionale",
        "Leichte",
        "Selbstständiger",
        "Selbstständige",
        "Behandelnder",
        "Behandelnde",
        "Patienteneigene",
        "Verschriebene",
        "Kontinuierliches",
        "Kontinuierliche",
        "Psychokardiologische",
        "Kardiologische",
        "Diabetologische",
        "Fiktives",
        "Fiktive",
        "Innere",
        "Anaphylaktischer",
        "Anaphylaktische",
        "Übelkeit",
        "Todesangst",
        "Körperpflege",
        "Hypertonie",
        "Mitralinsuffizienz",
        "Anpassungsstörung",
        "Wandbewegungsstörung",
        "Glukosemonitoring",
        "Schwerpunktpraxis",
        "Hausarztpraxis",
        "Gemeinschaftspraxis",
        "Bankverbindung",
        "Schock",
        "Ödem",
        "Infarkt",
        "Stenose",
        "Insuffizienz",
        "Störung",
        "Rhythmus",
        "Fibrillation",
        "Monitoring",
        "Implantation",
        "Kontrolle",
        "Überwachung",
        "Untersuchung",
        "Behandlung",
        "Medizin",
        "Chirurgie",
        "Neurologie",
        "Orthopädie",
        "Radiologie",
        "Pädiatrie",
        "Geriatrie",
        "Urologie",
        "Onkologie",
        "Hämatologie",
        "Gastroenterologie",
        "Pneumologie",
        "Nephrologie",
        "Rehabilitation",
        "Intensivstation",
        "Notaufnahme",
        "Ambulanz",
        "Physiotherapie",
        "Allergie",
        "Allergien",
        "Acetylsalicylsäure",
        "Penicillin",
        "Kontrastmittel",
        "Urtikaria",
        "Dyspnoe",
        "Tachykardie",
        "Bradykardie",
        "Palpitation",
        "Demodokument",
        "Testdokument",
        "Pflege",
        "Klinik",
        "Bayern",
        "Arzt",
        "Ärztin",
        "Arztbrief",
        "Entlassungsbericht",
        "Epikrise",
        "Angst",
        "Befund",
        "Zugang",
        "Leiste",
        "Zustand",
        "Wunde",
        "Narbe",
        "Steuerberater",
        "Steuerberaterin",
        "Steuerberatungsgesellschaft",
        "Berufsunfähigkeit",
        "Berufsunfähigkeitsversicherung",
        "Psychischer",
        "Psychische",
        "Psychisches",
        "Psychischen",
        "Mitbetreuung",
        "Hilfsmittel",
        "Geräte",
        "Kompressionsstrümpfe",
        "Kompressionsstrümpfen",
        "Verlaufskontrolle",
        "Wundkontrolle",
        "Labor",
        "Kontrolle",
        "Kontrollen",
        "Medtronic",
        "Dexcom",
        "Insulinpumpe",
        "Schrittmacher",
        "Senior",
        "Junior",
        "Trainee",
        "Praktikant",
        "Praktikantin",
        "Werkstudent",
        "Werkstudentin",
        "Geschäftsführer",
        "Geschäftsführerin",
        "Prokurist",
        "Prokuristin",
        "Aufsichtsrat",
        "Beirat",
        "Filialleiter",
        "Filialleiterin",
        "Abteilungsleiter",
        "Abteilungsleiterin",
        "Personalleiter",
        "Personalleiterin",
        "Niederlassungsleiter",
        "Niederlassungsleiterin",
        "Teamleiter",
        "Teamleiterin",
        "Projektleiter",
        "Projektleiterin",
        "Gruppenleiter",
        "Gruppenleiterin",
        "Betriebsrat",
        "Gewerkschaft",
        "Tarifvertrag",
        "Arbeitstage",
        "Arbeitstag",
        "Urlaubstage",
        "Urlaubstag",
        "Abmahnung",
        "Kündigung",
        "Entlassung",
        "Probezeit",
        "Elternzeit",
        "Mutterschutz",
        "Kurzarbeit",
        "Juckreiz",
        "Pruritus",
        "Schwindel",
        "Müdigkeit",
        "Erschöpfung",
        "Schlafstörung",
        "Kopfschmerz",
        "Kopfschmerzen",
        "Rückenschmerz",
        "Rückenschmerzen",
        "Bauchschmerz",
        "Bauchschmerzen",
        "Appetitlosigkeit",
        "Gewichtsabnahme",
        "Gewichtszunahme",
        "Erbrechen",
        "Verstopfung",
        "Durchfall",
        "Inkontinenz",
        "Blasenschwäche",
        "Blutdruck",
        "Blutzucker",
        "Blutwert",
        "Blutbild",
        "Entzündung",
        "Entzündungswerte",
        "Herzrasen",
        "Herzstolpern",
        "Brustschmerz",
        "Brustschmerzen",
        "Atemnot",
        "Luftnot",
        "Klinikum",
        "Krankenhaus",
        "Universitätsklinikum",
        "Kreiskrankenhaus",
        "Rehabilitationszentrum",
      ]);
      // GROSSGESCHRIEBENE Personennamen ("HANS MEIER"): nur wenn Vor- oder Nachname in den Wortlisten steht,
      // damit Ueberschriften ("KAUFVERTRAG ZWISCHEN") nicht als Name gelten.
      function isCapsPersonName(val) {
        const words = val.trim().split(/[ \t]+/).map((w) => w.replace(/,$/, ""));
        if (words.length < 2 || words.length > 3) return false;
        if (!words.every((w) => /^[A-ZÄÖÜ][A-ZÄÖÜ\-]+$/.test(w))) return false;
        const tc = (w) => w.charAt(0) + w.slice(1).toLowerCase();
        return LOCAL_NAMES.has(tc(words[0])) || words.some((w) => w.split("-").some((p) => LOCAL_SURNAMES.has(tc(p))));
      }
      function okName(s) {
        const tt = s.trim();
        if (tt === tt.toUpperCase() && /[A-ZÄÖÜ]{2}/.test(tt)) return isCapsPersonName(tt);
        // GROSSGESCHRIEBENER Nachname mit Komma ("SCHMIEDEBERG, Ottilie"): beide Teile duerfen kein Stoppwort sein
        const kom = /^([A-ZÄÖÜ][A-ZÄÖÜß\-]+),[ \t]+(\S+)$/.exec(tt);
        if (kom) {
          const tc = (w) => w.charAt(0) + w.slice(1).toLowerCase();
          if (SW.has(tc(kom[1])) || SW.has(kom[2]) || SW.has(tc(kom[2]))) return false;
        }
        return s
          .trim()
          .split(/\s+/)
          .every((p, i) => {
            // Ergebnis je Wort zwischenspeichern (lange Spannen wiederholen dieselben Woerter)
            const key = (i === 0 ? "0" : "1") + p;
            let ok = wordOkCache.get(key);
            if (ok === undefined) {
              ok = wordOk(p, i);
              if (wordOkCache.size > 20000) wordOkCache.clear();
              wordOkCache.set(key, ok);
            }
            return ok;
          });
      }
      const wordOkCache = new Map();
      function wordOk(p, i) {
        if (/^[A-ZÄÖÜ]\.$/.test(p)) return true; // Initiale
        const c = p.replace(/[^A-Za-züäöüÄÖÜß]/g, "");
        if (c.length < 2 || /^\d+$/.test(c)) return false;
        if (i === 0 && (SW.has(p) || SW.has(c))) return false;
        return true;
      }
      const PROFILES = [
        {
          id: "standard",
          lbl: "Standard",
          badge: "Empfohlen",
          desc: "Für die meisten Anwendungsfälle. Erkennt persönliche Daten, Kontaktdaten, Finanzdaten und Identifikationsnummern.",
          ents: ["email", "iban", "card", "bic", "phone", "money", "date", "taxid", "addr", "vehicle", "device", "account", "geo", "intlid", "org", "name", "ip"],
          tags: ["Namen", "Adressen", "IBAN", "Karten", "BIC", "Telefon", "E-Mail", "Daten", "Steuer-IDs", "Beträge", "Kfz", "IP/Links"],
          note: "",
        },
        {
          id: "finance",
          lbl: "Finanzen & Recht",
          badge: "",
          desc: "Für Anwaltskanzleien, Steuerberatung und Banken. Wie Standard — zusätzlich mit Aktenzeichen, Handelsregisternummern und Sozialversicherungsnummern.",
          ents: ["email", "iban", "card", "bic", "phone", "money", "date", "taxid", "addr", "vehicle", "device", "account", "geo", "intlid", "org", "name", "ip"],
          tags: ["+ Aktenzeichen", "+ HR-Nummern", "+ SV-Nummern", "Alle Standardfelder"],
          note: "Gleiche Kategorien wie Standard, jedoch mit erweiterten Mustern für rechtliche und steuerliche Dokumente.",
        },
        {
          id: "medical",
          lbl: "Medizin & Pflege",
          badge: "",
          desc: "Für Kliniken, Praxen und Pflegedienste. Enthält zusätzlich ICD-Codes, Diagnosen und Patientendaten. Finanzdaten (IBAN, Beträge) werden nicht erkannt.",
          ents: ["email", "phone", "date", "taxid", "addr", "name", "med", "sensitive", "paragraf", "ip", "device", "account", "geo", "intlid"],
          tags: ["+ ICD-Codes", "+ Diagnosen", "+ Patientendaten", "Ohne IBAN & Beträge"],
          note: "",
        },
        {
          id: "strict",
          lbl: "Maximal",
          badge: "",
          desc: "Alle Kategorien aktiv, auch besondere Kategorien (Art. 9/10 DSGVO), Funktionen und Paragraphen. Kann mehr maskieren als nötig; das Ergebnis bitte prüfen.",
          ents: ENTS.map((e) => e.id),
          tags: ["Alle Kategorien", "Art. 9/10 DSGVO", "Maximaler Schutz"],
          note: "",
        },
        {
          id: "custom",
          lbl: "Eigene Auswahl",
          badge: "",
          desc: "Alle Kategorien manuell ein- oder ausschalten. Für spezifische Anforderungen oder besondere Dokumenttypen.",
          ents: [],
          tags: ["Vollständige Kontrolle", "Eigene Regex-Muster"],
          note: "",
        },
      ];
      // Wortlisten-Erkennung (Namen, Organisationen, Orte) ist der Normalfall ohne KI-Treffer; nur wordlists: false schaltet sie ab (Diagnose, Referenz w0)
      let wordlistsOn = true;
      const LOCAL_NAMES = new Set([
        "Alexander",
        "Andreas",
        "Anna",
        "Anne",
        "Anja",
        "Bernd",
        "Brigitte",
        "Christian",
        "Christoph",
        "Claudia",
        "Daniel",
        "Dirk",
        "Elisabeth",
        "Frank",
        "Gabriele",
        "Gisela",
        "Hans",
        "Heike",
        "Heinz",
        "Helga",
        "Herbert",
        "Hermann",
        "Ingrid",
        "Jens",
        "Jessica",
        "Joachim",
        "Johann",
        "Johannes",
        "Josef",
        "Julia",
        "Jürgen",
        "Karin",
        "Karl",
        "Karsten",
        "Katharina",
        "Klaus",
        "Kurt",
        "Lars",
        "Laura",
        "Lena",
        "Lisa",
        "Lukas",
        "Manfred",
        "Maria",
        "Marina",
        "Mario",
        "Markus",
        "Martin",
        "Matthias",
        "Michael",
        "Monika",
        "Nina",
        "Oliver",
        "Patrick",
        "Paul",
        "Peter",
        "Petra",
        "Philipp",
        "Renate",
        "Robert",
        "Rolf",
        "Rüdiger",
        "Sabine",
        "Sandra",
        "Sarah",
        "Silke",
        "Simon",
        "Stefan",
        "Stefanie",
        "Susanne",
        "Thomas",
        "Thorsten",
        "Ute",
        "Uwe",
        "Veronika",
        "Walter",
        "Werner",
        "Wilhelm",
        "Wolfgang",
        "Alex",
        "Max",
        "Tom",
        "Tim",
        "Leon",
        "Felix",
        "Luca",
        "Jonas",
        "Niklas",
        "Miriam",
        "Sophie",
        "Emma",
        "Mia",
        "Hannah",
        "Lea",
        // ab C1.1: breiteres Vornamen-Woerterbuch (Ausfallmodus), Schreibweisen mit Sonderzeichen
        "Achim", "Adrian", "Agnieszka", "Ahmet", "Aisha", "Albert", "Alfred", "Ali", "Alina", "Amelie", "Amira", "Ana", "Andre", "Andrea",
        "Andrzej", "Angela", "Angelika", "Anita", "Anton", "Antje", "Antonio", "Armin", "Arnold", "Arthur", "Astrid", "Axel",
        "Aylin", "Ayse", "Barbara", "Bastian", "Beata", "Beate", "Benedikt", "Benjamin", "Bernhard", "Bettina", "Birgit", "Birte", "Boris",
        "Burak", "Carla", "Carlos", "Carmen", "Carolin", "Caroline", "Carsten", "Cem", "Charlotte", "Chiara", "Christiane", "Christina",
        "Christine", "Christof", "Clemens", "Constantin", "Cornelia", "Çağlar", "Dagmar", "Daniela", "Dennis", "Diana", "Dieter",
        "Dietmar", "Dmitri", "Dominik", "Doris", "Dorota", "Dorothea", "Eberhard", "Eckhard", "Edgar", "Edith", "Eduard", "Egon", "Elena",
        "Elfriede", "Elif", "Elke", "Ellen", "Emil", "Emilia", "Emily", "Emine", "Emre", "Erich", "Erik", "Erika", "Evelyn", "Ewa",
        "Fabian", "Fatima", "Fatma", "Ferdinand", "Florian", "Francesca", "Francesco", "Franziska", "Frederik", "Frieda", "Fritz",
        "Georg", "Gerald", "Gerd", "Gerda", "Gerhard", "Gerrit", "Giovanni", "Giulia", "Giuseppe", "Gertrud", "Gudrun", "Günter",
        "Günther", "Gustav", "Hamza", "Hanna", "Hannelore", "Harald", "Hasan", "Hatice", "Heiko", "Heidi", "Heinrich", "Helene", "Helmut",
        "Henning", "Henrik", "Henrike", "Hildegard", "Holger", "Horst", "Hubert", "Hüseyin", "Ibrahim", "Igor", "Ilona", "Ilse", "Ines",
        "Ingo", "Irene", "Irina", "Irmgard", "Isabel", "Isabella", "Jakob", "Jakub", "Jan", "Jana", "Janina", "Jannik", "Jasmin",
        "Jennifer", "Joanna", "Johanna", "Jonathan", "José", "Jose", "Juan", "Julian", "Justus", "Jutta", "Katarzyna", "Kathrin",
        "Katja", "Kerstin", "Kevin", "Khalid", "Klara", "Konrad", "Krzysztof", "Kristian", "Kristina", "Larissa", "Layla", "Lennart",
        "Leo", "Leonie", "Leyla", "Lilli", "Linda", "Linus", "Lothar", "Louisa", "Ludwig", "Luisa", "Lucia", "Łukasz", "Łucja",
        "Magdalena", "Maike", "Malte", "Małgorzata", "Marc", "Marcel", "Marco", "Marcus", "Marek", "Margarete", "Margit", "Mariam",
        "Marianne", "Marie", "Marlene", "Marta", "Mathias", "Matteo", "Maximilian", "Mehmet", "Meike", "Melanie", "Melissa", "Merve",
        "Michaela", "Miguel", "Mihail", "Mirko", "Mohammed", "Muhammad", "Moritz", "Murat", "Mustafa", "Nadine", "Natalia",
        "Natalie", "Nicole", "Nico", "Nikolaus", "Nils", "Nora", "Norbert", "Nour", "Oksana", "Olaf", "Olena", "Olga", "Omar", "Osman",
        "Otto", "Ömer", "Pamela", "Paula", "Pauline", "Pavel", "Pawel", "Pedro", "Piotr", "Rainer", "Ralf", "Ralph", "Rebecca",
        "Regina", "Reinhard", "Richard", "Rita", "Roland", "Romy", "Ronald", "Rosemarie", "Rudolf", "Ruth", "Sabrina", "Samir", "Saskia",
        "Sara", "Sebastian", "Selin", "Sergej", "Sibylle", "Siegfried", "Sigrid", "Simone", "Sofia", "Sonja", "Sophia", "Stephanie",
        "Svenja", "Sven", "Svetlana", "Søren", "Tanja", "Tarek", "Tatjana", "Theodor", "Theresa", "Thilo", "Tina", "Tobias", "Tomasz",
        "Torsten", "Udo", "Ulf", "Ulrich", "Ulrike", "Ursula", "Valentin", "Valentina", "Valentyna", "Vanessa", "Vera", "Verena", "Viktor",
        "Viktoria", "Vladimir", "Volker", "Waldemar", "Waltraud", "Wiebke", "Wilfried", "Willi", "Winfried", "Wojciech", "Wojtek",
        "Yannick", "Yasemin", "Yusuf", "Yvonne", "Zeynep", "Zoë",
        // Mehrdeutige Vornamen (auch Alltagswoerter): nur ohne Artikel davor, siehe WEAK_NAMES
        "Kai", "Iris", "Falk", "Mona", "Teddy",
        // Kurzformen und Spitznamen
        "Andi", "Basti", "Benni", "Biggi", "Chris", "Chrissi", "Conny", "Dani", "Danny", "Ede", "Evi", "Fabi", "Flo", "Flori", "Gabi",
        "Gaby", "Hannes", "Hanni", "Heiner", "Hotte", "Jenny", "Jessi", "Jule", "Kalle", "Kathi", "Kati", "Katrin", "Lissi", "Lotti",
        "Micha", "Michi", "Mike", "Mimi", "Mischa", "Moni", "Nici", "Nicki", "Resi", "Rike", "Rudi", "Sandy", "Silvi", "Sissi", "Steffi",
        "Susi", "Timo", "Toni", "Tommy", "Uli", "Uschi",       ]);
      // Vornamen, die auch Alltagswoerter sind (Kai, Iris, Falk, Mona, Teddy): gelten nur ohne Artikel/Praeposition mit Artikel davor und ohne Bindestrich danach
      const WEAK_NAMES = new Set(["Kai", "Iris", "Falk", "Mona", "Teddy"]);
      const LOCAL_SURNAMES = new Set([
        "Müller",
        "Schmidt",
        "Schneider",
        "Fischer",
        "Weber",
        "Wagner",
        "Becker",
        "Schulz",
        "Hoffmann",
        "Schäfer",
        "Koch",
        "Bauer",
        "Richter",
        "Klein",
        "Wolf",
        "Schröder",
        "Neumann",
        "Schwarz",
        "Zimmermann",
        "Braun",
        "Krüger",
        "Hofmann",
        "Hartmann",
        "Lange",
        "Weiß",
        "Schmitt",
        "Werner",
        "Schmitz",
        "Krause",
        "Meier",
        "Lehmann",
        "Schmid",
        "Schulze",
        "Maier",
        "Köhler",
        "Herrmann",
        "König",
        "Meyer",
        "Huber",
        "Kaiser",
        "Fuchs",
        "Peters",
        "Lang",
        "Scholz",
        "Jung",
        "Möller",
        "Weiß",
        "Hahn",
        "Schubert",
        "Vogel",
        "Friedrich",
        "Günther",
        "Frank",
        "Berger",
        "Winkler",
        "Roth",
        "Beck",
        "Gruber",
        "Lorenz",
        "Baumann",
        "Franke",
        "Albrecht",
        "Sauer",
        "Böhm",
        "Simon",
        "Winter",
        "Link",
        "Reuter",
        "Krebs",
        "Schilling",
        "Seidel",
        "Maas",
        "Uhlig",
        "Schröter",
        "Buchholz",
        "Grimm",
        "Arnold",
        "Jakob",
        "Engel",
        "Ziegler",
        "Kern",
        "Seifert",
        "Riedel",
        "Menzel",
        "Schindler",
        "Hammer",
        "Oswald",
        "Krug",
        "Büttner",
        "Kopp",
        "Bischoff",
        "Noll",
        "Fritz",
        "Dittrich",
        "Moritz",
        "Schuster",
        "Förster",
        "Hagen",
        "Hermann",
        "Rupp",
        "Barth",
        "Schumann",
        "Dietrich",
        "Benz",
        "Voigt",
        "Rohde",
        "Jost",
        "Kuhn",
        "Schwab",
        "Bock",
        "Ludwig",
        "Busch",
        "Sander",
        "Arcangeli",
        "Rossi",
        "Ferrari",
        "Bianchi",
        "Romano",
        "Colombo",
        "Ricci",
        "Marino",
        "Greco",
        "Bruno",
        "Gallo",
        "Conti",
        "Costa",
        "Mancini",
        "Esposito",
        // ab C1.1: breiteres Nachnamen-Woerterbuch (Ausfallmodus)
        "Aigner", "Albers", "Altmann", "Andersen", "Arslan", "Aslan", "Aydın", "Bachmann", "Bartels", "Baur",
        "Beier", "Bernard", "Beyer", "Blum", "Brandt", "Brinkmann", "Brunner", "Conrad", "Çelik", "Davies",
        "Demir", "Dietz", "Doğan", "Döring", "Dubois", "Dupont", "Dvořák", "Ebert", "Eckert", "Engelhardt", "Evans", "Farsi",
        "Fernández", "Ferreira", "Franz", "Friedrichs", "Garcia", "García", "Gerlach", "Giese", "Gonzalez", "Haas",
        "Haase", "Hansen", "Hartung", "Heinrich", "Henke", "Hess", "Hildebrandt", "Hinz", "Hofer", "Horváth", "Ivanov", "Jacobs",
        "Jahn", "Jansen", "Jensen", "Johansson", "Johnson", "Jones", "Kamiński", "Kaya", "Kessler", "Kierkegaard", "Kılıç", "Kirchner",
        "Kolb", "Konrad", "Kovács", "Kowalczyk", "Kowalski", "Kozłowski", "Kramer", "Kroll",         "Kunz", "Lachmann", "Larsen", "Laurent", "Lefèvre", "Lewandowski", "Lindner", "López", "Lüdenscheidt", "Lutz",
        "Martínez", "Mayer", "Mayr", "Mazur", "Mertens", "Michel", "Moreau", "Moser", "Mustermann", "Nagy", "Naumann", "Nielsen", "Nowak",
        "Novák", "Novotný", "Obermaier", "Ott", "Özdemir", "Öztürk", "Pereira", "Petersen", "Petrov", "Pfeiffer", "Pohl", "Polat",
        "Popov", "Rodríguez", "Reichert", "Reimann", "Reinhardt", "Sánchez", "Santos", "Scheffler", "Schlüter",
        "Schumacher", "Schütz", "Silva", "Smirnov", "Smith", "Sokolov", "Steiner", "Stoll", "Svensson", "Svoboda", "Szabó", "Szymański",
        "Şahin", "Taylor", "Thiel", "Thompson", "Tietz", "Ulrich", "Walter", "Wegner", "Weidner", "Wendt", "Wenzel", "Westphal",
        "Williams", "Wilson", "Wiśniewska", "Wiśniewski", "Wittmann", "Wójcik", "Woźniak", "Yilmaz", "Yıldız", "Zeller",
        "Zieliński", "Šimek",
      ]);
      const LOCAL_ORG_KEYWORDS = [
        /\b(GmbH|AG|e\.V\.|KG|OHG|UG|SE|Inc\.|Corp\.|LLC|Ltd\.|PLC|GmbH & Co\. KG|GmbH & Co\.)/gi,
        /(?:der|die|das)\s+([A-ZÄÖÜ][a-zäöü]+(?:[\s-][A-ZÄÖÜ][a-zäöü]+){0,3})\s+(?:GmbH|AG|e\.V\.|KG|UG|SE|Corp\.|Inc\.|Ltd\.)/g,
        /\b(Universität|Hochschule|Institut|Klinikum|Krankenhaus|Behörde|Amt|Ministerium|Stadt|Gemeinde|Landkreis|Sparkasse|Bank|Versicherung|Kanzlei|Praxis|Apotheke|Supermarkt|Bäckerei|Metzgerei|Restaurant|Café|Hotel|Schule|Kindergarten|Verein|Stiftung|Verband|Gewerkschaft|Kammer|Agentur|Redaktion|Verlag)\b/gi,
        /\b([A-ZÄÖÜ][a-zäöü]+(?:sstraße|sweg|splatz|sallee|shof|sberg|sturm|sbrücke|shaus|spark|sbad|sgalerie|szentrum))\b/g,
      ];
      const LOCAL_LOC_KEYWORDS = [
        /\b(in|nach|aus|bei|von|zu|im|am|zum|zur)\s+([A-ZÄÖÜ][a-zäöüß]+(?:(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)?))\b/g,
        /\b(Straße|Gasse|Weg|Platz|Allee|Ring|Damm|Ufer|Berg|Tal|Hof|Mühle|Schloss|Burg|Kirche|Kapelle|Brücke|Turm|Bad|Hafen|Flughafen|Bahnhof|Haltestelle)\b/gi,
        /\b(München|Berlin|Hamburg|Köln|Frankfurt|Stuttgart|Düsseldorf|Leipzig|Dresden|Hannover|Nürnberg|Bremen|Bonn|Münster|Karlsruhe|Mannheim|Augsburg|Wiesbaden|Freiburg|Aachen|Regensburg|Kiel|Erfurt|Mainz|Koblenz|Trier|Ulm|Heidelberg|Potsdam|Darmstadt|Bamberg|Passau|Bremen|Lübeck|Rostock|Chemnitz|Magdeburg|Saarbrücken|Würzburg|Ingolstadt|Flensburg|Cottbus|Gera|Bochum|Duisburg|Essen|Oberhausen|Leverkusen|Solingen|Wuppertal|Bielefeld|Dortmund|Gelsenkirchen|Krefeld|Mönchengladbach|Mülheim|Neuss|Paderborn|Remscheid|Siegen|Witten|Hagen|Herne|Iserlohn|Lüdenscheid|Moers|Ratingen|Velbert|Willich)\b/g,
      ];
      function detectLocalEntities(text) {
        var results = [];
        var nameRx = /(?<![A-Za-z0-9_À-ɏ])([A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+(?:[\- \t][A-ZÄÖÜÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-zäöüßàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)?)(?![A-Za-z0-9_À-ɏ])/g;
        var match;
        while ((match = nameRx.exec(text)) !== null) {
          var name = match[0].trim();
          if (name.length < 2) continue;
          var parts = name.split(/[\s-]/);
          var isName =
            parts.some(function (p) {
              return LOCAL_NAMES.has(p);
            }) ||
            parts.some(function (p) {
              return LOCAL_SURNAMES.has(p);
            });
          if (isName) {
            results.push({
              entity_group: "PER",
              score: 0.85,
              word: name,
              start: match.index,
              end: match.index + name.length,
            });
          }
        }
        for (var i = 0; i < LOCAL_ORG_KEYWORDS.length; i++) {
          var rx = LOCAL_ORG_KEYWORDS[i];
          rx.lastIndex = 0;
          while ((match = rx.exec(text)) !== null) {
            var org = (match[1] || match[2] || match[0]).trim();
            if (org.length < 3) continue;
            results.push({
              entity_group: "ORG",
              score: 0.75,
              word: match[0].trim(),
              start: match.index,
              end: match.index + match[0].length,
            });
          }
        }
        for (var j = 0; j < LOCAL_LOC_KEYWORDS.length; j++) {
          var rx2 = LOCAL_LOC_KEYWORDS[j];
          rx2.lastIndex = 0;
          while ((match = rx2.exec(text)) !== null) {
            var loc = (match[2] || match[1] || match[0]).trim();
            if (loc.length < 3) continue;
            var cityRx =
              /\b(München|Berlin|Hamburg|Köln|Frankfurt|Stuttgart|Düsseldorf|Leipzig|Dresden|Hannover|Nürnberg|Bremen|Bonn|Münster|Karlsruhe|Mannheim|Augsburg|Wiesbaden|Freiburg|Aachen|Regensburg|Kiel|Erfurt|Mainz|Koblenz|Trier|Ulm|Heidelberg|Potsdam|Darmstadt|Bamberg|Passau|Bremen|Lübeck|Rostock|Chemnitz|Magdeburg|Saarbrücken|Würzburg|Ingolstadt)\b/i;
            var score = loc.match(cityRx) ? 0.9 : 0.6;
            results.push({
              entity_group: "LOC",
              score: score,
              word: loc,
              start: match.index + (match[2] ? match.indexOf(loc) : 0),
              end: match.index + match[0].length,
            });
          }
        }
        return results;
      }
      const ENT_PRIO = {
        EMAIL: 1,
        IBAN: 1,
        BIC: 1,
        IP: 1,
        KARTE: 1,
        KFZ: 2,
        SENSIBEL: 2,
        GERAET: 1,
        KONTO: 1,
        STANDORT: 2,
        TEL: 2,
        BETRAG: 2,
        DATUM: 2,
        KENNNR: 2,
        PARAGRAF: 2,
        MEDIZIN: 2,
        ADRESSE: 3,
        ORG: 4,
        ROLLE: 4,
        NAME: 5,
        ORT: 5,
      };
      const HARD_ENT_IDS = new Set(["email", "iban", "bic", "phone", "money", "date", "taxid", "paragraf", "ip", "card", "vehicle", "device", "account", "geo", "intlid"]);
      const SOFT_ENT_IDS = new Set(["org", "addr", "name", "role", "med", "sensitive"]);
      function isWhitelisted(v) {
        return whitelist.some(function (w) {
          return w && v.toLowerCase().includes(w.toLowerCase());
        });
      }
      const ORG_LEGAL_ONLY =
        /^(GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|KGaA|KG|OHG|GbR|UG|e\.V\.|eG|SE|Ltd\.?|Inc\.?|Corp\.?|Stiftung|BIC|IBAN|SWIFT|BLZ|HRB|HRA|WKN|ISIN|PZN|ICD)$/;
      const ORG_LEAD =
        /^(?:(?:Vorstand|Geschäftsführer(?:in)?|Prokurist(?:in)?|Direktor(?:in)?|Inhaber(?:in)?|Gesellschafter(?:in)?|Mitarbeiter(?:in)?|Mandant(?:in)?|Aufsichtsrat|Beirat|Anteilseigner)\s+|(?:der|die|das|des|dem|den|bei|von|im|in|an|am|für|durch|mit|als|und|oder|einer?|eines|ist|sind|war|waren|bleibt|wird)\s+)+/;
      function isValidCard(raw) {
        const d = raw.replace(/\D/g, "");
        if (d.length < 13 || d.length > 19 || !/^[2-6]/.test(d)) return false;
        let sum = 0;
        for (let i = 0; i < d.length; i++) {
          let n = Number(d[d.length - 1 - i]);
          if (i % 2 === 1) {
            n *= 2;
            if (n > 9) n -= 9;
          }
          sum += n;
        }
        return sum % 10 === 0;
      }
      // Wertpruefung fuer harte Treffer. Muss schon beim Sammeln laufen: ein unplausibler Treffer
      // (z. B. PLZ 05331 als Telefonnummer) wuerde sonst die spaetere Adress-Erkennung verdraengen.
      function luhnOk(d) {
        let sum = 0;
        for (let i = 0; i < d.length; i++) {
          let n = Number(d[d.length - 1 - i]);
          if (i % 2 === 1) {
            n *= 2;
            if (n > 9) n -= 9;
          }
          sum += n;
        }
        return sum % 10 === 0;
      }
      function validIntlId(val) {
        const v = val.replace(/[ .\-]/g, "").toUpperCase();
        if (/^\d{8}[A-Z]$/.test(v) || /^[XYZ]\d{7}[A-Z]$/.test(v)) {
          // spanische DNI/NIE: Kontrollbuchstabe = Rest der Zahl durch 23
          const num = Number((v[0] === "X" ? "0" : v[0] === "Y" ? "1" : v[0] === "Z" ? "2" : v[0]) + v.slice(1, 8));
          return "TRWAGMYFPDXBNJZSQVHLCKE"[num % 23] === v[8];
        }
        if (/^\d{11}$/.test(v)) {
          // polnische PESEL: Pruefsumme
          const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
          const sum = w.reduce((a, x, i) => a + x * Number(v[i]), 0);
          return (10 - (sum % 10)) % 10 === Number(v[10]);
        }
        return true;
      }
      // Liefert den (ggf. gekuerzten) Wert oder null, wenn der Treffer unplausibel ist.
      function hardValue(pfx, val, id) {
        if (id === "device" && /^\d{2}[ \-]?\d{6}[ \-]?\d{6}[ \-]?\d$/.test(val)) return luhnOk(val.replace(/\D/g, "")) ? val : null;
        if (id === "intlid" && !validIntlId(val)) return null;
        if (pfx === "KARTE") return isValidCard(val) ? val : null;
        if (pfx === "TEL") return /^[A-Za-zäöüß ,\-]+$/.test(val) || val.replace(/\D/g, "").length >= 7 ? val : null;
        if (pfx === "IBAN" && /^[A-Za-z]{2}\d{2}/.test(val)) {
          const exp = IBAN_LEN[val.slice(0, 2).toUpperCase()];
          if (exp) {
            // Treffer, der ueber die IBAN hinausreicht (angrenzende Ziffern oder Woerter), auf die Landeslaenge kuerzen
            let n = 0;
            for (let i = 0; i < val.length; i++) {
              if (/[A-Za-z0-9]/.test(val[i])) n++;
              if (n === exp) {
                val = val.slice(0, i + 1);
                break;
              }
            }
          }
          // OCR-Verwechslung "O" statt "0" in der Kontonummer tolerieren (nur fuer die Pruefung)
          return isValidIBANFormat(val.slice(0, 4) + val.slice(4).replace(/O/g, "0")) ? val : null;
        }
        return val;
      }
      function isValidBIC(code) {
        return /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(code);
      }
      const IBAN_LEN = {
        DE: 22,
        AT: 20,
        CH: 21,
        FR: 27,
        GB: 22,
        NL: 18,
        IT: 27,
        ES: 24,
        BE: 16,
        LU: 20,
        PL: 28,
        DK: 18,
        SE: 24,
        NO: 15,
        FI: 18,
        IE: 22,
        PT: 25,
        CZ: 24,
        SK: 24,
        HU: 28,
        LI: 21,
        GR: 27,
        HR: 21,
        SI: 19,
        RO: 24,
        BG: 22,
        EE: 20,
        LV: 21,
        LT: 20,
        MT: 31,
        CY: 28,
        IS: 26,
        TR: 26,
      };
      function ibanMod97(c) {
        let rem = 0;
        const s = c.slice(4) + c.slice(0, 4);
        for (const ch of s) {
          const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
          for (const d of v) rem = (rem * 10 + Number(d)) % 97;
        }
        return rem === 1;
      }
      // Bekanntes Land: Laenge muss stimmen (Tippfehler in der Pruefziffer bleiben maskiert).
      // Unbekanntes Land: Laenge 15-34 und gueltige Pruefsumme (mod 97), sonst zu viele Zufallstreffer.
      function isValidIBANFormat(raw) {
        const c = raw.replace(/\s+/g, "").toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(c)) return false;
        const exp = IBAN_LEN[c.slice(0, 2)];
        if (exp) return c.length === exp;
        return c.length >= 15 && c.length <= 34 && ibanMod97(c);
      }
      // Zeilenangaben der zuletzt geprueften Zeile; die Zeile wird einmal getrimmt und auf Nummerierung geprueft,
      // nicht je Treffer (sonst quadratischer Aufwand bei sehr langen Zeilen).
      let headLine = { text: null, ls: 0, le: 0, tStart: 0, tEnd: 0, num: null };
      function isHeadingSpan(text, start, end) {
        const val = text.slice(start, end).trim();
        let h = headLine;
        if (h.text !== text || start < h.ls || end > h.le || start === 0) {
          const ls = text.lastIndexOf("\n", start - 1) + 1;
          let le = text.indexOf("\n", end);
          if (le === -1) le = text.length;
          let tStart = ls;
          while (tStart < le && /\s/.test(text[tStart])) tStart++;
          let tEnd = le;
          while (tEnd > tStart && /\s/.test(text[tEnd - 1])) tEnd--;
          const numbered = text.slice(tStart, tEnd).match(/^(?:[IVXLC]+|\d+(?:\.\d+)*)[\.\)]\s+(.*)$/);
          h = { text, ls, le, tStart, tEnd, num: numbered ? numbered[1].trim() : null };
          // wiederverwendbar nur, wenn die Zeile den Treffer ohne Zeilenwechsel enthaelt
          if (start > 0 && !text.slice(start, end).includes("\n")) headLine = h;
        }
        if (h.num !== null && h.num === val) return true;
        if (h.tEnd - h.tStart === val.length && text.startsWith(val, h.tStart)) {
          const line = val;
          if (/[A-ZÄÖÜ]/.test(line) && line === line.toUpperCase() && !/\d{5}/.test(line)) return !isCapsPersonName(val);
        }
        return false;
      }
      // Alle Treffer eines Musters wie bei einer exec-Schleife. Muster mit fuehrendem Lookbehind (Verankerung am
      // Tokenanfang, schuetzt vor quadratischem Aufwand) suchen nach jedem Treffer im Restteil (slice ist O(1)):
      // Der Lookbehind sieht dort die schon verbrauchten Zeichen nicht, ein Treffer darf also wie ohne Verankerung
      // gleich hinter dem vorigen beginnen (verklebte Werte wie "a@x.de-b@y.de").
      // Nur die in F5 eingefuehrten Verankerungen (E-Mail, Strasse mit Hausnummer und PLZ); andere Lookbehinds (Telefon u. a.) bleiben unberuehrt.
      const ANKER_LB = [
        "(?<![a-zA-Z0-9._%+\\-])",
        "(?:(?![A-Za-zäöüß\\.\\-])|(?<![A-ZÄÖÜ][A-Za-zäöüß\\.\\-]{0,100}))",
        "(?<![a-zA-ZüäöÜÄÖ][a-züäöß \\-]{0,100})",
      ];
      function matchesOf(srcRx, text) {
        const flags = srcRx.flags.includes("g") ? srcRx.flags : srcRx.flags + "g";
        const rx = new RegExp(srcRx.source, flags);
        const out = [];
        if (!ANKER_LB.some((a) => srcRx.source.startsWith(a))) {
          let m;
          while ((m = rx.exec(text)) !== null) {
            if (m.index === rx.lastIndex) rx.lastIndex++;
            out.push(m);
          }
          return out;
        }
        let pos = 0;
        while (pos <= text.length) {
          rx.lastIndex = 0;
          const m = rx.exec(pos ? text.slice(pos) : text);
          if (!m) break;
          m.index += pos;
          out.push(m);
          pos = m.index + m[0].length + (m[0].length === 0 ? 1 : 0);
        }
        return out;
      }
      let lastP1 = { text: null, sig: null, res: null };
      function computePass1(text) {
        const sig = ENTS.map((e) => (activeEnts.has(e.id) ? 1 : 0)).join("") + "|" + cvars.map((c) => c.n + "\u0001" + c.p).join("\u0002") + "|" + JSON.stringify(extraSpans);
        if (!(lastP1.text === text && lastP1.sig === sig)) lastP1 = { text: text, sig: sig, res: computePass1Uncached(text) };
        // Kopie liefern: postProcessSpans veraendert die Treffer (start/end), das darf spaetere Aufrufe nicht beeinflussen.
        return { p1: lastP1.res.p1.map((x) => Object.assign({}, x)), maskedText: lastP1.res.maskedText };
      }
      function computePass1Uncached(text) {
        const pass1 = [];
        for (const cv of cvars) {
          let rx;
          try {
            rx = new RegExp(cv.p, "g");
          } catch (e) {
            rx = new RegExp(cv.p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          }
          let m;
          while ((m = rx.exec(text)) !== null) {
            if (m.index === rx.lastIndex) rx.lastIndex++;
            if (!m[0].trim()) continue;
            pass1.push({
              start: m.index,
              end: m.index + m[0].length,
              pfx: cv.n,
              col: "#ff3b30",
              id: "custom",
              prio: 0,
              meth: "Eigene Regel",
            });
          }
        }
        for (const x of extraSpans) pass1.push(Object.assign({}, x));
        for (const e of ENTS) {
          if (!activeEnts.has(e.id) || !HARD_ENT_IDS.has(e.id)) continue;
          for (const srcRx of e.rx) {
            for (const m of matchesOf(srcRx, text)) {
              let gval = null;
              for (let gi = 1; gi < m.length; gi++)
                if (m[gi] !== undefined) {
                  gval = m[gi];
                  break;
                }
              const raw = gval !== null ? gval : m[0];
              let val = raw.trim();
              if (!val || val.length < 2) continue;
              val = hardValue(e.pfx, val, e.id);
              if (!val) continue;
              const off = (gval !== null ? m[0].indexOf(raw) : 0) + (raw.length - raw.replace(/^\s+/, "").length);
              pass1.push({
                start: m.index + off,
                end: m.index + off + val.length,
                pfx: e.pfx,
                col: e.col,
                id: e.id,
                prio: ENT_PRIO[e.pfx] !== undefined ? ENT_PRIO[e.pfx] : 5,
                meth: "Regex (Pass 1)",
              });
            }
          }
        }
        const p1 = resolveSpanOverlaps(pass1);
        let maskedText = text;
        for (let i = p1.length - 1; i >= 0; i--) {
          maskedText =
            maskedText.slice(0, p1[i].start) + "\0".repeat(p1[i].end - p1[i].start) + maskedText.slice(p1[i].end);
        }
        return { p1: p1, maskedText: maskedText };
      }
      function collectEntities(text) {
        const pass1Result = computePass1(text);
        const p1 = pass1Result.p1;
        const maskedText = pass1Result.maskedText;
        const pass2 = [];
        for (const e of ENTS) {
          if (!activeEnts.has(e.id) || !SOFT_ENT_IDS.has(e.id)) continue;
          for (const srcRx of e.rx) {
            for (const m of matchesOf(srcRx, maskedText)) {
              let gval = null;
              for (let gi = 1; gi < m.length; gi++)
                if (m[gi] !== undefined) {
                  gval = m[gi];
                  break;
                }
              const raw = gval !== null ? gval : m[0];
              const val = raw.trim();
              if (!val || val.length < 2 || val.includes("\0")) continue;
              const off = (gval !== null ? m[0].indexOf(raw) : 0) + (raw.length - raw.replace(/^\s+/, "").length);
              pass2.push({
                start: m.index + off,
                end: m.index + off + val.length,
                pfx: e.pfx,
                col: e.col,
                id: e.id,
                prio: ENT_PRIO[e.pfx] !== undefined ? ENT_PRIO[e.pfx] : 5,
                meth: "Regex (Pass 2)",
              });
            }
          }
        }
        if (aiCache.key === text) {
          for (const s of aiCache.spans) {
            const val = text.slice(s.start, s.end);
            const vt = val.trim();
            if (!vt || val.includes("\0")) continue;
            if (vt.length < 3) continue;
            const ls = text.lastIndexOf("\n", s.start - 1) + 1;
            let le = text.indexOf("\n", s.end);
            if (le === -1) le = text.length;
            const headLine = text.slice(ls, le).trim();
            if (
              /[A-ZÄÖÜ]/.test(headLine) &&
              headLine === headLine.toUpperCase() &&
              !/\d{5}/.test(headLine) &&
              !isCapsPersonName(vt)
            )
              continue;
            if (s.pfx === "ORG" && ORG_LEGAL_ONLY.test(vt)) continue;
            if (s.pfx === "ORG" && /^(?:AG|GmbH|KG|OHG|GbR|UG|SE|eG|Ltd\.?|Inc\.?|Corp\.?)[ \t]/.test(vt)) continue;
            if (SW.has(vt) || SW.has(vt.replace(/[^A-Za-züäöÄÖÜß]/g, ""))) continue;
            if (s.pfx === "NAME" && vt.split(/\s+/).every((w) => SW.has(w))) continue;
            pass2.push({
              start: s.start,
              end: s.end,
              pfx: s.pfx,
              col: s.col,
              id: "ai",
              prio: 5,
              meth: "KI (NER-Modell)",
            });
          }
        }
        if (wordlistsOn && activeEnts.size > 0) {
          try {
            const aiMap = {
              PER: { pfx: "NAME", col: "#f59e0b" },
              ORG: { pfx: "ORG", col: "#8b5cf6" },
              LOC: { pfx: "ORT", col: "#3b82f6" },
            };
            // Mit KI-Treffern ergaenzen die Wortlisten nur Luecken des Modells: Personennamen mit bekanntem Vornamen, die keinen
            // anderen Treffer beruehren. Organisationen und Orte kommen vom Modell (sonst Ueber-Maskierung durch Stichwoerter wie
            // Bank, Hotel), Nachnamen allein auch nicht (Link, Koch, Klein sind auch Alltagswoerter).
            const aiOn = aiCache.key === text;
            let belegt = null, maxEnd = null;
            if (aiOn) {
              belegt = p1.concat(pass2).sort((a, b) => a.start - b.start);
              maxEnd = [];
              belegt.forEach((x, i) => (maxEnd[i] = i ? Math.max(maxEnd[i - 1], x.end) : x.end));
            }
            const beruehrt = (a, b) => {
              let lo = 0, hi = belegt.length;
              while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (belegt[mid].start < b) lo = mid + 1;
                else hi = mid;
              }
              return lo > 0 && maxEnd[lo - 1] > a;
            };
            const neu = [];
            const ART = "(?:der|die|das|den|dem|des|ein|eine|einem|einen|einer|eines|mein|meine|meinen|dein|deine|unser|unsere|sein|seine|ihr|ihre|kein|keine|am|im|zum|zur|vom|beim)";
            const ART_ANF = new RegExp("^" + ART + "[ \\t]+", "i");
            const ART_START = new RegExp("^" + ART + "[ \\t]", "i");
            const ART_VOR = new RegExp("(?:^|[\\s(])" + ART + "[ \\t]+$", "i");
            detectLocalEntities(maskedText).forEach(function (ent) {
              const t = aiMap[ent.entity_group];
              if (!t) return;
              if (aiOn && ent.entity_group !== "PER") return;
              const val = (ent.word || "").trim();
              if (!val || val.length < 3 || val.includes("\0")) return;
              if (maskedText.slice(ent.start, ent.start + val.length) !== val) return;
              if (ent.entity_group === "LOC" && ent.score < 0.85) return;
              if (ent.entity_group === "ORG" && ORG_LEGAL_ONLY.test(val)) return;
              if (SW.has(val)) return;
              if (aiOn && (!val.split(/[\s-]/).some((w) => LOCAL_NAMES.has(w)) || beruehrt(ent.start, ent.start + val.length))) return;
              // Einzelner Vorname direkt hinter Artikel oder Praeposition mit Artikel ist meist ein Alltagswort ("die Iris", "ein Falk");
              // auch wenn der Artikel am Satzanfang als Teil des Treffers gelesen wurde ("Ein Anton")
              {
                // schwache Vornamen (Kai, Iris, ...): nicht hinter Artikel ("Am Kai"), nicht als Erstglied eines Kompositums ("Iris-Blende")
                const kern = val.replace(ART_ANF, "");
                const teile = kern.split("-");
                if ((WEAK_NAMES.has(kern) && (kern !== val || ART_VOR.test(maskedText.slice(Math.max(0, ent.start - 12), ent.start)))) || (teile.length > 1 && WEAK_NAMES.has(teile[0]) && !LOCAL_NAMES.has(teile[1]))) return;
              }
              if (aiOn && (ART_START.test(val) || (!/[\s-]/.test(val) && ART_VOR.test(maskedText.slice(Math.max(0, ent.start - 12), ent.start))))) return;
              neu.push({
                start: ent.start,
                end: ent.start + val.length,
                pfx: t.pfx,
                col: t.col,
                id: "ai",
                prio: 5,
                meth: "KI-Erkennung (Wortlisten)",
              });
            });
            for (const x of neu) pass2.push(x);
          } catch (err) {
            console.error("Lokale KI-Erkennung (nicht fatal):", err);
          }
        }
        return postProcessSpans(text, p1.concat(pass2));
      }
      function resolveSpanOverlaps(spans) {
        const LABEL_TYPES = new Set(["NAME", "ORG", "ORT"]);
        const all = spans.slice();
        // Nur Treffer mit niedrigerer prio als das Maximum koennen einen anderen aufnehmen; ihre Indizes (aufsteigend)
        // werden gefuehrt, damit der Aufwand nicht quadratisch in der Trefferzahl waechst. Entfernte Treffer werden markiert.
        let maxPrio = -Infinity;
        let nonNumeric = false;
        for (const s of all) {
          if (typeof s.prio === "number" && s.prio === s.prio) maxPrio = Math.max(maxPrio, s.prio);
          else nonNumeric = true;
        }
        const gone = new Uint8Array(all.length);
        const cont = [];
        for (let k = 0; k < all.length; k++) if (nonNumeric || all[k].prio < maxPrio) cont.push(k);
        for (let i = 0; i < all.length; i++) {
          const a = all[i];
          if (gone[i] || !LABEL_TYPES.has(a.pfx)) continue;
          for (let c = 0; c < cont.length; c++) {
            const j = cont[c];
            if (i === j || gone[j]) continue;
            const b = all[j];
            if (b.prio >= a.prio) continue;
            if (a.start >= b.start && a.end <= b.end) {
              a.start = b.start;
              a.end = b.end;
              a.prio = b.prio;
              gone[j] = 1;
              if (!nonNumeric && !(a.prio >= maxPrio)) {
                let lo = 0,
                  hi = cont.length;
                while (lo < hi) {
                  const mid = (lo + hi) >> 1;
                  if (cont[mid] < i) lo = mid + 1;
                  else hi = mid;
                }
                if (cont[lo] !== i) cont.splice(lo, 0, i);
              }
              break;
            }
          }
        }
        const working = all.filter((_, k) => !gone[k]);
        working.sort(function (a, b) {
          return (a.prio || 5) - (b.prio || 5) || b.end - b.start - (a.end - a.start) || a.start - b.start;
        });
        // Akzeptierte Treffer sind ueberlappungsfrei und nach Start sortiert: es genuegt, die Nachbarn zu pruefen.
        const accepted = [];
        for (const s of working) {
          let lo = 0,
            hi = accepted.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (accepted[mid].start < s.start) lo = mid + 1;
            else hi = mid;
          }
          const prev = accepted[lo - 1],
            next = accepted[lo];
          if (prev && prev.end > s.start) continue;
          if (next && next.start < s.end) continue;
          accepted.splice(lo, 0, s);
        }
        return accepted;
      }
      // Obergrenze (Zeichen) fuer Namensspannen beim Verlaengern; schuetzt vor quadratischem Aufwand bei Endlosfolgen grossgeschriebener Woerter.
      const MAX_NAME_SPAN = 120;
      function postProcessSpans(text, cands) {
        // Ueberlange Namensketten: der Rest ab der Abbruchstelle wird als eigener Treffer weitergefuehrt (je Anfang nur einmal),
        // damit kein Teil der Kette ungeschwaerzt bleibt.
        const nameStarts = new Set();
        for (const c of cands) if (c.pfx === "NAME") nameStarts.add(c.start);
        const rxWort = /^[ \t]+([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]+)?)(?![\wäöüß])/;
        const rxVon = /^[ \t]+(?:von|van|de|zu|zur|vom|ter|ten|di|da|le|la|bin|ibn)(?:[ \t]+(?:der|den|dem|la|los))?[ \t]+([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)/;
        const rxBind = /^-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}/;
        // Treffer je Position zwischenspeichern: viele Treffer laufen ueber dieselben Woerter (sonst Aufwand Treffer mal Spannenlaenge).
        const vorMemo = (rx) => {
          const memo = new Map();
          return (pos) => {
            let r = memo.get(pos);
            if (r === undefined) {
              r = text.slice(pos).match(rx);
              memo.set(pos, r);
            }
            return r;
          };
        };
        const vorWort = vorMemo(rxWort);
        const vorVon = vorMemo(rxVon);
        const vorBind = vorMemo(rxBind);
        const weiter = (s, pos, len, richtung) => {
          s.kette = true;
          if (nameStarts.has(pos)) return;
          nameStarts.add(pos);
          cands.push(Object.assign({}, s, { start: pos, end: pos + len, fort: richtung !== "rueck", rueck: richtung === "rueck" }));
        };
        const ADDR_LEAD = /^(?:Sitz|Anschrift|Adresse|Geschäftssitz|Wohnsitz|Lieferadresse|Rechnungsadresse)[ \t]+/;
        for (const s of cands) {
          let m = null;
          if (s.pfx === "ORG") m = text.slice(s.start, s.end).match(ORG_LEAD);
          else if (s.pfx === "ADRESSE") m = text.slice(s.start, s.end).match(ADDR_LEAD);
          if (m && m[0].length < s.end - s.start) s.start += m[0].length;
        }
        for (const s of cands) {
          if (s.pfx !== "NAME") continue;
          let m2;
          while (
            (m2 = text.slice(s.start, s.end).match(/^([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][A-Za-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ\-]*)[ \t]+/)) &&
            (SW.has(m2[1]) || SW.has(m2[1].replace(/[^A-Za-züäöÄÖÜß]/g, "")))
          ) {
            s.start += m2[0].length;
          }
          while (
            (m2 = vorWort(s.end)) &&
            !SW.has(m2[1])
          ) {
            if (s.end - s.start + m2[0].length > MAX_NAME_SPAN) {
              weiter(s, s.end + m2[0].length - m2[1].length, m2[1].length);
              break;
            }
            s.end += m2[0].length;
          }
        }
        for (const s of cands) {
          if (s.pfx !== "NAME") continue;
          let mp;
          while (
            (mp = vorVon(s.end)) &&
            !(SW.has(mp[1]) && !LOCAL_SURNAMES.has(mp[1]))
          ) {
            if (s.end - s.start + mp[0].length > MAX_NAME_SPAN) {
              weiter(s, s.end + mp[0].length - mp[1].length, mp[1].length);
              break;
            }
            s.end += mp[0].length;
          }
          const ml = text.slice(Math.max(0, s.start - 60), s.start).match(/([A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}(?:-[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,})?)[ \t]+(?:von|van|de|zu|zur|vom|ter|ten|di|da|le|la|bin|ibn)(?:[ \t]+(?:der|den|dem|la|los))?[ \t]+$/);
          if (ml && !SW.has(ml[1])) s.start -= ml[0].length;
        }
        for (const s of cands) {
          if (s.pfx !== "NAME") continue;
          let mh;
          while (!s.rueck && (mh = vorBind(s.end))) {
            if (s.end - s.start + mh[0].length > MAX_NAME_SPAN) {
              weiter(s, s.end + 1, mh[0].length - 1);
              break;
            }
            s.end += mh[0].length;
          }
          while (!s.fort && (mh = text.slice(Math.max(0, s.start - 40), s.start).match(/[A-ZÜÄÖÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕØÙÚÛÝŁŚŠŽČŘŇĎŤĆŃŹŻĄĘĞİŞŐŰŒ][a-züäößàáâãåæçèéêëìíîïñòóôõøùúûýłśšžčřňďťćńźżąęğışőűœ]{2,}-$/))) {
            if (s.end - s.start + mh[0].length > MAX_NAME_SPAN) {
              weiter(s, s.start - mh[0].length, mh[0].length - 1, "rueck");
              break;
            }
            s.start -= mh[0].length;
          }
        }
        const valid = cands.filter(function (s) {
          const val = text.slice(s.start, s.end);
          if (!val || val.length < 2) return false;
          if (val.includes("{{") || val.includes("}}") || val.includes("\0")) return false;
          if (isWhitelisted(val)) return false;
          if (["NAME", "ORG", "ROLLE", "ORT"].includes(s.pfx)) {
            if (s.end < text.length && /[\wäöüÄÖÜß]/.test(text[s.end])) return false;
            if (s.start > 0 && /[\wäöüÄÖÜß]/.test(text[s.start - 1])) return false;
          }
          if (s.pfx === "KARTE" && !isValidCard(val)) return false;
          if (s.pfx === "BIC") {
            if (!isValidBIC(val)) return false;
            if (!/\d/.test(val) && !/XXX$/.test(val)) {
              const ls = text.lastIndexOf("\n", s.start - 1) + 1;
              let le = text.indexOf("\n", s.end);
              if (le === -1) le = text.length;
              if (!/BIC|SWIFT|IBAN|Bank|BLZ|Konto/i.test(text.slice(ls, s.start) + text.slice(s.end, le))) return false;
            }
          }
          if (s.pfx === "IBAN" && /^[A-Za-z]{2}\d{2}/.test(val) && !isValidIBANFormat(val)) return false;
          if (s.pfx === "NAME" && !okName(val)) return false;
          if (s.pfx === "ORG" && ORG_LEGAL_ONLY.test(val)) return false;
          if (s.pfx === "ORT" && SW.has(val)) return false;
          if (["NAME", "ORG", "ORT", "ROLLE"].includes(s.pfx) && isHeadingSpan(text, s.start, s.end)) return false;
          return true;
        });
        valid.sort(function (a, b) {
          return a.start - b.start || b.end - a.end;
        });
        const MERGE_GAP = { ADRESSE: /^[,\s]{1,6}$/, NAME: /^\s$/, ORG: /^[\s&,]{1,3}$/ };
        const mergedSpans = [];
        for (const s of valid) {
          const last = mergedSpans[mergedSpans.length - 1];
          // Gekappte Namensketten ueberlappen sich (jedes Stueck endet an der Kette Ende): zur Vereinigung zusammenfuehren,
          // sonst gewinnt in resolveSpanOverlaps nur das laengste Stueck und der Anfang der Kette bliebe im Klartext.
          if (last && last.pfx === "NAME" && s.pfx === "NAME" && (last.kette || s.kette) && s.start < last.end) {
            last.end = Math.max(last.end, s.end);
            last.kette = true;
            continue;
          }
          if (
            last &&
            last.pfx === s.pfx &&
            MERGE_GAP[s.pfx] &&
            s.start >= last.end &&
            MERGE_GAP[s.pfx].test(text.slice(last.end, s.start))
          ) {
            last.end = Math.max(last.end, s.end);
            continue;
          }
          mergedSpans.push({
            start: s.start,
            end: s.end,
            pfx: s.pfx,
            col: s.col,
            id: s.id,
            prio: s.prio,
            meth: s.meth,
            kette: s.kette,
          });
        }
        const final = resolveSpanOverlaps(mergedSpans);
        final.forEach(function (s) {
          s.val = text.slice(s.start, s.end);
        });
        return final;
      }
      function normalizeForDetection(t) {
        return t
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
          .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
      }
      function smartSuffix(val, pfx) {
        cnt[pfx] = (cnt[pfx] || 0) + 1;
        return String(cnt[pfx]);
      }
      // Rueckwaerts-Index Wert -> erstes Token. Wird neu aufgebaut, sobald `store` ein neues Objekt ist (Zuruecksetzen).
      let storeIdx = new Map(),
        storeIdxFor = null;
      function storeIndex() {
        if (storeIdxFor !== store) {
          storeIdx = new Map();
          for (const [t, d] of Object.entries(store)) if (!storeIdx.has(d.v)) storeIdx.set(d.v, t);
          storeIdxFor = store;
        }
        return storeIdx;
      }
      function tok(val, pfx, col, meth) {
        const cleanVal = val.replace(/\{\{[^}]*\}\}/g, "").trim();
        if (!cleanVal || cleanVal.length < 2) return val;
        const idx = storeIndex();
        const known = idx.get(cleanVal);
        if (known !== undefined) return known;
        const suffix = smartSuffix(cleanVal, pfx);
        let base = "{{" + pfx + "_" + suffix + "}}";
        if (store[base] && store[base].v !== cleanVal) {
          cnt[pfx] = (cnt[pfx] || 0) + 1;
          base = "{{" + pfx + "_" + suffix + "_" + cnt[pfx] + "}}";
        }
        store[base] = { v: cleanVal, t: pfx, c: col, m: meth };
        if (!idx.has(cleanVal)) idx.set(cleanVal, base);
        return base;
      }

  function createState() {
    return { store: {}, cnt: {} };
  }

  function resetContext() {
    cvars = [];
    whitelist = [];
    extraSpans = [];
    activeEnts = new Set();
    aiCache = { key: null, spans: [] };
    wordlistsOn = true;
  }

  // Aktive Regeln: opts.ents hat Vorrang; sonst die Regeln des Profils (unbekanntes Profil: standard)
  function activeIds(o) {
    if (Array.isArray(o.ents)) return o.ents;
    const p = PROFILES.find((x) => x.id === o.profile) || PROFILES.find((x) => x.id === "standard");
    return p.ents;
  }

  // Kontext des Aufrufs setzen (gemeinsam fuer detect und maskHard); det = normalisierter Text
  function setContext(o, det) {
    cvars = Array.isArray(o.cvars) ? o.cvars : [];
    whitelist = Array.isArray(o.whitelist) ? o.whitelist : [];
    activeEnts = new Set(activeIds(o));
    wordlistsOn = o.wordlists !== false;
    extraSpans = (Array.isArray(o.extraSpans) ? o.extraSpans : [])
      .filter((x) => x && Number.isInteger(x.start) && Number.isInteger(x.end) && x.start >= 0 && x.end > x.start && x.end <= det.length)
      .map((x) => ({
        start: x.start,
        end: x.end,
        pfx: x.pfx,
        col: x.col,
        id: x.id !== undefined ? x.id : "custom",
        prio: typeof x.prio === "number" ? x.prio : 0,
        meth: x.meth !== undefined ? x.meth : "Eigene Regel",
      }));
  }

  // text -> Spans [{ start, end, pfx, col, id, prio, meth, val }], nach Position sortiert, ueberlappungsfrei
  function detect(text, opts) {
    const o = opts || {};
    const input = typeof text === "string" ? text : String(text == null ? "" : text);
    const det = normalizeForDetection(input);
    setContext(o, det);
    aiCache = Array.isArray(o.aiSpans) ? { key: det, spans: o.aiSpans } : { key: null, spans: [] };
    try {
      let spans = collectEntities(det);
      spans.forEach((sp) => (sp.val = input.slice(sp.start, sp.end)));
      const rel = Array.isArray(o.released) ? o.released : [];
      if (rel.length) spans = spans.filter((sp) => !rel.some((r) => r && r.pfx === sp.pfx && r.value === sp.val));
      return spans;
    } finally {
      resetContext();
    }
  }

  // Wie anonCore ohne Oberflaeche: Treffer von hinten nach vorne durch Platzhalter ersetzen; state wird in place fortgeschrieben
  function anonymize(text, opts) {
    const o = opts || {};
    const input = typeof text === "string" ? text : String(text == null ? "" : text);
    const state = o.state || createState();
    if (!state.store) state.store = {};
    if (!state.cnt) state.cnt = {};
    const spans = detect(input, o);
    store = state.store;
    cnt = state.cnt;
    storeIdx = new Map();
    storeIdxFor = null;
    try {
      const parts = [];
      let tail = input.length;
      for (let i = spans.length - 1; i >= 0; i--) {
        const s = spans[i];
        parts.push(input.slice(s.end, tail), tok(s.val, s.pfx, s.col, s.meth));
        tail = s.start;
      }
      parts.push(input.slice(0, tail));
      return { text: parts.reverse().join(""), state: state, spans: spans };
    } finally {
      store = {};
      cnt = {};
      storeIdx = new Map();
      storeIdxFor = null;
    }
  }

  // Platzhalter (laengste zuerst) durch die Originalwerte ersetzen; ohne Platzhalter unveraendert
  function deanonymize(text, state) {
    const st = state && state.store ? state.store : {};
    const tokens = Object.keys(st).sort((a, b) => b.length - a.length);
    return tokens.length
      ? String(text).replace(new RegExp(tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g"), (m) => st[m].v)
      : String(text);
  }

  // Text mit maskierten Pass-1-Treffern (cvars, extraSpans, harte Regeln; Treffer durch \0 ersetzt), wie ihn die KI-Erkennung
  // der Oberflaeche sieht. text ist bereits normalisiert (normalizeForDetection); opts wie bei detect (ents/profile, cvars, extraSpans).
  function maskHard(text, opts) {
    const o = opts || {};
    const det = typeof text === "string" ? text : String(text == null ? "" : text);
    setContext(o, det);
    try {
      return computePass1(det).maskedText;
    } finally {
      resetContext();
    }
  }

  // Stoppwort der Erkennung (exakte Schreibweise wie in der Liste)
  function isStopword(w) {
    return SW.has(w);
  }

  // Platzhalter fuer einen Wert vergeben und in state eintragen (state wird in place fortgeschrieben, wie bei anonymize)
  function token(state, val, pfx, col, meth) {
    if (!state || !state.store || !state.cnt) throw new TypeError("state mit store und cnt erforderlich");
    store = state.store;
    cnt = state.cnt;
    storeIdx = new Map();
    storeIdxFor = null;
    try {
      return tok(String(val), pfx, col, meth);
    } finally {
      store = {};
      cnt = {};
      storeIdx = new Map();
      storeIdxFor = null;
    }
  }

  return { PROFILES, ENTS, detect, createState, anonymize, deanonymize, normalizeForDetection, maskHard, isStopword, token };
});
