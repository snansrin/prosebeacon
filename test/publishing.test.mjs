import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportDocument } from '../lib/export.mjs';
import { extractDocument } from '../lib/documents.mjs';
import { readProfile, updateProfile, profileContext } from '../lib/profile.mjs';
import { searchSources } from '../lib/web-sources.mjs';
import { rewrite } from '../lib/rewrite.mjs';
import { createApp } from '../server.mjs';
const text='İstanbul’da eğitim uçuşu: görüş 800 metre, frekans 110.30 MHz. Çığ, öğüt, şüphe ve özgünlük.\n\nİkinci paragraf; Türkçe noktalama ve ILS [2] atfı korunur.';
test('DOCX and PDF export preserve Turkish text and paragraph content on reimport',async()=>{
  for(const format of ['docx','pdf']){const result=await exportDocument({text,format});assert.ok(result.bytes.length>1000);const extracted=await extractDocument(result.bytes,'roundtrip.'+format);const all=extracted.text;for(const phrase of ['800','110.30','Çığ','öğüt','şüphe','özgünlük','İkinci paragraf','ILS','[2]'])assert.ok(all.includes(phrase),`${format}: ${phrase}`);}
  assert.equal((await exportDocument({text,format:'txt'})).bytes.toString('utf8'),text);
  await assert.rejects(exportDocument({text,format:'exe'}),error=>error.status===400);
});
test('long PDF output paginates instead of truncating the final paragraph',async()=>{
  const long=('Ölçüm sırasında cihazın durumu ve gözlemler kayda geçirildi.\n\n'.repeat(150))+'SON KAYIT 459';const output=await exportDocument({text:long,format:'pdf'});const imported=await extractDocument(output.bytes,'long.pdf');assert.ok(imported.text.includes('SON KAYIT 459'));assert.ok(imported.pages>1);
});
test('approved profile is versioned, serialized across concurrent writes and resettable',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'prosebeacon-profile-')),env={PROSEBEACON_DATA_DIR:directory};
  try{assert.equal((await readProfile(env)).revision,0);await updateProfile({action:'settings',terminology:'ILS kısaltmasını koru.',preferences:'Açık cümleler.'},env);await Promise.all([1,2].map(id=>updateProfile({action:'example',before:`Özgün kaynak metin örneği ${id} burada yer alır.`,after:`Düzeltilmiş ve açık metin örneği ${id} burada bulunur.`},env)));const profile=await readProfile(env);assert.equal(profile.revision,3);assert.equal(profile.examples.length,2);assert.equal(profileContext(profile,'Özgün kaynak').examples.length,2);await assert.rejects(updateProfile({action:'example',before:'kısa',after:'kısa'},env),error=>error.status===400);const reset=await updateProfile({action:'reset'},env);assert.equal(reset.revision,4);assert.equal(reset.examples.length,0);}finally{await rm(directory,{recursive:true,force:true});}
});
test('search requires explicit transmission consent and rejects excess sentences',async()=>{
  await assert.rejects(searchSources({text,consent:false}),error=>error.status===400);
  await assert.rejects(searchSources({text:'This sufficiently long sentence needs a source. '.repeat(6),locale:'en',consent:true}),error=>error.status===413);
  await assert.rejects(searchSources({text,consent:true},{env:{SEARCH_PROVIDER:'brave'}}),error=>error.status===503);
});
test('web search reports excerpt evidence, removes unsafe links and does not invent authors',async()=>{
  const sentence='This exact sentence appears in the search excerpt.';
  const fetcher=async url=>{assert.equal(new URL(url).hostname,'en.wikipedia.org');return Response.json({query:{search:[{title:'Article',pageid:123,snippet:`<span>${sentence}</span>`}]}});};
  const result=await searchSources({text:sentence,locale:'en',consent:true},{env:{},fetcher});assert.equal(result.groups[0].candidates[0].exactExcerptMatch,true);assert.match(result.groups[0].candidates[0].citation,/curid=123/);assert.equal(result.groups[0].candidates[0].authors,undefined);assert.match(result.notice,/tam sayfa/);
  const failed=await searchSources({text:sentence,locale:'en',consent:true},{env:{},fetcher:async()=>{throw new Error('private-token');}});assert.equal(failed.groups[0].status,'failed');assert.ok(!JSON.stringify(failed).includes('private-token'));
});
test('general web adapter keeps key in header and labels nonmatching candidates',async()=>{
  const result=await searchSources({text:'This claim needs independent source verification.',locale:'en',consent:true},{env:{SEARCH_PROVIDER:'brave',BRAVE_SEARCH_API_KEY:'test-only-key'},fetcher:async(url,options)=>{assert.equal(options.headers['X-Subscription-Token'],'test-only-key');assert.ok(!String(url).includes('test-only-key'));return Response.json({web:{results:[{title:'Candidate',url:'https://example.org/paper',description:'Other words only.'},{title:'Unsafe',url:'javascript:alert(1)',description:'bad'}]}});}});assert.equal(result.groups[0].candidates.length,1);assert.equal(result.groups[0].candidates[0].exactExcerptMatch,false);
});
test('proofreading includes approved terminology context but does not train model weights',async()=>{
  const result=await rewrite({text,style:'proofread'},{env:{AI_PROVIDER:'ollama',OLLAMA_MODEL:'test'},learningContext:{revision:7,terminology:'ILS kısaltmasını koru.',examples:[]},fetcher:async(url,options)=>{const request=JSON.parse(options.body);assert.match(request.messages[0].content,/noktalama/);assert.match(request.messages[1].content,/ILS kısaltmasını koru/);return Response.json({message:{content:text},done_reason:'stop'});}});assert.equal(result.profileRevision,7);
});
test('publishing HTTP routes enforce auth, serve actual binary documents and hide memory files',async()=>{
  const server=createApp({APP_PASSWORD:'test-password'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  try{for(const path of ['/api/profile','/api/search','/api/export'])assert.equal((await fetch(base+path)).status,401);const response=await fetch(base+'/api/export',{method:'POST',headers:{'Content-Type':'application/json','X-App-Password':'test-password'},body:JSON.stringify({text,format:'docx'})});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/wordprocessingml/);assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,2).toString(),'PK');assert.equal((await fetch(base+'/.prosebeacon-data/profile.json')).status,404);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
