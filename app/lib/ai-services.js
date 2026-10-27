// Fixed, document-free launch destinations shared by browser UI and the native IPC.
(function(root,factory){
  if(typeof module === 'object' && module.exports) module.exports=factory();
  else {root.PSLib=root.PSLib||{};root.PSLib.aiServices=factory();}
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const services=Object.freeze([
    {id:'chatgpt',name:'ChatGPT',legacy:'https://chatgpt.com',web:'https://chatgpt.com/',ios:'https://chatgpt.com/open-app',desktop:'chatgpt://',android:'com.openai.chatgpt'},
    {id:'claude',name:'Claude',legacy:'https://claude.ai',web:'https://claude.ai/new',ios:'https://claude.ai/new',desktop:'claude://claude.ai/new',android:'com.anthropic.claude'},
    {id:'gemini',name:'Gemini',legacy:'https://gemini.google.com',web:'https://gemini.google.com/app',ios:'https://gemini.google.com/app/download/mobile',android:'com.google.android.apps.bard'},
    {id:'grok',name:'Grok',web:'https://grok.com/',ios:'https://grok.com/',android:'ai.x.grok'},
    {id:'deepseek',name:'DeepSeek',web:'https://chat.deepseek.com/',ios:'https://chat.deepseek.com/',android:'com.deepseek.chat'},
    {id:'mistral',name:'Mistral Le Chat',web:'https://chat.mistral.ai/',ios:'https://chat.mistral.ai/chat/',android:'ai.mistral.chat',more:true},
    {id:'perplexity',name:'Perplexity',web:'https://www.perplexity.ai/',ios:'https://www.perplexity.ai/open',android:'ai.perplexity.app.android',more:true},
    {id:'copilot',name:'Microsoft Copilot',web:'https://copilot.microsoft.com/',ios:'https://copilot.microsoft.com/',android:'com.microsoft.copilot',more:true},
  ].map(Object.freeze));
  function get(id){return services.find(s=>s.id===id||s.legacy===id)||null;}
  function appURL(id,platform){
    const s=get(id);if(!s)return null;
    if(platform==='android')return 'intent://'+s.web.slice('https://'.length)+'#Intent;scheme=https;package='+s.android+';S.browser_fallback_url='+encodeURIComponent(s.web)+';end';
    return platform==='ios'?s.ios:s.web;
  }
  return {services,get,appURL};
});
