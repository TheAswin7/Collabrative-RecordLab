import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request, { params }: { params:{id:string;sectionId:string} }) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const { data:record } = await supabase.from('records').select('created_by').eq('id',params.id).single();
  if(!record) return NextResponse.json({error:'Not found'},{status:404});
  if(record.created_by!==user.id) {
    const { data:collab } = await supabase.from('collaborators').select('permission').eq('record_id',params.id).eq('user_id',user.id).single();
    if(!collab||collab.permission!=='editor') return NextResponse.json({error:'Forbidden'},{status:403});
  }
  const body = await req.json() as {content_json:object};
  await supabase.from('record_sections').update({content_json:body.content_json,updated_at:new Date().toISOString()}).eq('id',params.sectionId).eq('record_id',params.id);
  await supabase.from('records').update({last_edited_at:new Date().toISOString()}).eq('id',params.id);
  return NextResponse.json({success:true});
}
