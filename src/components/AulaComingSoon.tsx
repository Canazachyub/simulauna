import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  GraduationCap,
  TrendingUp,
  BookMarked,
  Sparkles,
  Loader2,
  CreditCard,
  Mail,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Users,
  Wallet,
  Info,
} from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';
import { useAuth } from '../context/AuthContext';
import { resolveThemeVars } from '../utils/universityTheme';
import { validateDNI } from '../utils/calculations';
import { WHATSAPP_NUMBER, whatsappUrl } from '../constants/contact';
import { SectionCurve } from './landing/SectionCurve';
import { AulaShell } from './aula/AulaShell';
import { formatFechaLarga, formatMoneda } from './aula/aulaFormat';
import type { AulaConAccesoData, CicloMock } from './aula/aulaTypes';
import { getAula, inscribirCiclo, type GetAulaOutcome, type InscribirCicloResult } from '../services/api';

/**
 * Aula Virtual — flujo real cableado al backend v2.1 (docs/CONTRATO_AULA_V21.md), con
 * degradación elegante: el backend está ESCRITO pero puede no estar desplegado todavía (el
 * usuario debe copiar `aula.gs` al editor de Apps Script). Mientras eso no pase — o si hay
 * cualquier error de red — esta pantalla cae sola a la experiencia anterior (lista de espera +
 * vista previa con datos de ejemplo) sin romper nada; el día que se despliegue, empieza a
 * mostrar datos reales sin tocar código.
 *
 * Estados (`Vista`):
 * - `cargando`: hay sesión (DNI+email del banqueo) y se está resolviendo `getAula`.
 * - `login`: no hay sesión — pide DNI+email (con opción de saltarlo y solo mirar la vista
 *   previa) antes de decidir cualquier otra cosa.
 * - `matriculado`: el alumno tiene acceso real → se monta `AulaShell` con sus datos.
 * - `inscripcion`: el alumno no está matriculado pero hay ciclos con inscripciones abiertas →
 *   tarjetas de preinscripción (nunca "pago online": el coordinador verifica a mano).
 * - `fallback`: error de red o el backend v2.1 todavía no está desplegado → misma experiencia
 *   de siempre (lista de espera + vista previa con mock), con un aviso sutil solo si hubo un
 *   intento real de sesión (para no alarmar a quien solo quería mirar sin loguearse).
 */

type Vista = 'cargando' | 'login' | 'matriculado' | 'inscripcion' | 'fallback';

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Mismo número que usa StudentForm.tsx (src/constants/contact.ts) — lista de espera del Aula virtual.
const WHATSAPP_MESSAGE = 'Hola, quiero unirme a la lista de espera del Aula Virtual de SimulaUNA';

const BULLETS = [
  { icon: GraduationCap, text: 'Clases de calidad por universidad' },
  { icon: TrendingUp, text: 'Seguimiento de tu avance' },
  { icon: BookMarked, text: 'Material por curso' },
];

/** Arma un enlace wa.me con mensaje pre-llenado a partir de un wa.me BASE ya armado (con o sin
 * número propio) — los `whatsappCoordinador` que trae la API son "bare" (sin `?text=`, ver
 * docs/CONTRATO_AULA_V21.md §4), así que el mensaje contextual siempre se agrega acá. */
