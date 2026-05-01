import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const { data } = await supabase.from('records').select('*').order('last_edited_at',{ascending:false});
  return NextResponse.json(data??[]);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body = await req.json() as {title:string;experiment_id?:string};
  if(!body.title?.trim()) return NextResponse.json({error:'Title required'},{status:400});
  const { data, error } = await supabase.from('records').insert({title:body.title.trim(),experiment_id:body.experiment_id??null,created_by:user.id,status:'draft',last_edited_at:new Date().toISOString()}).select().single();
  if(error) return NextResponse.json({error:'Failed to create'},{status:500});
  return NextResponse.json(data,{status:201});
}
