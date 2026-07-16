import { useState, type CSSProperties } from 'react';
import { BookMarked, ChevronDown, FileText, PlayCircle, Link2, ExternalLink } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta } from './aulaFormat';
import { ResourceViewer, detectResourceKind, type ResourceKind } from './ResourceViewer';
import type { MaterialMock } from './aulaMock';

const ICONO_TIPO = { pdf: FileText, video: PlayCircle, enlace: Link2 } as const;
const LABEL_TIPO = { pdf: 'PDF', video: 'Video', enlace: 'Enlace' } as const;

interface MaterialesCursoProps {
  materiales: MaterialMock[];
  interactive: boolean;
}

/** Un `pdf` de la hoja `materiales` casi siempre es un archivo de Drive (ver convención de
 * carpetas en docs/AULA_VIRTUAL_DISENO.md §5.1) — se fuerza a `drive` aunque la URL no calce
 * con el patrón exacto, porque un PDF suelto (no-Drive) es la excepción, no la regla. Para
 * `video`/`enlace` se detecta el proveedor real de la URL (puede ser YouTube o Drive).
 */
function resourceKindDeMaterial(m: MaterialMock): ResourceKind {
  if (m.tipo === 'pdf') return 'drive';
  return detectResourceKind(m.urlDrive);
}

/**
 * Materiales agrupados por curso (docs/AULA_VIRTUAL_DISENO.md §5): acordeón
 * simple, más reciente primero dentro de cada curso. El alumno solo
 * consume — no hay orden propio, el `fechaPublicacion` de cada fila de la
 * hoja `materiales` decide el orden.
 */
export function MaterialesCurso({ materiales, interactive }: MaterialesCursoProps) {
  const cursos = [...new Set(materiales.map((m) => m.curso))];
  const [abierto, setAbierto] = useState<string | null>(cursos[0] || null);
  const [activo, setActivo] = useState<MaterialMock | null>(null);

  return (
    <>
    <AulaSectionCard icon={BookMarked} title="Materiales por curso" spanClassName="sm:col-span-2 lg:col-span-2">
      {cursos.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay materiales publicados.</p>
      ) : (
        <div className="space-y-2">
          {cursos.map((curso) => {
            const items = materiales
              .filter((m) => m.curso === curso)
              .sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion));
            const isOpen = abierto === curso;
            return (
              <div key={curso} className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierto(isOpen ? null : curso)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 min-h-[44px]"
                  style={{ '--tw-ring-color': 'var(--uni-primary-soft)' } as CSSProperties}
                >
                  <span className="font-semibold text-slate-700 text-sm">{curso}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{items.length} material{items.length === 1 ? '' : 'es'}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </span>
                </button>
                {isOpen && (
                  <ul className="border-t border-slate-100 divide-y divide-slate-100">
                    {items.map((m) => {
                      const Icon = ICONO_TIPO[m.tipo];
                      return (
                        <li key={m.idMaterial} className="flex items-center gap-3 px-4 py-3">
                          <div
                            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                          >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 truncate">{m.titulo}</p>
                            <p className="text-xs text-slate-400">
                              {LABEL_TIPO[m.tipo]} · Semana {m.semana} · {formatFechaCorta(m.fechaPublicacion)}
                            </p>
                          </div>
                          {interactive ? (
                            <span className="shrink-0 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActivo(m)}
                                className="text-xs font-bold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)' }}
                              >
                                Ver aquí
                              </button>
                              <a
                                href={m.urlDrive}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Abrir "${m.titulo}" en una pestaña nueva`}
                                title="Abrir en pestaña nueva"
                                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              >
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            </span>
                          ) : (
                            <span
                              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-slate-400 bg-slate-100 cursor-not-allowed"
                              title="Disponible cuando tengas un ciclo activo"
                            >
                              Ver aquí
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AulaSectionCard>

    {activo && (
      <ResourceViewer
        open
        onClose={() => setActivo(null)}
        title={activo.titulo}
        subtitle={`${activo.curso} · Semana ${activo.semana}`}
        url={activo.urlDrive}
        kind={resourceKindDeMaterial(activo)}
      />
    )}
    </>
  );
}

export default MaterialesCurso;
