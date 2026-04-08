import type { Metadata } from 'next';
import NextTopLoader from 'nextjs-toploader';
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
      <body>
        <NextTopLoader
          color="#2563eb"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #2563eb,0 0 5px #2563eb"
          easing="ease"
          speed={200}
        />
        {children}
      </body>
    </html>
  );
}