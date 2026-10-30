import { validateText } from './analysis.mjs';

const fail = message => { throw Object.assign(new Error(message),{status:400}); };
function tokens(text, locale) { return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(match=>({word:match[0].normalize('NFKC').toLocaleLowerCase(locale),start:match.index,end:match.index+match[0].length})); }
export function compareSources(input) {
  const { text, sources, locale='tr', excludeQuotes=true, excludeBibliography=true, minWords=8 }=input;
  validateText(text);
  if(!['tr','en'].includes(locale)||typeof excludeQuotes!=='boolean'||typeof excludeBibliography!=='boolean'||!Number.isInteger(minWords)||minWords<5||minWords>20)fail('Benzerlik seçenekleri geçersiz.');
  if(!Array.isArray(sources)||sources.length<1||sources.length>10)fail('1–10 kaynak metni ekleyin.');
  const refs=sources.map((source,id)=>{
    if(!source||typeof source.title!=='string'||source.title.trim().length<1||source.title.length>160||typeof source.text!=='string'||source.text.trim().length<20||source.text.length>20000)fail('Her kaynak için başlık ve 20–20.000 karakter metin gerekli.');
    const url=source.url||'';
    if(typeof url!=='string'||url.length>2000||(url&&!/^https?:\/\//iu.test(url)))fail('Kaynak adresi http/https olmalıdır.');
    return {id,title:source.title.trim(),url,text:source.text,words:tokens(source.text,locale)};
  });
  const query=tokens(text,locale), excluded=[];
  if(excludeQuotes)for(const match of text.matchAll(/"[^"\n]*(?:\n[^"\n]*)*"|“[^”]*”|«[^»]*»/gu))excluded.push([match.index,match.index+match[0].length]);
  if(excludeBibliography){const match=/^\s*(?:references|bibliography|kaynakça|kaynaklar)\s*:?\s*$/imu.exec(text);if(match)excluded.push([match.index,text.length]);}
  const eligible=query.map(token=>!excluded.some(([start,end])=>token.start<end&&token.end>start));
  const index=new Map();
  const key=(list,start)=>list.slice(start,start+minWords).map(t=>t.word).join('\u0001');
  for(const source of refs)for(let i=0;i<=source.words.length-minWords;i++){
    const hash=key(source.words,i);if(!index.has(hash))index.set(hash,[]);
    const hits=index.get(hash);if(hits.length<100)hits.push([source.id,i]);
  }
  const covered=Array(query.length).fill(false), lastEnd=Array(refs.length).fill(0), matches=[];
  let comparisons=0;
  for(let i=0;i<=query.length-minWords;i++){
    if(!eligible.slice(i,i+minWords).every(Boolean))continue;
    const best=new Map();
    for(const [sourceId,offset] of index.get(key(query,i))||[]){
      if(i<lastEnd[sourceId])continue;
      const source=refs[sourceId];let size=minWords;
      while(i+size<query.length&&offset+size<source.words.length&&eligible[i+size]&&query[i+size].word===source.words[offset+size].word){size++;if(++comparisons>2000000)fail('Çok tekrarlı metin; daha kısa bölümlerle karşılaştırın.');}
      if(!best.has(sourceId)||size>best.get(sourceId).size)best.set(sourceId,{offset,size});
    }
    for(const [sourceId,{offset,size}]of best){
      const source=refs[sourceId],start=query[i].start,end=query[i+size-1].end;
      for(let j=i;j<i+size;j++)covered[j]=true;
      const cited=/\[\d[^\]]*\]|\([^)]*\d{4}[^)]*\)/u.test(text.slice(Math.max(0,start-80),Math.min(text.length,end+100)));
      matches.push({sourceId,start,end,sourceStart:source.words[offset].start,sourceEnd:source.words[offset+size-1].end,words:size,citationNearby:cited,
        excerpt:text.slice(start,end),sourceExcerpt:source.text.slice(source.words[offset].start,source.words[offset+size-1].end)});
      lastEnd[sourceId]=i+size;
    }
  }
  const eligibleWords=eligible.filter(Boolean).length,matchedWords=covered.filter((value,i)=>value&&eligible[i]).length;
  return {engine:'source-shingle-matching-v1',scope:'supplied-sources-only',internetSearched:false,score:eligibleWords?Math.round(matchedWords/eligibleWords*1000)/10:0,
    totalWords:query.length,eligibleWords,matchedWords,excludedWords:query.length-eligibleWords,options:{excludeQuotes,excludeBibliography,minWords},
    sources:refs.map(source=>({id:source.id,title:source.title,url:source.url,words:source.words.length,matches:matches.filter(m=>m.sourceId===source.id).length})),matches,
    notice:'Benzerlik, eklenen kaynaklardaki eşleşmeleri gösterir; intihal kararı değildir. İnternet veya Turnitin veri tabanı taranmadı.'};
}
