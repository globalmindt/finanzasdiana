"use client";
import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handler(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function onInstall() {
    try {
      if (!deferredPrompt) return;
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Ocultar botón después del intento
      setVisible(false);
      setDeferredPrompt(null);
      console.info('PWA install outcome:', outcome);
    } catch (e) {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={onInstall}
        className="rounded bg-blue-600 text-white px-4 py-2 shadow-md"
      >
        Instalar app
      </button>
    </div>
  );
}