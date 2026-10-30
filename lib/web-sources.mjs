import { validateText, splitSentences } from './analysis.mjs';
const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim();
const normalized=value=>clean(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const safeUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};
export function searchConfiguration(env=process.env){return {provider:env.SEARCH_PROVIDER||'wikipedia',generalWebConfigured:Boolean((env.SEARCH_PROVIDER==='brave'&&env.BRAVE_SEARCH_API_KEY)||(env.SEARCH_PROVIDER==='searxng'&&env.SEARXNG_URL)),scope:(env.SEARCH_PROVIDER||'wikipedia')==='wikipedia'?'Wikipedia search excerpts':(env.SEARCH_PROVIDER==='crossref'?'Crossref bibliographic metadata':'configured search index')};}
async function json(url,headers,fetcher){const response=await fetcher(url,{headers:{'User-Agent':'ProseBeacon/0.2 (local writing review)',...headers},redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();const size=Number(response.headers.get('content-length')||0);if(size>3000000)throw new Error();const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>3000000)throw new Error();chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export async function searchSources({text,locale='tr',consent=false},{env=process.env,fetcher=fetch}={}){
  validateText(text);if(!['tr','en'].includes(locale)||consent!==true)throw Object.assign(new Error('Kaynak araması için dil ve dış sağlayıcıya metin gönderme onayı gerekli.'),{status:400});
  const sentences=splitSentences(text,locale).map(s=>s.text).filter(s=>s.trim().length>=20);
  if(!sentences.length||sentences.length>5||sentences.some(s=>s.length>500))throw Object.assign(new Error('Bir aramada 1–5 cümle, cümle başına en fazla 500 karakter seçin. Daha uzun metni bölün.'),{status:413});
  const config=searchConfiguration(env),groups=[];
  if(!['wikipedia','crossref','brave','searxng'].includes(config.provider))throw Object.assign(new Error('Kaynak arama sağlayıcısı geçersiz.'),{status:503});
  if(['brave','searxng'].includes(config.provider)&&!config.generalWebConfigured)throw Object.assign(new Error('Genel web araması için Brave API anahtarı veya JSON etkin SearXNG adresi yapılandırılmalı.'),{status:503});
  for(const sentence of sentences){
    try{
      let data,candidates;
      if(config.provider==='wikipedia'){
        const url=new URL(`https://${locale}.wikipedia.org/w/api.php`);url.search=new URLSearchParams({action:'query',list:'search',format:'json',srsearch:`"${sentence.replace(/["“”]/g,'')}"`,srlimit:'5',srprop:'snippet'}).toString();data=await json(url,{},fetcher);
        candidates=(data.query?.search||[]).map(item=>({title:item.title,url:`https://${locale}.wikipedia.org/?curid=${item.pageid}`,snippet:item.snippet,sourceType:'search-excerpt'}));
      }else if(config.provider==='crossref'){
        const url=new URL('https://api.crossref.org/works');url.search=new URLSearchParams({'query.bibliographic':sentence,rows:'5'}).toString();data=await json(url,{},fetcher);
        candidates=(data.message?.items||[]).map(item=>({title:item.title?.[0],url:item.URL,snippet:item.abstract||item.title?.[0],sourceType:'bibliographic-metadata',doi:item.DOI,authors:(item.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).slice(0,10),year:item.published?.['date-parts']?.[0]?.[0]}));
      }else if(config.provider==='brave'){
        const url=new URL('https://api.search.brave.com/res/v1/web/search');url.search=new URLSearchParams({q:`"${sentence}"`,count:'5',search_lang:locale}).toString();data=await json(url,{'X-Subscription-Token':env.BRAVE_SEARCH_API_KEY},fetcher);
        candidates=(data.web?.results||[]).map(item=>({title:item.title,url:item.url,snippet:item.description,sourceType:'search-excerpt'}));
      }else{
        const url=new URL('search',env.SEARXNG_URL.endsWith('/')?env.SEARXNG_URL:env.SEARXNG_URL+'/');if(!['http:','https:'].includes(url.protocol))throw new Error();url.search=new URLSearchParams({q:`"${sentence}"`,format:'json',language:locale,categories:'general'}).toString();data=await json(url,{},fetcher);
        candidates=(data.results||[]).slice(0,5).map(item=>({title:item.title,url:item.url,snippet:item.content,sourceType:'search-excerpt'}));
      }
      groups.push({sentence,status:'complete',candidates:candidates.filter(item=>safeUrl(item.url)).map(item=>({...item,title:clean(item.title).slice(0,500),url:safeUrl(item.url),snippet:clean(item.snippet).slice(0,3000),exactExcerptMatch:normalized(item.snippet).includes(normalized(sentence)),citation:`${clean(item.title)}. ${safeUrl(item.url)} (Erişim: ${new Date().toISOString().slice(0,10)})`}))});
    }catch{groups.push({sentence,status:'failed',error:'Kaynak sağlayıcı yanıt vermedi, erişimi reddetti veya geçersiz veri döndürdü.',candidates:[]});}
  }
  return {...config,groups,notice:'Yalnızca seçili sağlayıcının döndürdüğü özet/metadata incelendi; tam sayfa doğrulaması yapılmadı. Aday kaynak bir iddiayı desteklediğini kanıtlamaz. Atıf eklemeden önce asıl kaynağı okuyun. Sonuç bulunmaması özgünlük kanıtı değildir.'};
}
