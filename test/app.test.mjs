import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, splitSentences, validateText } from '../lib/analysis.mjs';
import { configuration, rewrite, checkPreservation } from '../lib/rewrite.mjs';
import { createApp } from '../server.mjs';

const sample='Günümüz dünyasında bu bağlamda kapsamlı bir şekilde değerlendirilen sistemler büyük önem taşımaktadır. Sonuç olarak bu doğrultuda önemli bir rol oynamaktadır.';
test('sentence offsets reconstruct exact source including whitespace and Unicode',()=>{
  const text='  Uçuş 10.30 saatinde.\n\nİkinci cümle! 🚀 Third sentence?  ';
  const spans=splitSentences(text);
  assert.equal(spans.map(s=>text.slice(s.start,s.end)).join(''),text);
  for(let i=1;i<spans.length;i++) assert.equal(spans[i-1].end,spans[i].start);
  assert.ok(spans.every(s=>s.text.trim().length>0));
});
test('analysis has evidence and never claims calibrated authorship',()=>{
  const r=analyze(sample);assert.equal(r.calibrated,false);assert.ok(r.sentences.some(s=>s.level==='high'&&s.reasons.length));assert.ok(r.score>=0&&r.score<=100);assert.equal(r.reliability,'short-text');
});
test('plain English has no invented statistical authorship certainty',()=>{
  const r=analyze('I missed the train this morning. My neighbor gave me a lift to work.','en');assert.equal(r.score,0);assert.equal(r.locale,'en');
});
test('invalid input and unsupported locale rejected',()=>{
  for(const s of [null,3,'','x'.repeat(20001),'a'.repeat(20)+'\u0000']) assert.throws(()=>validateText(s));
  assert.throws(()=>analyze(sample,'fr'));
});
test('empty whitespace is invalid',()=>assert.throws(()=>analyze(' '.repeat(40))));
test('numeric drift, citations and glossary loss are exposed',()=>{
  const r=checkPreservation('ILS frekansı 110.30 MHz [12]. Karar irtifası 200 ft.','Frekans 110.50 MHz [12]. Karar irtifası 200 ft.',['karar irtifası']);
  assert.ok(r.missing.includes('110.30'));assert.ok(r.missing.includes('ILS'));assert.ok(r.addedNumbers.includes('110.50'));
});
test('unconfigured rewrite returns explicit setup error',async()=>{
  assert.equal(configuration({}).ready,false);await assert.rejects(rewrite({text:sample},{env:{}}),e=>e.status===503);
});
const env={AI_PROVIDER:'openai',OPENAI_API_KEY:'unit-test-secret',OPENAI_MODEL:'test-model'};
test('OpenAI integration sends key only as header and reports integrity drift',async()=>{
  let call;
  const r=await rewrite({text:'TCAS sisteminin menzili 20 NM olarak ölçüldü.',style:'aviation'},{env,fetcher:async(url,init)=>{call={url,init};return new Response(JSON.stringify({choices:[{message:{content:'TCAS menzili 30 NM ölçüldü.'},finish_reason:'stop'}]}));}});
  assert.equal(call.url,'https://api.openai.com/v1/chat/completions');assert.equal(call.init.headers.Authorization,'Bearer unit-test-secret');assert.ok(!call.init.body.includes('unit-test-secret'));assert.ok(r.needsReview);assert.ok(r.preservation.missing.includes('20'));
});
test('Ollama response and local endpoint',async()=>{
  const r=await rewrite({text:sample,style:'academic'},{env:{AI_PROVIDER:'ollama',OLLAMA_MODEL:'test'},fetcher:async(url,init)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(init.headers.Authorization,undefined);return new Response(JSON.stringify({message:{content:sample},done_reason:'stop'}));}});
  assert.equal(r.text,sample);assert.equal(r.needsReview,false);
});
test('malformed, empty and truncated model outputs fail clearly',async()=>{
  for(const value of ['not json',JSON.stringify({choices:[]}),JSON.stringify({choices:[{finish_reason:'length',message:{content:'Incomplete'}}]})]) {
    await assert.rejects(rewrite({text:sample},{env,fetcher:async()=>new Response(value)}),e=>e.status===502);
  }
});
test('upstream failures do not leak response bodies or keys',async()=>{
  await assert.rejects(rewrite({text:sample},{env,fetcher:async()=>new Response('secret diagnostic',{status:401})}),e=>e.status===502&&!e.message.includes('secret'));
  await assert.rejects(rewrite({text:sample},{env,fetcher:async()=>{throw new Error('secret')}}),e=>e.status===502&&!e.message.includes('secret'));
});
test('unknown styles, prototype names and oversized instructions rejected',async()=>{
  for(const style of ['unknown','toString','__proto__'])await assert.rejects(rewrite({text:sample,style},{env}),e=>e.status===400);
  await assert.rejects(rewrite({text:sample,instruction:'x'.repeat(1001)},{env}),e=>e.status===400);
});
async function withServer(options,fn){const server=createApp(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
test('HTTP integration: assets, analysis, errors, secrets and same-origin enforcement',()=>withServer({},async base=>{
  const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/ProseBeacon/);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const health=await (await fetch(base+'/api/health')).json();assert.equal(health.ready,false);
  const request=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const response=await request('/api/analyze',{text:sample});assert.equal(response.status,200);assert.equal((await response.json()).calibrated,false);
  for(const body of [null,[],{}, {text:4},{text:'x'.repeat(20001)}])assert.ok((await request('/api/analyze',body)).status>=400);
  assert.equal((await request('/api/analyze',{text:sample},{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/rewrite',{text:sample})).status,503);
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/lib/rewrite.mjs')).status,404);
}));
test('HTTP authentication protects every API and does not expose credentials',()=>withServer({...env,APP_PASSWORD:'test-password'},async base=>{
  assert.equal((await fetch(base+'/api/health')).status,401);
  const response=await fetch(base+'/api/health',{headers:{'X-App-Password':'test-password'}});assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes('unit-test-secret'));assert.ok(!text.includes('test-password'));
}));
test('rate limit bounds repeated expensive requests',()=>withServer({},async base=>{
  let status;for(let i=0;i<31;i++)status=(await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sample})})).status;assert.equal(status,429);
}));
