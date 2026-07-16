import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Celda base del muro bento del Aula (ver docs/AULA_VIRTUAL_DISENO.md §7).
 * Todas las secciones curadas (HoyEnTuAula, HorarioSemanal, etc.) comparten
 * este envoltorio para que el bento se vea como UN sistema, no como
 * tarjetas sueltas — mismo tratamiento visual que `.shadow-tinted` +
 * `.card-elevated` ya usado en UniversityPage/AulaComingSoon.
 */
interface AulaSectionCardProps {
  icon: LucideIcon;
  title: string;
  /** Clases de Tailwind para el span de columnas/filas dentro del grid padre. */
  spanClassName?: string;
  /** Acción secundaria a la derecha del título (ej. "Ver todo"). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AulaSectionCard({ icon: Icon, title, spanClassName = '', action, children, className = '' }: AulaSectionCardProps) {
  return (
    <section className={`shadow-tinted card-elevated rounded-2xl p-5 md:p-6 flex flex-col ${spanClassName} ${className}`}>
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: 'var(--uni-primary-safe)' }}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-base md:text-lg truncate">{title}</h3>
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

export default AulaSectionCard;
