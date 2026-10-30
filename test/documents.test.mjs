import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { extractDocument, validateFilename, splitDocument, MAX_FILE_BYTES } from '../lib/documents.mjs';
import { createApp } from '../server.mjs';
import { docxFixture, pdfFixture } from '../support/document-fixtures.mjs';

test('supported extensions and legacy DOC guidance',()=>{
  for (const name of ['rapor.PDF','uçuş.docx','a.txt','notes.md']) assert.ok(validateFilename(name));
  for (const name of ['', '../x.pdf','x/y.docx','x\u0000.txt','a.exe','archive.zip','a'.repeat(260)+'.pdf']) assert.throws(()=>validateFilename(name));
  assert.throws(()=>validateFilename('old.doc'),error=>error.status===415&&/docx/u.test(error.message));
});
test('TXT, Markdown and UTF-16 preserve Turkish text without rendering markup',async()=>{
  const text='Türkçe uçuş: ığüşöç İĞÜŞÖÇ. <script>alert(1)</script> [12]';
  for (const name of ['uçuş.txt','uçuş.md']) assert.equal((await extractDocument(Buffer.from(text),name)).text,text);
  const utf16=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(text,'utf16le')]);
  assert.equal((await extractDocument(utf16,'rapor.txt')).text,text);
});
test('binary, invalid encoding, empty and oversized uploads rejected',async()=>{
  for(const [buffer,name] of [[Buffer.alloc(0),'empty.txt'],[Buffer.from([0x80,0xff]),'broken.txt'],[Buffer.from([0,0,0,0]),'binary.txt'],[Buffer.from('not a PDF'),'fake.pdf'],[Buffer.from('not a docx'),'fake.docx']]) {
    await assert.rejects(extractDocument(buffer,name),error=>[400,422].includes(error.status));
  }
  await assert.rejects(extractDocument(Buffer.alloc(MAX_FILE_BYTES+1),'huge.txt'),error=>error.status===413);
});
test('real DOCX paragraphs, tables, numbers and Turkish characters extracted',async()=>{
  const result=await extractDocument(docxFixture(['Türkçe: ığüşöç İĞÜŞÖÇ.','İkinci paragraf.'],true),'uçuş.docx');
  assert.match(result.text,/ığüşöç İĞÜŞÖÇ/u);assert.match(result.text,/İkinci paragraf/u);assert.match(result.text,/Karar irtifası/u);assert.match(result.text,/200 ft \[12\]/u);assert.equal(result.format,'DOCX');assert.equal(result.pages,null);assert.ok(result.warnings.length);
});
test('arbitrary ZIP and empty Word documents are not accepted as readable DOCX',async()=>{
  const zip=Buffer.from(zipSync({'not-document.txt':strToU8('not a Word file')}));
  await assert.rejects(extractDocument(zip,'fake.docx'),error=>error.status===422);
  await assert.rejects(extractDocument(docxFixture([]),'empty.docx'),error=>error.status===422);
});
test('DOCX archive expansion is bounded before XML conversion',async()=>{
  const zip=docxFixture();const central=zip.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  assert.ok(central>=0);zip.writeUInt32LE(60*1024*1024,central+24);
  await assert.rejects(extractDocument(zip,'large.docx'),error=>error.status===422);
});
test('real multi-page PDF returns text, page count and layout notice',async()=>{
  const result=await extractDocument(pdfFixture(['ILS frequency 110.30 MHz [12].','Second page: 24 participants.']),'report.pdf');
  assert.equal(result.pages,2);assert.match(result.text,/110\.30 MHz \[12\]/u);assert.match(result.text,/Second page: 24 participants/u);assert.equal(result.format,'PDF');assert.ok(result.warnings.length);
});
test('image-only PDF asks for OCR, and mixed blank pages are disclosed',async()=>{
  await assert.rejects(extractDocument(pdfFixture(['']),'scan.pdf'),error=>error.status===422&&/OCR/u.test(error.message));
  const mixed=await extractDocument(pdfFixture(['Visible selectable text.','']),'mixed.pdf');
  assert.ok(mixed.warnings.some(value=>/1 sayfada/u.test(value)));
});
test('PDF page limit and total extracted text limit are explicit',async()=>{
  await assert.rejects(extractDocument(pdfFixture(Array(151).fill('Text.')),'book.pdf'),error=>error.status===413);
  await assert.rejects(extractDocument(Buffer.from('a'.repeat(500001)),'book.txt'),error=>error.status===413);
});
test('large document parts preserve every character, order and surrogate pairs',()=>{
  const text=('Türkçe paragraf ığüşöç.\n\n'.repeat(3000))+'🚀';const parts=splitDocument(text);
  assert.ok(parts.length>1);assert.equal(parts.map(p=>text.slice(p.start,p.end)).join(''),text);
  for(const part of parts)assert.ok(part.end-part.start<=20000&&part.end>part.start);
  const edge='x'.repeat(19999)+'🚀x';const pieces=splitDocument(edge);assert.equal(pieces[0].end,19999);
});
test('parser timeout and cancellation are bounded and release the worker slot',async()=>{
  await assert.rejects(extractDocument(docxFixture(),'test.docx',{timeoutMs:1}),error=>error.status===422);
  await assert.rejects(extractDocument(Buffer.from('some text'),'test.txt',{signal:AbortSignal.abort()}),error=>error.status===499);
  assert.equal((await extractDocument(Buffer.from('A subsequent valid text file.'),'test.txt')).text,'A subsequent valid text file.');
});
test('HTTP import applies authentication, origin, content type, size and format checks',async()=>{
  const server=createApp({APP_PASSWORD:'import-test'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(filename,body,extra={})=>fetch(`${base}/api/import`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(filename),'X-App-Password':'import-test',...extra},body});
  try{
    assert.equal((await post('file.txt',Buffer.from('Text'),{'X-App-Password':''})).status,401);
    assert.equal((await post('file.txt',Buffer.from('Text'),{Origin:'https://other.example'})).status,403);
    assert.equal((await post('file.txt','{}',{'Content-Type':'application/json'})).status,415);
    assert.equal((await post('old.doc',Buffer.from('Text'))).status,415);
    assert.equal((await post('fake.pdf',Buffer.from('not a PDF'))).status,422);
    const result=await post('uçuş.docx',docxFixture());assert.equal(result.status,200);const data=await result.json();assert.equal(data.filename,'uçuş.docx');assert.match(data.text,/110\.30/u);
    const large=await post('long.md',Buffer.from('Türkçe uzun metin.\n'.repeat(3000)));assert.equal(large.status,200);assert.ok((await large.json()).parts.length>1);
    assert.equal((await post('huge.txt',Buffer.alloc(MAX_FILE_BYTES+1,65))).status,413);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
