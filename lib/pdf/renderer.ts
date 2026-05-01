import fs from 'fs';
import path from 'path';
import { createServiceClient } from '@/lib/supabase/server';
import { SECTION_DEFINITIONS } from '@/types';

type Node = { type:string; content?:Node[]; text?:string; marks?:{type:string}[]; attrs?:Record<string,unknown> };

function toHtml(n: Node): string {
  if(n.type==='text') {
    let t=(n.text??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    (n.marks??[]).forEach(m=>{ if(m.type==='bold')t=`<strong>${t}</strong>`; else if(m.type==='italic')t=`<em>${t}</em>`; });
    return t;
  }
  const inner=(n.content??[]).map(toHtml).join('');
  switch(n.type){
    case 'doc': return inner;
    case 'paragraph': return `<p>${inner}</p>`;
    case 'bulletList': return `<ul>${inner}</ul>`;
    case 'orderedList': return `<ol>${inner}</ol>`;
    case 'listItem': return `<li>${inner}</li>`;
    case 'table': return `<table>${inner}</table>`;
    case 'tableRow': return `<tr>${inner}</tr>`;
    case 'tableHeader': return `<th>${inner}</th>`;
    case 'tableCell': return `<td>${inner}</td>`;
    case 'hardBreak': return '<br/>';
    default: return inner;
  }
}

export async function generateRecordPDF(recordId: string, userId: string): Promise<Buffer> {
  const supabase = createServiceClient();
  const [{ data:record }, { data:sections }, { data:profile }] = await Promise.all([
    supabase.from('records').select('*').eq('id',recordId).single(),
    supabase.from('record_sections').select('*').eq('record_id',recordId).order('order_number'),
    supabase.from('profiles').select('name').eq('id',userId).single(),
  ]);
  if(!record) throw new Error('Record not found');

  let template = fs.readFileSync(path.join(process.cwd(),'public','pdf-template','template.html'),'utf-8');

  const content = (sections??[]).map(sec=>{
    const def=SECTION_DEFINITIONS.find(d=>d.type===sec.section_type);
    if(!def) return '';
    const html=sec.content_json&&Object.keys(sec.content_json).length>0?toHtml(sec.content_json as Node):'<p style="color:#94a3b8;font-style:italic">Not filled</p>';
    return `<section class="section"><div class="section-header"><h2>${def.icon} ${def.label}</h2></div><div class="section-body">${html}</div></section>`;
  }).join('');

  template=template.replace(/{{TITLE}}/g,record.title).replace('{{STUDENT_NAME}}',profile?.name??'—').replace('{{EXPERIMENT}}','—').replace('{{DATE}}',new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})).replace('{{CONTENT}}',content);

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.setContent(template,{waitUntil:'networkidle0'});
  const pdf = await page.pdf({format:'A4',printBackground:true,margin:{top:'2cm',bottom:'2cm',left:'2cm',right:'2cm'}});
  await browser.close();
  return Buffer.from(pdf);
}