function withWhatsappMessage(baseUrl: string, mensaje: string): string {
  const separador = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separador}text=${encodeURIComponent(mensaje)}`;
}

/** Bento con shimmer — misma silueta que el resumen "Inicio" del Aula real, para no dejar
 * pantalla en blanco mientras se resuelve `getAula`. */
function AulaCargandoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" role="status" aria-label="Cargando tu aula">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`shadow-tinted card-elevated rounded-2xl p-5 md:p-6 ${i === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : ''}`}>
          <div className="w-9 h-9 rounded-lg animate-shimmer mb-4" />
          <div className="h-3.5 w-2/3 rounded-full animate-shimmer mb-3" />
          <div className="h-3 w-full rounded-full animate-shimmer mb-2" />
          <div className="h-3 w-5/6 rounded-full animate-shimmer" />
        </div>
      ))}
      <span className="sr-only">Cargando tu aula…</span>
    </div>
  );
}

interface LoginCardProps {
  dni: string;
  email: string;
  onDniChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  error: string;
  isLoading: boolean;
  onSubmit: () => void;
  onSoloVistaPrevia: () => void;
}

/** Login ligero (mismo patrón visual que `practice/PracticeLogin.tsx`: DNI+email dentro de una
 * tarjeta glass) pero embebido dentro de la página, no a pantalla completa — porque acá el
 * alumno también puede optar por no loguearse y solo mirar la vista previa. */
function AulaLoginCard({ dni, email, onDniChange, onEmailChange, error, isLoading, onSubmit, onSoloVistaPrevia }: LoginCardProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="glass rounded-3xl p-8 shadow-elevation-3 border border-white/40 animate-fade-up">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white shadow-lg"
            style={{ backgroundColor: 'var(--uni-primary-safe)' }}
          >
            <GraduationCap className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-800 mb-1">Ingresa a tu Aula</h2>
          <p className="text-sm text-slate-500">Usa el mismo DNI y correo con los que rendiste tu simulacro.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <label htmlFor="aula-login-dni" className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">
              <CreditCard className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
              DNI
            </label>
            <input
              id="aula-login-dni"
              type="text"
              inputMode="numeric"
              value={dni}
              onChange={(e) => onDniChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Ingresa tu DNI"
              maxLength={8}
              className="w-full min-h-[44px] rounded-2xl py-3 px-4 bg-white/80 border border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-elevation-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-all"
              style={{ '--tw-ring-color': 'var(--uni-primary-safe)' } as CSSProperties}
            />
          </div>

          <div>
            <label htmlFor="aula-login-email" className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">
              <Mail className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
              Correo electrónico
            </label>
            <input
              id="aula-login-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full min-h-[44px] rounded-2xl py-3 px-4 bg-white/80 border border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-elevation-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-all"
              style={{ '--tw-ring-color': 'var(--uni-primary-safe)' } as CSSProperties}
            />
          </div>

          {error && (
            <div className="bg-red-50 rounded-2xl p-4 flex items-start gap-3 border border-red-200 animate-fade-up">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary-brand w-full justify-center mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <>
                Entrar a mi Aula
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onSoloVistaPrevia}
          className="w-full mt-4 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-lg"
          style={{ '--tw-ring-color': 'var(--uni-primary-safe)' } as CSSProperties}
        >
          Solo quiero mirar la vista previa
        </button>
      </div>
    </div>
  );
}

interface ConfirmacionPreinscripcionProps {
  ciclo: CicloMock;
  resultado: InscribirCicloResult;
  onActualizar: () => void;
  actualizando: boolean;
}

/** Panel que reemplaza al botón "Inscribirme" una vez que ya se preinscribió (o si reintenta y
 * ya tenía una fila previa — `inscribirCiclo` es idempotente, ver docs/CONTRATO_AULA_V21.md
 * §4). Honestidad del MVP: nunca dice "pago online", el coordinador verifica a mano. */
function ConfirmacionPreinscripcion({ ciclo, resultado, onActualizar, actualizando }: ConfirmacionPreinscripcionProps) {
  // "Bare" a propósito (sin `?text=`, ver docs/CONTRATO_AULA_V21.md §4) — el mensaje contextual
  // lo agrega `withWhatsappMessage` más abajo según el caso (preinscrito/matriculado/retirado).
  const whatsappBase = resultado.instruccionesPago?.whatsappCoordinador || ciclo.whatsappCoordinador || `https://wa.me/${WHATSAPP_NUMBER}`;

  if (resultado.estado === 'matriculado') {
    return (
      <div className="rounded-2xl p-4 border border-emerald-200 bg-emerald-50 animate-fade-up">
        <p className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          ¡Ya estás matriculado en este ciclo!
        </p>
        <button
          type="button"
          onClick={onActualizar}
          disabled={actualizando}
          className="btn-glow !px-4 !py-2 text-sm text-white"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          {actualizando ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : 'Entrar a mi aula'}
        </button>
      </div>
    );
  }

  if (resultado.estado === 'retirado') {
    return (
      <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 animate-fade-up">
        <p className="text-sm text-slate-600 mb-3">
          Tu matrícula en este ciclo figura como retirada. Si crees que es un error, escríbenos por WhatsApp.
        </p>
        <a
          href={withWhatsappMessage(whatsappBase, `Hola, mi matrícula en "${ciclo.nombre}" figura como retirada y quiero consultar sobre eso.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-glow !px-4 !py-2 text-sm text-white"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          Escribir al coordinador
        </a>
      </div>
    );
  }

  // estado === 'preinscrito' (el caso normal, recién inscrito o reintento del mismo alumno)
  const mensaje =
    resultado.instruccionesPago?.mensaje ||
    `Realiza el pago de matrícula (${formatMoneda(ciclo.precioMatricula)}) por Yape/Plin/transferencia y envía tu voucher por este medio.`;

  return (
    <div className="rounded-2xl p-4 border-2 animate-fade-up" style={{ borderColor: 'var(--uni-secondary-safe)', backgroundColor: 'var(--uni-primary-soft)' }}>
      <p className="flex items-center gap-2 font-black text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--uni-primary-safe)' }}>
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        {resultado.yaExistia ? 'Ya tienes una preinscripción' : 'Preinscripción registrada'}
      </p>
      <p className="text-xs font-bold text-slate-600 mb-1">
        Tu lugar se confirma al verificar tu pago — nada de pago online, todo es manual.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">{mensaje}</p>
      <a
        href={withWhatsappMessage(whatsappBase, `Hola, me preinscribí al ciclo "${ciclo.nombre}" y quiero enviar mi voucher de pago.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-glow !px-4 !py-2 text-sm text-white"
        style={{ backgroundColor: 'var(--uni-primary-safe)' }}
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        Enviar mi voucher por WhatsApp
      </a>
    </div>
  );
}

export function AulaComingSoon() {
  const navigate = useNavigate();
  const { universidad: codigo } = useParams<{ universidad: string }>();
  const universidadCode = codigo || 'una';
  const registro = useUniversityStore((state) => state.registro);
  const loadRegistro = useUniversityStore((state) => state.loadRegistro);
  const { user, isAuthenticated, login: authLogin } = useAuth();
  const [mascotFailed, setMascotFailed] = useState(false);

  const [vista, setVista] = useState<Vista>(isAuthenticated ? 'cargando' : 'login');
  const [huboIntentoSesion, setHuboIntentoSesion] = useState(false);
  const [aulaData, setAulaData] = useState<AulaConAccesoData | null>(null);
  const [ciclosDisponibles, setCiclosDisponibles] = useState<CicloMock[]>([]);

  const [loginDni, setLoginDni] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [inscripciones, setInscripciones] = useState<Map<string, InscribirCicloResult>>(new Map());
  const [inscripcionEnCurso, setInscripcionEnCurso] = useState<string | null>(null);
  const [inscripcionError, setInscripcionError] = useState<string | null>(null);
  const [actualizandoTrasMatricula, setActualizandoTrasMatricula] = useState(false);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  /** Aplica el resultado de `getAula` al estado de la pantalla. `esIntentoDeSesion=true` cuando
   * viene de una sesión ya existente o de un login recién enviado (para el aviso sutil del
   * fallback); `false` solo cuando el alumno eligió "solo mirar la vista previa". */
  const aplicarOutcome = useCallback((outcome: GetAulaOutcome, forzarFallbackEnError: boolean) => {
    if (outcome.ok) {
      if (outcome.data.matriculado) {
        setAulaData(outcome.data);
        setVista('matriculado');
      } else {
        setCiclosDisponibles(outcome.data.ciclosDisponibles);
        setVista('inscripcion');
      }
      return;
    }
    if (outcome.reason === 'error' && !forzarFallbackEnError) {
      setLoginError(outcome.message);
      setVista('login');
      return;
    }
    setHuboIntentoSesion(true);
    setVista('fallback');
  }, []);

  // Sesión ya existente (AuthContext, del banqueo) al montar: intenta getAula en silencio,
  // sin pasar por el formulario de login.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelado = false;
    setVista('cargando');
    getAula(user.dni, user.email, universidadCode).then((outcome) => {
      if (cancelado) return;
      aplicarOutcome(outcome, true);
    });
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated, user, universidadCode, aplicarOutcome]);

  const handleLoginSubmit = async () => {
    setLoginError('');
    const dni = loginDni.trim();
    const email = loginEmail.trim().toLowerCase();

    if (!dni || !validateDNI(dni)) {
      setLoginError('Ingresa un DNI válido (8 dígitos)');
      return;
    }
    if (!email || !validateEmail(email)) {
      setLoginError('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoggingIn(true);
    const outcome = await getAula(dni, email, universidadCode);
    setIsLoggingIn(false);

    if (outcome.ok || outcome.reason !== 'error') {
      authLogin(dni, email);
    }
    aplicarOutcome(outcome, false);
  };

  const handleSoloVistaPrevia = () => {
    setHuboIntentoSesion(false);
    setVista('fallback');
  };

  const handleInscribirme = async (ciclo: CicloMock) => {
    if (!user) return;
    setInscripcionEnCurso(ciclo.idCiclo);
    setInscripcionError(null);
    try {
      const resultado = await inscribirCiclo({
        universidad: universidadCode,
        dni: user.dni,
        email: user.email,
        cicloId: ciclo.idCiclo,
      });
      setInscripciones((prev) => new Map(prev).set(ciclo.idCiclo, resultado));
    } catch (error) {
      setInscripcionError(error instanceof Error ? error.message : 'No se pudo procesar tu inscripción. Intenta de nuevo.');
    } finally {
      setInscripcionEnCurso(null);
    }
  };

  const handleActualizarTrasMatricula = async () => {
    if (!user) return;
    setActualizandoTrasMatricula(true);
    const outcome = await getAula(user.dni, user.email, universidadCode);
    setActualizandoTrasMatricula(false);
    aplicarOutcome(outcome, true);
  };

  const universidad = registro.find((u) => u.codigo === codigo);
  const nombreUniversidad = universidad?.nombreCorto || universidad?.nombre || (codigo ? codigo.toUpperCase() : 'tu universidad');
  const themeVars = resolveThemeVars(codigo, registro);
  const whatsappHrefListaEspera = whatsappUrl(WHATSAPP_MESSAGE);
  const volverHref = `/${codigo || ''}`;

  const mostrarCTAListaEspera = vista === 'login' || vista === 'cargando' || vista === 'fallback';
  const mostrarBullets = vista !== 'matriculado';

  const heroBadge =
    vista === 'matriculado'
      ? { texto: 'Tu aula', icono: GraduationCap }
      : vista === 'inscripcion'
        ? { texto: 'Inscripciones abiertas', icono: CalendarDays }
        : { texto: 'Próximamente', icono: Sparkles };

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
                <heroBadge.icono className="w-4 h-4" aria-hidden="true" />
                {heroBadge.texto}
              </span>

              <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
                {vista === 'matriculado' ? 'Bienvenido de vuelta a tu Aula' : 'El Aula Virtual está en construcción'}
              </h1>

              <p className="mt-5 text-white/90 max-w-prose mx-auto md:mx-0 text-base md:text-lg leading-relaxed">
                {vista === 'matriculado'
                  ? `Clases en vivo, materiales y tu seguimiento del ciclo — todo en un solo lugar para ${nombreUniversidad}.`
                  : vista === 'inscripcion'
                    ? `Hay ciclos con inscripciones abiertas para ${nombreUniversidad}. Elige el tuyo y preinscríbete.`
                    : `Estamos preparando clases de calidad, seguimiento de tu avance y material por curso para ${nombreUniversidad}. Únete a la lista de espera y entra entre los primeros.`}
              </p>

              {mostrarCTAListaEspera && (
                <div className="mt-8 flex flex-col sm:flex-row items-center md:items-start gap-3 justify-center md:justify-start">
                  <a
                    href={whatsappHrefListaEspera}
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
              )}
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

      {/* Qué vas a encontrar — solo tiene sentido antes de tener acceso real */}
      {mostrarBullets && (
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
      )}

      {/* Contenido principal — depende del estado real de la sesión/matrícula */}
      <section className="max-w-5xl mx-auto px-4 pb-14 md:pb-20">
        {vista === 'cargando' && <AulaCargandoSkeleton />}

        {vista === 'login' && (
          <AulaLoginCard
            dni={loginDni}
            email={loginEmail}
            onDniChange={setLoginDni}
            onEmailChange={setLoginEmail}
            error={loginError}
            isLoading={isLoggingIn}
            onSubmit={handleLoginSubmit}
            onSoloVistaPrevia={handleSoloVistaPrevia}
          />
        )}

        {vista === 'matriculado' && aulaData && (
          <AulaShell
            universidad={universidadCode}
            nombreUniversidad={nombreUniversidad}
            whatsappHref={aulaData.ciclo.whatsappCoordinador ? withWhatsappMessage(aulaData.ciclo.whatsappCoordinador, `Hola, soy DNI ${user?.dni ?? ''}, quiero reportar mi pago del ciclo "${aulaData.ciclo.nombre}".`) : whatsappHrefListaEspera}
            cepreHref={`/${universidadCode}/cepre`}
            preview={false}
            showWelcome
            data={aulaData}
          />
        )}

        {vista === 'inscripcion' && (
          <div>
            <h2 className="font-display text-display-section font-bold text-slate-800 mb-2 text-center">
              Ciclos con inscripciones abiertas
            </h2>
            <p className="text-slate-500 text-sm md:text-base text-center max-w-prose mx-auto mb-8">
              Elige tu ciclo y preinscríbete — tu lugar se confirma cuando el coordinador verifique tu pago,
              no hay pago online.
            </p>

            {ciclosDisponibles.length === 0 ? (
              <div className="max-w-md mx-auto text-center shadow-tinted card-elevated rounded-2xl p-8">
                <p className="text-slate-600 mb-4">Por ahora no hay ciclos con inscripciones abiertas para {nombreUniversidad}.</p>
                <a
                  href={whatsappHrefListaEspera}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glow min-h-[44px]"
                  style={{ backgroundColor: 'var(--uni-primary-safe)', color: '#fff' }}
                >
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  Avísenme cuando abra un ciclo
                </a>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {ciclosDisponibles.map((ciclo) => {
                  const resultado = inscripciones.get(ciclo.idCiclo);
                  const enviando = inscripcionEnCurso === ciclo.idCiclo;
                  return (
                    <div key={ciclo.idCiclo} className="shadow-tinted card-elevated rounded-2xl p-6 flex flex-col">
                      <h3 className="font-display font-bold text-lg text-slate-800 mb-1">{ciclo.nombre}</h3>
                      <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {formatFechaLarga(ciclo.fechaInicio)} – {formatFechaLarga(ciclo.fechaFin)} · Turno {ciclo.turno}
                      </p>
                      <ul className="text-sm text-slate-600 space-y-1.5 mb-5">
                        <li className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          Matrícula: <strong className="text-slate-800">{formatMoneda(ciclo.precioMatricula)}</strong>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          Mensualidad: <strong className="text-slate-800">{formatMoneda(ciclo.precioMensualidad)}</strong> × {ciclo.nMensualidades}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          {ciclo.aforo} vacantes
                        </li>
                      </ul>

                      <div className="mt-auto">
                        {resultado ? (
                          <ConfirmacionPreinscripcion
                            ciclo={ciclo}
                            resultado={resultado}
                            onActualizar={handleActualizarTrasMatricula}
                            actualizando={actualizandoTrasMatricula}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInscribirme(ciclo)}
                            disabled={enviando}
                            className="btn-glow w-full justify-center text-white min-h-[44px]"
                            style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                          >
                            {enviando ? (
                              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            ) : (
                              'Inscribirme'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {inscripcionError && (
              <div className="max-w-3xl mx-auto mt-5 bg-red-50 rounded-2xl p-4 flex items-start gap-3 border border-red-200 animate-fade-up">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-red-700 text-sm">{inscripcionError}</p>
              </div>
            )}
          </div>
        )}

        {vista === 'fallback' && (
          <>
            {huboIntentoSesion && (
              <div className="max-w-2xl mx-auto mb-8 rounded-2xl p-4 border border-slate-200 bg-slate-50 flex items-start gap-3 animate-fade-up">
                <Info className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-slate-600">El Aula aún no está habilitada — pronto vas a poder entrar con tu DNI y correo.</p>
              </div>
            )}
            <h2 className="font-display text-display-section font-bold text-slate-800 mb-2 text-center">
              Así se verá tu aula
            </h2>
            <p className="text-slate-500 text-sm md:text-base text-center max-w-prose mx-auto mb-8">
              Una plataforma organizada en secciones: clases en vivo, grabaciones, materiales,
              horario, anuncios y más — cada una con su propio panel, todo dentro de SimulaUNA.
            </p>
            <AulaShell
              universidad={universidadCode}
              nombreUniversidad={nombreUniversidad}
              whatsappHref={whatsappHrefListaEspera}
              cepreHref={`/${universidadCode}/cepre`}
              preview
              showWelcome={false}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default AulaComingSoon;
