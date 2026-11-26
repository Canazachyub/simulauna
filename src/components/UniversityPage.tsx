import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { GraduationCap, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';
import { getUniversityTheme, themeCssVars } from '../theme/universityThemes';
import { resolveLogoUrl } from '../utils/logos';
import { SectionCurve } from './landing/SectionCurve';
import { Reveal } from './motion/motion';
import { useScrollProgress, ILLUSTRATIONS_3D } from './motion/hooks';
import { HubStats } from './hub/HubStats';
import { ModeCard, type HubMode } from './hub/ModeCard';
import { useHubConfig, formatDuracion } from './hub/useHubConfig';
import './hub/hub.css';

/**
 * Página de una universidad específica (hub del postulante): hero con marca propia y
 * parallax suave, franja de stats y tarjetas de modos con ilustración 3D (Simulacro /
 * Banqueo / Banqueo por tema / CEPRE / Aula), según `procesos` del registro maestro
 * (getUniversidades). Ver docs/CONTRATO_API_V2.md §5.
 *
 * El theming es 100% dinámico vía src/theme/universityThemes.ts: el registro maestro
 * (universidad.colores) tiene precedencia sobre el mapa local investigado; ambos pasan
 * por ensureAccessible() antes de servir de fondo con texto/ícono blanco encima (AA).
 */
export function UniversityPage() {
  const navigate = useNavigate();
  const { universidad: codigo } = useParams<{ universidad: string }>();
  const { registro, loading, error, loadRegistro, setActiva } = useUniversityStore();
  const [logoFailed, setLogoFailed] = useState(false);
  const heroRef = useScrollProgress<HTMLElement>();

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  useEffect(() => {
    if (codigo) setActiva(codigo);
  }, [codigo, setActiva]);

  const universidad = registro.find(u => u.codigo === codigo);

  useEffect(() => {
    setLogoFailed(false);
  }, [universidad?.codigo]);

  // Config del banco (stats + datos de la tarjeta de Simulacro). Se pide antes de los
  // early returns para respetar el orden de los hooks.
  const procesos = universidad?.procesos || [];
  const statsProceso = procesos.includes('ORDINARIO') ? 'ORDINARIO' : (procesos[0] || 'ORDINARIO');
  const { config: hubConfig, status: hubConfigStatus } = useHubConfig(universidad?.codigo, statsProceso);

  if (loading && !universidad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-andean-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-sans text-sm">Cargando universidad…</p>
        </div>
      </div>
    );
  }

  if (!universidad) {
    // Registro aún no cargó (backend v2 no disponible) o universidad desconocida: mostramos
    // un estado neutral en vez de bloquear — la ruta ya fue validada por UniversityGate.
    return (
      <div className="min-h-screen flex items-center justify-center bg-andean-white px-4">
        <div className="max-w-md w-full text-center card-elevated p-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-slate-800 mb-2">
            {codigo?.toUpperCase() || 'Universidad'}
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            {error || 'No se pudo cargar la información de esta universidad todavía.'}
          </p>
          <button onClick={() => navigate('/')} className="btn-primary-brand px-5 py-2.5 rounded-xl font-semibold min-h-[44px]">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Fuente única de theming: el color del registro maestro (si viene) tiene precedencia
  // sobre el mapa local investigado; themeCssVars ya deriva --uni-primary-safe (AA
  // garantizado, útil tanto para texto sobre claro como para fondos con blanco encima,
  // pues el contraste es simétrico), --uni-primary-soft (tinte para hovers/fondos
  // suaves) y --uni-primary-deep (ancla oscura de gradientes).
  const theme = getUniversityTheme(universidad.codigo, universidad.colores);
  const vars = themeCssVars(theme) as CSSProperties;

  const hasOrdinario = procesos.includes('ORDINARIO') || procesos.includes('EXTRAORDINARIO');
  const hasCepre = procesos.includes('CEPRE');
  // resolveLogoUrl prefiere SIEMPRE el asset local (el campo logo del registro
  // puede traer rutas desactualizadas tipo /logos/una.svg → 404).
  const logoUrl = resolveLogoUrl(universidad.codigo, universidad.logo);
  const cepreNombre = universidad.cepreNombre || 'CEPRE';
  const base = `/${universidad.codigo}`;

  // Modos de práctica. Simulacro (si el proceso existe) es la tarjeta principal; el resto
  // usa una sola línea en lenguaje simple para que un postulante novato entienda qué es
  // cada cosa sin conocer la jerga ("banqueo").
  const mainMode: HubMode | null = hasOrdinario
    ? {
        key: 'simulacro',
        title: 'Simulacro completo',
        description: 'Rinde un examen como el de admisión y mira tu puntaje al terminar.',
        illustration: ILLUSTRATIONS_3D.simulacro,
        cta: 'Empezar simulacro',
        to: `${base}/registro`,
      }
    : null;

  const otherModes: HubMode[] = [
    {
      key: 'banqueo',
      title: 'Banqueo histórico',
      description: 'Practica con preguntas de exámenes pasados.',
      illustration: ILLUSTRATIONS_3D.banqueoHistorico,
      cta: 'Practicar',
      to: `${base}/banqueo`,
    },
    {
      key: 'banqueo-tema',
      title: 'Banqueo por tema',
      description: 'Practica un tema específico.',
      illustration: ILLUSTRATIONS_3D.banqueoTema,
      cta: 'Elegir tema',
      to: `${base}/banqueo-tema`,
    },
    ...(hasCepre
      ? [{
          key: 'cepre',
          title: cepreNombre,
          description: `Cuadernillos y simulacro del ciclo ${cepreNombre}.`,
          illustration: ILLUSTRATIONS_3D.cepre,
          cta: `Ir a ${cepreNombre}`,
          to: `${base}/cepre`,
        }]
      : []),
    // Aula virtual: ya tiene flujo real (preinscripción por ciclo) con vista previa y lista
    // de espera como respaldo — ver AulaComingSoon.tsx —, así que ya no se anuncia como
    // "Próximamente".
    {
      key: 'aula',
      title: 'Aula virtual',
      description: 'Clases por ciclo y seguimiento de tu avance. Mira cómo funciona.',
      illustration: ILLUSTRATIONS_3D.aula,
      cta: 'Ver el aula',
      to: `${base}/aula`,
      badge: 'Nuevo',
    },
  ];

  // Celdas que se estiran para no dejar huecos (ver .hub-modes en hub/hub.css):
  // - tablet (2 columnas): si quedan impares, la última ocupa la fila entera;
  // - ≥1024 con Simulacro 2x2: caben 4 a su derecha; con 3, la última ocupa 2 columnas.
  const n = otherModes.length;
  const spanFor = (i: number) => clsx(
    n % 2 === 1 && i === n - 1 && 'hub-span-sm',
    mainMode && n === 3 && i === n - 1 && 'hub-span-lg',
  );

  const nPreguntas = hubConfig?.escala.nPreguntasTotal ?? 0;
  const simFacts = [
    nPreguntas > 0 ? `${nPreguntas} preguntas` : 'Preguntas de exámenes reales',
    `Tiempo sugerido: ${formatDuracion(hubConfig?.escala.duracionMin)}`,
    'Puntaje al instante',
  ];

  return (
    <div className="min-h-screen bg-andean-white hub-clip" style={vars}>
      {/* HERO con marca institucional — las decoraciones se mueven con el scroll
          (parallax por --sp); el texto y el logo quedan quietos. */}
      <section ref={heroRef} className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(150deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
        />
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <div aria-hidden="true" className="parallax-slow absolute -top-24 -right-20 w-80 h-80 md:w-[28rem] md:h-[28rem] pointer-events-none">
          <div className="w-full h-full rounded-full opacity-25 blur-3xl" style={{ backgroundColor: 'var(--uni-secondary-safe)' }} />
        </div>
        <div aria-hidden="true" className="parallax-fast absolute top-16 right-[8%] hidden md:block pointer-events-none">
          <div className="w-40 h-40 rounded-full border-[10px] border-white/10" />
        </div>
        <div aria-hidden="true" className="parallax-slow absolute bottom-16 left-[4%] hidden md:block pointer-events-none">
          <div className="w-16 h-16 rounded-2xl border-4 border-white/10 rotate-12" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-16 md:pt-10 md:pb-24">
          {/* Breadcrumb / volver al selector */}
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-white/80 mb-6 md:mb-10">
            <button
              onClick={() => navigate('/')}
              className="uni-hover-chip inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2.5 rounded-lg text-white/90 hover:text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Todas las universidades
            </button>
            <span aria-hidden="true" className="text-white/50">/</span>
            <span className="text-white font-semibold truncate max-w-[9rem] sm:max-w-none">{universidad.nombreCorto}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 text-center md:text-left">
            {/* Logo local (public/logos/<codigo>.webp) — parte del primer pantallazo */}
            <div className="shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white shadow-2xl border-4 border-white/30 flex items-center justify-center p-3 md:p-4">
              {!logoFailed ? (
                <img
                  src={logoUrl}
                  alt={`Logo de ${universidad.nombre}`}
                  width={128}
                  height={128}
                  decoding="async"
                  // React 18 no tipa fetchPriority (ver Landing.tsx): en minúsculas pasa tal cual.
                  {...({ fetchpriority: 'high' } as Record<string, string>)}
                  onError={() => setLogoFailed(true)}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              ) : (
                <GraduationCap className="w-10 h-10 md:w-14 md:h-14" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                <span className="inline-flex items-center gap-2 max-w-full px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/25 text-sm font-medium">
                  <GraduationCap className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />
                  <span className="truncate">{universidad.nombre}</span>
                </span>
                {universidad.estado === 'piloto' && (
                  // "Beta" no lo entiende un postulante: se dice en palabras simples y se
                  // explica en una línea bajo el texto del hero.
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-white text-xs font-black uppercase tracking-wide"
                    style={{ color: 'var(--uni-primary-safe)' }}
                  >
                    En prueba
                  </span>
                )}
              </div>

              <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
                {universidad.nombreCorto}
              </h1>

              <p className="mt-3 md:mt-4 text-white/95 max-w-prose mx-auto md:mx-0 text-base md:text-lg leading-relaxed">
                Practica con preguntas de exámenes pasados de {universidad.nombreCorto}
                {hasCepre ? ` y su ${cepreNombre}` : ''}. Tu puntaje se calcula igual que en el examen real.
              </p>
              {universidad.estado === 'piloto' && (
                <p className="mt-2 text-sm text-white/90">
                  Estamos sumando preguntas de esta universidad: puede que aún falten algunos cursos.
                </p>
              )}

              <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/25 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />
                Tu primer simulacro es gratis · Datos protegidos
              </div>
            </div>
          </div>
        </div>

        {/* Divisor curvo hacia el contenido (blanco, mismo tono que bg-andean-white) */}
        <SectionCurve fill="#ffffff" />
      </section>

      {/* Stats del banco de preguntas — carga perezosa (getConfig), con skeleton y CountUp */}
      <HubStats config={hubConfig} status={hubConfigStatus} />

      {/* Modos de práctica */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-14 md:pt-14 md:pb-20" aria-labelledby="hub-modos-titulo">
        <Reveal className="text-center">
          <h2 id="hub-modos-titulo" className="font-display text-display-section font-bold text-slate-900">
            ¿Qué quieres practicar hoy?
          </h2>
          <p className="mt-2 text-slate-600 text-base">
            {mainMode ? 'Si es tu primera vez, empieza por el simulacro.' : 'Elige cómo quieres practicar.'}
          </p>
        </Reveal>

        <div className={clsx('hub-modes', !mainMode && n === 3 && 'hub-modes--3')}>
          {mainMode && (
            <Reveal variant="zoom" className="hub-span-sm hub-cell-main">
              <ModeCard mode={mainMode} main facts={simFacts} />
            </Reveal>
          )}
          {otherModes.map((mode, i) => (
            <Reveal key={mode.key} variant="up" delay={(i + 1) * 90} className={spanFor(i)}>
              <ModeCard mode={mode} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
