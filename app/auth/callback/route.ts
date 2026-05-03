import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next'); // only set for password-reset flow

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        // Password reset — keep session and go to update-password page
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Email confirmation — sign out so the user logs in explicitly
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?confirmed=true`);
    }
    return NextResponse.redirect(`${origin}/login?error=link-expired`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
