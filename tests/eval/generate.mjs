// Synthetische deutsche Dokumente mit bekannter Wahrheit (Ground Truth).
// Gleicher Seed = gleiche Dokumente, damit Messungen vergleichbar bleiben.
// Jedes Dokument: { template, text, truth: [{ type, frags: [Fragmente, die nach dem Anonymisieren verschwunden sein muessen] }] }

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Anna', 'Thomas', 'Sabine', 'Jürgen', 'Fatima', 'Lena', 'Tobias', 'Ilse', 'Karl-Heinz', 'Mohammed', 'Zoë', 'José', 'Søren', 'Łucja', 'Çağlar', 'Dieter', 'Birgit', 'Matthias', 'Nadine', 'Ömer', 'Katharina', 'Stefan', 'Yasemin', 'Florian', 'Hannelore', 'Lukas', 'Marlene', 'Oliver', 'Petra', 'Ralf'];
const LAST = ['Müller', 'Schmidt-Weber', 'Krüger', 'Yilmaz', 'Hoffmann', 'Richter', 'Aigner-Lechner', 'Al-Farsi', 'García', 'Kierkegaard', 'Wiśniewska', 'Yıldız', 'Bärtschi', 'Obermaier', 'Nowak', 'Kowalski', 'Wagner', 'Becker', 'Schulz', 'Koch', 'Bauer', 'Schäfer', 'Neumann', 'Zimmermann', 'Dvořák', 'Šimek', 'Lüdenscheidt', 'Braun', 'Hartmann', 'Voigt'];
const PART = ['', '', '', 'von der ', 'van ', 'de '];
const TITLE = ['', '', 'Dr. ', 'Prof. Dr. ', 'Dipl.-Ing. '];
const STREET = ['Musterstraße', 'Hauptstr.', 'Am Markt', 'Lindenallee', 'Gartenweg', 'Bahnhofstrasse', 'Kantonsstrasse', 'Schillerplatz', 'Rosenweg', 'Industriestraße', 'Berliner Allee', 'Kirchgasse'];
const CITY_DE = ['München', 'Berlin', 'Köln', 'Hamburg', 'Leipzig', 'Freiburg im Breisgau', 'Stuttgart', 'Dresden', 'Nürnberg', 'Essen'];
const CITY_4 = [['Linz', 'A-'], ['Zürich', 'CH-'], ['Graz', ''], ['Basel', ''], ['Wien', ''], ['Bern', 'CH-']];
const ORG = ['Nordlicht Logistik GmbH', 'Müller & Söhne GmbH & Co. KG', 'Beispiel Consulting UG (haftungsbeschränkt)', 'Stadtwerke Beispielstadt GmbH', 'Kanzlei Schmidt & Partner PartG mbB', 'Alpenblick Hotel AG', 'Rheinland Versicherung AG', 'Praxis Dr. Weber', 'Sonnenhof Pflegedienst e.V.', 'Tannenberg Bau KG'];
const MONTH_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function makeGen(seed) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');
  const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(65 + int(0, 25))).join('');
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  const mod97 = (s) => { let rem = 0; for (const ch of s) { const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); for (const d of v) rem = (rem * 10 + +d) % 97; } return rem; };
  const iban = (cc, bban) => { const chk = pad(98 - mod97(bban + cc + '00')); return cc + chk + bban; };
  const IBANS = {
    DE: () => iban('DE', digits(18)), AT: () => iban('AT', digits(16)), CH: () => iban('CH', digits(17)),
    NL: () => iban('NL', letters(4) + digits(10)), FR: () => iban('FR', digits(23)), IT: () => iban('IT', letters(1) + digits(22)),
    GB: () => iban('GB', letters(4) + digits(14)), ES: () => iban('ES', digits(20)),
  };
  const group4 = (s) => s.replace(/(.{4})/g, '$1 ').trim();
  const luhnComplete = (prefix, len) => { let body = prefix + digits(len - prefix.length - 1); let sum = 0; for (let i = 0; i < body.length; i++) { let d = +body[body.length - 1 - i]; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } sum += d; } return body + ((10 - (sum % 10)) % 10); };

  const g = {
    pick, int, digits,
    name(style) {
      const first = pick(FIRST), last = pick(LAST), part = pick(PART), title = pick(TITLE);
      const frags = [first, last.split('-').pop()];
      if (part) frags.push(last);
      const surname = part + last;
      const forms = { full: `${first} ${surname}`, formal: `${title}${first} ${surname}`, herr: `Herr ${title}${surname}`, frau: `Frau ${title}${surname}`, initial: `${first[0]}. ${surname}` };
      const text = forms[style || pick(['full', 'formal', 'herr', 'frau', 'initial'])];
      const f = style === 'herr' || style === 'frau' ? [last.split('-').pop()] : text.startsWith(first[0] + '.') ? [last.split('-').pop()] : frags;
      return { text, truth: { type: 'NAME', frags: f } };
    },
    org() { const o = pick(ORG); return { text: o, truth: { type: 'ORG', frags: [o.split(' ')[0] === 'Praxis' ? o : o.split(' ').slice(0, 2).join(' ')] } }; },
    address() {
      const st = pick(STREET), no = int(1, 150) + (r() < 0.2 ? pick(['a', 'b']) : '');
      if (r() < 0.65) { const city = pick(CITY_DE), plz = digits(5); return { text: `${st} ${no}, ${plz} ${city}`, truth: [{ type: 'ADR', frags: [`${st} ${no}`, plz] }, { type: 'ORT', frags: [city.split(' ')[0]] }] }; }
      const [city, pre] = pick(CITY_4), plz = String(int(1000, 9999));
      return { text: `${st} ${no}, ${pre}${plz} ${city}`, truth: [{ type: 'ADR', frags: [`${st} ${no}`, plz] }, { type: 'ORT', frags: [city] }] };
    },
    phone() {
      const a = pick(['89', '30', '40', '221', '711', '170', '151', '160']), s = digits(int(6, 8));
      const forms = [`+49 ${a} ${s}`, `0${a}/${s}`, `0${a} ${s}`, `+49 (0)${a} ${s}`, `0049 ${a} ${s}`, `0${a}-${s}`, `+43 1 ${s}`, `+41 44 ${s.slice(0, 3)} ${s.slice(3)}`];
      const t = pick(forms);
      return { text: t, truth: { type: 'TEL', frags: [t.match(/\d+(?=\D*$)/)[0]] } };
    },
    email() { const e = `${pick(FIRST).toLowerCase().replace(/[^a-z]/g, '')}.${pick(LAST).toLowerCase().replace(/[^a-z]/g, '')}@${pick(['firma', 'beispiel', 'mail', 'kanzlei'])}.${pick(['de', 'com', 'at', 'ch'])}`; return { text: e, truth: { type: 'EMAIL', frags: [e] } }; },
    url() { const u = pick([`https://www.beispiel.de/kunde/${int(1000, 99999)}?token=${letters(6).toLowerCase()}`, `www.linkedin.com/in/${pick(FIRST).toLowerCase().replace(/[^a-z]/g, '')}-${pick(LAST).toLowerCase().replace(/[^a-z]/g, '')}`, `https://portal.firma.de/vorgang/${digits(6)}`]); return { text: u, truth: { type: 'URL', frags: [u.replace(/^https?:\/\/(www\.)?/, '').split('/').slice(1).join('/') || u] } }; },
    ip() { const v = r() < 0.7 ? `${int(1, 223)}.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}` : `2001:0db8:${digits(4)}:0000:0000:${letters(4).toLowerCase().replace(/[g-z]/g, 'a')}:0370:7334`; return { text: v, truth: { type: 'IP', frags: [v.includes(':') ? v.split(':').slice(4).join(':') : v] } }; },
    iban() { const cc = pick(Object.keys(IBANS)), raw = IBANS[cc](); const form = pick(['spaced', 'spaced', 'compact', 'lower']); const t = form === 'spaced' ? group4(raw) : form === 'compact' ? raw : raw.toLowerCase(); return { text: t, truth: { type: 'IBAN', frags: [t.slice(-9)] } }; },
    card() { const brand = pick([['4', 16], ['51', 16], ['55', 16], ['37', 15]]); const n = luhnComplete(brand[0], brand[1]); const t = brand[1] === 15 ? `${n.slice(0, 4)} ${n.slice(4, 10)} ${n.slice(10)}` : group4(n); return { text: t, truth: { type: 'CARD', frags: [t.slice(-9)] } }; },
    taxid() { const d = digits(11), t = pick([`${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`, d]); return { text: t, truth: { type: 'TAXID', frags: [t.slice(-6)] } }; },
    date() {
      const d = int(1, 28), m = int(1, 12), y = int(1940, 2005);
      const forms = [`${pad(d)}.${pad(m)}.${y}`, `${d}. ${MONTH_DE[m - 1]} ${y}`, `${y}-${pad(m)}-${pad(d)}`, `${pad(d)}/${pad(m)}/${y}`, `${d} ${MONTH_EN[m - 1]} ${y}`];
      const t = pick(forms); return { text: t, truth: { type: 'DATUM', frags: [t] } };
    },
    plate() { const p = `${pick(['M', 'B', 'HH', 'K', 'S', 'F', 'DD', 'N'])}-${letters(int(1, 2))} ${int(1, 9999)}${r() < 0.15 ? 'E' : ''}`; return { text: p, truth: { type: 'KFZ', frags: [p] } }; },
    vin() { const v = (letters(3).replace(/[IOQ]/g, 'X') + 'ZZZ' + digits(3) + letters(2).replace(/[IOQ]/g, 'A') + digits(6)).slice(0, 17).padEnd(17, '0'); return { text: v, truth: { type: 'KFZ', frags: [v] } }; },
    amount() { const t = `${int(10, 9999)},${pad(int(0, 99))} EUR`; return { text: t, truth: { type: 'BETRAG', frags: [t.split(' ')[0]] } }; },
  };
  return g;
}

