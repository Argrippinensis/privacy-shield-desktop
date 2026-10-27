// One safe DOM renderer for preview and print. No document text, remote images or signing service.
const PS_EVIDENCE_CSS = `
@page{size:A4;margin:15mm 16mm}
.ps-proof{font:11px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#20352e;background:#fff;max-width:760px;margin:0 auto;overflow-wrap:anywhere}
.ps-proof *{box-sizing:border-box}.ps-proof h1,.ps-proof h2,.ps-proof p{margin:0}
.ps-proof-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:2px solid #164b3a;gap:16px}
.ps-proof-arcangeli{font-size:20px;letter-spacing:-.7px;font-weight:600;color:#1a3a5c}.ps-proof-regusafe{font-size:20px;letter-spacing:-.5px;font-weight:750;color:#004b23}.ps-proof-kicker{font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:#52665d;margin:22px 0 6px!important}
.ps-proof h1{font-size:30px;font-weight:550;letter-spacing:-1px;line-height:1.2;color:#173b2e}.ps-proof-intro{margin:9px 0 18px!important;color:#526159}
.ps-proof-meta{display:grid;grid-template-columns:1.35fr 1fr;gap:8px 18px;padding:14px 0;border-top:1px solid #dce5df;border-bottom:1px solid #dce5df}.ps-proof dt{font-size:9px;color:#526159;text-transform:uppercase;letter-spacing:.6px}.ps-proof dd{margin:3px 0 0;font-weight:550}.ps-proof dl{margin:0}.ps-proof-status{padding:11px 14px;margin:16px 0;background:#f4f7f5;border-left:3px solid #315a45}.ps-proof-status strong{display:block;font-size:11px}.ps-proof-status p{font-size:10px;margin-top:3px}
.ps-proof h2{font-size:12px;font-weight:650;margin:18px 0 7px}.ps-proof-line{display:grid;grid-template-columns:122px minmax(0,1fr);gap:10px;padding:3px 0}.ps-proof-label{color:#526159}.ps-proof-mono{font:9px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;word-break:break-all}.ps-proof-doc{margin-top:14px;padding-top:3px;border-top:1px solid #dce5df;break-inside:avoid}.ps-proof-counts{display:flex;flex-wrap:wrap;gap:5px 12px;margin:7px 0}.ps-proof-counts span{font-size:10px}.ps-proof-warning{margin:4px 0!important;color:#63451c}.ps-proof-checks{margin-top:6px!important;font-weight:550}.ps-proof-hash{margin-top:9px;padding:9px 11px;border:1px solid #dce5df;background:#fafbfa}.ps-proof-footer{display:flex;align-items:center;gap:17px;margin-top:20px;padding-top:15px;border-top:1px solid #dce5df;break-inside:avoid}.ps-proof-seal{width:78px;height:78px;flex:none;border:2px double #487260;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#315a45;transform:rotate(-8deg);font-size:8px;letter-spacing:.65px;line-height:1.5}.ps-proof-seal strong{font-size:19px;line-height:1.1}.ps-proof-footer p{font-size:9px;color:#526159}.ps-proof-notice{margin-top:7px!important;font-size:8px;color:#59665f}.ps-proof-footer-title{font-weight:650;color:#254735!important}
@media(max-width:520px){.ps-proof h1{font-size:25px}.ps-proof-meta{grid-template-columns:1fr}.ps-proof-line{grid-template-columns:1fr;gap:0}.ps-proof-footer{gap:10px}.ps-proof-header{padding-bottom:14px}.ps-proof-arcangeli,.ps-proof-regusafe{font-size:18px}}
@media print{html,body{margin:0;background:#fff}.ps-proof{max-width:none;font-size:9.5pt;line-height:1.35}.ps-proof h1{font-size:25pt}.ps-proof-meta{grid-template-columns:1.35fr 1fr}.ps-proof-line{grid-template-columns:122px minmax(0,1fr)}.ps-proof-doc h2{break-after:avoid}.ps-proof-seal{color:#234736}.ps-proof-status,.ps-proof-hash{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;
function psEvidenceDocument(e, doc = document) {
  const make = (tag, text, cls) => { const n=doc.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n; };
  const article=make('article',undefined,'ps-proof');article.setAttribute('data-ps-evidence-content','');
  const categoryLabel=id=>PSDetect.ENTS.find(item=>item.id===id||item.pfx===id)?.lbl||id;
  const profileLabel=PSDetect.PROFILES.find(item=>item.id===e.profile)?.lbl||e.profile;
  const header=make('header',undefined,'ps-proof-header');header.append(make('div','arcangeli.eu','ps-proof-arcangeli'),make('div','ReguSafe','ps-proof-regusafe'));article.append(header);
  article.append(make('p','PrivacyShield · Lokale Dokumentverarbeitung','ps-proof-kicker'),make('h1','Verarbeitungsnachweis'),make('p','Dokumentierte Pseudonymisierung mit nachvollziehbarem Prüfstatus und Bezug zum Ergebnis.','ps-proof-intro'));
  const meta=make('div',undefined,'ps-proof-meta');
  function entry(label,value){const dl=make('dl');dl.append(make('dt',label),make('dd',value));meta.append(dl);}
  entry('Nachweis-ID',e.id);entry('Erstellt · Zeitangabe dieses Geräts',e.created+' · '+e.timezone);entry('Verfahren',e.operation);entry('Produkt',e.product+' '+e.version);article.append(meta);
  const status=make('div',undefined,'ps-proof-status');status.append(make('strong',e.humanReview),make('p','Automatische Prüfung und persönliche Sichtprüfung werden getrennt ausgewiesen.'));article.append(status);
  function line(parent,label,value,mono=false){const row=make('div',undefined,'ps-proof-line');row.append(make('span',label,'ps-proof-label'),make('span',value,mono?'ps-proof-mono':undefined));parent.append(row);}
  article.append(make('h2','Verarbeitung & technische Identität'));
  line(article,'Profil',profileLabel);line(article,'Kategorien',e.categories.map(categoryLabel).join(', '));line(article,'Erkennung',e.mode);
  if(e.modelId){line(article,'Modell',e.modelId);line(article,'Modellrevision',e.modelRevision,true);}
  if(e.fallback)line(article,'Fallback',e.fallback);
  line(article,'Kern SHA-256',e.coreSha256,true);line(article,'Dokumentanzahl',e.documentCount);
  for(const d of e.documents){
    const section=make('section',undefined,'ps-proof-doc');section.append(make('h2','Dokument '+d.index+' · '+d.inputChars+' Eingabezeichen'));
    line(section,'Importumfang',d.import.kind+' · '+(d.import.complete?'vollständig gelesen':'unvollständig'));
    line(section,'Seiten',d.import.pages.length?d.import.pages.map(p=>p.index+': '+p.method).join('; '):'kein Seitenbezug');
    for(const warning of d.import.warnings)section.append(make('p',warning,'ps-proof-warning'));
    const counts=make('div',undefined,'ps-proof-counts');for(const [type,count]of Object.entries(d.replacements))counts.append(make('span',categoryLabel(type)+' · '+count));section.append(counts);
    section.append(make('p',e.counting),make('p','Gegenprüfung: '+d.check.mechanism),make('p','Bekannte verbleibende Funde: '+d.check.remaining+' · bewusst freigegeben/ignoriert: '+d.check.released,'ps-proof-checks'));
    const hash=make('div',undefined,'ps-proof-hash');hash.append(make('p','SHA-256 · '+d.result.format+' · '+d.result.encoding),make('p',d.result.sha256,'ps-proof-mono'));section.append(hash);article.append(section);
  }
  const footer=make('footer',undefined,'ps-proof-footer'),seal=make('div',undefined,'ps-proof-seal');seal.setAttribute('aria-label','Grafisches Siegel: lokal erstellt, keine Signatur');seal.append(make('span','LOKAL'),make('strong','✓'),make('span','ERSTELLT'));
  const note=make('div');note.append(make('p','PrivacyShield · Verarbeitungsdokumentation','ps-proof-footer-title'),make('p','Technischer Nachweis · keine digitale Signatur. Die Prüfsumme bezieht sich auf die bezeichneten Ergebnisbytes.'),make('p',e.notice,'ps-proof-notice'));footer.append(seal,note);article.append(footer);
  return article;
}
function psEvidenceView(e,doc=document){const fragment=doc.createDocumentFragment(),style=doc.createElement('style');style.textContent=PS_EVIDENCE_CSS;fragment.append(style,psEvidenceDocument(e,doc));return fragment;}
