import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Presupuesto Personal',
  description: 'Gestiona tus finanzas personales de forma organizada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
