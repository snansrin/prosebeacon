import { Document, Paragraph, TextRun, Packer } from 'docx';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { validateText } from './analysis.mjs';
export async function exportDocument({text,format,title='ProseBeacon metni'}) {
  validateText(text);
  if(typeof title!=='string'||title.length>160||!['txt','docx','pdf'].includes(format))throw Object.assign(new Error('Geçerli başlık ve txt/docx/pdf biçimi gerekli.'),{status:400});
  if(format==='txt')return {bytes:Buffer.from(text,'utf8'),mime:'text/plain; charset=utf-8',extension:'txt'};
  if(format==='docx'){
    const document=new Document({creator:'ProseBeacon',title,styles:{default:{document:{run:{font:'Calibri',size:23},paragraph:{spacing:{after:160,line:300}}}}},sections:[{properties:{page:{margin:{top:1134,right:1134,bottom:1134,left:1134}}},children:text.split(/\r?\n/u).map(line=>new Paragraph({children:[new TextRun({text:line})]}))}]});
    return {bytes:await Packer.toBuffer(document),mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',extension:'docx'};
  }
  const bytes=await new Promise((resolve,reject)=>{
    const document=new PDFDocument({size:'A4',margin:56,info:{Title:title,Author:'ProseBeacon'}}),chunks=[];
    document.on('data',chunk=>chunks.push(chunk));document.once('error',reject);document.once('end',()=>resolve(Buffer.concat(chunks)));
    document.font(fileURLToPath(new URL('../assets/fonts/NotoSans-Regular.ttf',import.meta.url))).fontSize(11).text(text,{lineGap:4,paragraphGap:8});document.end();
  });
  return {bytes,mime:'application/pdf',extension:'pdf'};
}
