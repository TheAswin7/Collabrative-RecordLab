import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_r: Request, { params }: { params:{id:string} }) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const { data } = await supabase.from('records').select('*,record_sections(*)').eq('id',params.id).single();
  if(!data) return NextResponse.json({error:'Not found'},{status:404});
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params:{id:string} }) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body = await req.json() as Record<string,unknown>;
  await supabase.from('records').update({...body,last_edited_at:new Date().toISOString()}).eq('id',params.id).eq('created_by',user.id);
  return NextResponse.json({success:true});
}