// ---- Vorlagen: jede gibt { text, truth } zurueck ----
const T = {
  rechnung(g) {
    const org = g.org(), cust = g.name('full'), adr = g.address(), tel = g.phone(), mail = g.email(), ib = g.iban(), dt = g.date(), am = g.amount();
    return [`${org.text}\n${adr.text}\n\nRechnung Nr. ${g.digits(7)}\n\nSehr geehrte(r) ${cust.text},\nfür Ihre Bestellung berechnen wir ${am.text}. Bitte überweisen Sie bis zum ${dt.text} auf IBAN ${ib.text}.\nRückfragen: ${tel.text} oder ${mail.text}.\n\nMit freundlichen Grüßen\n${g.name('full').text}`, [org, cust, adr, tel, mail, ib, dt, am]];
  },
  kuendigung(g) {
    const me = g.name('formal'), adr = g.address(), org = g.org(), oadr = g.address(), dt = g.date(), id = g.taxid();
    return [`${me.text}\n${adr.text}\n\n${org.text}\n${oadr.text}\n\nKündigung meines Vertrags\n\nSehr geehrte Damen und Herren,\nhiermit kündige ich meinen Vertrag. Mein Geburtsdatum: ${dt.text}. Steuer-ID: ${id.text}.\n\nMit freundlichen Grüßen\n${me.text}`, [me, adr, org, oadr, { text: dt.text, truth: dt.truth }, { text: id.text, truth: id.truth }]];
  },
  arztbrief(g) {
    const pat = g.name('full'), dt = g.date(), adr = g.address(), arzt = g.name('formal'), praxis = g.org();
    return [`${praxis.text}\n\nPatient: ${pat.text}, geboren am ${dt.text}\nAnschrift: ${adr.text}\n\nSehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,\nder Patient wurde ambulant behandelt. Die Weiterbehandlung erfolgt durch ${arzt.text}.\n\nMit kollegialen Grüßen\n${arzt.text}`, [praxis, pat, dt, adr, arzt]];
  },
  mahnung(g) {
    const s = g.name('herr'), ib = g.iban(), am = g.amount(), org = g.org(), tel = g.phone(), ip = g.ip();
    return [`${org.text}\nMahnung\n\nSehr geehrter ${s.text},\nsie schulden uns ${am.text}. Zahlung an ${ib.text}. Telefonische Rückfragen: ${tel.text}. Zugriff erfolgte von ${ip.text}.\n`, [org, s, ib, am, tel, ip]];
  },
  mail(g) {
    const a = g.name('full'), b = g.name('full'), ea = g.email(), eb = g.email(), tel = g.phone(), u = g.url();
    return [`Von: ${a.text} <${ea.text}>\nAn: ${b.text} <${eb.text}>\nBetreff: Unterlagen\n\nHallo ${b.text.split(' ')[0]},\nanbei der Link ${u.text}. Ich bin unter ${tel.text} erreichbar.\n\nViele Grüße\n${a.text}`, [a, b, ea, eb, tel, u]];
  },
  schaden(g) {
    const h = g.name('formal'), k = g.plate(), v = g.vin(), adr = g.address(), org = g.org(), ib = g.iban(), card = g.card();
    return [`Schadensmeldung an ${org.text}\n\nHalter: ${h.text}\nAnschrift: ${adr.text}\nKennzeichen: ${k.text}\nFahrgestellnummer: ${v.text}\nAuszahlung auf ${ib.text} oder Karte ${card.text}.`, [org, h, adr, k, v, ib, card]];
  },
  vollmacht(g) {
    const a = g.name('initial'), b = g.name('initial'), c = g.name('herr');
    return [`Vollmacht\n\nHiermit bevollmächtige ich ${a.text}, vertreten durch ${c.text}, sowie ${b.text} zur Abgabe aller Erklärungen.`, [a, b, c]];
  },
};

