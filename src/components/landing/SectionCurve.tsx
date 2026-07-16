/**
 * SectionCurve — divisor SVG curvo reutilizable entre secciones de distinto
 * fondo (Dirección de Diseño v3, patrón 5 "ruptura del grid").
 *
 * Uso: colocarlo como último hijo de una sección con `position: relative`
 * (todas las secciones del Landing ya la tienen). `fill` debe ser el color
 * de fondo de la sección SIGUIENTE (o anterior, si `position="top"`), de
 * forma que el arco parezca "crecer" desde el borde compartido.
 *
 * Puramente decorativo (aria-hidden) — no añade nodos interactivos ni
 * animaciones, así que no interfiere con prefers-reduced-motion.
 */
interface SectionCurveProps {
  /** Color de relleno del arco — el bg de la sección hacia la que "crece". */
  fill: string;
  /** Borde de la sección en el que se ancla el divisor. */
  position?: 'top' | 'bottom';
  /** Invierte la curva horizontalmente para variar el ritmo entre secciones. */
  flip?: boolean;
  /** Alto del divisor en móvil/desktop (clases Tailwind de height). */
  heightClassName?: string;
  className?: string;
}

export function SectionCurve({
  fill,
  position = 'bottom',
  flip = false,
  heightClassName = 'h-[46px] md:h-[84px]',
  className = '',
}: SectionCurveProps) {
  const anchor =
    position === 'bottom'
      ? 'absolute bottom-0 left-0 right-0'
      : 'absolute top-0 left-0 right-0 rotate-180';

  return (
    <div
      aria-hidden="true"
      className={`${anchor} pointer-events-none overflow-hidden leading-[0] z-10 ${heightClassName} ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="block w-full h-full"
        style={flip ? { transform: 'scaleX(-1)' } : undefined}
      >
        <path
          d="M0,32 C180,92 340,0 620,42 C860,78 1040,6 1260,46 C1350,63 1410,58 1440,50 L1440,120 L0,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

export default SectionCurve;
