export function cn(...c: (string|undefined|null|false)[]) { return c.filter(Boolean).join(' '); }
export function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
export function formatBytes(b: number) { return b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`; }
export const MAX_FILE_SIZE = 10*1024*1024;
export const ALLOWED_FILE_TYPES = ['application/pdf','image/png','image/jpeg','text/csv'];
