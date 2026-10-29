import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { modelStatus, startLocalRuntime } from '../lib/local-runtime.mjs';
const env={AI_PROVIDER:'ollama',OLLAMA_MODEL:'qwen3:8b',OLLAMA_EXECUTABLE:'test-only-ollama',OLLAMA_MODELS:'test-only-models'};
const tags=models=>new Response(JSON.stringify({models:models.map(name=>({name}))}));
test('health distinguishes service connectivity from installed model',async()=>{
  assert.deepEqual(await modelStatus(env,async()=>tags(['qwen3:8b'])),{connected:true,modelAvailable:true});
  assert.deepEqual(await modelStatus(env,async()=>tags(['other:latest'])),{connected:true,modelAvailable:false});
  assert.deepEqual(await modelStatus(env,async()=>{throw new Error('offline');}),{connected:false,modelAvailable:false});
  assert.deepEqual(await modelStatus({AI_PROVIDER:'openai'}),{connected:null,modelAvailable:null});
});
test('existing runtime is reused without spawning or taking ownership',async()=>{
  assert.equal(await startLocalRuntime(env,{fetcher:async()=>tags([]),spawnProcess:()=>{throw new Error('must not spawn');}}),null);
});
test('automatic runtime enforces loopback and refuses remote URL',async()=>{
  await assert.rejects(startLocalRuntime({...env,OLLAMA_URL:'http://remote.example:11434'}),/yerel/);
});
test('portable runtime binds locally, hides windows and disables cloud',async()=>{
  let calls=0;let started;
  const child=new EventEmitter();child.exitCode=null;child.kill=()=>{};
  const result=await startLocalRuntime(env,{fetcher:async()=>{if(calls++===0)throw new Error('not yet running');return tags(['qwen3:8b']);},spawnProcess:(file,args,options)=>{started={file,args,options};return child;},wait:async()=>{}});
  assert.equal(result,child);assert.deepEqual(started.args,['serve']);assert.equal(started.options.env.OLLAMA_HOST,'127.0.0.1:11434');assert.equal(started.options.env.OLLAMA_NO_CLOUD,'1');assert.equal(started.options.env.OLLAMA_MODELS,'test-only-models');assert.equal(started.options.windowsHide,true);
});
test('failed process startup is stopped and produces actionable error',async()=>{
  let killed=false;const child=new EventEmitter();child.exitCode=1;child.kill=()=>{killed=true;};
  await assert.rejects(startLocalRuntime(env,{fetcher:async()=>{throw new Error('offline');},spawnProcess:()=>child,wait:async()=>{}}),/başlatılamadı/);assert.equal(killed,true);
});
test('no provider or executable means no automatic process start',async()=>{
  assert.equal(await startLocalRuntime({AI_PROVIDER:'none'}),null);
  assert.equal(await startLocalRuntime({AI_PROVIDER:'ollama'}),null);
});
