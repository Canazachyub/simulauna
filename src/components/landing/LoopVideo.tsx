/* -------------------------------------------------------------------------- */
/*  Animación 3D en bucle (videos de Higgsfield, 2026-11-27). Muestra la      */
/*  imagen fija si el usuario prefiere menos movimiento o si el video falla.  */
/*  Los bordes se difuminan con mask-image para fundirse con la sección.      */
/* -------------------------------------------------------------------------- */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export function LoopVideo({
  src,
  poster,
  alt,
  className,
}: {
  src: string;
  poster: string;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [estatico, setEstatico] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEstatico(true);
      return;
    }
    const v = ref.current;
    if (!v) return;
    // Solo se reproduce cuando está en pantalla (ahorra batería y datos).
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => setEstatico(true));
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const mascara = 'radial-gradient(closest-side, #000 72%, transparent 100%)';
  const estilo = { WebkitMaskImage: mascara, maskImage: mascara };

  if (estatico) {
    return <img src={poster} alt={alt} loading="lazy" decoding="async" className={className} style={estilo} />;
  }
  return (
    <video
      ref={ref}
      className={clsx(className)}
      style={estilo}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={alt}
      onError={() => setEstatico(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export default LoopVideo;
