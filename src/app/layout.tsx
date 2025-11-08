import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Finanzas Personales',
  description: 'Control financiero personal (Next.js + MongoDB)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <nav className="sticky bottom-0 border-t bg-white">
            <ul className="grid grid-cols-5 text-center">
              <li className="py-4"><Link href="/">Inicio</Link></li>
              <li className="py-4"><Link href="/movs">Movs.</Link></li>
              <li className="py-4 font-bold"><Link href="/add">+</Link></li>
              <li className="py-4"><Link href="/accounts">Cuentas</Link></li>
              <li className="py-4"><Link href="/more">Más</Link></li>
            </ul>
          </nav>
        </div>
      </body>
    </html>
  );
}
