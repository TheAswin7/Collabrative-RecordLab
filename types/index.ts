export type SectionType = 'aim'|'apparatus'|'theory'|'procedure'|'observation'|'result'|'conclusion';

export interface SectionMeta { type: SectionType; label: string; hint: string; icon: string; }

export const SECTION_DEFINITIONS: SectionMeta[] = [
  { type:'aim',         label:'Aim',         icon:'🎯', hint:'State the objective of the experiment in one or two sentences.' },
  { type:'apparatus',   label:'Apparatus',   icon:'🔬', hint:'List all equipment, chemicals, and materials used.' },
  { type:'theory',      label:'Theory',      icon:'📖', hint:'Briefly explain the scientific principle behind this experiment.' },
  { type:'procedure',   label:'Procedure',   icon:'📋', hint:'Write the steps followed during the experiment in order.' },
  { type:'observation', label:'Observation', icon:'👁️', hint:'Record exactly what you observed — values, changes, readings.' },
  { type:'result',      label:'Result',      icon:'✅', hint:'State the outcome. Include calculated values if any.' },
  { type:'conclusion',  label:'Conclusion',  icon:'💡', hint:'What did you learn? Did the result match the expected outcome?' },
];

export interface LabRecord { id:string; title:string; experiment_id:string|null; created_by:string; status:'draft'|'complete'; last_edited_at:string; created_at:string; }
export interface RecordSection { id:string; record_id:string; section_type:SectionType; content_json:object; order_number:number; }
export interface FileItem { id:string; name:string; storage_path:string; file_type:'pdf'|'image'|'csv'; experiment_id:string|null; uploaded_by:string; visibility:'private'|'department'|'public'; }
export interface Profile { id:string; name:string; college_email:string|null; role:'student'|'class_rep'|'admin'; department_id:string|null; }
export interface Department { id:string; name:string; code:string; }
export interface Subject { id:string; name:string; code:string; department_id:string; semester:string|null; }
export interface Experiment { id:string; title:string; description:string|null; subject_id:string; order_number:number; }
