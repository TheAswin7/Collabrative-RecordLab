import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function cookieHandlers() {
  const store = cookies();
  return {
    getAll() { return store.getAll(); },
    setAll(list: {name:string;value:string;options?:Record<string,unknown>}[]) {
      try { list.forEach(({name,value,options}) => store.set(name,value,options as Parameters<typeof store.set>[2])); } catch {}
    },
  };
}

export function createClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: cookieHandlers() });
}

export function createServiceClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: cookieHandlers() });
}
