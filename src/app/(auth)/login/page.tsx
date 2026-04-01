import type { Metadata } from 'next';
import LoginForm from '@/components/features/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión — Presupuesto Personal',
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido</h1>
      <p className="text-gray-500 mb-8">Inicia sesión para continuar</p>
      <LoginForm />
    </div>
  );
}
