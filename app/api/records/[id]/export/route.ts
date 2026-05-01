import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRecordPDF } from '@/lib/pdf/renderer';

export async function POST(_r: Request, { params }: { params:{id:string} }) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const { data:record } = await supabase.from('records').select('title,created_by').eq('id',params.id).single();
  if(!record) return NextResponse.json({error:'Not found'},{status:404});
  if(record.created_by!==user.id) return NextResponse.json({error:'Forbidden'},{status:403});
  try {
    const pdf = await generateRecordPDF(params.id, user.id);
    const filename = `${record.title.replace(/[^a-z0-9]/gi,'_')}.pdf`;
    return new NextResponse(pdf as unknown as BodyInit, { headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`} });
  } catch {
    return NextResponse.json({error:'PDF generation failed'},{status:500});
  }
}
