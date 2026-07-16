import { Megaphone, Pin } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta } from './aulaFormat';
import type { AnuncioMock } from './aulaMock';

interface AnunciosCoordinadorProps {
  anuncios: AnuncioMock[];
}

/** Feed de avisos del coordinador (docs/AULA_VIRTUAL_DISENO.md §7, sección 3): fijados primero, luego cronológico. */
export function AnunciosCoordinador({ anuncios }: AnunciosCoordinadorProps) {
  const ordenados = [...anuncios].sort((a, b) => {
    if (a.fijado !== b.fijado) return a.fijado ? -1 : 1;
    return b.fecha.localeCompare(a.fecha);
  });

  return (
    <AulaSectionCard icon={Megaphone} title="Anuncios del coordinador" spanClassName="sm:col-span-2 lg:col-span-1 lg:row-span-2">
      {ordenados.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay anuncios en este ciclo.</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {ordenados.map((a) => (
            <li key={a.idAnuncio} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {a.fijado && <Pin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />}
                <p className="text-xs text-slate-400">{formatFechaCorta(a.fecha)}</p>
              </div>
              <p className="font-semibold text-slate-700 text-sm leading-snug">{a.titulo}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.cuerpo}</p>
            </li>
          ))}
        </ul>
      )}
    </AulaSectionCard>
  );
}

export default AnunciosCoordinador;