export const TEMPLATES = Object.keys(T);

export function generateDocs(count, seed = 20261020) {
  const g = makeGen(seed);
  const docs = [];
  for (let i = 0; i < count; i++) {
    const name = TEMPLATES[i % TEMPLATES.length];
    const [text, items] = T[name](g);
    const truth = items.flatMap((it) => (Array.isArray(it.truth) ? it.truth : [it.truth]));
    docs.push({ template: name, text, truth });
  }
  return docs;
}

// ---------------------------------------------------------------------------
// C1.0: zweite Dokumentmenge (14 Vorlagen x 7 = 98 Dokumente). Eigener Zufallsstrom (Seed 20261021);
// generateDocs/TEMPLATES oben bleiben unveraendert, damit Referenz und Ratsche der 42 Dokumente stabil sind.
// ---------------------------------------------------------------------------
const BERUF = ['Sachbearbeiter', 'Projektleiter', 'Buchhalterin', 'Softwareentwickler', 'Pflegefachkraft', 'Vertriebsleiter', 'Elektrikerin', 'Logistikplaner'];
const TAET = ['die Bearbeitung eingehender Anfragen', 'die Planung und Steuerung von Projekten', 'die laufende Buchhaltung', 'die Entwicklung interner Werkzeuge', 'die Betreuung unserer Kunden', 'die Koordination der Auslieferung'];
const SPRECHER = ['MOD', 'TN1', 'TN2', 'PR'];
const NOTE = ['sehr gut', 'gut', 'stets zu unserer vollen Zufriedenheit', 'zu unserer vollen Zufriedenheit'];

