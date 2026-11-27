import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User, CreditCard, ChevronRight, ChevronLeft, Loader2, AlertCircle,
  Mail, Phone, GraduationCap, Briefcase, ShieldAlert, Lock, Clock,
  MessageCircle, ArrowRight, Star, Shield, Info, CheckCircle2
} from 'lucide-react';
import { useExamStore } from '../hooks/useExam';
import { useUniversityStore } from '../hooks/useUniversity';
import { useAuth } from '../context/AuthContext';
import { validateDNI, getNameError } from '../utils/calculations';
import { registerUser, checkAccess, type AccessCheckResult } from '../services/api';
import { resolveThemeVars } from '../utils/universityTheme';
import { processOptionsFor } from '../utils/procesos';
import { normalizeEmail, suggestEmailCorrection } from '../utils/emailTypos';
import { readRememberedIdentity, rememberIdentity } from '../utils/rememberedIdentity';
import { AreaSelector } from './AreaSelector';
import { ILLUSTRATIONS_3D } from './motion/hooks';
import { whatsappUrl } from '../constants/contact';
import './hub/hub.css';
import type { AreaType, ProcessType } from '../types';

type BlockVariant = 'fraud' | 'cuota' | 'blocked';

/* -------------------------------------------------------------------------- */
/*  Borrador del formulario (sessionStorage)                                   */
/* -------------------------------------------------------------------------- */
// "Editar datos" en ExamConfirmation vuelve aquí: el store solo guarda dni/nombre/área/
// proceso, así que el resto (correo, celular, carrera) se guarda en un borrador de la
// pestaña para no obligar a reescribir todo. sessionStorage: se borra al cerrar la pestaña.
const DRAFT_KEY = 'simulauna_registro_borrador';

interface FormDraft {
  universidad: string;
  dni: string;
  fullName: string;
  email: string;
  phone: string;
  processType: ProcessType | null;
  area: AreaType | null;
  career: string;
}

function readDraft(): FormDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as FormDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: FormDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento: el formulario igual funciona, solo no se recuerda.
  }
}

/** Celular peruano: solo dígitos; quita el prefijo de país si pegaron "+51 987 654 321". */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Los celulares peruanos empiezan con 9: si empieza con 51/0051 es el prefijo de país.
  // Mientras se TECLEA el prefijo, se deja crecer hasta completar y recién ahí se recorta
  // (antes se cortaba a 9 dígitos y "+51 987…" tecleado quedaba como "519876543").
  if (digits.startsWith('0051')) {
    return digits.length >= 13 ? digits.slice(4, 13) : digits;
  }
  if (digits.startsWith('51')) {
    return digits.length >= 11 ? digits.slice(2, 11) : digits;
  }
  return digits.slice(0, 9);
}

/** Lleva la vista al campo (o bloque) con error y le da foco si es enfocable. */
function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  if (typeof (el as HTMLElement).focus === 'function') {
    (el as HTMLElement).focus({ preventScroll: true });
  }
}

const NAME_ERROR_MESSAGES = {
  requerido: 'El nombre es requerido',
  corto: 'Tu nombre es muy corto: escribe al menos 3 letras',
  largo: 'El nombre es muy largo (máximo 100 caracteres)',
  caracteres: 'Usa solo letras (se permiten tildes, ñ, apóstrofo y guion)',
} as const;

const WHATSAPP_MESSAGES: Record<BlockVariant, string> = {
  fraud: 'Hola, tengo un problema con mi registro en Sinapsis Preu (datos ya vinculados).',
  cuota: 'Hola, quiero solicitar mi código de acceso ilimitado a Sinapsis Preu.',
  blocked: 'Hola, necesito soporte con mi acceso a Sinapsis Preu.'
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

// Carreras de respaldo de 'una' (por si su hoja config_carreras todavía no existe).
// Para todas las universidades la fuente principal es `division.carreras` (getConfig lee la
// hoja config_carreras); sin lista, el paso 2 pide la carrera como texto libre.
/** Valor centinela del desplegable: "Mi carrera no está en la lista" → texto libre. */
const CAREER_OTRA = '__otra__';

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
/*  Fondo cálido con capas decorativas                                         */
/* -------------------------------------------------------------------------- */
// Sin animaciones infinitas: junto a un formulario distraen y gastan batería en
// celulares de gama baja. La única animación continua es la flotación suave de
// la ilustración 3D del carnet.
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

      {/* Blobs estáticos */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-brand-accent/25 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-brand-primary-400/20 blur-3xl pointer-events-none" />
    </>
  );
}

