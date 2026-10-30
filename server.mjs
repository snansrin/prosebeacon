import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { analyze, validateText } from './lib/analysis.mjs';
import { configuration, rewrite } from './lib/rewrite.mjs';
import { modelStatus, startLocalRuntime } from './lib/local-runtime.mjs';
import { extractDocument, validateFilename, MAX_FILE_BYTES } from './lib/documents.mjs';
const publicDir = new URL('./public/',import.meta.url);
const routes = new Map([['/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/styles.css',['styles.css','text/css; charset=utf-8']],['/import.css',['import.css','text/css; charset=utf-8']]]);
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
      if (req.method==='GET' && url.pathname==='/api/health') return send(200,{ok:true,...configuration(env),...await modelStatus(env,fetcher),analysis:'local; no external transmission',maxCharacters:20000});
      if (req.method!=='POST') return send(405,{error:'Yöntem desteklenmiyor.'});
      if (!['/api/analyze','/api/rewrite','/api/import'].includes(url.pathname)) return send(404,{error:'Bulunamadı.'});
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
      const limit=importing ? MAX_FILE_BYTES : 100000;
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
      validateText(body.text);
      if(url.pathname==='/api/analyze') return send(200,analyze(body.text,body.locale || 'tr'));
      if (slot.active>=2) return send(429,{error:'Devam eden düzenlemeyi bekleyin.'});
      slot.active++;
      try { return send(200,await rewrite(body,{env,fetcher})); } finally { slot.active--; }
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
  server.listen(Number(process.env.PORT || 3210),host,()=>console.log(`Leksivoraq · http://${host}:${process.env.PORT || 3210}`));
}
