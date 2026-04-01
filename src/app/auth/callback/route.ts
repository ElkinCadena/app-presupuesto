import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Verificar si ya tiene nombre guardado
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user.id)
        .limit(1);

      const hasName = profiles && profiles.length > 0 && profiles[0].full_name;
      const destination = hasName ? '/app/dashboard' : '/app/onboarding';
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
