import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { documentError, MAX_DOCUMENT_TEXT, MAX_PDF_PAGES } from './documents.mjs';

function clean(text) {
  const value = text.replace(/\u0000/gu, '').replace(/\r\n?/gu, '\n').replace(/[ \t]+\n/gu, '\n').trim();
  if (value.length > MAX_DOCUMENT_TEXT) throw documentError('Belgedeki metin 500.000 karakteri aşıyor. Belgeyi bölerek yükleyin.', 413);
  return value;
}
async function inspectDocx(buffer) {
  const { default: yauzl } = await import('yauzl');
  await new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error) return reject(documentError('Word dosyası bozuk veya geçerli bir DOCX değil.'));
      let size = 0, actual = 0, count = 0, documentFound = false, typesFound = false, stopped = false;
      const fail = () => { if (!stopped) { stopped = true;zip.close();reject(documentError('Word dosyası bozuk, şifreli veya açılmış içerik sınırını (50 MB) aşıyor.')); } };
      zip.on('error', fail);
      zip.on('entry', entry => {
        if (stopped) return;
        size += entry.uncompressedSize;count++;
        if (size > 50 * 1024 * 1024 || count > 2048 || entry.isEncrypted()) return fail();
        documentFound ||= entry.fileName === 'word/document.xml';
        typesFound ||= entry.fileName === '[Content_Types].xml';
        if (/\/$/u.test(entry.fileName)) { zip.readEntry();return; }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return fail();
          stream.on('data', chunk => { actual += chunk.length;if (actual > 50 * 1024 * 1024) { stream.destroy();fail(); } });
          stream.on('error', fail);
          stream.on('end', () => { if (!stopped) zip.readEntry(); });
        });
      });
      zip.on('end', () => { if (!stopped) { stopped = true;zip.close();documentFound && typesFound ? resolve() : reject(documentError('Bu ZIP dosyası bir Word (.docx) belgesi değil.')); } });
      zip.readEntry();
    });
  });
}
async function parse(data, extension) {
  const buffer = Buffer.from(data);
  if (extension === '.pdf') {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw documentError('Dosya içeriği PDF biçimiyle eşleşmiyor.');
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const require = createRequire(import.meta.url);
    const root = dirname(require.resolve('pdfjs-dist/package.json'));
    const task = getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: false, disableFontFace: true,
      useWorkerFetch: false, verbosity: 0, standardFontDataUrl: join(root, 'standard_fonts') + '/', cMapUrl: join(root, 'cmaps') + '/', cMapPacked: true });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > MAX_PDF_PAGES) throw documentError('PDF en fazla 150 sayfa olabilir. Belgeyi bölerek yükleyin.', 413);
      const pages = [];let total = 0;let emptyPages = 0;
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const text = clean(content.items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
        total += text.length + 2;
        if (total > MAX_DOCUMENT_TEXT) throw documentError('Belgedeki metin 500.000 karakteri aşıyor. Belgeyi bölerek yükleyin.', 413);
        if (!text) emptyPages++;
        pages.push(text);page.cleanup();
      }
      const text = clean(pages.join('\n\n'));
      if (!text) throw documentError('PDF içinde seçilebilir metin bulunamadı. Taranmış/görüntü PDF için önce OCR (metin tanıma) uygulayın.');
      return { text, format: 'PDF', pages: pdf.numPages, warnings: ['PDF okuma sırası, sütunlar ve tablolar aslıyla farklı olabilir. Metin önizlemesini kontrol edin.', ...(emptyPages ? [`${emptyPages} sayfada metin bulunamadı; görüntü/tarama sayfaları OCR gerektirebilir.`] : [])] };
    } catch (error) {
      if (error.name === 'PasswordException') throw documentError('PDF şifreli. Parolasını kaldırdığınız bir kopyayı yükleyin.');
      throw error;
    } finally { await task.destroy(); }
  }
  if (extension === '.docx') {
    if (buffer.readUInt32LE(0) !== 0x04034b50) throw documentError('Dosya içeriği Word (.docx) biçimiyle eşleşmiyor.');
    await inspectDocx(buffer);
    const { default: mammoth } = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = clean(result.value);
    if (!text) throw documentError('Word belgesinde okunabilir metin bulunamadı. Görüntülerdeki metin için önce OCR uygulayın.');
    return { text, format: 'DOCX', pages: null, warnings: ['Yalnızca metin aktarılır; sayfa düzeni ve görseller aktarılmaz. Tabloların okuma sırasını kontrol edin.', ...(result.messages.length ? ['Belgedeki bazı öğeler metne dönüştürülemedi. Önizlemeyi kontrol edin.'] : [])] };
  }
  let text;
  try {
    const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le' : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : 'utf-8';
    text = new TextDecoder(encoding, { fatal: true }).decode(buffer);
  } catch { throw documentError('Metin dosyası okunamadı. UTF-8 veya BOM içeren UTF-16 olarak kaydedin.'); }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) throw documentError('Dosya düz metin içermiyor veya desteklenmeyen bir kodlamada.');
  text = clean(text);
  if (!text) throw documentError('Dosyada okunabilir metin bulunamadı.');
  return { text, format: extension === '.md' ? 'Markdown' : 'TXT', pages: null, warnings: [] };
}
if (parentPort && workerData) {
  try { parentPort.postMessage(await parse(workerData.data, workerData.extension)); }
  catch (error) { parentPort.postMessage({ error: { status: error.status || 422, message: error.status ? error.message : 'Belge okunamadı. Dosya bozuk, şifreli veya desteklenmeyen bir yapıda olabilir.' } }); }
}
