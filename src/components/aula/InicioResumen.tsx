import { useEffect, useState } from 'react';
import { CalendarClock, Video, FileText, PlayCircle, Link2, Megaphone, Users, MessageCircle, ArrowRight } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta, formatCountdown } from './aulaFormat';
import { getEstadoClaseEnVivo, getProximaClaseEnVivoMock, getMaterialDestacadoMock, type AulaAgregadoMock } from './aulaMock';
import type { SectionId } from './AulaShell';

const ICONO_MATERIAL = { pdf: FileText, video: PlayCircle, enlace: Link2 } as const;
const PLATAFORMA_LABEL = { meet: 'Google Meet', zoom: 'Zoom' } as const;

interface InicioResumenProps {
  aula: AulaAgregadoMock;
  interactive: boolean;
  onIrASeccion: (id: SectionId) => void;
}

/**
 * Sección "Inicio" (docs/AULA_VIRTUAL_DISENO.md v2): resumen bento de 4 celdas — lo primero
 * que un alumno necesita ver en 5 segundos al entrar. Reemplaza a la antigua celda dominante
 * "Hoy en tu aula" de v1 (ver docs/AULA_VIRTUAL_DISENO.md) con un countdown en vivo a la
 * próxima sesión Meet/Zoom (hoja `clases_en_vivo`), en vez de solo mostrar el próximo bloque
 * del horario semanal.
 */
export function InicioResumen({ aula, interactive, onIrASeccion }: InicioResumenProps) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const proximaClase = getProximaClaseEnVivoMock(aula.clasesEnVivo, ahora);
  const estadoProxima = proximaClase ? getEstadoClaseEnVivo(proximaClase, ahora) : null;
  const materialDestacado = getMaterialDestacadoMock(aula.materiales);
  const ultimoAnuncio = [...aula.anuncios].sort((a, b) => {
    if (a.fijado !== b.fijado) return a.fijado ? -1 : 1;
    return b.fecha.localeCompare(a.fecha);
  })[0];
  const MaterialIcon = materialDestacado ? ICONO_MATERIAL[materialDestacado.tipo] : FileText;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:grid-flow-row-dense">
      {/* Próxima clase en vivo — countdown */}
      <AulaSectionCard icon={CalendarClock} title="Tu próxima clase en vivo" spanClassName="sm:col-span-2 lg:col-span-2 lg:row-span-2">
        {proximaClase ? (
          <div className="flex flex-col gap-4 h-full">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--uni-primary-soft)' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--uni-primary-safe)' }}>
                {estadoProxima === 'en_vivo' ? 'En vivo ahora' : 'Cuenta regresiva'}
              </p>
              <p className="font-display font-bold text-slate-800 text-xl md:text-2xl">
                {estadoProxima === 'en_vivo'
                  ? '¡Tu clase ya empezó!'
                  : formatCountdown(new Date(`${proximaClase.fecha}T${proximaClase.horaInicio}:00`).getTime() - ahora.getTime())}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {proximaClase.curso} · {proximaClase.horaInicio}–{proximaClase.horaFin} · {proximaClase.docente} · {PLATAFORMA_LABEL[proximaClase.plataforma]}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {interactive && (estadoProxima === 'en_vivo' || estadoProxima === 'proxima') ? (
                  <a
                    href={proximaClase.enlace}
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
                )}
                <button
                  type="button"
                  onClick={() => onIrASeccion('clases')}
                  className="text-xs font-bold flex items-center gap-1 px-2 py-2"
                  style={{ color: 'var(--uni-primary-safe)' }}
                >
                  Ver todas mis clases
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No tienes clases en vivo programadas por ahora.</p>
        )}
      </AulaSectionCard>

      {/* Último material */}
      <AulaSectionCard
        icon={MaterialIcon}
        title="Material nuevo"
        action={
          <button type="button" onClick={() => onIrASeccion('materiales')} className="text-xs font-bold shrink-0" style={{ color: 'var(--uni-primary-safe)' }}>
            Ver todo
          </button>
        }
      >
        {materialDestacado ? (
          <div>
            <p className="font-semibold text-slate-700 text-sm">{materialDestacado.titulo}</p>
            <p className="text-xs text-slate-400 mt-1">
              {materialDestacado.curso} · Semana {materialDestacado.semana} · {formatFechaCorta(materialDestacado.fechaPublicacion)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Todavía no se publicó material.</p>
        )}
      </AulaSectionCard>

      {/* Último anuncio */}
      <AulaSectionCard
        icon={Megaphone}
        title="Último anuncio"
        action={
          <button type="button" onClick={() => onIrASeccion('anuncios')} className="text-xs font-bold shrink-0" style={{ color: 'var(--uni-primary-safe)' }}>
            Ver todo
          </button>
        }
      >
        {ultimoAnuncio ? (
          <div>
            <p className="font-semibold text-slate-700 text-sm leading-snug">{ultimoAnuncio.titulo}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{ultimoAnuncio.cuerpo}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Todavía no hay anuncios.</p>
        )}
      </AulaSectionCard>

      {/* Acceso rápido al grupo */}
      <AulaSectionCard icon={Users} title="Tu grupo">
        <p className="text-sm text-slate-600 mb-3 truncate">{aula.grupoWhatsapp.nombreGrupo}</p>
        {interactive && aula.grupoWhatsapp.estado === 'activo' ? (
          <a
            href={aula.grupoWhatsapp.enlaceInvitacion}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow !px-4 !py-2 text-sm text-white"
            style={{ backgroundColor: 'var(--uni-primary-safe)' }}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Unirme
          </a>
        ) : (
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
            title={!interactive ? 'Disponible cuando tengas un ciclo activo' : 'Grupo completo'}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Unirme
          </span>
        )}
      </AulaSectionCard>
    </div>
  );
}

export default InicioResumen;
