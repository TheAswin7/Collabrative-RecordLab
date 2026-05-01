import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if(!q) return NextResponse.json({records:[],files:[]});
  const [recs, files] = await Promise.all([
    supabase.from('records').select('*').ilike('title',`%${q}%`).limit(20),
    supabase.from('files').select('*').ilike('name',`%${q}%`).limit(20),
  ]);
  return NextResponse.json({records:recs.data??[],files:files.data??[]});
}
