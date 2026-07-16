import { Video, MapPin, ExternalLink } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { DIA_LABEL, formatFechaCorta } from './aulaFormat';
import { getEstadoClaseEnVivo, type ClaseEnVivoMock, type EstadoClaseDerivado } from './aulaMock';

interface ClasesEnVivoProps {
  clases: ClaseEnVivoMock[];
  interactive: boolean;
}

const PLATAFORMA_LABEL: Record<ClaseEnVivoMock['plataforma'], string> = { meet: 'Google Meet', zoom: 'Zoom' };
/** Color reconocible de cada proveedor SOLO para esta chip identificadora — el resto de la
 * tarjeta (ícono, botón, borde de estado) sigue el tema institucional (--uni-*). */
const PLATAFORMA_COLOR: Record<ClaseEnVivoMock['plataforma'], string> = { meet: '#1B8E63', zoom: '#2D8CFF' };

const ESTADO_BADGE: Record<EstadoClaseDerivado, { label: string; className: string }> = {
  en_vivo: { label: 'EN VIVO AHORA', className: 'bg-rose-600 text-white animate-pulse motion-reduce:animate-none' },
  proxima: { label: 'Próxima', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  pasada: { label: 'Finalizada', className: 'bg-slate-100 text-slate-500' },
  cancelada: { label: 'Cancelada', className: 'bg-slate-100 text-slate-400 line-through' },
};

function diaDeFecha(fechaIso: string): string {
  // getDay() en JS: 0=domingo..6=sábado; DIA_LABEL usa claves en español empezando en lunes.
  const claves = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const d = new Date(`${fechaIso}T00:00:00`);
  return DIA_LABEL[claves[d.getDay()]] || fechaIso;
}

/**
 * "Clases en vivo" (docs/AULA_VIRTUAL_DISENO.md v2): sesiones Meet/Zoom del ciclo, una
 * tarjeta bento por sesión. Honestidad deliberada: ni Meet ni Zoom permiten embeberse en un
 * iframe (el proveedor lo bloquea por diseño, no es una limitación nuestra), así que
 * "Unirme" siempre abre en pestaña nueva — lo que SÍ vive 100% en nuestra plataforma es toda
 * la información de la sesión (curso, docente, horario, estado) organizada en esta tarjeta.
 */
export function ClasesEnVivo({ clases, interactive }: ClasesEnVivoProps) {
  const ordenadas = [...clases].sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {ordenadas.length === 0 ? (
        <AulaSectionCard icon={Video} title="Clases en vivo" spanClassName="sm:col-span-2 xl:col-span-3">
          <p className="text-sm text-slate-500">Aún no hay sesiones programadas para este ciclo.</p>
        </AulaSectionCard>
      ) : (
        ordenadas.map((clase) => {
          const estado = getEstadoClaseEnVivo(clase);
          const badge = ESTADO_BADGE[estado];
          const puedeUnirse = interactive && (estado === 'en_vivo' || estado === 'proxima');
          return (
            <AulaSectionCard key={clase.idClase} icon={Video} title={clase.curso}>
              <div className="flex flex-col gap-3 h-full">
                <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${badge.className}`}>
                  {estado === 'en_vivo' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
                  )}
                  {badge.label}
                </span>

                <div>
                  <p className="text-sm text-slate-600">
                    {diaDeFecha(clase.fecha)} {formatFechaCorta(clase.fecha)} · {clase.horaInicio}–{clase.horaFin}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{clase.docente}</p>
                </div>

                <span
                  className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: PLATAFORMA_COLOR[clase.plataforma] }}
                >
                  <MapPin className="w-3 h-3" aria-hidden="true" />
                  {PLATAFORMA_LABEL[clase.plataforma]}
                </span>

                <div className="mt-auto pt-1">
                  {puedeUnirse ? (
                    <a
                      href={clase.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-glow !px-4 !py-2 text-sm text-white w-full sm:w-auto"
                      style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      Unirme
                    </a>
                  ) : (
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                      title={
                        !interactive
                          ? 'Disponible cuando tengas un ciclo activo'
                          : estado === 'pasada'
                            ? 'Esta sesión ya terminó'
                            : 'Esta sesión fue cancelada'
                      }
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      Unirme
                    </span>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">
                    {PLATAFORMA_LABEL[clase.plataforma]} no permite verse dentro de la plataforma — el botón abre en una pestaña nueva.
                  </p>
                </div>
              </div>
            </AulaSectionCard>
          );
        })
      )}
    </div>
  );
}

export default ClasesEnVivo;
