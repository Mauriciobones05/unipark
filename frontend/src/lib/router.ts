import { useEffect, useState } from 'react';

/** Roteador mínimo por hash (#/rota): funciona servido direto do ESP32, sem regras de rewrite. */
export function useHashRoute(defaultRoute = '/'): [string, (to: string) => void] {
  const read = () => window.location.hash.replace(/^#/, '') || defaultRoute;
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [route, (to: string) => { window.location.hash = to; }];
}
