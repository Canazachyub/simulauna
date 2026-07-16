import { useState } from 'react';
import { Compass, ArrowUpRight } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { ResourceViewer, detectResourceKind } from './ResourceViewer';
import type { RecursoMock } from './aulaMock';

interface RecursosExternosProps {
  recursos: RecursoMock[];
  interactive: boolean;
}

/**
 * "Recursos" (docs/AULA_VIRTUAL_DISENO.md v2): enlaces externos curados por el coordinador
 * (hoja `recursos`) agrupados por categoría. Se abren en ResourceViewer — si el sitio bloquea
 * el embebido (X-Frame-Options), el propio visor muestra el fallback "Abrir en pestaña
 * nueva" (ver ResourceViewer.tsx). Esta sección ES la materialización de "links externos
 * dentro de nuestra plataforma": el alumno nunca sale de simulauna para verlos.
 */
export function RecursosExternos({ recursos, interactive }: RecursosExternosProps) {
  const [activo, setActivo] = useState<RecursoMock | null>(null);
  const categorias = [...new Set(recursos.map((r) => r.categoria))];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {categorias.length === 0 ? (
          <AulaSectionCard icon={Compass} title="Recursos" spanClassName="lg:col-span-2">
            <p className="text-sm text-slate-500">Tu coordinador todavía no publicó recursos externos.</p>
          </AulaSectionCard>
        ) : (
          categorias.map((cat) => (
            <AulaSectionCard key={cat} icon={Compass} title={cat}>
              <ul className="space-y-2">
                {recursos
                  .filter((r) => r.categoria === cat)
                  .map((r) => (
                    <li key={r.idRecurso}>
                      <button
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && setActivo(r)}
                        title={interactive ? 'Ver dentro de la plataforma' : 'Disponible cuando tengas un ciclo activo'}
                        className="w-full flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-700 truncate">{r.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{r.descripcion}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ul>
            </AulaSectionCard>
          ))
        )}
      </div>

      {activo && (
        <ResourceViewer
          open
          onClose={() => setActivo(null)}
          title={activo.titulo}
          subtitle={activo.categoria}
          url={activo.url}
          kind={detectResourceKind(activo.url)}
        />
      )}
    </>
  );
}

export default RecursosExternos;
