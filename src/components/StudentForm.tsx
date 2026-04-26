import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, CreditCard, ChevronRight, ChevronLeft, Loader2, AlertCircle,
  Mail, Phone, GraduationCap, Briefcase, ShieldAlert, Lock, Clock,
  MessageCircle, ArrowRight, Sparkles, Star, Shield
} from 'lucide-react';
import { useExamStore } from '../hooks/useExam';
import { validateDNI, validateName } from '../utils/calculations';
import { registerUser, checkAccess } from '../services/api';
import { AreaSelector } from './AreaSelector';
import type { AreaType, ProcessType } from '../types';

const PHOTOS = {
  desk: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop',
  openBooks: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop',
  graduation: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80&auto=format&fit=crop',
  library: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop',
  studyWoman: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop',
};

type BlockVariant = 'fraud' | 'cuota' | 'blocked';

const WHATSAPP_BASE = 'https://wa.me/51900266810';
const WHATSAPP_MESSAGES: Record<BlockVariant, string> = {
  fraud: 'Hola,%20tengo%20un%20problema%20con%20mi%20registro%20en%20SimulaUNA%20(datos%20ya%20vinculados).',
  cuota: 'Hola,%20quiero%20solicitar%20mi%20c%C3%B3digo%20de%20acceso%20ilimitado%20a%20SimulaUNA.',
  blocked: 'Hola,%20necesito%20soporte%20con%20mi%20acceso%20a%20SimulaUNA.'
};

function detectBlockVariant(reason: string, isFraud: boolean, attemptCount: number): BlockVariant {
  if (isFraud) return 'fraud';
  const r = (reason || '').toLowerCase();
  if (r.includes('fraude') || r.includes('vinculad') || r.includes('otro correo') || r.includes('otro email')) {
    return 'fraud';
  }
  if (attemptCount > 0 || r.includes('gratuito') || r.includes('cupo') || r.includes('ya realiz') || r.includes('intento')) {
    return 'cuota';
  }
  return 'blocked';
}

// Carreras organizadas por área
const CAREERS_BY_AREA: Record<AreaType, string[]> = {
  'Ingenierías': [
    'Ingeniería Agronómica',
    'Ingeniería Económica',
    'Ingeniería de Minas',
    'Ingeniería Geológica',
    'Ingeniería Metalúrgica',
    'Ingeniería Química',
    'Ingeniería Estadística e Informática',
    'Ingeniería Topográfica y Agrimensura',
    'Ingeniería Agroindustrial',
    'Ingeniería Agrícola',
    'Ingeniería Civil',
    'Ingeniería de Sistemas',
    'Ingeniería Mecánica Eléctrica',
    'Ingeniería Electrónica',
    'Arquitectura y Urbanismo',
    'Ciencias Físico Matemáticas: Física',
    'Ciencias Físico Matemáticas: Matemáticas',
  ],
  'Biomédicas': [
    'Medicina Veterinaria y Zootecnia',
    'Enfermería',
    'Biología: Pesquería',
    'Biología: Microbiología y Laboratorio Clínico',
    'Biología: Ecología',
    'Medicina Humana',
    'Nutrición Humana',
    'Odontología',
  ],
  'Sociales': [
    'Ciencias Contables',
    'Trabajo Social',
    'Educación Primaria',
    'Educación Inicial',
    'Educación Física',
    'Educ. Secundaria: Ciencia, Tecnología y Ambiente',
    'Educ. Secundaria: Lengua, Literatura, Psicología y Filosofía',
    'Educ. Secundaria: Matemática, Física, Computación e Informática',
    'Antropología',
    'Derecho',
    'Turismo',
    'Ciencias de la Comunicación Social',
    'Administración',
    'Arte: Música',
    'Arte: Artes Plásticas',
    'Arte: Danza',
    'Psicología',
  ],
};

