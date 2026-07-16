import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Sistema ligero de "coach marks" (tour de primera vez), sin librerías externas.
 *
 * Uso típico: definir un array de `CoachTourStep[]` a nivel de módulo (ver Quiz.tsx y
 * BanqueoCourseSelect.tsx) donde cada paso apunta a un `data-tour="algo"` del propio
 * componente, y renderizar `<CoachTour name="simulacro" steps={...} active={condición} />`
 * en cualquier punto del árbol — no requiere estar pegado al elemento objetivo, localiza
 * todo por selector CSS en cada paso.
 *
 * Persistencia: la clave `simulauna_tour_<name>` en localStorage marca el tour como visto
 * (al completarlo o saltarlo) para que jamás vuelva a aparecer. `resetTour(name)` la borra
 * (útil para QA/soporte).
 *
 * prefers-reduced-motion: no se maneja aquí a propósito — la regla global en index.css
 * (`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:
 * 0.01ms !important; transition-duration: 0.01ms !important; } }`) ya neutraliza tanto la
 * clase `animate-bounce-in` como las transiciones inline del halo, así que el tour aparece
 * estático sin lógica adicional.
 */

const STORAGE_PREFIX = 'simulauna_tour_';

function storageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}

function hasTourBeenSeen(name: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(storageKey(name)) === 'done';
  } catch {
    return true; // sin localStorage (modo privado, etc.) preferimos no interrumpir
  }
}

function markTourSeen(name: string): void {
  try {
    window.localStorage.setItem(storageKey(name), 'done');
  } catch {
    /* ignore */
  }
}

/** Olvida que el tour `name` ya se mostró, para que vuelva a aparecer la próxima vez. */
export function resetTour(name: string): void {
  try {
    window.localStorage.removeItem(storageKey(name));
  } catch {
    /* ignore */
  }
}

export interface CoachTourStep {
  /** Selector CSS del elemento a resaltar (p.ej. '[data-tour="quiz-cronometro"]'). Si se
   * omite, el paso se muestra centrado en pantalla, sin halo (para la bienvenida o pasos
   * puramente informativos). */
  selector?: string;
  title: string;
  text: string;
  /** Imagen del lobito para este paso. Por defecto: lobito-saludo en el primer paso,
   * lobito-profesor en el resto. */
  mascot?: string;
}

interface CoachTourProps {
  /** Nombre corto y estable del tour — arma la clave de localStorage `simulauna_tour_<name>`. */
  name: string;
  steps: CoachTourStep[];
  /** El tour sólo se activa (una vez) cuando este flag pasa a `true` y aún no se vio. */
  active: boolean;
}

const MASCOT_WELCOME = '/simulauna/illustrations/lobito-saludo.webp';
const MASCOT_GUIDE = '/simulauna/illustrations/lobito-profesor.webp';

const CARD_WIDTH = 336;
const CARD_MARGIN = 12;
const HALO_PADDING = 8;

interface CardStyle {
  position: 'fixed';
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

function computeCardStyle(rect: DOMRect): CardStyle {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - CARD_MARGIN * 2);

  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;

  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(CARD_MARGIN, Math.min(left, vw - width - CARD_MARGIN));

  if (placeBelow) {
    return { position: 'fixed', top: rect.bottom + CARD_MARGIN, left, width };
  }
  return { position: 'fixed', bottom: vh - rect.top + CARD_MARGIN, left, width };
}

/** Tour de coach marks: una tarjeta flotante por paso + overlay oscuro con recorte del
 * elemento objetivo (halo vía box-shadow gigante, sin librerías de terceros). */
export function CoachTour({ name, steps, active }: CoachTourProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  if (import.meta.env.DEV && steps.length > 5) {
    console.warn(`[CoachTour] "${name}" tiene ${steps.length} pasos; el criterio de sobriedad pide máximo 5.`);
  }

  // Se activa una única vez: cuando `active` pasa a true y el tour no se vio antes. Una vez
  // abierto, permanece abierto aunque `active` vuelva a false (p.ej. el examen pasa de
  // "listo" a "en progreso" apenas se monta) — sólo se cierra al completarse o saltarse.
  useEffect(() => {
    if (active && !hasTourBeenSeen(name)) {
      setOpen(true);
      setStepIndex(0);
    }
  }, [active, name]);

  const step = steps[stepIndex];

  const updateRect = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Elemento presente pero oculto (display:none en el breakpoint actual, p.ej. un botón
    // "hidden sm:inline-flex" en móvil): degradamos a tarjeta centrada sin halo.
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect(r);
  }, [step]);

  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = () => updateRect();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    // Reintento corto: el elemento objetivo puede montarse un tick después del propio tour.
    const retry = window.setTimeout(updateRect, 60);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      window.clearTimeout(retry);
    };
  }, [open, updateRect]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, stepIndex]);

  const finish = useCallback(() => {
    markTourSeen(name);
    setOpen(false);
  }, [name]);

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  };

  if (!open || !step) return null;

  const mascot = step.mascot ?? (stepIndex === 0 ? MASCOT_WELCOME : MASCOT_GUIDE);
  const isLast = stepIndex === steps.length - 1;

  const haloStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.top - HALO_PADDING,
        left: rect.left - HALO_PADDING,
        width: rect.width + HALO_PADDING * 2,
        height: rect.height + HALO_PADDING * 2,
        borderRadius: 16,
        boxShadow: '0 0 0 9999px rgba(15,23,42,0.65)',
        transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
        pointerEvents: 'none',
      }
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.65)',
        pointerEvents: 'none',
      };

  const cardStyle: React.CSSProperties = rect ? computeCardStyle(rect) : { position: 'relative' };

  return (
    <div className="fixed inset-0 z-[9999]" aria-hidden="false">
      <div aria-hidden="true" style={haloStyle} />
      <div
        className={rect ? undefined : 'fixed inset-0 flex items-center justify-center p-4'}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="bg-white rounded-2xl shadow-elevation-4 border border-slate-200/70 p-5 max-h-[80vh] overflow-y-auto focus:outline-none animate-bounce-in"
          style={{ ...cardStyle, width: rect ? cardStyle.width : `min(${CARD_WIDTH}px, calc(100vw - ${CARD_MARGIN * 2}px))` }}
        >
          <div className="flex items-start gap-3 mb-4">
            <img
              src={mascot}
              alt=""
              aria-hidden="true"
              className="w-14 h-14 flex-shrink-0 object-contain"
            />
            <div className="min-w-0 pt-1">
              <p id={titleId} className="font-display font-bold text-slate-800 text-base leading-snug">
                {step.title}
              </p>
              <p id={descId} className="text-slate-600 text-sm leading-relaxed mt-1">
                {step.text}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === stepIndex ? 'bg-[var(--uni-primary-safe,#003D7A)]' : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={finish}
                className="min-h-11 px-3 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={next}
                className="min-h-11 px-4 rounded-xl text-sm font-semibold text-white transition active:scale-[0.97]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, var(--uni-primary,#003D7A) 0%, var(--uni-primary-deep,#002855) 100%)',
                }}
              >
                {isLast ? 'Entendido' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
