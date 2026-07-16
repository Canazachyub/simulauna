import { CalendarClock, Video, MapPin, FileText, PlayCircle, Link2 } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { DIA_LABEL, formatFechaCorta } from './aulaFormat';
import type { HorarioItemMock, MaterialMock } from './aulaMock';

const ICONO_MATERIAL = { pdf: FileText, video: PlayCircle, enlace: Link2 } as const;

interface HoyEnTuAulaProps {
  proximaClase: HorarioItemMock | null;
  materialDestacado: MaterialMock | null;
  /** En vista previa las acciones no navegan a ningún lado real. */
  interactive: boolean;
}

/**
 * Celda dominante del muro (docs/AULA_VIRTUAL_DISENO.md §7, sección 1):
 * combina la próxima clase del horario + el material más reciente marcado
 * `destacado` — lo primero que un alumno necesita ver al entrar, sin tener
 * que armar el panorama leyendo 3 secciones distintas.
 */
export function HoyEnTuAula({ proximaClase, materialDestacado, interactive }: HoyEnTuAulaProps) {
  const MaterialIcon = materialDestacado ? ICONO_MATERIAL[materialDestacado.tipo] : FileText;

  return (
    <AulaSectionCard
      icon={CalendarClock}
      title="Hoy en tu aula"
      spanClassName="sm:col-span-2 lg:col-span-2 lg:row-span-2"
    >
      <div className="flex flex-col gap-5 h-full">
        {/* Próxima clase */}
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--uni-primary-soft)' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--uni-primary-safe)' }}>
            Tu próxima clase
          </p>
          {proximaClase ? (
            <>
              <p className="font-display font-bold text-slate-800 text-lg md:text-xl">{proximaClase.curso}</p>
              <p className="text-sm text-slate-600 mt-1">
                {DIA_LABEL[proximaClase.dia]} · {proximaClase.horaInicio}–{proximaClase.horaFin} · {proximaClase.docente}
              </p>
              <div className="mt-3">
                {proximaClase.modalidad === 'virtual' ? (
                  interactive ? (
                    <a
                      href={proximaClase.enlaceMeet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-glow !px-4 !py-2 text-sm text-white"
                      style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                    >
                      <Video className="w-4 h-4" aria-hidden="true" />
                      Unirme a la clase
                    </a>
                  ) : (
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                      title="Disponible cuando tengas un ciclo activo"
                    >
                      <Video className="w-4 h-4" aria-hidden="true" />
                      Unirme a la clase
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {proximaClase.aulaFisica}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Aún no hay clases programadas.</p>
          )}
        </div>

        {/* Material nuevo destacado */}
        <div className="rounded-xl p-4 border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Material nuevo de la semana</p>
          {materialDestacado ? (
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--uni-secondary-safe)', color: '#1e293b' }}
              >
                <MaterialIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-700 text-sm truncate">{materialDestacado.titulo}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {materialDestacado.curso} · Semana {materialDestacado.semana} · {formatFechaCorta(materialDestacado.fechaPublicacion)}
                </p>
              </div>
              {interactive ? (
                <a
                  href={materialDestacado.urlDrive}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-white"
                  style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                >
                  Abrir
                </a>
              ) : (
                <span
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full text-slate-400 bg-slate-100 cursor-not-allowed"
                  title="Disponible cuando tengas un ciclo activo"
                >
                  Abrir
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Todavía no se publicó material esta semana.</p>
          )}
        </div>
      </div>
    </AulaSectionCard>
  );
}

export default HoyEnTuAula;
