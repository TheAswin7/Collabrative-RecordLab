import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RecordEditor from '@/components/editor/RecordEditor';
import type { LabRecord, RecordSection } from '@/types';

export default async function RecordPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if(!user) notFound();
  const { data:record } = await supabase.from('records').select('*').eq('id',params.id).single();
  if(!record) notFound();
  const { data:sections } = await supabase.from('record_sections').select('*').eq('record_id',params.id).order('order_number');
  return <div className="h-full"><RecordEditor record={record as LabRecord} sections={(sections??[]) as RecordSection[]}/></div>;
}
