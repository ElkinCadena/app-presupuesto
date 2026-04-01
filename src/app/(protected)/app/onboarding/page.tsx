import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import OnboardingForm from '@/components/features/OnboardingForm';

export const metadata: Metadata = {
  title: '¿Cómo te llamamos? — Presupuesto Personal',
};

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Si ya tiene nombre, no necesita onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (profile?.full_name) redirect('/app/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido!
        </h1>
        <p className="text-gray-500 mb-8">
          ¿Con qué nombre quieres que te identifiquemos?
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
