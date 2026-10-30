import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateText } from './analysis.mjs';
let active=false;
export function classifierConfiguration(env=process.env){return {configured:Boolean(env.DETECTOR_PYTHON&&env.DETECTOR_MODEL_DIR),model:'desklib/ai-text-detector-v1.01',languages:['en'],calibrated:false};}
export async function classifyText(text,locale='en',{env=process.env}={}){
  validateText(text);
  if(!['tr','en'].includes(locale))throw Object.assign(new Error('Desteklenmeyen dil.'),{status:400});
  if(locale!=='en')return {status:'unsupported-language',...classifierConfiguration(env),notice:'Bu eğitilmiş model yalnızca İngilizce içindir. Türkçe için kural analizi ve model incelemesini kullanın.'};
  if((text.match(/[\p{L}\p{N}]+/gu)||[]).length<80)return {status:'insufficient-text',...classifierConfiguration(env),notice:'Model karşılaştırması için en az 80 kelime girin. Bu eşik doğruluk garantisi değildir.'};
  if(!classifierConfiguration(env).configured)throw Object.assign(new Error('Yerel sınıflandırıcı kurulmamış. DETECTOR_PYTHON ve DETECTOR_MODEL_DIR ayarlayın.'),{status:503});
  if(active)throw Object.assign(new Error('Sınıflandırıcı başka bir metni inceliyor. Bekleyip tekrar deneyin.'),{status:429});
  active=true;
  try{return await new Promise((resolve,reject)=>{
    const child=spawn(env.DETECTOR_PYTHON,[fileURLToPath(new URL('../python/detector.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...env,PYTHONIOENCODING:'utf-8',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
    let output='',settled=false;
    const finish=(error,data)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();error?reject(error):resolve(data);};
    const timer=setTimeout(()=>finish(Object.assign(new Error('Yerel sınıflandırıcı zaman aşımına uğradı. Metni kısaltın.'),{status:504})),180000);
    child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>1000000)finish(Object.assign(new Error('Geçersiz model yanıtı.'),{status:502}));});
    child.stderr.resume();child.stdin.on('error',()=>{});
    child.once('error',()=>finish(Object.assign(new Error('Sınıflandırıcı başlatılamadı. Python ortamını kontrol edin.'),{status:503})));
    child.once('close',code=>{if(settled)return;try{const result=JSON.parse(output);if(code||!Array.isArray(result.windows)||!result.windows.length||!Number.isFinite(result.score))throw new Error();finish(null,{status:'complete',...result,...classifierConfiguration(env)});}catch{finish(Object.assign(new Error('Sınıflandırıcı çalışmadı. Yerel model dosyalarını ve Python paketlerini kontrol edin.'),{status:502}));}});
    child.stdin.end(JSON.stringify({text,modelDirectory:env.DETECTOR_MODEL_DIR}));
  });}finally{active=false;}
}
