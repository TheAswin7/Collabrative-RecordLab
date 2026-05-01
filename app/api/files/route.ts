import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MAX_FILE_SIZE } from '@/lib/utils';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const expId = new URL(req.url).searchParams.get('experiment_id');
  let q = supabase.from('files').select('*').order('created_at',{ascending:false});
  if(expId) q = q.eq('experiment_id',expId);
  const { data } = await q;
  return NextResponse.json(data??[]);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body = await req.json() as {name:string;storage_path:string;file_type:string;file_size_bytes:number;experiment_id:string|null;visibility:string};
  if(body.file_size_bytes>MAX_FILE_SIZE) return NextResponse.json({error:'File too large. Max 10 MB.'},{status:400});
  const fileType = body.file_type.includes('pdf')?'pdf':body.file_type.includes('csv')?'csv':'image';
  const { data, error } = await supabase.from('files').insert({name:body.name,storage_path:body.storage_path,file_type:fileType,file_size_bytes:body.file_size_bytes,experiment_id:body.experiment_id,uploaded_by:user.id,visibility:body.visibility??'department'}).select().single();
  if(error) return NextResponse.json({error:'Failed to save file'},{status:500});
  return NextResponse.json(data,{status:201});
}
