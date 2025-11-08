"use client";
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.info('Service Worker registrado', reg);
        } catch (e) {
          console.warn('No se pudo registrar el Service Worker', e);
        }
      };
      // Esperar a que la app haya cargado
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register);
    }
  }, []);
  return null;
}