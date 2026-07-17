import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, ArrowLeft, BookOpen, Clock, FileText,
  Trophy, Loader2, AlertCircle, ShieldCheck, MonitorPlay
} from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';
import { getUniversityTheme, themeCssVars } from '../theme/universityThemes';
import { resolveLogoUrl } from '../utils/logos';
import { UniversityStats } from './landing/UniversityStats';
import { SectionCurve } from './landing/SectionCurve';

/**
 * Página de una universidad específica: hero con marca propia + tarjetas de procesos
 * disponibles (Simulacro / Banqueo / Banqueo por tema / CEPRE), según `procesos` del
 * registro maestro (getUniversidades). Ver docs/CONTRATO_API_V2.md §5.
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
  const [aulaIconFailed, setAulaIconFailed] = useState(false);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  useEffect(() => {
    if (codigo) setActiva(codigo);
  }, [codigo, setActiva]);

  const universidad = registro.find(u => u.codigo === codigo);

  useEffect(() => {
    setLogoFailed(false);
    setAulaIconFailed(false);
  }, [universidad?.codigo]);

  if (loading && !universidad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-andean-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-sans text-sm">Cargando universidad…</p>
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
          <p className="text-slate-500 text-sm mb-6">
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

  const procesos = universidad.procesos || [];
  const hasOrdinario = procesos.includes('ORDINARIO') || procesos.includes('EXTRAORDINARIO');
  const hasCepre = procesos.includes('CEPRE');
  const statsProceso = procesos.includes('ORDINARIO') ? 'ORDINARIO' : (procesos[0] || 'ORDINARIO');
  // resolveLogoUrl prefiere SIEMPRE el asset local (el campo logo del registro
  // puede traer rutas desactualizadas tipo /logos/una.svg → 404).
  const logoUrl = resolveLogoUrl(universidad.codigo, universidad.logo);

  const processCards = [
    hasOrdinario && {
      key: 'simulacro',
      title: 'Simulacro completo',
      description: 'Examen cronometrado con preguntas de exámenes de admisión pasados y calificación al instante, como lo hace tu universidad.',
      icon: FileText,
      cta: 'Empezar simulacro',
      to: `/${universidad.codigo}/registro`
    },
    {
      key: 'banqueo',
      title: 'Banqueo histórico',
      description: 'Practica con preguntas de exámenes pasados, organizadas por curso, con feedback inmediato a tu ritmo.',
      icon: BookOpen,
      cta: 'Practicar banqueo',
      to: `/${universidad.codigo}/banqueo`
    },
    {
      key: 'banqueo-tema',
      title: 'Banqueo por tema',
      description: 'Filtra por curso, tema y subtema para reforzar puntos débiles con preguntas reales de años anteriores.',
      icon: Clock,
      cta: 'Practicar por tema',
      to: `/${universidad.codigo}/banqueo-tema`
    },
    hasCepre && {
      key: 'cepre',
      title: universidad.cepreNombre || 'CEPRE',
      description: `Cuadernillos y simulacro del ciclo ${universidad.cepreNombre || 'CEPRE'}, con los exámenes históricos propios del ciclo.`,
      icon: Trophy,
      cta: `Ir a ${universidad.cepreNombre || 'CEPRE'}`,
      to: `/${universidad.codigo}/cepre`
    }
  ].filter((c): c is Exclude<typeof c, false | undefined> => Boolean(c));

  return (
    <div className="min-h-screen bg-andean-white" style={vars}>
      {/* HERO con marca institucional real — gradiente propio + patrón andino */}
      <section className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(150deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
        />
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-14 md:pt-10 md:pb-20">
          {/* Breadcrumb / volver al selector */}
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs md:text-sm text-white/70 mb-8 md:mb-10">
            <button
              onClick={() => navigate('/')}
              className="uni-hover-chip inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2.5 rounded-lg text-white/85 hover:text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Todas las universidades
            </button>
            <span aria-hidden="true" className="text-white/40">/</span>
            <span className="text-white font-semibold truncate max-w-[10rem] sm:max-w-none">{universidad.nombreCorto}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
            {/* Badge de logo local (public/logos/<codigo>.png) */}
            <div className="shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white shadow-2xl border-4 border-white/30 flex items-center justify-center p-3 md:p-4">
              {!logoFailed ? (
                <img
                  src={logoUrl}
                  alt={`Logo de ${universidad.nombre}`}
                  onError={() => setLogoFailed(true)}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <GraduationCap className="w-10 h-10 md:w-14 md:h-14" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-medium mb-4">
                <GraduationCap className="w-4 h-4" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />
                <span>{universidad.nombre}</span>
                {universidad.estado === 'piloto' && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--uni-primary-safe)' }}>
                    Beta
                  </span>
                )}
              </div>

              <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
                {universidad.nombreCorto}
              </h1>

              <p className="mt-4 text-white/90 max-w-prose mx-auto md:mx-0 text-base md:text-lg leading-relaxed">
                Simulacros y banqueo por curso y tema, construidos con los exámenes históricos de{' '}
                {universidad.nombreCorto}
                {hasCepre ? ` y su ${universidad.cepreNombre}` : ''}. El puntaje se calcula exactamente
                como lo hace tu universidad. Gratis. Serio. Tuyo.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />
                Datos protegidos · Acceso gratuito al primer intento
              </div>
            </div>
          </div>
        </div>

        {/* Divisor curvo hacia el contenido (blanco, mismo tono que bg-andean-white) */}
        <SectionCurve fill="#ffffff" />
      </section>

      {/* Stats del banco de preguntas — carga perezosa (getConfig), con skeleton */}
      <UniversityStats codigo={universidad.codigo} proceso={statsProceso} />

      {/* Tarjetas de procesos disponibles */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-12 md:pt-14 md:pb-16">
        <h2 className="font-display text-display-section font-bold text-slate-800 mb-6 text-center">
          ¿Qué quieres practicar hoy?
        </h2>
        {/* Bento: Simulacro (si el proceso existe) es la celda dominante
            (2 cols desde ≥480px, 2x2 desde ≥1024px); Banqueo/Banqueo por
            tema/CEPRE quedan medianas y Aula virtual como celda menor. El
            número de tarjetas varía por universidad (3 a 5 según
            `procesos`), por eso se usa grid-auto-flow: dense + spans en vez
            de grid-template-areas fijas — ver .bento-procesos en index.css. */}
        <div className="bento-procesos">
          {processCards.map((card) => {
            const Icon = card.icon;
            const isDominant = card.key === 'simulacro';
            return (
              <button
                key={card.key}
                onClick={() => navigate(card.to)}
                className={`uni-process-card shadow-tinted shadow-tinted-hover group relative text-left card-elevated rounded-2xl border-2 border-slate-200 transition-all focus:outline-none focus-visible:ring-4 ${
                  isDominant
                    ? 'bento-cell-dominante p-7 md:p-9 flex flex-col justify-center'
                    : 'p-6'
                }`}
                style={{ '--tw-ring-color': 'var(--uni-primary-soft)' } as CSSProperties}
              >
                {/* Acento del tema — el dorado/secundario solo aparece como detalle, nunca como fondo con texto */}
                <span
                  className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--uni-secondary-safe)' }}
                  aria-hidden="true"
                />
                <div
                  className={`${isDominant ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12'} rounded-xl flex items-center justify-center mb-4 text-white shadow-md`}
                  style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                >
                  <Icon className={isDominant ? 'w-8 h-8 md:w-10 md:h-10' : 'w-6 h-6'} aria-hidden="true" />
                </div>
                <h3 className={`font-display font-bold text-slate-800 mb-1 ${isDominant ? 'text-2xl md:text-3xl' : 'text-lg'}`}>{card.title}</h3>
                <p className={`text-slate-500 mb-4 leading-relaxed ${isDominant ? 'text-base max-w-md' : 'text-sm'}`}>{card.description}</p>
                <span
                  className={`btn-glow text-white ${isDominant ? '!px-6 !py-3 text-base' : '!px-4 !py-2 text-sm'}`}
                  style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                >
                  {card.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </span>
              </button>
            );
          })}

          {/* Aula virtual — Próximamente: visualmente presente pero claramente no-activa;
              navega al placeholder ComingSoon (ver docs/DIRECCION_DISENO_V3.md §Aulas virtuales). */}
          <button
            key="aula-virtual"
            onClick={() => navigate(`/${universidad.codigo}/aula`)}
            className="uni-process-card shadow-tinted shadow-tinted-hover group relative text-left card-elevated p-6 rounded-2xl border-2 border-dashed border-slate-300 transition-all focus:outline-none focus-visible:ring-4"
            style={{ '--tw-ring-color': 'var(--uni-primary-soft)' } as CSSProperties}
          >
            <span
              className="absolute top-5 right-5 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: 'var(--uni-secondary-safe)', color: '#1e293b' }}
            >
              Próximamente
            </span>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-md overflow-hidden"
              style={{ backgroundColor: 'var(--uni-primary-safe)' }}
            >
              {!aulaIconFailed ? (
                <img
                  src="/simulauna/illustrations/aula-virtual.webp"
                  alt=""
                  aria-hidden="true"
                  onError={() => setAulaIconFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <MonitorPlay className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <h3 className="font-display text-lg font-bold text-slate-800 mb-1">Aula virtual</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Clases de calidad por universidad, seguimiento de tu avance y material por curso — muy pronto.</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400">
              Ver más
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
