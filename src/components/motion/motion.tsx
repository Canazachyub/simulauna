/* -------------------------------------------------------------------------- */
/*  Kit de movimiento compartido (sin librerías externas)                     */
/*                                                                            */
/*  - <Reveal>: aparece al entrar en pantalla (scroll), con variantes.        */
/*  - <TiltCard>: inclinación 3D que sigue al puntero (solo mouse/lápiz; en   */
/*    táctil queda quieta para no pelear con el scroll).                      */
/*  - useScrollProgress: progreso 0→1 de un elemento cruzando la pantalla,    */
/*    expuesto como la variable CSS --sp para parallax en CSS puro.           */
/*  - <CountUp>: número que cuenta hacia arriba al hacerse visible.           */
/*                                                                            */
/*  Todo respeta prefers-reduced-motion: sin animaciones, contenido visible.  */
/* -------------------------------------------------------------------------- */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { prefersReducedMotion, useInView } from './hooks';

type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'fade' | 'flip';

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  /** Retardo en ms (útil para escalonar tarjetas: index * 80). */
  delay?: number;
  className?: string;
  as?: ElementType;
  style?: CSSProperties;
}

export function Reveal({ children, variant = 'up', delay = 0, className, as: Tag = 'div', style }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={clsx('reveal', `reveal--${variant}`, inView && 'is-visible', className)}
      style={{ ...style, transitionDelay: inView && delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Grados máximos de inclinación. */
  max?: number;
  /** Brillo especular que sigue al puntero. */
  glare?: boolean;
  as?: ElementType;
  [key: string]: unknown;
}

export function TiltCard({ children, className, style, max = 8, glare = true, as: Tag = 'div', ...rest }: TiltCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const frame = useRef(0);

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch' || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${((0.5 - py) * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      el.classList.add('is-tilting');
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('is-tilting');
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <Tag
      ref={ref}
      className={clsx('tilt', glare && 'tilt--glare', className)}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, duration = 1400, decimals = 0, prefix = '', suffix = '', className }: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref} className={clsx('tabular-nums', className)}>
      {prefix}
      {display.toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