/* -------------------------------------------------------------------------- */
/*  Background — rich warm mesh with decorative layers                         */
/* -------------------------------------------------------------------------- */
function RichBackground() {
  return (
    <>
      {/* Base mesh */}
      <div className="absolute inset-0 bg-mesh-warm pointer-events-none" />
      {/* Andean stripe texture */}
      <div className="absolute inset-0 andean-bold text-brand-primary/15 pointer-events-none" />
      {/* Paper/noise grain */}
      <div className="absolute inset-0 noise opacity-40 pointer-events-none" />
      {/* Spotlight gold top */}
      <div className="absolute inset-x-0 top-0 h-[60vh] spotlight-gold pointer-events-none" />

      {/* Blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-brand-accent/25 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-orange-400/20 blur-3xl animate-blob-morph animate-float-slow pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-brand-primary-400/20 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />

      {/* Floating stars */}
      {[
        { top: '8%', left: '12%', size: 'w-5 h-5', delay: '0ms' },
        { top: '15%', left: '82%', size: 'w-4 h-4', delay: '300ms' },
        { top: '55%', left: '6%', size: 'w-6 h-6', delay: '600ms' },
        { top: '80%', left: '88%', size: 'w-4 h-4', delay: '900ms' },
        { top: '40%', left: '94%', size: 'w-3 h-3', delay: '1200ms' }
      ].map((s, i) => (
        <svg
          key={i}
          className={`absolute ${s.size} text-brand-accent/50 animate-star-twinkle pointer-events-none`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </svg>
      ))}

      {/* Warmth fotográfico */}
      <img
        src={PHOTOS.studyWoman}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute top-0 right-0 w-1/2 h-full object-cover opacity-[0.08] pointer-events-none hidden lg:block"
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floating-label input                                                       */
/* -------------------------------------------------------------------------- */
interface FLProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  placeholder?: string;
}
function FloatingInput({ id, label, value, onChange, icon: Icon, error, type = 'text', inputMode, maxLength, placeholder }: FLProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const raised = focused || hasValue;
  const ref = useRef<HTMLInputElement>(null);

  // Shake on error change
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  return (
    <div className={`relative ${shake ? 'animate-shake' : ''}`}>
      <div
        className={`relative rounded-xl border-2 bg-white transition-all duration-200 ${
          error
            ? 'border-red-400 focus-within:border-red-500'
            : focused
              ? 'border-brand-primary-500 shadow-[0_0_0_4px_rgba(212,175,55,0.25)]'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          focused ? 'text-brand-primary-600' : error ? 'text-red-500' : 'text-slate-400'
        }`} />
        <label
          htmlFor={id}
          onClick={() => ref.current?.focus()}
          className={`absolute left-10 pointer-events-none transition-all duration-200 ${
            raised
              ? 'top-1 text-[10px] uppercase tracking-wider font-semibold'
              : 'top-1/2 -translate-y-1/2 text-sm'
          } ${
            error ? 'text-red-500' : focused ? 'text-brand-primary-600' : 'text-slate-500'
          }`}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          placeholder={raised ? placeholder : ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent pt-5 pb-2 pl-10 pr-4 text-slate-800 font-medium placeholder-slate-300 focus:outline-none text-sm"
        />
      </div>
      {error && (
        <p className="mt-1.5 text-[12px] text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stepper                                                                    */
/* -------------------------------------------------------------------------- */
function Stepper({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Tus datos' },
    { n: 2, label: 'Tu meta' }
  ];
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => {
          const active = step >= s.n;
          const current = step === s.n;
          return (
            <div key={s.n} className="flex-1 flex items-center gap-3">
              <div
                className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                  active
                    ? 'bg-gradient-to-br from-brand-primary-600 to-brand-primary-800 text-white border-2 border-brand-accent shadow-lg shadow-brand-accent/30'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {s.n.toString().padStart(2, '0').slice(-1)}
                {current && (
                  <span className="absolute inset-0 rounded-full border-2 border-brand-accent animate-pulse-ring" />
                )}
              </div>
              <div className="flex-1 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-primary-600 via-brand-primary-500 to-brand-accent transition-all duration-500 ease-out"
                  style={{ width: active ? '100%' : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
        <span className={step >= 1 ? 'text-brand-primary-800' : 'text-slate-400'}>
          01 · {steps[0].label}
        </span>
        <span className={step >= 2 ? 'text-brand-primary-800' : 'text-slate-400'}>
          02 · {steps[1].label}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StudentForm                                                                */
/* -------------------------------------------------------------------------- */
export function StudentForm() {
  const navigate = useNavigate();
  const { setStudent, loadConfig, config, status, error } = useExamStore();

  const [step, setStep] = useState(1);
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [processType, setProcessType] = useState<ProcessType | null>(null);
  const [area, setArea] = useState<AreaType | null>(null);
  const [career, setCareer] = useState<string>('');
  const [errors, setErrors] = useState<{ dni?: string; name?: string; email?: string; phone?: string; processType?: string; area?: string; career?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState<{ show: boolean; reason: string; attemptCount: number; isFraud: boolean }>({
    show: false,
    reason: '',
    attemptCount: 0,
    isFraud: false
  });

  // Cargar configuración al montar
  useEffect(() => {
    if (!config) {
      loadConfig();
    }
  }, [config, loadConfig]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^9\d{8}$/.test(phone);
  };

  const validateStep1 = () => {
    const newErrors: { dni?: string; name?: string; email?: string; phone?: string } = {};

    if (!dni.trim()) {
      newErrors.dni = 'El DNI es requerido';
    } else if (!validateDNI(dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos';
    }

    if (!fullName.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!validateName(fullName)) {
      newErrors.name = 'Ingresa un nombre válido (mínimo 3 caracteres)';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!phone.trim()) {
      newErrors.phone = 'El número de celular es requerido';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'El celular debe tener 9 dígitos y empezar con 9';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSelectArea = (selectedArea: AreaType) => {
    setArea(selectedArea);
    setCareer(''); // Resetear carrera al cambiar área
    setErrors({ ...errors, area: undefined, career: undefined });
  };

  const validateStep2 = () => {
    const newErrors: { processType?: string; area?: string; career?: string } = {};

    if (!processType) {
      newErrors.processType = 'Selecciona el tipo de proceso';
    }

    if (!area) {
      newErrors.area = 'Selecciona un área';
    }

    if (!career) {
      newErrors.career = 'Selecciona una carrera';
    }

    setErrors({ ...errors, ...newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    // Verificar acceso antes de continuar
    try {
      const accessResult = await checkAccess(dni.trim(), email.trim().toLowerCase());

      if (!accessResult.canAccess) {
        setAccessDenied({
          show: true,
          reason: accessResult.reason,
          attemptCount: accessResult.attemptCount,
          isFraud: accessResult.isFraudAttempt || false
        });
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Error al verificar acceso:', err);
      // Si falla la verificación, continuamos para no bloquear
    }

    // Registrar usuario en Google Sheets (en segundo plano, no bloquea)
    try {
      await registerUser({
        dni: dni.trim(),
        fullName: fullName.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        processType: processType!,
        area: area!,
        career
      });
    } catch (err) {
      // Si falla el registro, continuamos de todos modos (no bloqueamos al usuario)
      console.warn('No se pudo registrar usuario:', err);
    }

    setStudent({
      dni: dni.trim(),
      fullName: fullName.trim().toUpperCase(),
      area: area!,
      processType: processType!
    });

    setIsSubmitting(false);
    navigate('/confirmar');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-mesh-warm flex items-center justify-center">
        <RichBackground />
        <div className="relative text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-brand-accent/40 blur-xl animate-pulse" />
            <Loader2 className="relative w-14 h-14 text-brand-primary-700 animate-spin" />
          </div>
          <p className="text-slate-700 font-bold">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-mesh-warm flex items-center justify-center px-4">
        <RichBackground />
        <div className="relative max-w-md w-full text-center rounded-3xl bg-white/95 backdrop-blur border border-slate-100 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-black text-brand-primary-900 mb-2">Error de conexión</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => loadConfig()} className="px-5 py-2.5 rounded-xl bg-brand-primary-600 text-white font-bold hover:bg-brand-primary-700 transition">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-mesh-warm py-12 md:py-16 px-4">
      <RichBackground />

      <div className={`relative z-10 mx-auto ${step === 2 ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Stepper */}
        <Stepper step={step} />

        {/* STEP 1 */}
        {step === 1 && (
          <div
            className="relative rounded-3xl bg-white/95 backdrop-blur border border-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.2)] p-7 md:p-10 animate-fade-up overflow-hidden"
          >
            {/* Corner gold accent */}
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-accent/30 via-brand-accent/10 to-transparent rounded-bl-full" />
              <svg className="absolute top-5 right-5 w-6 h-6 text-brand-accent animate-star-twinkle" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
              </svg>
            </div>

            <div className="relative mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-[11px] font-black uppercase tracking-[0.2em] text-brand-primary-800 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Paso 01 de 02
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tightest gradient-text-brand leading-[1.02]">
                Empecemos por ti.
              </h1>
              <p className="mt-3 text-slate-600 text-base">
                Cuatro datos rápidos para guardar tu progreso y preparar tu simulacro.
              </p>
            </div>

            <div className="relative space-y-4">
              <FloatingInput
                id="dni"
                label="DNI"
                placeholder="8 dígitos"
                value={dni}
                onChange={(v) => {
                  const val = v.replace(/\D/g, '').slice(0, 8);
                  setDni(val);
                  if (errors.dni) setErrors({ ...errors, dni: undefined });
                }}
                icon={CreditCard}
                error={errors.dni}
                inputMode="numeric"
                maxLength={8}
              />
              <FloatingInput
                id="name"
                label="Nombre completo"
                placeholder="Como aparece en tu DNI"
                value={fullName}
                onChange={(v) => {
                  setFullName(v);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                icon={User}
                error={errors.name}
              />
              <FloatingInput
                id="email"
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                icon={Mail}
                error={errors.email}
                type="email"
              />
              <FloatingInput
                id="phone"
                label="Celular"
                placeholder="9XXXXXXXX"
                value={phone}
                onChange={(v) => {
                  const val = v.replace(/\D/g, '').slice(0, 9);
                  setPhone(val);
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                icon={Phone}
                error={errors.phone}
                inputMode="numeric"
                maxLength={9}
                type="tel"
              />
            </div>

            <div className="relative mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:border-brand-primary-300 hover:bg-brand-primary-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                onClick={handleNextStep}
                className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-primary-600 to-brand-primary-800 text-white font-black text-base shadow-[0_15px_35px_-10px_rgba(0,61,122,0.55)] hover:shadow-[0_20px_45px_-10px_rgba(0,61,122,0.7)] hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <span className="relative">Siguiente</span>
                <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Testimonial chip */}
            <div className="relative mt-8 flex justify-center">
              <div className="relative inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-xs text-slate-800 shadow-sm max-w-full overflow-hidden">
                <img
                  src={PHOTOS.openBooks}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none rounded-full"
                />
                <div className="relative z-10 flex -space-x-1 shrink-0">
                  {[0, 1, 2].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-brand-accent fill-brand-accent" />
                  ))}
                </div>
                <span className="relative z-10 italic text-slate-800 font-medium truncate">
                  "Ingresé a la UNA después de 3 simulacros" — Maribel, Ing. Civil
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div
            className="relative rounded-3xl bg-white/95 backdrop-blur border border-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.2)] p-7 md:p-10 animate-fade-up overflow-hidden"
          >
            {/* Corner gold accent */}
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-accent/30 via-brand-accent/10 to-transparent rounded-bl-full" />
              <svg className="absolute top-5 right-5 w-6 h-6 text-brand-accent animate-star-twinkle" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
              </svg>
            </div>

            <div className="relative mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-[11px] font-black uppercase tracking-[0.2em] text-brand-primary-800 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Paso 02 de 02
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tightest gradient-text-brand leading-[1.02]">
                Tu meta es clara.
              </h1>
              <p className="mt-3 text-slate-600 text-base">Elige proceso, área y carrera.</p>
            </div>

            <div className="relative space-y-7">
              {/* Process Type */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-primary-700 mb-2.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Proceso de admisión
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CEPREUNA', 'GENERAL', 'EXTRAORDINARIO'] as ProcessType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProcessType(type);
                        if (errors.processType) setErrors({ ...errors, processType: undefined });
                      }}
                      className={`relative px-2 py-3.5 rounded-xl border-2 text-xs sm:text-sm font-black transition-all overflow-hidden ${
                        processType === type
                          ? 'border-brand-accent bg-gradient-to-br from-brand-primary-50 to-brand-accent/15 text-brand-primary-900 shadow-md shadow-brand-accent/30'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-primary-400 hover:bg-brand-primary-50/60'
                      }`}
                    >
                      {processType === type && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-accent" />
                      )}
                      {type}
                    </button>
                  ))}
                </div>
                {errors.processType && (
                  <p className="mt-2 text-[12px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.processType}
                  </p>
                )}
              </div>

              {/* Area */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-primary-700 mb-2.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Área académica
                </label>
                <AreaSelector
                  selectedArea={area}
                  onSelectArea={handleSelectArea}
                  config={config}
                />
                {errors.area && (
                  <p className="mt-2 text-[12px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.area}
                  </p>
                )}
              </div>

              {/* Career */}
              {area && (
                <div className="animate-fade-up">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-primary-700 mb-2.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Carrera profesional
                  </label>
                  <select
                    value={career}
                    onChange={(e) => {
                      setCareer(e.target.value);
                      if (errors.career) setErrors({ ...errors, career: undefined });
                    }}
                    className={`w-full px-4 py-4 rounded-xl border-2 bg-white font-semibold text-slate-700 outline-none transition-all text-sm ${
                      errors.career
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 hover:border-slate-300 focus:border-brand-primary-500 focus:shadow-[0_0_0_4px_rgba(212,175,55,0.25)]'
                    }`}
                  >
                    <option value="">-- Selecciona una carrera --</option>
                    {CAREERS_BY_AREA[area].map((careerOption) => (
                      <option key={careerOption} value={careerOption}>
                        {careerOption}
                      </option>
                    ))}
                  </select>
                  {errors.career && (
                    <p className="mt-2 text-[12px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.career}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="relative mt-9 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:border-brand-primary-300 hover:bg-brand-primary-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-primary-600 to-brand-primary-800 text-white font-black text-base shadow-[0_15px_35px_-10px_rgba(0,61,122,0.55)] hover:shadow-[0_20px_45px_-10px_rgba(0,61,122,0.7)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                {isSubmitting ? (
                  <>
                    <Loader2 className="relative w-5 h-5 animate-spin" />
                    <span className="relative">Registrando…</span>
                  </>
                ) : (
                  <>
                    <span className="relative">Continuar</span>
                    <ChevronRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Trust chip */}
            <div className="relative mt-8 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary-50 border border-brand-primary-100 text-xs font-semibold text-brand-primary-700">
                <Shield className="w-3.5 h-3.5 text-brand-accent" />
                Datos protegidos · Solo para generar tu simulacro
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de acceso denegado — lógica de variantes preservada íntegramente */}
      {accessDenied.show && (() => {
        const variant: BlockVariant = detectBlockVariant(
          accessDenied.reason,
          accessDenied.isFraud,
          accessDenied.attemptCount
        );

        const variantConfig: Record<BlockVariant, {
          borderClass: string;
          bgClass: string;
          iconColor: string;
          primaryColorClass: string;
          title: string;
          body: string;
          primaryLabel: string;
          IconComponent: typeof ShieldAlert;
          showDniBox: boolean;
        }> = {
          fraud: {
            borderClass: 'border-red-500',
            bgClass: 'bg-red-50',
            iconColor: 'text-red-600',
            primaryColorClass: 'bg-green-600 hover:bg-green-700',
            title: 'Datos ya registrados',
            body: dni
              ? `El DNI ${dni} está vinculado a otro correo. Si es un error, contáctanos.`
              : (accessDenied.reason || 'Los datos ingresados ya están vinculados a otro registro. Si es un error, contáctanos.'),
            primaryLabel: 'Contactar por WhatsApp',
            IconComponent: ShieldAlert,
            showDniBox: Boolean(dni),
          },
          cuota: {
            borderClass: 'border-amber-500',
            bgClass: 'bg-amber-50',
            iconColor: 'text-amber-600',
            primaryColorClass: 'bg-green-600 hover:bg-green-700',
            title: 'Simulacro gratuito ya usado',
            body: 'Ya realizaste tu simulacro de prueba. Para acceso ilimitado, solicita tu código.',
            primaryLabel: 'Solicitar acceso',
            IconComponent: Clock,
            showDniBox: false,
          },
          blocked: {
            borderClass: 'border-blue-500',
            bgClass: 'bg-blue-50',
            iconColor: 'text-blue-600',
            primaryColorClass: 'bg-blue-600 hover:bg-blue-700',
            title: 'Acceso restringido',
            body: accessDenied.reason || 'Tu acceso al simulacro se encuentra restringido en este momento.',
            primaryLabel: 'Contactar soporte',
            IconComponent: Lock,
            showDniBox: false,
          },
        };

        const cfg = variantConfig[variant];
        const Icon = cfg.IconComponent;
        const whatsappHref = `${WHATSAPP_BASE}?text=${WHATSAPP_MESSAGES[variant]}`;
        const closeModal = () =>
          setAccessDenied({ show: false, reason: '', attemptCount: 0, isFraud: false });

        // Renderizar body con DNI resaltado en negrita si corresponde
        const renderBody = () => {
          if (variant === 'fraud' && dni) {
            const parts = cfg.body.split(dni);
            return (
              <p className="text-slate-700 leading-relaxed">
                {parts[0]}
                <strong className="font-semibold text-slate-900">{dni}</strong>
                {parts.slice(1).join(dni)}
              </p>
            );
          }
          return <p className="text-slate-700 leading-relaxed">{cfg.body}</p>;
        };

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className={`max-w-md w-full rounded-2xl bg-white shadow-2xl overflow-hidden border-l-[6px] ${cfg.borderClass} animate-fade-in`}>
              <div className={`p-5 ${cfg.bgClass} flex items-center gap-3`}>
                <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center ${cfg.iconColor}`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">{cfg.title}</h3>
              </div>
              <div className="p-6">
                {renderBody()}
                {cfg.showDniBox && dni && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-100 font-mono text-sm">
                    DNI: {dni}
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
                >
                  Volver
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-white active:scale-[0.98] transition flex items-center justify-center gap-2 ${cfg.primaryColorClass}`}
                >
                  <MessageCircle size={18} />
                  {cfg.primaryLabel}
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