/** Ilustración 3D del carnet (registro). Decorativa: el título ya dice qué es el paso. */
function CarnetIllustration({ className }: { className: string }) {
  return (
    <img
      src={ILLUSTRATIONS_3D.carnet}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      decoding="async"
      className={`illus-3d float-3d ${className}`}
    />
  );
}

const STEP_INFO = [
  { n: 1, label: 'Tus datos', detail: 'DNI, nombre, correo y celular' },
  { n: 2, label: 'Tu meta', detail: 'Proceso, área y carrera' },
] as const;

/** Columna lateral (≥1024): ilustración flotando + resumen de los dos pasos. */
function SideSummary({ step }: { step: number }) {
  return (
    <aside className="hidden lg:block" aria-label="Resumen del registro">
      <div className="sticky top-10">
        <CarnetIllustration className="w-56 h-56 mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-black text-slate-900 leading-tight">
          Tu simulacro en 2 pasos
        </h2>
        <p className="mt-1 text-sm text-slate-600">Te toma menos de un minuto.</p>
        <ol className="mt-5 space-y-3">
          {STEP_INFO.map((s) => {
            const done = step > s.n;
            const current = step === s.n;
            return (
              <li
                key={s.n}
                aria-current={current ? 'step' : undefined}
                className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-colors ${
                  current ? 'bg-white shadow-md' : 'bg-white/60 border-transparent'
                }`}
                style={current ? { borderColor: 'var(--uni-primary-safe)' } : undefined}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    current || done ? 'text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                  style={current || done ? { backgroundColor: 'var(--uni-primary-safe)' } : undefined}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> : s.n}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900">{s.label}</span>
                  <span className="block text-sm text-slate-600">{s.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Shield className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
          Datos protegidos · Solo para tu simulacro
        </p>
      </div>
    </aside>
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
  /** Atributo `name` (ayuda al autocompletado del navegador). */
  name?: string;
  autoComplete?: string;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>['enterKeyHint'];
  pattern?: string;
  onBlur?: () => void;
  /** Texto de ayuda bajo el campo (se oculta mientras hay error). */
  hint?: React.ReactNode;
  /** Contenido extra bajo el campo, siempre visible (p. ej. sugerencia de correo). */
  children?: React.ReactNode;
}
function FloatingInput({
  id, label, value, onChange, icon: Icon, error, type = 'text', inputMode, maxLength, placeholder,
  name, autoComplete, enterKeyHint, pattern, onBlur, hint, children
}: FLProps) {
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
              ? 'border-[var(--uni-primary-safe)] shadow-[0_0_0_4px_var(--uni-primary-soft)]'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          focused ? 'text-[var(--uni-primary-safe)]' : error ? 'text-red-500' : 'text-slate-400'
        }`} />
        <label
          htmlFor={id}
          onClick={() => ref.current?.focus()}
          className={`absolute left-10 pointer-events-none transition-all duration-200 ${
            raised
              ? 'top-1.5 text-xs uppercase tracking-wider font-semibold'
              : 'top-1/2 -translate-y-1/2 text-base'
          } ${
            error ? 'text-red-600' : focused ? 'text-[var(--uni-primary-safe)]' : 'text-slate-600'
          }`}
        >
          {label}
        </label>
        {/* text-base (16px): con menos, iOS hace zoom al enfocar el campo */}
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          pattern={pattern}
          maxLength={maxLength}
          value={value}
          placeholder={raised ? placeholder : ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          className="w-full bg-transparent pt-6 pb-2 pl-10 pr-4 text-slate-800 font-medium placeholder-slate-400 focus:outline-none text-base"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-600 flex items-start gap-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{hint}</span>
        </p>
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stepper                                                                    */
/* -------------------------------------------------------------------------- */
// Barra de pasos en palabras simples: "Paso 1 de 2: Tus datos" + dos segmentos.
// El segmento se llena con scaleX (transform) para animar sin recalcular layout.
function Stepper({ step }: { step: number }) {
  const current = STEP_INFO[step - 1] ?? STEP_INFO[0];
  const next = STEP_INFO[step];
  return (
    <div className="mb-5 md:mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-base md:text-lg font-black text-slate-900" aria-live="polite">
          <span style={{ color: 'var(--uni-primary-safe)' }}>Paso {step} de {STEP_INFO.length}:</span>{' '}
          {current.label}
        </p>
        <p className="text-sm font-semibold text-slate-600">
          {next ? `Sigue: ${next.label}` : 'Último paso'}
        </p>
      </div>
      <div
        className="mt-2.5 grid grid-cols-2 gap-2"
        role="progressbar"
        aria-label="Avance del registro"
        aria-valuemin={1}
        aria-valuemax={STEP_INFO.length}
        aria-valuenow={step}
        aria-valuetext={`Paso ${step} de ${STEP_INFO.length}: ${current.label}`}
      >
        {STEP_INFO.map((s) => (
          <div key={s.n} className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full w-full origin-left transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{
                transform: `scaleX(${step >= s.n ? 1 : 0})`,
                backgroundImage: 'linear-gradient(90deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StudentForm                                                                */
/* -------------------------------------------------------------------------- */
export function StudentForm() {
  const navigate = useNavigate();
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const registroUniversidades = useUniversityStore(state => state.registro);
  const universidad = activaUniversidad || universidadParam || 'una';
  const themeVars = resolveThemeVars(universidad, registroUniversidades);
  const { setStudent, loadConfig, config, status, error, student } = useExamStore();
  const { user: authUser } = useAuth();
  const divisions = config?.divisiones ?? [];

  // Estado inicial: si el alumno vuelve desde "Editar datos" (ExamConfirmation) usamos el
  // `student` del store + el borrador de la pestaña; si ya inició sesión en Banqueo/Aula, o
  // se registró antes en este celular, al menos pre-llenamos DNI y correo.
  const [initial] = useState(() => {
    const draft = readDraft();
    const sameUni = draft?.universidad === universidad ? draft : null;
    const remembered = readRememberedIdentity();
    const initDni = student?.dni || sameUni?.dni || authUser?.dni || remembered?.dni || '';
    const draftForDni = sameUni && sameUni.dni === initDni ? sameUni : null;
    const emailFor = (src: { dni: string; email: string } | null | undefined) =>
      src && src.dni === initDni ? src.email : '';
    const initArea = student?.area || draftForDni?.area || null;
    return {
      dni: initDni,
      fullName: student?.fullName || draftForDni?.fullName || '',
      email: draftForDni?.email || emailFor(authUser) || emailFor(remembered),
      phone: draftForDni?.phone || '',
      processType: student?.processType || draftForDni?.processType || null,
      area: initArea,
      career: draftForDni && draftForDni.area === initArea ? draftForDni.career : '',
    };
  });

  const [step, setStep] = useState(1);
  // Solo presentación: dirección de la transición entre pasos (entrada inicial, avanzar, volver).
  const [stepAnim, setStepAnim] = useState<'in' | 'forward' | 'back'>('in');
  const [dni, setDni] = useState(initial.dni);
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState(initial.phone);
  const [processTypeElegido, setProcessType] = useState<ProcessType | null>(initial.processType);
  // Solo los procesos que ESTA universidad tiene (piloto: solo Ordinario). Si hay uno solo queda
  // elegido; un borrador con un proceso que aquí no existe (p. ej. CEPREUNA en UNSA) se descarta.
  const processOptions = useMemo(
    () => processOptionsFor(universidad, registroUniversidades.find((u) => u.codigo === universidad)),
    [universidad, registroUniversidades]
  );
  const processType: ProcessType | null = processOptions.some((o) => o.type === processTypeElegido)
    ? processTypeElegido
    : processOptions.length === 1 ? processOptions[0].type : null;
  const [area, setArea] = useState<AreaType | null>(initial.area);
  const [career, setCareer] = useState<string>(initial.career);
  // true = eligió "Mi carrera no está en la lista" y la escribe a mano.
  const [careerOtra, setCareerOtra] = useState(false);
  const [errors, setErrors] = useState<{ dni?: string; name?: string; email?: string; phone?: string; processType?: string; area?: string; career?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Último checkAccess exitoso (por universidad+DNI+correo): el paso 2 lo reutiliza en vez
  // de repetir la petición si el alumno no cambió esos datos.
  const accessOkKey = useRef<string | null>(null);

  const emailSuggestion = emailTouched ? suggestEmailCorrection(email) : null;
  const [accessDenied, setAccessDenied] = useState<{ show: boolean; reason: string; attemptCount: number; isFraud: boolean }>({
    show: false,
    reason: '',
    attemptCount: 0,
    isFraud: false
  });

  // Cargar configuración al montar
  useEffect(() => {
    if (!config) {
      loadConfig(universidad);
    }
  }, [config, loadConfig, universidad]);

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

    const nameError = getNameError(fullName);
    if (nameError) {
      newErrors.name = NAME_ERROR_MESSAGES[nameError];
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

    // Llevar al alumno al primer campo con error (en el celular puede quedar fuera de vista)
    const firstInvalid = (['dni', 'name', 'email', 'phone'] as const).find(k => newErrors[k]);
    if (firstInvalid) focusField(firstInvalid);

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Verifica el intento gratuito / discrepancia de correo. Devuelve true si puede seguir.
   * Se llama al terminar el paso 1 (para avisar ANTES de pedir proceso/área/carrera) y
   * otra vez al enviar el paso 2, donde reutiliza el resultado si DNI y correo no cambiaron.
   */
  const verifyAccess = async (dniValue: string, emailValue: string): Promise<boolean> => {
    const key = `${universidad}|${dniValue}|${emailValue}`;
    if (accessOkKey.current === key) return true;

    let accessResult: AccessCheckResult;
    try {
      accessResult = await checkAccess(dniValue, emailValue, universidad);
    } catch (err) {
      console.warn('Error al verificar acceso:', err);
      // Si falla la verificación, continuamos para no bloquear
      return true;
    }

    if (!accessResult.canAccess) {
      setAccessDenied({
        show: true,
        reason: accessResult.reason,
        attemptCount: accessResult.attemptCount,
        isFraud: accessResult.isFraudAttempt || false
      });
      return false;
    }

    // checkAccess devuelve canAccess=true también cuando falla la red ("Error de
    // verificación…"): en ese caso NO lo guardamos, para reintentar al enviar el paso 2.
    if (!accessResult.reason?.startsWith('Error de verificación')) {
      accessOkKey.current = key;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (isChecking) return;
    setEmailTouched(true);
    if (!validateStep1()) return;

    const dniValue = dni.trim();
    const emailValue = normalizeEmail(email);
    if (emailValue !== email) setEmail(emailValue);

    setIsChecking(true);
    const ok = await verifyAccess(dniValue, emailValue);
    setIsChecking(false);
    if (!ok) return;

    // Recordar DNI + correo en este celular para pre-llenar Banqueo/Aula (no es sesión).
    rememberIdentity(dniValue, emailValue);
    setStepAnim('forward');
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  // Lista del desplegable: la de la hoja config_carreras (getConfig) y, para 'una', la de
  // respaldo del código. null = no hay lista → texto libre.
  const careerOptions = useMemo<string[] | null>(() => {
    if (!area) return null;
    const division = config?.divisiones?.find((d) => d.codigo === area || d.nombre === area);
    if (division?.carreras && division.carreras.length > 0) return division.carreras;
    if (universidad === 'una' && CAREERS_BY_AREA[area]) return CAREERS_BY_AREA[area];
    return null;
  }, [area, config, universidad]);
  // Un borrador con una carrera que ya no está en la lista se muestra como texto libre.
  const showCareerSelect = !!careerOptions && !careerOtra && (career === '' || careerOptions.includes(career));

  const handleSelectArea = (selectedArea: AreaType) => {
    setArea(selectedArea);
    setCareer(''); // Resetear carrera al cambiar área
    setCareerOtra(false);
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

    if (!career.trim()) {
      newErrors.career = 'Selecciona una carrera';
    }

    setErrors({ ...errors, ...newErrors });

    const firstInvalid = newErrors.processType
      ? 'process-section'
      : newErrors.area
        ? 'area-section'
        : newErrors.career
          ? 'career'
          : null;
    if (firstInvalid) focusField(firstInvalid);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    const dniValue = dni.trim();
    const emailValue = normalizeEmail(email);
    const nameValue = fullName.trim().replace(/\s+/g, ' ').toUpperCase();
    const careerValue = career.trim();

    // Verificar acceso antes de continuar (reutiliza el resultado del paso 1 si no cambió nada)
    const ok = await verifyAccess(dniValue, emailValue);
    if (!ok) {
      setIsSubmitting(false);
      return;
    }

    // Registrar usuario en Google Sheets en segundo plano: el flujo no depende de su
    // resultado (antes se esperaba con await pero un error se ignoraba igual), así que no
    // bloqueamos la navegación con datos móviles lentos. Solo capturamos el error.
    registerUser({
      dni: dniValue,
      fullName: nameValue,
      email: emailValue,
      phone: phone.trim(),
      processType: processType!,
      area: area!,
      career: careerValue,
      universidad
    }).catch((err) => {
      console.warn('No se pudo registrar usuario:', err);
    });

    setStudent({
      dni: dniValue,
      fullName: nameValue,
      email: emailValue,
      area: area!,
      processType: processType!
    });

    // Borrador para "Editar datos" desde la confirmación
    saveDraft({
      universidad,
      dni: dniValue,
      fullName: fullName.trim(),
      email: emailValue,
      phone: phone.trim(),
      processType,
      area,
      career: careerValue,
    });
    rememberIdentity(dniValue, emailValue);

    setIsSubmitting(false);
    navigate(`/${universidad}/confirmar`);
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
          <button onClick={() => loadConfig(universidad)} className="min-h-[48px] px-5 py-2.5 rounded-xl bg-brand-primary-600 text-white font-bold hover:bg-brand-primary-700 transition">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative hub-clip bg-mesh-warm py-8 md:py-14 px-4" style={themeVars}>
      <RichBackground />

      {/* ≥1024: columna lateral con la ilustración + resumen; debajo, una sola columna */}
      <div
        className={`relative z-10 mx-auto lg:max-w-6xl lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 xl:gap-16 ${
          step === 2 ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <SideSummary step={step} />

        <div className={`min-w-0 w-full ${step === 1 ? 'lg:max-w-2xl' : ''}`}>
        {/* Barra de pasos */}
        <Stepper step={step} />

        {/* La key re-monta la tarjeta en cada paso para animar la entrada (desliza
            desde la derecha al avanzar y desde la izquierda al volver). */}
        <div key={step} className={`hub-step--${stepAnim}`}>
        {/* STEP 1 */}
        {step === 1 && (
          <div
            className="relative rounded-3xl bg-white/95 backdrop-blur border border-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.2)] p-5 sm:p-7 md:p-10 overflow-hidden"
          >
            {/* Acento dorado en la esquina (estático) */}
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" aria-hidden="true">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-accent/30 via-brand-accent/10 to-transparent rounded-bl-full" />
            </div>

            <div className="relative mb-7 md:mb-8 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.05]">
                  Empecemos por ti.
                </h1>
                <p className="mt-2 md:mt-3 text-slate-600 text-base">
                  Cuatro datos rápidos para guardar tu progreso y preparar tu simulacro.
                </p>
              </div>
              {/* En celular/tablet la ilustración va pequeña junto al título */}
              <CarnetIllustration className="lg:hidden shrink-0 w-20 h-20 sm:w-24 sm:h-24 -mt-1" />
            </div>

            {/* <form> para que "Ir"/Enter del teclado del celular avance al paso 2 */}
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleNextStep();
              }}
            >
            <div className="relative space-y-4">
              <FloatingInput
                id="dni"
                name="dni"
                label="DNI"
                placeholder="8 dígitos"
                value={dni}
                onChange={(v) => {
                  // Sin maxLength en el input: así un DNI pegado con espacios o texto no se corta
                  const val = v.replace(/\D/g, '').slice(0, 8);
                  setDni(val);
                  if (errors.dni) setErrors({ ...errors, dni: undefined });
                }}
                icon={CreditCard}
                error={errors.dni}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                enterKeyHint="next"
              />
              <FloatingInput
                id="name"
                name="name"
                label="Nombre completo"
                placeholder="Como aparece en tu DNI"
                value={fullName}
                onChange={(v) => {
                  setFullName(v);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                icon={User}
                error={errors.name}
                autoComplete="name"
                enterKeyHint="next"
              />
              <FloatingInput
                id="email"
                name="email"
                label="Correo electrónico"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(v) => {
                  // Sin espacios y en minúsculas: así se guarda y así se compara al entrar
                  setEmail(normalizeEmail(v));
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                onBlur={() => setEmailTouched(true)}
                icon={Mail}
                error={errors.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="next"
                hint="Usa un correo que recuerdes: con tu DNI y este correo entras siempre."
              >
                {emailSuggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(emailSuggestion);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className="mt-2 w-full min-h-[44px] text-left px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-900 hover:bg-amber-100 transition"
                  >
                    ¿Quisiste decir <strong className="font-bold break-all">{emailSuggestion}</strong>? Toca para corregir.
                  </button>
                )}
              </FloatingInput>
              <FloatingInput
                id="phone"
                name="tel"
                label="Celular"
                placeholder="9XXXXXXXX"
                value={phone}
                onChange={(v) => {
                  // Acepta "+51 987 654 321" o "51987654321" pegados: quita el prefijo de país
                  setPhone(normalizePhone(v));
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                icon={Phone}
                error={errors.phone}
                inputMode="numeric"
                autoComplete="tel-national"
                enterKeyHint="go"
                type="tel"
              />
            </div>

            <div className="relative mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(`/${universidad}`)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:border-[var(--uni-primary-safe)] hover:bg-[var(--uni-primary-soft)] transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                type="submit"
                disabled={isChecking}
                className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)',
                  boxShadow: '0 15px 35px -10px var(--uni-primary)',
                }}
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                {isChecking ? (
                  <>
                    <Loader2 className="relative w-5 h-5 animate-spin" />
                    <span className="relative">Verificando…</span>
                  </>
                ) : (
                  <>
                    <span className="relative">Siguiente</span>
                    <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
            </form>

            {/* Testimonio: menciona la UNA, así que solo se muestra ahí */}
            {universidad === 'una' && (
            <div className="relative mt-8 flex justify-center">
              <div className="relative inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-xs text-slate-800 shadow-sm max-w-full overflow-hidden">
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
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div
            className="relative rounded-3xl bg-white/95 backdrop-blur border border-white shadow-[0_30px_60px_-15px_rgba(15,23,42,0.2)] p-5 sm:p-7 md:p-10 overflow-hidden"
          >
            {/* Acento dorado en la esquina (estático) */}
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" aria-hidden="true">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-accent/30 via-brand-accent/10 to-transparent rounded-bl-full" />
            </div>

            <div className="relative mb-7 md:mb-8 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.05]">
                  Tu meta es clara.
                </h1>
                <p className="mt-2 md:mt-3 text-slate-600 text-base">Elige proceso, área y carrera.</p>
              </div>
              <CarnetIllustration className="lg:hidden shrink-0 w-20 h-20 sm:w-24 sm:h-24 -mt-1" />
            </div>

            <div className="relative space-y-7">
              {/* Process Type */}
              <div id="process-section" tabIndex={-1} className="outline-none scroll-mt-6">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: 'var(--uni-primary-safe)' }}>
                  <Briefcase className="w-3.5 h-3.5" />
                  Proceso de admisión
                </label>
                <div className={`grid grid-cols-1 gap-2 ${processOptions.length >= 3 ? 'sm:grid-cols-3' : processOptions.length === 2 ? 'sm:grid-cols-2' : ''}`}>
                  {processOptions.map(({ type, label }) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={processType === type}
                      onClick={() => {
                        setProcessType(type);
                        if (errors.processType) setErrors({ ...errors, processType: undefined });
                      }}
                      className={`relative min-h-[48px] px-3 py-3 rounded-xl border-2 text-sm font-black break-words transition-all overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--uni-primary-soft)] ${
                        processType === type
                          ? 'border-brand-accent shadow-md shadow-brand-accent/30'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-[var(--uni-primary-safe)] hover:bg-[var(--uni-primary-soft)]'
                      }`}
                      style={processType === type
                        ? { backgroundImage: 'linear-gradient(135deg, var(--uni-primary-soft) 0%, rgba(212,175,55,0.15) 100%)', color: 'var(--uni-primary-safe)' }
                        : undefined}
                    >
                      {processType === type && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-accent" />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
                {errors.processType && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.processType}
                  </p>
                )}
              </div>

              {/* Area */}
              <div id="area-section" tabIndex={-1} className="outline-none scroll-mt-6">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: 'var(--uni-primary-safe)' }}>
                  <GraduationCap className="w-3.5 h-3.5" />
                  Área académica
                </label>
                <AreaSelector
                  selectedArea={area}
                  onSelectArea={handleSelectArea}
                  divisions={divisions}
                />
                {errors.area && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.area}
                  </p>
                )}
              </div>

              {/* Career */}
              {area && (
                <div className="animate-fade-up">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: 'var(--uni-primary-safe)' }}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    Carrera profesional
                  </label>
                  {showCareerSelect && careerOptions ? (
                    <select
                      id="career"
                      name="career"
                      value={career}
                      onChange={(e) => {
                        if (e.target.value === CAREER_OTRA) {
                          setCareerOtra(true);
                          setCareer('');
                        } else {
                          setCareer(e.target.value);
                        }
                        if (errors.career) setErrors({ ...errors, career: undefined });
                      }}
                      className={`w-full px-4 py-4 rounded-xl border-2 bg-white font-semibold text-slate-700 outline-none transition-all text-base ${
                        errors.career
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[var(--uni-primary-safe)] focus:shadow-[0_0_0_4px_var(--uni-primary-soft)]'
                      }`}
                    >
                      <option value="">-- Selecciona una carrera --</option>
                      {careerOptions.map((careerOption) => (
                        <option key={careerOption} value={careerOption}>
                          {careerOption}
                        </option>
                      ))}
                      <option value={CAREER_OTRA}>Mi carrera no está en la lista</option>
                    </select>
                  ) : (
                    <>
                    <input
                      id="career"
                      name="career"
                      type="text"
                      autoComplete="off"
                      enterKeyHint="go"
                      value={career}
                      placeholder="Escribe tu carrera de interés"
                      autoFocus={careerOtra}
                      onChange={(e) => {
                        setCareer(e.target.value);
                        if (errors.career) setErrors({ ...errors, career: undefined });
                      }}
                      onKeyDown={(e) => {
                        // "Ir" del teclado del celular envía el paso 2 (aquí no hay <form>: los
                        // botones de AreaSelector no tienen type="button" y lo enviarían).
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      className={`w-full px-4 py-4 rounded-xl border-2 bg-white font-semibold text-slate-700 outline-none transition-all text-base ${
                        errors.career
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-200 hover:border-slate-300 focus:border-[var(--uni-primary-safe)] focus:shadow-[0_0_0_4px_var(--uni-primary-soft)]'
                      }`}
                    />
                    {careerOptions && (
                      <button
                        type="button"
                        onClick={() => {
                          setCareerOtra(false);
                          setCareer('');
                        }}
                        className="mt-2 min-h-[44px] text-sm font-semibold underline underline-offset-2"
                        style={{ color: 'var(--uni-primary-safe)' }}
                      >
                        Volver a la lista de carreras
                      </button>
                    )}
                    </>
                  )}
                  {errors.career && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.career}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="relative mt-9 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStepAnim('back');
                  setStep(1);
                }}
                className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold hover:border-[var(--uni-primary-safe)] hover:bg-[var(--uni-primary-soft)] transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="group relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)',
                  boxShadow: '0 15px 35px -10px var(--uni-primary)',
                }}
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
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold"
                style={{ backgroundColor: 'var(--uni-primary-soft)', borderColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)' }}
              >
                <Shield className="w-3.5 h-3.5 text-brand-accent" />
                Datos protegidos · Solo para generar tu simulacro
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
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
        const whatsappHref = whatsappUrl(WHATSAPP_MESSAGES[variant]);
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
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
                >
                  Volver
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-lg font-semibold text-white active:scale-[0.98] transition flex items-center justify-center gap-2 ${cfg.primaryColorClass}`}
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
