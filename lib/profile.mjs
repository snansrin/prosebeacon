import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
let queue=Promise.resolve();
const empty=()=>({version:1,revision:0,terminology:'',preferences:'',examples:[]});
function path(env){return resolve(env.PROSEBEACON_DATA_DIR||'.prosebeacon-data','profile.json');}
export async function readProfile(env=process.env){try{return JSON.parse(await readFile(path(env),'utf8'));}catch(error){if(error.code==='ENOENT')return empty();throw Object.assign(new Error('Öğrenme profili okunamadı. Yerel veri dosyasını kontrol edin.'),{status:500});}}
export function updateProfile(input,env=process.env){
  const operation=queue.catch(()=>{}).then(async()=>{
    const profile=await readProfile(env);
    if(input.action==='reset'){Object.assign(profile,empty(),{revision:profile.revision+1});}
    else if(input.action==='settings'){
      if(typeof input.terminology!=='string'||input.terminology.length>4000||typeof input.preferences!=='string'||input.preferences.length>2000)throw Object.assign(new Error('Terminoloji en fazla 4.000, tercihler 2.000 karakter olabilir.'),{status:400});
      profile.terminology=input.terminology;profile.preferences=input.preferences;profile.revision++;
    }else if(input.action==='example'){
      if(typeof input.before!=='string'||typeof input.after!=='string'||input.before.trim().length<20||input.after.trim().length<20||input.before.length>2000||input.after.length>2000||input.before===input.after)throw Object.assign(new Error('Önce/sonra örneği farklı ve 20–2.000 karakter olmalıdır.'),{status:400});
      if(profile.examples.length>=50)throw Object.assign(new Error('Hafıza 50 örnekle dolu. Yeni örnek için hafızayı sıfırlayın.'),{status:409});
      profile.examples.push({id:randomUUID(),before:input.before,after:input.after,created:new Date().toISOString()});profile.revision++;
    }else throw Object.assign(new Error('Geçersiz hafıza işlemi.'),{status:400});
    const file=path(env);await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(profile,null,2),'utf8');await rename(temp,file);return profile;
  });queue=operation;return operation;
}
export function profileContext(profile,text){
  const words=new Set((text.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu)||[]));
  const examples=profile.examples.map(example=>({example,score:(example.before.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu)||[]).filter(word=>words.has(word)).length})).sort((a,b)=>b.score-a.score).slice(0,3).map(({example})=>({before:example.before,after:example.after}));
  return {revision:profile.revision,terminology:profile.terminology,preferences:profile.preferences,examples};
}
