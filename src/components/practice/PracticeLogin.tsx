import { useEffect, useState } from 'react';
import {
  CreditCard, Mail, ChevronLeft, ChevronRight, Loader2, AlertCircle, Lock,
  CheckCircle, Sparkles, Layers, BookOpen, Target, Lightbulb, Zap
} from 'lucide-react';
import type { PracticeMode } from './types';

const ROTATING_ICONS = [Layers, BookOpen, Target, Lightbulb, Zap];

interface Props {
  mode: PracticeMode;
  isAuthenticated: boolean;
  userDni?: string;
  loginError: string;
  isLoading: boolean;
  onSubmit: (dni: string, email: string) => void;
  onLogout: () => void;
  onBack: () => void;
}

/**
 * Paso de login compartido por los 3 modos de práctica. El insignia animada (iconos en
 * cross-fade dentro de un badge con gradiente azul→dorado) es la versión que antes sólo tenía
 * BanqueoPorTema — se unificó hacia ella para los 3 modos (ver docs/CONTRATO_API_V2.md §5).
 */
export function PracticeLogin({
  mode, isAuthenticated, userDni, loginError, isLoading, onSubmit, onLogout, onBack
}: Props) {
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [iconIdx, setIconIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIconIdx(i => (i + 1) % ROTATING_ICONS.length), 1800);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = () => {
    onSubmit(dni.trim(), email.trim());
  };

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-12 px-4 flex items-center">
      {mode.renderLoginDecoration?.()}

      <div className="max-w-md mx-auto w-full relative z-10">
        <div className="glass rounded-3xl p-8 animate-fade-up shadow-elevation-3 border border-white/40 corner-accent relative">
          <div className="text-center mb-8">
            {/* Insignia animada: iconos en pila cross-fade + anillo punteado + puntitos orbitando */}
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-5">
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed animate-spin-slow"
                style={{ borderColor: 'rgba(212,175,55,0.45)' }}
              />
              <div
                className="absolute inset-2 rounded-2xl blur-xl opacity-70"
                style={{ background: 'radial-gradient(circle, rgba(0,102,204,0.45) 0%, rgba(212,175,55,0.35) 60%, transparent 100%)' }}
              />
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #003D7A 0%, #0066CC 45%, #D4AF37 100%)',
                  boxShadow: '0 20px 40px -12px rgba(0,61,122,0.55), inset 0 2px 4px rgba(255,255,255,0.25)',
                }}
              >
                {ROTATING_ICONS.map((Icon, i) => (
                  <Icon
                    key={i}
                    className="absolute w-9 h-9 transition-all duration-700 ease-out"
                    style={{
                      color: '#ffffff',
                      opacity: iconIdx === i ? 1 : 0,
                      transform: iconIdx === i ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-45deg)',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}
                  />
                ))}
              </div>
              {[0, 72, 144, 216, 288].map((deg, i) => (
                <div
                  key={deg}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full animate-spin-slow"
                  style={{
                    backgroundColor: '#D4AF37',
                    boxShadow: '0 0 8px rgba(212,175,55,0.8)',
                    transform: `rotate(${deg}deg) translateY(-3rem) translateX(-0.25rem) translateY(-0.25rem)`,
                    transformOrigin: '0 0',
                    animationDuration: `${8 + i}s`,
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>

            <span className={
              mode.kickerChipClass ??
              'chip bg-white/70 text-brand-primary-700 text-[10px] font-bold uppercase tracking-[0.18em] font-mono mb-3'
            }>
              {mode.kickerExtra}
              <Sparkles className="w-3 h-3" />
              {mode.loginKicker}
            </span>
            <h1 className={`inline-block font-display text-4xl font-black leading-tight mb-2 ${mode.headingGradientClass}`}>
              {mode.loginTitle}
            </h1>
            <p className="font-sans text-slate-600">{mode.loginSubtitle}</p>
          </div>

          {isAuthenticated && userDni && (
            <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-200 flex items-center gap-3 animate-fade-up">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-800 text-sm font-sans flex-1">
                Continúas como DNI <strong className="font-mono">{userDni}</strong>
              </p>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-semibold text-emerald-700 hover:text-red-600 underline"
              >
                Cambiar
              </button>
            </div>
          )}

          <div className="bg-brand-accent-50/80 rounded-2xl p-4 mb-6 border border-brand-accent-200">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-brand-accent-700 mt-0.5 flex-shrink-0" />
              <p className="text-brand-accent-900 text-sm font-sans">
                Acceso exclusivo para usuarios inscritos. Ingresa tus datos para verificar tu acceso.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2 font-display">
                <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />
                DNI
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ingresa tu DNI"
                className="w-full rounded-2xl py-3 px-4 bg-white/80 border border-slate-200 font-sans text-slate-800 placeholder:text-slate-400 shadow-elevation-1 focus:outline-none focus:border-brand-primary-500 focus:ring-4 focus:ring-brand-primary-100 transition-all"
                maxLength={8}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2 font-display">
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-2xl py-3 px-4 bg-white/80 border border-slate-200 font-sans text-slate-800 placeholder:text-slate-400 shadow-elevation-1 focus:outline-none focus:border-brand-primary-500 focus:ring-4 focus:ring-brand-primary-100 transition-all"
              />
            </div>

            {loginError && (
              <div className="bg-red-50 rounded-2xl p-4 flex items-start gap-3 border border-red-200 animate-fade-up">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm font-sans">{loginError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={onBack} className="btn-secondary flex-1">
              <ChevronLeft className="w-5 h-5" />
              Volver
            </button>
            <button
              onClick={handleVerify}
              className="btn-primary-brand flex-1 shine-hover"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verificar
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
