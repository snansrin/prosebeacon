import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { analyze, validateText } from './lib/analysis.mjs';
import { configuration, rewrite } from './lib/rewrite.mjs';
import { modelStatus, startLocalRuntime } from './lib/local-runtime.mjs';
import { extractDocument, validateFilename, MAX_FILE_BYTES } from './lib/documents.mjs';
import { compareSources } from './lib/similarity.mjs';
import { wordStatistics } from './lib/statistics.mjs';
import { classifyText, classifierConfiguration } from './lib/classifier.mjs';
import { reviewWriting } from './lib/model-review.mjs';
import { exportDocument } from './lib/export.mjs';
import { readProfile, updateProfile, profileContext } from './lib/profile.mjs';
import { searchSources, searchConfiguration } from './lib/web-sources.mjs';
const publicDir = new URL('./public/',import.meta.url);
const routes = new Map([['/advanced.js',['advanced.js','text/javascript; charset=utf-8']],['/print.html',['print.html','text/html; charset=utf-8']],['/print.js',['print.js','text/javascript; charset=utf-8']],['/print.css',['print.css','text/css; charset=utf-8']],['/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/styles.css',['styles.css','text/css; charset=utf-8']],['/import.css',['import.css','text/css; charset=utf-8']],['/tools.js',['tools.js','text/javascript; charset=utf-8']],['/tools.css',['tools.css','text/css; charset=utf-8']],['/statistics.js',['../lib/statistics.mjs','text/javascript; charset=utf-8']],['/report.js',['../lib/report.mjs','text/javascript; charset=utf-8']]]);
function equal(a,b) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export function createApp(env = process.env, fetcher = fetch) {
  const windows = new Map();
  return http.createServer(async (req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control','no-store');
    const send = (status,data)=>{if(status>=400)req.resume();res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    try {
      const url = new URL(req.url,'http://localhost');
      if (req.method==='GET' && routes.has(url.pathname)) { const [file,type]=routes.get(url.pathname); const content=await readFile(new URL(file,publicDir));res.writeHead(200,{'Content-Type':type});res.end(content);return; }
      if (!url.pathname.startsWith('/api/')) return send(404,{error:'Bulunamadı.'});
      if (env.APP_PASSWORD && !equal(req.headers['x-app-password'] || '',env.APP_PASSWORD)) return send(401,{error:'Uygulama parolası gerekli veya hatalı.'});
      if (req.method==='GET' && url.pathname==='/api/health') return send(200,{ok:true,...configuration(env),...await modelStatus(env,fetcher),classifier:classifierConfiguration(env),search:searchConfiguration(env),analysis:'local; no external transmission',maxCharacters:20000});
      if (req.method==='GET' && url.pathname==='/api/profile')return send(200,await readProfile(env));
      if (req.method!=='POST') return send(405,{error:'Yöntem desteklenmiyor.'});
      if (!['/api/analyze','/api/rewrite','/api/import','/api/similarity','/api/statistics','/api/classify','/api/review','/api/export','/api/profile','/api/search'].includes(url.pathname)) return send(404,{error:'Bulunamadı.'});
      if (req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`) return send(403,{error:'Farklı kaynaktan istek reddedildi.'});
      const importing = url.pathname === '/api/import';
      if (!(req.headers['content-type'] || '').startsWith(importing ? 'application/octet-stream' : 'application/json')) return send(415,{error:importing ? 'Dosya içeriği gerekli.' : 'JSON içerik gerekli.'});
      const now=Date.now(); for (const [k,v] of windows) if(v.until<now) windows.delete(k);
      const key=req.socket.remoteAddress; const slot=windows.get(key)||{until:now+60000,count:0,active:0};
      if (++slot.count>30) return send(429,{error:'Çok fazla istek. Bir dakika sonra deneyin.'}); windows.set(key,slot);
      let filename;
      if (importing) {
        try { filename=decodeURIComponent(req.headers['x-file-name'] || ''); } catch { return send(400,{error:'Geçersiz dosya adı.'}); }
        validateFilename(filename);
      }
      const limit=importing ? MAX_FILE_BYTES : url.pathname==='/api/similarity' ? 1000000 : 100000;
      if (Number(req.headers['content-length']) > limit) return send(413,{error:importing ? 'Dosya en fazla 10 MB olabilir.' : 'İstek çok büyük.'});
      const chunks=[];let bytes=0;
      for await (const chunk of req.iterator({destroyOnReturn:false})) { bytes+=chunk.length; if(bytes>limit) return send(413,{error:importing ? 'Dosya en fazla 10 MB olabilir.' : 'İstek çok büyük.'}); chunks.push(chunk); }
      if (importing) {
        const abort = new AbortController();
        const disconnect = () => { if (!res.writableEnded) abort.abort(); };
        res.once('close',disconnect);
        try { return send(200,await extractDocument(Buffer.concat(chunks),filename,{signal:abort.signal})); }
        finally { res.removeListener('close',disconnect); }
      }
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'Geçersiz JSON.'});}
      if (!body || typeof body!=='object' || Array.isArray(body)) return send(400,{error:'JSON nesnesi gerekli.'});
      if(url.pathname==='/api/profile')return send(200,await updateProfile(body,env));
      if(url.pathname==='/api/statistics') { if(typeof body.text!=='string'||body.text.length>20000)return send(400,{error:'En fazla 20.000 karakter metin gerekli.'});return send(200,wordStatistics(body.text,body.locale)); }
      if(url.pathname==='/api/similarity')return send(200,compareSources(body));
      validateText(body.text);
      if(url.pathname==='/api/export'){const result=await exportDocument(body);res.writeHead(200,{'Content-Type':result.mime,'Content-Disposition':`attachment; filename="prosebeacon-document.${result.extension}"`});return res.end(result.bytes);}
      if(url.pathname==='/api/search')return send(200,await searchSources(body,{env,fetcher}));
      if(url.pathname==='/api/analyze') return send(200,analyze(body.text,body.locale || 'tr'));
      if(url.pathname==='/api/classify')return send(200,await classifyText(body.text,body.locale||'tr',{env}));
      if (slot.active>=2) return send(429,{error:'Devam eden düzenlemeyi bekleyin.'});
      slot.active++;
      try { return send(200,url.pathname==='/api/review' ? await reviewWriting(body.text,body.locale||'tr',{env,fetcher}) : await rewrite(body,{env,fetcher,learningContext:body.useProfile===true?profileContext(await readProfile(env),body.text):null})); } finally { slot.active--; }
    } catch(error) { if (!res.headersSent) send(error.status || 500,{error:error.status ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'}); else res.end(); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const host=process.env.HOST || '127.0.0.1';
  if(!['127.0.0.1','localhost','::1'].includes(host) && !process.env.APP_PASSWORD) throw new Error('Ağa açmak için APP_PASSWORD ayarlayın.');
  const runtime=await startLocalRuntime();
  const server=createApp(); server.requestTimeout=350000;
  const shutdown=()=>{server.closeAllConnections();server.close();runtime?.kill();};
  process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  server.once('error',error=>{runtime?.kill();console.error(error.message);process.exitCode=1;});
  server.listen(Number(process.env.PORT || 3210),host,()=>console.log(`ProseBeacon · http://${host}:${process.env.PORT || 3210}`));
}
