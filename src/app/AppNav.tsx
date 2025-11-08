"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = useMemo(() => pathname === '/login', [pathname]);
  const [authed, setAuthed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        const data = await res.json();
        if (active) setAuthed(Boolean(data?.authed));
      } catch {
        if (active) setAuthed(false);
      }
    })();
    return () => { active = false; };
  }, [pathname]);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  if (isLogin || !authed) return null;

  return (
    <nav className="sticky bottom-0 border-t bg-white">
      <ul className="grid grid-cols-7 text-center text-sm">
        <li className="py-3">
          <Link href="/" className="inline-flex flex-col items-center gap-0.5">
            <span aria-hidden>🏠</span>
            <span>Inicio</span>
          </Link>
        </li>
        <li className="py-3">
          <Link href="/movs" className="inline-flex flex-col items-center gap-0.5">
            <span aria-hidden>📄</span>
            <span>Movs</span>
          </Link>
        </li>
        <li className="py-3 font-bold">
          <Link href="/add" className="inline-flex flex-col items-center gap-0.5 text-blue-600">
            <span aria-hidden>➕</span>
            <span>Agregar</span>
          </Link>
        </li>
        <li className="py-3">
          <Link href="/accounts" className="inline-flex flex-col items-center gap-0.5">
            <span aria-hidden>🏦</span>
            <span>Cuentas</span>
          </Link>
        </li>
        <li className="py-3">
          <Link href="/payees" className="inline-flex flex-col items-center gap-0.5">
            <span aria-hidden>🧩</span>
            <span>Servicios</span>
          </Link>
        </li>
        <li className="py-3">
          <Link href="/more" className="inline-flex flex-col items-center gap-0.5">
            <span aria-hidden>⚙️</span>
            <span>Más</span>
          </Link>
        </li>
        <li className="py-3">
          <button onClick={onLogout} disabled={loggingOut} className="inline-flex flex-col items-center gap-0.5 text-gray-800 hover:text-rose-600">
            <span aria-hidden>🚪</span>
            <span>{loggingOut ? 'Saliendo…' : 'Salir'}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}