import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GraduationCap, ArrowRight, ArrowLeft, BookOpen, Clock, FileText,
  Trophy, Loader2, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';

/**
 * Página de una universidad específica: hero con marca propia + tarjetas de procesos
 * disponibles (Simulacro / Banqueo / Banqueo por tema / CEPRE), según `procesos` del
 * registro maestro (getUniversidades). Ver docs/CONTRATO_API_V2.md §5.
 */
export function UniversityPage() {
  const navigate = useNavigate();
  const { universidad: codigo } = useParams<{ universidad: string }>();
  const { registro, loading, error, loadRegistro, setActiva } = useUniversityStore();

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  useEffect(() => {
    if (codigo) setActiva(codigo);
  }, [codigo, setActiva]);

  const universidad = registro.find(u => u.codigo === codigo);

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
          <button onClick={() => navigate('/')} className="btn-primary-brand px-5 py-2.5 rounded-xl font-semibold">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const primary = universidad.colores?.primario || '#003D7A';
  const secondary = universidad.colores?.secundario || '#D4AF37';
  const procesos = universidad.procesos || [];
  const hasOrdinario = procesos.includes('ORDINARIO') || procesos.includes('EXTRAORDINARIO');
  const hasCepre = procesos.includes('CEPRE');

  const processCards = [
    hasOrdinario && {
      key: 'simulacro',
      title: 'Simulacro completo',
      description: 'Examen cronometrado con preguntas reales y calificación al instante.',
      icon: FileText,
      cta: 'Empezar simulacro',
      to: `/${universidad.codigo}/registro`
    },
    {
      key: 'banqueo',
      title: 'Banqueo histórico',
      description: 'Practica por curso con feedback inmediato, a tu ritmo.',
      icon: BookOpen,
      cta: 'Practicar banqueo',
      to: `/${universidad.codigo}/banqueo`
    },
    {
      key: 'banqueo-tema',
      title: 'Banqueo por tema',
      description: 'Filtra por curso, tema y subtema para reforzar puntos débiles.',
      icon: Clock,
      cta: 'Practicar por tema',
      to: `/${universidad.codigo}/banqueo-tema`
    },
    hasCepre && {
      key: 'cepre',
      title: universidad.cepreNombre || 'CEPRE',
      description: `Cuadernillos y simulacro del ciclo ${universidad.cepreNombre || 'CEPRE'}.`,
      icon: Trophy,
      cta: `Ir a ${universidad.cepreNombre || 'CEPRE'}`,
      to: `/${universidad.codigo}/cepre`
    }
  ].filter((c): c is Exclude<typeof c, false | undefined> => Boolean(c));

  return (
    <div
      className="min-h-screen bg-andean-white"
      style={{ '--uni-primary': primary, '--uni-secondary': secondary } as React.CSSProperties}
    >
      {/* HERO con marca de la universidad */}
      <section
        className="relative overflow-hidden text-white py-16 md:py-24 px-4"
        style={{ backgroundColor: 'var(--uni-primary)' }}
      >
        <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-semibold mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Todas las universidades
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-medium mb-5">
            <GraduationCap className="w-4 h-4" style={{ color: 'var(--uni-secondary)' }} />
            <span>{universidad.nombre}</span>
            {universidad.estado === 'piloto' && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider">
                Piloto
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tightest leading-[1.02] mb-4">
            {universidad.nombreCorto}
          </h1>
          <p className="text-white/90 max-w-xl mx-auto text-base md:text-lg">
            Simulacros con preguntas reales, banqueo por curso y preparación
            {hasCepre ? ` para ${universidad.cepreNombre}` : ''}. Gratis. Serio. Tuyo.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--uni-secondary)' }} />
            Datos protegidos · Acceso gratuito al primer intento
          </div>
        </div>
      </section>

      {/* Tarjetas de procesos disponibles */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <h2 className="font-display text-2xl font-bold text-slate-800 mb-6 text-center">
          ¿Qué quieres practicar hoy?
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {processCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                onClick={() => navigate(card.to)}
                className="group text-left card-elevated p-6 rounded-2xl border border-slate-200 hover:-translate-y-1 hover:shadow-elevation-3 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                  style={{ backgroundColor: 'var(--uni-primary)' }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-800 mb-1">{card.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{card.description}</p>
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: 'var(--uni-primary)' }}
                >
                  {card.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
