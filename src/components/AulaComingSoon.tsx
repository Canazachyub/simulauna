import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, GraduationCap, TrendingUp, BookMarked, Sparkles } from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';
import { resolveThemeVars } from '../utils/universityTheme';
import { SectionCurve } from './landing/SectionCurve';
import { AulaMuro } from './aula/AulaMuro';

/**
 * Placeholder "Aula virtual — Próximamente" (ver docs/DIRECCION_DISENO_V3.md
 * §Aulas virtuales y docs/AULA_VIRTUAL_DISENO.md). Ruta /:universidad/aula:
 * mismo tema institucional que el resto de pantallas de la universidad
 * (resolveThemeVars) + CTA a WhatsApp para lista de espera. Backend: sin
 * cambios, es 100% presentacional.
 *
 * Estado real hoy: NINGUNA universidad tiene un ciclo activo todavía (no
 * existe la hoja `ciclos` en CORE ni la action `getAula` — ver §10 del
 * documento de diseño), así que esta pantalla es siempre la lista de
 * espera. Para vender la experiencia sin mentir, se añade debajo un
 * "vista previa" del muro curado (`AulaMuro` en modo `preview`, con datos
 * de ejemplo y las interacciones reales deshabilitadas) construido con los
 * mismos componentes que se usarán tal cual cuando el backend v2.1 exista
 * — el día que haya un ciclo real, este archivo solo necesita reemplazar
 * este bloque de vista previa por `<AulaMuro preview={false} .../>`
 * alimentado con datos reales.
 */

// Mismo número que usa StudentForm.tsx (WHATSAPP_BASE) — lista de espera del Aula virtual.
const WHATSAPP_BASE = 'https://wa.me/51900266810';
const WHATSAPP_MESSAGE = 'Hola, quiero unirme a la lista de espera del Aula Virtual de SimulaUNA';

const BULLETS = [
  { icon: GraduationCap, text: 'Clases de calidad por universidad' },
  { icon: TrendingUp, text: 'Seguimiento de tu avance' },
  { icon: BookMarked, text: 'Material por curso' },
];

export function AulaComingSoon() {
  const navigate = useNavigate();
  const { universidad: codigo } = useParams<{ universidad: string }>();
  const registro = useUniversityStore((state) => state.registro);
  const loadRegistro = useUniversityStore((state) => state.loadRegistro);
  const [mascotFailed, setMascotFailed] = useState(false);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  const universidad = registro.find((u) => u.codigo === codigo);
  const nombreUniversidad = universidad?.nombreCorto || universidad?.nombre || (codigo ? codigo.toUpperCase() : 'tu universidad');
  const themeVars = resolveThemeVars(codigo, registro);
  const whatsappHref = `${WHATSAPP_BASE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const volverHref = `/${codigo || ''}`;

  return (
    <div className="min-h-screen bg-andean-white" style={themeVars}>
      {/* HERO institucional — mismo tratamiento que UniversityPage */}
      <section className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(150deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
        />
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-16 md:pt-10 md:pb-24">
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs md:text-sm text-white/70 mb-8 md:mb-10">
            <button
              onClick={() => navigate(volverHref)}
              className="uni-hover-chip inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2.5 rounded-lg text-white/85 hover:text-white font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Volver a {nombreUniversidad}
            </button>
          </nav>

          <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <span
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-bold uppercase tracking-wide mb-5"
                style={{ color: 'var(--uni-secondary)' }}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Próximamente
              </span>

              <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
                El Aula Virtual está en construcción
              </h1>

              <p className="mt-5 text-white/90 max-w-prose mx-auto md:mx-0 text-base md:text-lg leading-relaxed">
                Estamos preparando clases de calidad, seguimiento de tu avance y material por curso
                para {nombreUniversidad}. Únete a la lista de espera y entra entre los primeros.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center md:items-start gap-3 justify-center md:justify-start">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glow min-h-[44px]"
                  style={{ backgroundColor: 'var(--uni-secondary)', color: '#1e293b' }}
                >
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  Unirme a la lista de espera
                </a>
                <button
                  onClick={() => navigate(volverHref)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/30 font-semibold text-white hover:bg-white/10 transition min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Volver a {nombreUniversidad}
                </button>
              </div>
            </div>

            {!mascotFailed && (
              <div className="shrink-0 w-40 sm:w-52 md:w-64">
                <img
                  src="/simulauna/illustrations/mascota-lobito.webp"
                  alt="Mascota SimulaUNA: un lobito muy estudioso"
                  onError={() => setMascotFailed(true)}
                  className="w-full h-auto drop-shadow-2xl animate-float-y"
                />
              </div>
            )}
          </div>
        </div>

        {/* Divisor curvo hacia el contenido (blanco, mismo tono que bg-andean-white) */}
        <SectionCurve fill="#ffffff" />
      </section>

      {/* Qué vas a encontrar */}
      <section className="max-w-4xl mx-auto px-4 pt-10 pb-14 md:pt-14 md:pb-20">
        <h2 className="font-display text-display-section font-bold text-slate-800 mb-8 text-center">
          Qué vas a encontrar
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {BULLETS.map(({ icon: Icon, text }) => (
            <div key={text} className="shadow-tinted card-elevated p-6 rounded-2xl text-center">
              <div
                className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 text-white shadow-md"
                style={{ backgroundColor: 'var(--uni-primary-safe)' }}
              >
                <Icon className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="font-semibold text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vista previa del muro curado — mismos componentes de src/components/aula/
          que se usarán tal cual cuando exista un ciclo real (ver docs/AULA_VIRTUAL_DISENO.md).
          Datos de ejemplo, interacciones deshabilitadas, honestamente etiquetado. */}
      <section className="max-w-5xl mx-auto px-4 pb-14 md:pb-20">
        <h2 className="font-display text-display-section font-bold text-slate-800 mb-2 text-center">
          Así se verá tu aula
        </h2>
        <p className="text-slate-500 text-sm md:text-base text-center max-w-prose mx-auto mb-8">
          Un muro ya organizado por nosotros: tu horario, tus materiales, los avisos del coordinador
          y tu estado de pagos, todo en un solo lugar. Tú no armas nada, solo entras y ves.
        </p>
        <AulaMuro
          universidad={codigo || 'una'}
          nombreUniversidad={nombreUniversidad}
          whatsappHref={whatsappHref}
          cepreHref={`/${codigo || 'una'}/cepre`}
          preview
          showWelcome={false}
        />
      </section>
    </div>
  );
}

export default AulaComingSoon;
