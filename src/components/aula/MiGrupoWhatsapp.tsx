import { Users, MessageCircle } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import type { GrupoWhatsappMock } from './aulaMock';

interface MiGrupoWhatsappProps {
  grupo: GrupoWhatsappMock;
  interactive: boolean;
}

/** Comunidad de WhatsApp del ciclo (docs/AULA_VIRTUAL_DISENO.md §6). */
export function MiGrupoWhatsapp({ grupo, interactive }: MiGrupoWhatsappProps) {
  const disponible = grupo.estado === 'activo';

  return (
    <AulaSectionCard icon={Users} title="Mi grupo">
      <p className="text-sm font-semibold text-slate-700 mb-1">{grupo.nombreGrupo}</p>
      {disponible ? (
        <>
          <p className="text-xs text-slate-500 mb-3">Avisos del día a día, dudas y recordatorios de tu turno.</p>
          {interactive ? (
            <a
              href={grupo.enlaceInvitacion}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow !px-4 !py-2 text-sm text-white"
              style={{ backgroundColor: 'var(--uni-primary-safe)' }}
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              Unirme al grupo
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
              title="Disponible cuando tengas un ciclo activo"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              Unirme al grupo
            </span>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-500">Este grupo está completo — el coordinador abrirá uno nuevo pronto.</p>
      )}
    </AulaSectionCard>
  );
}

export default MiGrupoWhatsapp;
