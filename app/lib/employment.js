// Public employer aliases and narrowly scoped contract language. No document persistence or network.
(function(root,factory){
  if(typeof module === 'object' && module.exports) module.exports=factory();
  else {root.PSLib=root.PSLib||{};root.PSLib.employment=factory();}
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const generic = new Set(('Befristung Probezeit Freistellung Arbeitsverhältnis Arbeitsverhältnisses Arbeitsverhältnisse Geschäftsgeheimnis Geschäftsgeheimnisse Geschäftsgeheimnissen Geschäftsgeheimnisgesetz GeschGehG Kündigungsfrist Arbeitsvertrag Arbeitsvertrages Tarifgruppe Berufsjahr Urlaubstage Monate Monaten Monat Jahre Jahren Jahr').toLowerCase().split(' '));
  function isGenericLabel(value){
    const words=value.toLocaleLowerCase('de').replace(/[^\p{L}\s]/gu,' ').trim().split(/\s+/);
    return words.length>0 && words.every(w=>generic.has(w));
  }
  function isLegalReference(value){return /^\s*§{1,2}\s*\d+[a-z]?(?:\s*(?:Abs\.?|Satz|Nr\.?)\s*\d+)*(?:\s+[A-Za-zÄÖÜäöüß]+)?\s*$/u.test(value);}
  function employerSpans(text){
    // Resolve the family only from an unambiguous brand or full name in THIS input.
    if(!/(?<![\p{L}\p{N}_])(?:apoBank|Deutsche\s+Apotheker-\s*und\s+[ÄA]rztebank)(?![\p{L}\p{N}_])/iu.test(text))return [];
    const rx=/(?<![\p{L}\p{N}_])(?:Deutsche\s+Apotheker-\s*und\s+[ÄA]rztebank(?:\s+eG)?|Deutsche[ \t]+Apotheker-[ \t]*und|(?:und[ \t]+)?[ÄA]rztebank|apoBank|Bank[ \t]+der[ \t]+Gesundheit|apoBalance)(?![\p{L}\p{N}_])/giu;
    return Array.from(text.matchAll(rx),m=>({start:m.index,end:m.index+m[0].length,pfx:'ORG',col:'#8b5cf6',id:'org',prio:3,meth:'Arbeitgeber-Variante (öffentliche Aliasliste)'}));
  }
  return {isGenericLabel,isLegalReference,employerSpans};
});
