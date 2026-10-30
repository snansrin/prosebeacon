import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSources } from '../lib/similarity.mjs';
import { wordStatistics } from '../lib/statistics.mjs';
import { createReport } from '../lib/report.mjs';
import { classifyText } from '../lib/classifier.mjs';
import { reviewWriting } from '../lib/model-review.mjs';
import { checkPreservation } from '../lib/rewrite.mjs';
import { createApp } from '../server.mjs';
const passage='Pilot eğitiminde kullanılan simülatörler yaklaşma kararlarını değerlendirmek için kontrollü bir çalışma ortamı sağlar.';
const source={title:'Uçuş çalışması',text:passage,url:'https://example.org/paper'};
test('source similarity finds normalized spans with exact original offsets',()=>{
  const text='Ön bilgi farklı bir cümledir. '+passage+' Son yorum tamamen farklıdır.';
  const result=compareSources({text,sources:[source]});assert.equal(result.internetSearched,false);assert.equal(result.scope,'supplied-sources-only');assert.equal(result.matches.length,1);const match=result.matches[0];assert.equal(text.slice(match.start,match.end),match.excerpt);assert.equal(source.text.slice(match.sourceStart,match.sourceEnd),match.sourceExcerpt);assert.ok(result.score>0&&result.score<100);
});
test('duplicate references cannot double-count similarity coverage',()=>{
  const result=compareSources({text:passage,sources:[source,{...source,title:'Duplicate'}]});assert.equal(result.score,100);assert.equal(result.matchedWords,result.totalWords);assert.equal(result.matches.length,2);
});
test('quotation and bibliography exclusions affect both numerator and denominator',()=>{
  const text=`"${passage}"\n\nBu bölümde başka bir fikir anlatılır ve hiçbir kaynakla eşleşmez.\n\nKaynakça\n${passage}`;
  const filtered=compareSources({text,sources:[source]});assert.equal(filtered.matchedWords,0);assert.ok(filtered.excludedWords>0);
  const unfiltered=compareSources({text,sources:[source],excludeQuotes:false,excludeBibliography:false});assert.ok(unfiltered.matchedWords>0);
});
test('nearby citations are evidence labels, not plagiarism verdicts',()=>{
  const result=compareSources({text:passage+' [12]',sources:[source]});assert.equal(result.matches[0].citationNearby,true);assert.match(result.notice,/kararı değildir/u);
});
test('unmatched source returns scoped zero rather than global originality claim',()=>{
  const result=compareSources({text:passage,sources:[{title:'Other',text:'The shoreline changed after the storm and the old fishing boat never returned to the harbor.'}]});assert.equal(result.score,0);assert.equal(result.matches.length,0);assert.equal(result.internetSearched,false);
});
test('source validation rejects unsafe URLs, excessive references and invalid options',()=>{
  for(const input of [{sources:[]},{sources:Array(11).fill(source)},{sources:[{...source,url:'javascript:alert(1)'}]},{sources:[source],minWords:1},{sources:[source],locale:'invalid'}])assert.throws(()=>compareSources({text:passage,...input}));
});
test('live counter handles empty text, Unicode characters, paragraphs and reading times',()=>{
  assert.equal(wordStatistics('').words,0);assert.equal(wordStatistics('').sentences,0);
  const stats=wordStatistics('Hello world.\n\nHello again! 🚀','en');assert.equal(stats.words,4);assert.equal(stats.paragraphs,2);assert.equal(stats.characters,[...'Hello world.\n\nHello again! 🚀'].length);assert.ok(stats.readingSeconds>0);assert.ok(stats.repeatedWords.some(item=>item.word==='hello'&&item.count===2));
});
test('HTML report escapes document text, source titles and model explanations',()=>{
  const html=createReport({text:'<script>alert(1)</script>',statistics:wordStatistics('Some text.'),review:{flaggedCoverage:0,sentences:[{text:'<img src=x onerror=alert(1)>',reason:'<script>bad</script>',level:'low'}]}});
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Turnitin ve TextGuard üzerinde kontrol yapılmadı.'));assert.ok(html.includes('Çalıştırılmadı'));
});
test('trained detector abstains on Turkish and short English, errors when unconfigured',async()=>{
  assert.equal((await classifyText(passage,'tr',{env:{}})).status,'unsupported-language');
  assert.equal((await classifyText('A short paragraph contains too little context.','en',{env:{}})).status,'insufficient-text');
  await assert.rejects(classifyText('A meaningful English sentence provides context for this writing example. '.repeat(12),'en',{env:{}}),error=>error.status===503);
});
test('editorial review validates complete, unique sentence IDs and enum values',async()=>{
  const env={AI_PROVIDER:'ollama',OLLAMA_MODEL:'unit-test'};
  const text='This sentence is complete. A second sentence follows.';
  const valid={sentences:[{id:0,level:'high',reason:'Kalıplaşmış ifade.'},{id:1,level:'low',reason:'Belirgin örüntü yok.'}]};
  const mock=value=>async()=>new Response(JSON.stringify({message:{content:JSON.stringify(value)},done_reason:'stop'}));
  const result=await reviewWriting(text,'en',{env,fetcher:mock(valid)});assert.equal(result.sentences.length,2);assert.equal(result.calibrated,false);assert.ok(result.flaggedCoverage>0&&result.flaggedCoverage<100);
  for(const value of [{sentences:[]},{sentences:[valid.sentences[0],valid.sentences[0]]},{sentences:[valid.sentences[0],{id:1,level:'definitely-ai',reason:'bad'}]}])await assert.rejects(reviewWriting(text,'en',{env,fetcher:mock(value)}),error=>error.status===502);
});
test('rewrite preservation detects a changed unit even when numeric value stays',()=>{
  const result=checkPreservation('Karar irtifası 200 ft olarak belirlendi.','Karar irtifası 200 m olarak belirlendi.');assert.ok(result.missing.includes('200 ft'));
});
test('HTTP research routes validate inputs and expose only configured classifier metadata',async()=>{
  const server=createApp({});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    const response=await post('/api/similarity',{text:passage,sources:[source]});assert.equal(response.status,200);assert.equal((await response.json()).score,100);
    assert.equal((await post('/api/statistics',{text:''})).status,200);
    assert.equal((await post('/api/classify',{text:passage,locale:'tr'})).status,200);
    const review=await post('/api/review',{text:passage,locale:'tr'});assert.equal(review.status,200);assert.equal((await review.json()).provider,'builtin');
    const health=await(await fetch(base+'/api/health')).json();assert.equal(health.classifier.configured,false);assert.equal(health.classifier.calibrated,false);
    for(const path of ['/tools.js','/statistics.js','/report.js','/print.html'])assert.equal((await fetch(base+path)).status,200);
    assert.equal((await fetch(base+'/python/detector.py')).status,404);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
