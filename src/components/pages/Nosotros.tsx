import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, MessageCircleHeart, Gift, ArrowRight } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Mascot } from './Mascot';
import { goToUniversidades } from './navHelpers';

const GOLD_GLOW = { '--uni-primary': '#D4AF37' } as CSSProperties;

/**
 * "Cómo trabajamos" — solo los 3 valores reales del proyecto (nada de
 * cifras infladas ni testimonios inventados, ver instrucciones de la misión).
 */
const VALORES = [
  {
    icon: FileCheck2,
    title: 'Preguntas reales, verificadas',
    text: 'Cada pregunta de nuestros bancos viene de exámenes de admisión reales de años anteriores. No las inventamos.',
  },
  {
    icon: MessageCircleHeart,
    title: 'Honestidad con lo que existe',
    text: 'Si algo todavía está en construcción — como el Aula Virtual — te lo decimos tal cual. Nada de promesas que aún no cumplimos.',
  },
  {
    icon: Gift,
    title: 'Gratis para empezar',
    text: 'Tu primer simulacro es gratis en cada universidad, para que pruebes la plataforma antes de decidir.',
  },
];

/**
 * Página "Nosotros" (/nosotros). Historia real y honesta de SimulaUNA — solo
 * los hechos indicados por el usuario, sin inventar cifras ni testimonios.
 */
export function Nosotros() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Nosotros · SimulaUNA';
  }, []);

  return (
    <div className="min-h-screen bg-andean-white">
      <PageHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#001f3f] bg-mesh-deep text-white py-16 md:py-24">
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <div className="relative container mx-auto px-4 sm:px-6 max-w-4xl flex flex-col-reverse md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-5 text-brand-accent-300">
              Sobre nosotros
            </span>
            <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
              Empezamos en Puno.
              <br />
              Hoy somos de todo el Perú.
            </h1>
            <p className="mt-5 text-white/90 text-base md:text-lg max-w-prose mx-auto md:mx-0 leading-relaxed">
              SimulaUNA nació como un simulador para postulantes de la Universidad Nacional del
              Altiplano (UNA) — Puno. Hoy es una plataforma nacional multi-universidad, con un banco
              de preguntas de exámenes históricos reales y un puntaje calculado exactamente como lo
              hace cada universidad.
            </p>
          </div>

          <Mascot
            src="/simulauna/illustrations/lobito-corazon.webp"
            alt="Mascota SimulaUNA: un lobito con un corazón"
            className="w-40 sm:w-52 md:w-60 shrink-0 animate-float-y drop-shadow-2xl select-none"
          />
        </div>
      </section>

      {/* Quiénes somos */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <h2 className="font-display text-display-section font-bold text-slate-900 mb-6">
            Quiénes somos
          </h2>
          <div className="space-y-4 text-slate-600 text-base md:text-lg leading-relaxed">
            <p>
              Somos un proyecto independiente hecho por el equipo SINAPSIS. No estamos afiliados
              oficialmente a ninguna universidad.
            </p>
            <p>
              Trabajamos con exámenes de admisión reales de años pasados y calculamos tu puntaje con
              el mismo sistema que usa cada universidad, para que tu práctica se parezca lo más
              posible al examen real.
            </p>
            <p>
              Estamos construyendo un Aula Virtual con clases de calidad — todavía en construcción,
              pero ya en camino.
            </p>
          </div>
        </div>
      </section>

      {/* Misión */}
      <section className="py-14 md:py-20 bg-andean-cream">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <h2 className="font-display text-display-section font-bold text-slate-900 mb-4">
            Nuestra misión
          </h2>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Acceso de calidad a la preparación preuniversitaria para todos los postulantes del Perú,
            sin importar a qué universidad quieran entrar.
          </p>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <h2 className="font-display text-display-section font-bold text-slate-900 mb-10 text-center">
            Cómo trabajamos
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {VALORES.map((v) => (
              <div key={v.title} className="shadow-tinted card-elevated p-6 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-brand-primary-50 flex items-center justify-center mb-4 text-brand-primary-700">
                  <v.icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-slate-800 mb-2">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 md:py-20 bg-brand-primary-900 text-white text-center">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <h2 className="font-display text-display-section font-black mb-6">
            Elige tu universidad y empieza a practicar
          </h2>
          <button
            onClick={() => goToUniversidades(navigate)}
            style={GOLD_GLOW}
            className="btn-glow shine-hover bg-brand-accent-500 text-brand-primary-900 min-h-[44px]"
          >
            Ver universidades
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

export default Nosotros;
