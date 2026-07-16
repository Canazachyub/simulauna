import { useState } from 'react';

interface AulaBienvenidaProps {
  nombreCiclo: string;
}

/**
 * Bienvenida del aula con la mascota (docs/AULA_VIRTUAL_DISENO.md — la
 * mascota aparece UNA sola vez por página). `AulaShell` la muestra por
 * defecto; cuando se embebe dentro de `AulaComingSoon` (que ya usa la
 * mascota en su propio hero) se debe pasar `showWelcome={false}` a
 * `AulaShell` para no duplicarla en la misma pantalla.
 */
export function AulaBienvenida({ nombreCiclo }: AulaBienvenidaProps) {
  const [mascotFailed, setMascotFailed] = useState(false);

  return (
    <div className="flex items-center gap-4 mb-6">
      {!mascotFailed && (
        <img
          src="/simulauna/illustrations/mascota-lobito.webp"
          alt=""
          aria-hidden="true"
          onError={() => setMascotFailed(true)}
          className="w-14 h-14 md:w-16 md:h-16 shrink-0 drop-shadow-lg animate-float-y"
        />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bienvenido a tu aula</p>
        <h2 className="font-display font-bold text-slate-800 text-lg md:text-xl truncate">{nombreCiclo}</h2>
      </div>
    </div>
  );
}

export default AulaBienvenida;
