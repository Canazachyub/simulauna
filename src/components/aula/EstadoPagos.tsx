import { Wallet, CheckCircle2, Clock, AlertTriangle, MessageCircle } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta, formatMoneda } from './aulaFormat';
import type { AulaAgregadoMock } from './aulaMock';

interface EstadoPagosProps {
  pagos: AulaAgregadoMock['pagos'];
  whatsappHref: string;
  interactive: boolean;
}

const ESTADO_GENERAL: Record<AulaAgregadoMock['pagos']['estadoGeneral'], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  al_dia: { label: 'Al día', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  en_revision: { label: 'Pago en revisión', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  vencido: { label: 'Mensualidad vencida', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
};

const ESTADO_CONCEPTO: Record<string, { label: string; className: string }> = {
  verificado: { label: 'Pagado', className: 'text-emerald-600 bg-emerald-50' },
  pendiente: { label: 'Pendiente', className: 'text-amber-600 bg-amber-50' },
  rechazado: { label: 'Rechazado', className: 'text-rose-600 bg-rose-50' },
};

/**
 * Mi estado de cuenta (docs/AULA_VIRTUAL_DISENO.md §3.2): lenguaje llano,
 * sin jerga contable, sin pasarela de pagos — el CTA reporta el pago por
 * el mismo canal de WhatsApp que ya usa la plataforma para la lista de
 * espera, honesto con el MVP (verificación manual del coordinador).
 */
export function EstadoPagos({ pagos, whatsappHref, interactive }: EstadoPagosProps) {
  const general = ESTADO_GENERAL[pagos.estadoGeneral];
  const GeneralIcon = general.icon;

  return (
    <AulaSectionCard icon={Wallet} title="Mi estado de pagos">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold mb-3 ${general.className}`}>
        <GeneralIcon className="w-3.5 h-3.5" aria-hidden="true" />
        {general.label}
      </div>
      <ul className="space-y-1.5 mb-4">
        {pagos.conceptos.map((c) => {
          const estado = ESTADO_CONCEPTO[c.estado];
          return (
            <li key={c.concepto} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{c.etiqueta}</span>
              <span className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">{formatMoneda(c.monto)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estado.className}`}>{estado.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-400 mb-3">
        {pagos.conceptos.find((c) => c.estado === 'pendiente')?.fechaVencimiento
          ? `Próximo vencimiento: ${formatFechaCorta(pagos.conceptos.find((c) => c.estado === 'pendiente')!.fechaVencimiento!)}`
          : 'Sin vencimientos próximos.'}
      </p>
      {interactive ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-white min-h-[36px]"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          ¿Ya pagaste? Avísanos por WhatsApp
        </a>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-slate-400 bg-slate-100 cursor-not-allowed"
          title="Disponible cuando tengas un ciclo activo"
        >
          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          ¿Ya pagaste? Avísanos por WhatsApp
        </span>
      )}
    </AulaSectionCard>
  );
}

export default EstadoPagos;
