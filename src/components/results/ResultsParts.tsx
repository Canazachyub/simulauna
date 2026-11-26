/* -------------------------------------------------------------------------- */
/*  Piezas visuales de Results.tsx (anillo de puntaje, barras, marcador).     */
/*  Cada pieza observa su propia visibilidad (useInView), así se anima al     */
/*  entrar en pantalla y no depende de cuándo se rehidrata el store.          */
/*  Todo respeta prefers-reduced-motion (los hooks del kit ya lo resuelven).  */
/* -------------------------------------------------------------------------- */
import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { CountUp, Reveal } from '../motion/motion';
import { useInView, useScrollProgress } from '../motion/hooks';
import { formatNumber } from '../../utils/calculations';

interface AnilloPuntajeProps {
  /** Puntaje sobre el máximo, 0-100. */
  porcentaje: number;
  puntaje: number;
  maximo: number;
  decimales: number;
  /** Color del trazo (decorativo: el texto va siempre en slate). */
  color: string;
  children?: ReactNode;
}

/**
 * Anillo SVG grande con trazo animado (se dibuja al entrar en pantalla) y el puntaje
 * contando hacia arriba en el centro. `children` se posiciona sobre el anillo (badges).
 */
export function AnilloPuntaje({ porcentaje, puntaje, maximo, decimales, color, children }: AnilloPuntajeProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const R = 122;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, porcentaje));
  const offset = inView ? C - (pct / 100) * C : C;

  return (
    <div
      ref={ref}
      className="relative w-[210px] h-[210px] min-[400px]:w-[236px] min-[400px]:h-[236px] md:w-[272px] md:h-[272px]"
      role="img"
      aria-label={`Tu puntaje: ${formatNumber(puntaje, decimales)} de ${formatNumber(maximo, decimales)} puntos (${pct.toFixed(0)} %)`}
    >
      <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90" aria-hidden="true">
        {/* Pista */}
        <circle cx="140" cy="140" r={R} stroke="#E2E8F0" strokeWidth={16} fill="none" />
        {/* Marcas finas interiores, como un dial */}
        <circle cx="140" cy="140" r={R - 20} stroke="#CBD5E1" strokeWidth={2} strokeDasharray="2 9" fill="none" />
        {/* Valor */}
        <circle
          cx="140"
          cy="140"
          r={R}
          stroke={color}
          strokeWidth={16}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <CountUp
          value={puntaje}
          decimals={decimales}
          duration={1600}
          className="font-display font-black text-slate-900 leading-none text-5xl md:text-7xl"
        />
        <span className="mt-2 text-xs md:text-sm uppercase tracking-widest font-semibold text-slate-600">
          de {formatNumber(maximo, decimales)} pts
        </span>
        <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/80 text-sm font-bold text-slate-700 tabular-nums">
          {pct.toFixed(0)} %
        </span>
      </div>
      {children}
    </div>
  );
}

interface BarraAnimadaProps {
  /** 0-100 */
  valor: number;
  color: string;
  etiqueta: string;
  delay?: number;
  className?: string;
}

/** Barra de progreso que se llena (scaleX) al entrar en pantalla. */
export function BarraAnimada({ valor, color, etiqueta, delay = 0, className }: BarraAnimadaProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.6);
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div
      ref={ref}
      className={clsx('h-2.5 rounded-full bg-slate-200 overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
    >
      <div
        className="h-full w-full origin-left rounded-full"
        style={{
          transform: `scaleX(${inView ? v / 100 : 0})`,
          transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
          transitionDelay: inView && delay ? `${delay}ms` : undefined,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

interface StatMarcadorProps {
  icono: ReactNode;
  valor: number;
  decimales?: number;
  /** Texto chico junto al número (p.ej. "/60"). */
  complemento?: string;
  etiqueta: string;
  /** Color del número/ícono (debe cumplir AA sobre blanco). */
  color: string;
  fondoIcono: string;
  delay?: number;
}

/** Tarjeta del marcador (puntaje / correctas / incorrectas / en blanco). */
export function StatMarcador({ icono, valor, decimales = 0, complemento, etiqueta, color, fondoIcono, delay = 0 }: StatMarcadorProps) {
  return (
    <Reveal variant="up" delay={delay} className="card-elevated p-4 sm:p-5 flex flex-col items-start gap-2 min-w-0">
      <span
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
        style={{ backgroundColor: fondoIcono, color }}
        aria-hidden="true"
      >
        {icono}
      </span>
      <span className="font-display font-black text-3xl sm:text-4xl leading-none tabular-nums" style={{ color }}>
        <CountUp value={valor} decimals={decimales} />
        {complemento && <span className="text-lg sm:text-xl text-slate-500 font-bold">{complemento}</span>}
      </span>
      <span className="text-xs sm:text-sm uppercase tracking-wider font-semibold text-slate-600">{etiqueta}</span>
    </Reveal>
  );
}

/** Sección con parallax: expone --sp (0→1) a sus decoraciones (.parallax-slow/.parallax-fast). */
export function SeccionParallax({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useScrollProgress<HTMLElement>();
  return (
    <section ref={ref} className={className} style={style}>
      {children}
    </section>
  );
}

/**
 * Monta `children` recién cuando el bloque se acerca a la pantalla. Sirve para no descargar el
 * chunk de Recharts (lazy) hasta que el alumno llega a la sección de análisis.
 */
export function CuandoVisible({ children, placeholder, className }: { children: ReactNode; placeholder?: ReactNode; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0, '300px 0px 300px 0px');
  return (
    <div ref={ref} className={className}>
      {inView ? children : placeholder}
    </div>
  );
}
