import { useState } from 'react';

interface MascotProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Imagen de mascota con onError elegante: si el asset webp aún no existe (en
 * generación) o falla al cargar, el componente se retira por completo sin
 * dejar hueco ni placeholder feo — mismo patrón que HeroMascot/CtaMascot en
 * Landing.tsx y el mascotFailed de AulaComingSoon.tsx.
 */
export function Mascot({ src, alt, className = '' }: MascotProps) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={className}
    />
  );
}

export default Mascot;
