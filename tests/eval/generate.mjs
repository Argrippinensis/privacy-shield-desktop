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