const T2 = {
  zeugnis(g) {
    const n = g.name('full'), dt = g.date(), org = g.org(), oadr = g.address(), am = g.amount(), sig = g.name('formal');
    const von = g.int(2008, 2016), bis = von + g.int(2, 8);
    return [`Arbeitszeugnis\n\n${org.text}\n${oadr.text}\n\n${n.text}, geboren am ${dt.text}, war vom 01.03.${von} bis zum 30.06.${bis} in unserem Unternehmen als ${g.pick(BERUF)} tätig.\n\nZu den Aufgaben gehörten ${g.pick(TAET)} und ${g.pick(TAET)}. Die Leistungen beurteilen wir mit "${g.pick(NOTE)}". Zuletzt betrug das Bruttogehalt ${am.text} im Monat.\n\nWir danken ${n.text.split(' ')[0]} für die Zusammenarbeit und wünschen alles Gute.\n\n${sig.text}\nGeschäftsleitung`, [org, oadr, n, dt, am, sig]];
  },
  mietvertrag(g) {
    const v = g.name('formal'), m = g.name('full'), vadr = g.address(), obj = g.address(), ib = g.iban(), kaut = g.amount(), miete = g.amount(), tel = g.phone();
    return [`Mietvertrag\n\nzwischen ${v.text}, ${vadr.text} (Vermieter)\nund ${m.text} (Mieter)\n\n§ 1 Mietsache\nVermietet wird die Wohnung im ${g.int(1, 5)}. Obergeschoss des Hauses ${obj.text}.\n\n§ 2 Miete\nDie monatliche Kaltmiete beträgt ${miete.text}. Die Kaution beträgt ${kaut.text}. Zahlungen erfolgen auf das Konto ${ib.text}.\n\n§ 3 Erreichbarkeit\nDer Vermieter ist unter ${tel.text} erreichbar.\n\n________________  ________________\n${v.text}      ${m.text}`, [v, vadr, m, obj, ib, kaut, miete, tel]];
  },
  gespraechsprotokoll(g) {
    const a = g.name('full'), b = g.name('full'), tel = g.phone(), mail = g.email(), dt = g.date(), org = g.org();
    return [`Gesprächsprotokoll vom ${dt.text}\nTeilnehmer: ${a.text} (TN1), ${b.text} (TN2), Moderation (MOD)\nOrganisation: ${org.text}\n\nMOD: Wir beginnen mit dem Stand der Rückmeldungen.\nTN1: Ich habe gestern mit dem Kunden gesprochen, er ist unter ${tel.text} erreichbar.\nTN2: Dann schicke ich ihm die Unterlagen an ${mail.text}.\nMOD: Gut, bitte bis Freitag bestätigen.\nTN1: Mache ich. ${b.text.split(' ')[0]}, kannst du das Protokoll übernehmen?\nTN2: Ja, gerne.`, [dt, a, b, org, tel, mail]];
  },
  emailverlauf(g) {
    const a = g.name('full'), b = g.name('full'), ea = g.email(), eb = g.email(), tel = g.phone(), org = g.org(), adr = g.address();
    return [`Von: ${a.text} <${ea.text}>\nAn: ${b.text} <${eb.text}>\nBetreff: AW: AW: Lieferung\n\nHallo ${b.text.split(' ')[0]},\ndanke, das passt so.\n\nGruß\n${a.text}\n${org.text}\nTel. ${tel.text}\n\n-----Ursprüngliche Nachricht-----\nVon: ${b.text} <${eb.text}>\nAn: ${a.text} <${ea.text}>\nBetreff: AW: Lieferung\n\nHallo ${a.text.split(' ')[0]},\nich schlage Dienstag vor. Lieferadresse bleibt ${adr.text}.\n\nBeste Grüße\n${b.text}`, [a, b, ea, eb, org, tel, adr]];
  },
  csvexport(g) {
    const n = g.int(3, 4), rows = [], items = [];
    for (let i = 0; i < n; i++) {
      const p = g.name('full'), e = g.email(), t = g.phone();
      rows.push(`${p.text},${e.text},${t.text},${g.digits(5)}`);
      items.push(p, e, t);
    }
    return [`Name,E-Mail,Telefon,Kundennummer\n${rows.join('\n')}\n`, items];
  },
  chatverlauf(g) {
    const a = g.name('full'), b = g.name('full'), tel = g.phone(), ib = g.iban(), adr = g.address(), mail = g.email();
    const fa = a.text.split(' ')[0], fb = b.text.split(' ')[0];
    return [`[09:12] ${fa}: Hast du die Daten für die Überweisung?\n[09:13] ${fb}: Ja, IBAN ${ib.text}, läuft auf ${b.text}.\n[09:14] ${fa}: Danke. Wohin soll die Post gehen?\n[09:15] ${fb}: An ${adr.text}.\n[09:15] ${fb}: Oder schreib mir an ${mail.text}\n[09:16] ${fa}: Ok. Falls was ist, ruf an: ${tel.text}\n[09:17] ${fa}: Gruß, ${a.text}`, [a, b, ib, adr, mail, tel]];
  },
  bewerbung(g) {
    const n = g.name('full'), dt = g.date(), adr = g.address(), tel = g.phone(), mail = g.email(), o1 = g.org(), o2 = g.org(), u = g.url();
    return [`Lebenslauf\n\nPersönliche Daten\nName: ${n.text}\nGeboren: ${dt.text}\nAnschrift: ${adr.text}\nTelefon: ${tel.text}\nE-Mail: ${mail.text}\nProfil: ${u.text}\n\nBerufserfahrung\n2019 bis heute: ${g.pick(BERUF)}, ${o1.text}\n2014 bis 2019: ${g.pick(BERUF)}, ${o2.text}\n\nAusbildung\n2011 bis 2014: Ausbildung, Industrie- und Handelskammer\n\nSprachen: Deutsch (Muttersprache), Englisch (fließend)`, [n, dt, adr, tel, mail, u, o1, o2]];
  },
  rechnung_positionen(g) {
    const org = g.org(), c = g.name('full'), adr = g.address(), ib = g.iban(), a1 = g.amount(), a2 = g.amount(), a3 = g.amount(), mail = g.email();
    return [`${org.text}\n\nRechnung ${g.digits(6)}\nRechnungsempfänger: ${c.text}, ${adr.text}\n\nPos.  Beschreibung               Betrag\n1     Beratung                  ${a1.text}\n2     Material                  ${a2.text}\n3     Anfahrt                   ${a3.text}\n\nBitte überweisen Sie auf ${ib.text}. Fragen an ${mail.text}.`, [org, c, adr, a1, a2, a3, ib, mail]];
  },
  gutachten(g) {
    const sv = g.name('formal'), gesch = g.name('herr'), k = g.plate(), v = g.vin(), adr = g.address(), dt = g.date(), am = g.amount(), org = g.org();
    return [`Kfz-Gutachten\n\nAuftraggeber: ${org.text}\nSachverständiger: ${sv.text}\nGeschädigter: ${gesch.text}, ${adr.text}\nFahrzeug: Kennzeichen ${k.text}, FIN ${v.text}\nBesichtigung am ${dt.text}\n\nDie Reparaturkosten werden auf ${am.text} geschätzt. Der Schaden ist auf einen Auffahrunfall zurückzuführen.\n\n${sv.text}`, [org, sv, gesch, adr, k, v, dt, am]];
  },
  behoerdenbescheid(g) {
    const org = g.org(), n = g.name('formal'), adr = g.address(), id = g.taxid(), dt = g.date(), am = g.amount(), ib = g.iban(), sb = g.name('frau'), tel = g.phone();
    return [`${org.text}\nBescheid\n\nAn ${n.text}\n${adr.text}\n\nIhre Steuer-ID: ${id.text}. Geburtsdatum: ${dt.text}.\n\nHiermit setzen wir den Betrag von ${am.text} fest. Die Erstattung erfolgt auf ${ib.text}.\n\nRechtsbehelfsbelehrung: Gegen diesen Bescheid kann innerhalb eines Monats Widerspruch erhoben werden.\n\nSachbearbeitung: ${sb.text}, Tel. ${tel.text}`, [org, n, adr, id, dt, am, ib, sb, tel]];
  },
  krankmeldung(g) {
    const pat = g.name('full'), dt = g.date(), adr = g.address(), arzt = g.name('formal'), praxis = g.org(), tel = g.phone();
    return [`${praxis.text}\nTel. ${tel.text}\n\nArbeitsunfähigkeitsbescheinigung\n\nPatient: ${pat.text}, geboren am ${dt.text}\nAnschrift: ${adr.text}\n\nDie Arbeitsunfähigkeit besteht seit dem ${g.int(1, 28)}.${g.int(10, 12)}.2025 voraussichtlich bis zum ${g.int(1, 28)}.12.2025.\n\n${arzt.text}`, [praxis, tel, pat, dt, adr, arzt]];
  },
  arztbrief_lang(g) {
    const pat = g.name('full'), dt = g.date(), adr = g.address(), arzt = g.name('formal'), praxis = g.org(), hausarzt = g.name('formal'), tel = g.phone(), kh = g.org();
    return [`${praxis.text}\n\nArztbrief\n\nPatient: ${pat.text}, geboren am ${dt.text}\nAnschrift: ${adr.text}\n\nSehr geehrter Herr Kollege ${hausarzt.text.replace(/^(Prof\. Dr\. |Dr\. |Dipl\.-Ing\. )/, '')},\n\nwir berichten über die ambulante Vorstellung des oben genannten Patienten.\n\nAnamnese\nDer Patient berichtet seit mehreren Wochen über wiederkehrende Beschwerden. Vorerkrankungen sind nicht bekannt.\n\nBefund\nDer körperliche Untersuchungsbefund war unauffällig. Die Laborwerte liegen im Referenzbereich.\n\nBeurteilung und Procedere\nEine stationäre Aufnahme im ${kh.text} ist nicht erforderlich. Wir bitten um Wiedervorstellung in vier Wochen. Rückfragen unter ${tel.text}.\n\nAnlage 1: Laborbericht\nAnlage 2: Befundkopie\n\nMit kollegialen Grüßen\n${arzt.text}`, [praxis, pat, dt, adr, hausarzt, kh, tel, arzt]];
  },
  kuendigung_lang(g) {
    const me = g.name('formal'), adr = g.address(), org = g.org(), oadr = g.address(), dt = g.date(), id = g.taxid(), ib = g.iban(), tel = g.phone(), mail = g.email();
    return [`${me.text}\n${adr.text}\nTel. ${tel.text}, ${mail.text}\n\n${org.text}\n${oadr.text}\n\nKündigung meines Vertrags\n\nSehr geehrte Damen und Herren,\n\nhiermit kündige ich den zwischen uns bestehenden Vertrag fristgerecht zum nächstmöglichen Zeitpunkt.\n\nZur Identifikation: Mein Geburtsdatum ist der ${dt.text}, meine Steuer-ID lautet ${id.text}.\n\nBitte bestätigen Sie die Kündigung schriftlich. Eine eventuelle Rückerstattung veranlassen Sie bitte auf mein Konto ${ib.text}.\n\nMit freundlichen Grüßen\n${me.text}\n\nAnlagen:\n1. Kopie des Vertrags\n2. Nachweis der Vertretungsberechtigung`, [me, adr, tel, mail, org, oadr, dt, id, ib]];
  },
  schadensmeldung_lang(g) {
    const h = g.name('formal'), k = g.plate(), v = g.vin(), adr = g.address(), org = g.org(), ib = g.iban(), card = g.card(), z = g.name('full'), tel = g.phone(), dt = g.date();
    return [`Schadensmeldung an ${org.text}\n\nVersicherungsnehmer: ${h.text}\nAnschrift: ${adr.text}\nKennzeichen: ${k.text}\nFahrgestellnummer: ${v.text}\n\nUnfallhergang\nAm ${dt.text} kam es auf einer Landstraße zu einem Zusammenstoß. Es entstand nur Sachschaden.\n\nZeugen\nZeuge war ${z.text}, erreichbar unter ${tel.text}.\n\nAuszahlung\nBitte zahlen Sie auf ${ib.text} oder auf die Karte ${card.text}.\n\nAnlagen: Fotos, Kostenvoranschlag, Unfallbericht`, [org, h, adr, k, v, dt, z, tel, ib, card]];
  },
};

export const TEMPLATES2 = Object.keys(T2);
export const SYNTH_DOCS2 = 98; // 14 Vorlagen x 7

export function generateDocs2(count = SYNTH_DOCS2, seed = 20261021) {
  const g = makeGen(seed);
  const docs = [];
  for (let i = 0; i < count; i++) {
    const name = TEMPLATES2[i % TEMPLATES2.length];
    const [text, items] = T2[name](g);
    const truth = items.flatMap((it) => (Array.isArray(it.truth) ? it.truth : [it.truth]));
    docs.push({ template: name, text, truth });
  }
  return docs;
}
