import { useState, type CSSProperties } from 'react';
import { Clapperboard, PlayCircle, Clock } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta } from './aulaFormat';
import { ResourceViewer, detectResourceKind, extractYoutubeThumb } from './ResourceViewer';
import type { GrabacionMock } from './aulaMock';

interface GrabacionesProps {
  grabaciones: GrabacionMock[];
  interactive: boolean;
}

/**
 * "Grabaciones" (docs/AULA_VIRTUAL_DISENO.md v2): grid bento de videos ya grabados. A
 * diferencia de "Clases en vivo" (Meet/Zoom, imposible de embeber), estos SÍ se reproducen
 * embebidos dentro de la plataforma vía ResourceViewer (YouTube nocookie o Drive /preview).
 */
export function Grabaciones({ grabaciones, interactive }: GrabacionesProps) {
  const [activa, setActiva] = useState<GrabacionMock | null>(null);
  const ordenadas = [...grabaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {ordenadas.length === 0 ? (
          <AulaSectionCard icon={Clapperboard} title="Grabaciones" spanClassName="sm:col-span-2 xl:col-span-3">
            <p className="text-sm text-slate-500">Todavía no hay clases grabadas publicadas.</p>
          </AulaSectionCard>
        ) : (
          ordenadas.map((g) => {
            const kind = detectResourceKind(g.urlVideo);
            const thumb = kind === 'youtube' ? extractYoutubeThumb(g.urlVideo) : null;
            return (
              <div key={g.idGrabacion} className="shadow-tinted card-elevated rounded-2xl overflow-hidden flex flex-col">
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => interactive && setActiva(g)}
                  title={interactive ? 'Reproducir dentro de la plataforma' : 'Disponible cuando tengas un ciclo activo'}
                  className="relative aspect-video bg-slate-800 group focus:outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-not-allowed"
                  style={{ '--tw-ring-color': 'var(--uni-primary-safe)' } as CSSProperties}
                >
                  {thumb ? (
                    <img src={thumb} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900" />
                  )}
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" aria-hidden="true" />
                  </div>
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {g.duracionMin} min
                  </span>
                </button>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="font-semibold text-slate-700 text-sm leading-snug line-clamp-2">{g.titulo}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {g.curso} · {g.docente} · {formatFechaCorta(g.fecha)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activa && (
        <ResourceViewer
          open
          onClose={() => setActiva(null)}
          title={activa.titulo}
          subtitle={`${activa.curso} · ${activa.docente}`}
          url={activa.urlVideo}
          kind={detectResourceKind(activa.urlVideo)}
        />
      )}
    </>
  );
}

export default Grabaciones;
