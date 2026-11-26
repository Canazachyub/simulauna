import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User, CreditCard, BookOpen, Clock, GraduationCap,
  Play, Loader2, AlertCircle, CheckCircle2,
  Pencil, Shield, Star, Sparkles, RotateCcw
} from 'lucide-react';
import { useExamStore, useExamHydrated, hasExamInProgress } from '../hooks/useExam';
import { useUniversityStore } from '../hooks/useUniversity';
import { useSlowHint } from '../hooks/useSlowHint';
import { resolveThemeVars } from '../utils/universityTheme';
import { processLabel } from '../utils/procesos';
import { Reveal } from './motion/motion';
import { ILLUSTRATIONS_3D } from './motion/hooks';
import { formatDuracion } from './hub/useHubConfig';
import './hub/hub.css';

/** Fondo oscuro común: base neutra + resplandor con el color de la universidad activa. */
function DarkBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(120% 70% at 50% 0%, var(--uni-primary-deep, #003D7A), transparent 72%)' }}
      />
      <div className="absolute inset-0 bg-mountains-bottom opacity-40 pointer-events-none" />
      <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
      <div className="absolute inset-0 noise opacity-40 pointer-events-none" />
    </>
  );
}

export function ExamConfirmation() {
  const navigate = useNavigate();
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const registroUniversidades = useUniversityStore(state => state.registro);
  const universidad = activaUniversidad || universidadParam || 'una';
  const themeVars = resolveThemeVars(universidad, registroUniversidades);
  const universidadRegistrada = registroUniversidades.find(u => u.codigo === universidad);
  const {
    student, config, loadQuestions, status, error,
    questions, savedAnswers, startTime, result, examDivision, universidad: examUniversidad
  } = useExamStore();
  const hydrated = useExamHydrated();
  const slowHint = useSlowHint(status === 'loading');
  // "Empezar uno nuevo" con examen en curso pide un segundo toque (borra las respuestas)
  const [confirmRestart, setConfirmRestart] = useState(false);

  // Redirect if no student data (solo tras rehidratar el store desde localStorage)
  useEffect(() => {
    if (hydrated && !student) {
      navigate(`/${universidad}/registro`, { replace: true });
    }
  }, [hydrated, student, navigate, universidad]);

  if (!student) return null;

  const areaConfig = config?.divisiones.find(d => d.codigo === student.area || d.nombre === student.area);

  // ¿Hay un examen empezado de ESTE estudiante, en ESTA universidad y ESTA área? Entonces se
  // ofrece "Continuar donde lo dejaste" en vez de pedir preguntas nuevas (que borraría todo).
  const canResume =
    hasExamInProgress({ questions, startTime, result }) &&
    (!examUniversidad || examUniversidad === universidad) &&
    (!examDivision || examDivision === student.area);
  const answeredSoFar = canResume ? savedAnswers.size : 0;

  const handleStartExam = async () => {
    setConfirmRestart(false);
    const ok = await loadQuestions(student.area, universidad);
    // Si falló la carga, NO navegamos: esta pantalla muestra el error con Reintentar.
    if (ok) {
      navigate(`/${universidad}/examen`);
    }
  };

  const handleResumeExam = () => {
    navigate(`/${universidad}/examen`);
  };

  const handleNewExam = () => {
    if (canResume && !confirmRestart) {
      setConfirmRestart(true);
      return;
    }
    handleStartExam();
  };

  // Un único mensaje de tiempo en toda la pantalla: el tiempo es SUGERIDO (el examen no se
  // corta), igual que en el Quiz, que usa la misma escala.duracionMin. Sin dato: 3 h.
  const nPreguntas = areaConfig?.totalQuestions ?? config?.escala.nPreguntasTotal;
  const tiempoSugerido = formatDuracion(config?.escala.duracionMin);

  const instructions = [
    `Tiempo sugerido: ${tiempoSugerido}. Si te pasas, igual se califica.`,
    'Responde en el orden que prefieras: avanza, retrocede o salta con el mapa de preguntas',
    'Al terminar verás tu puntaje detallado y podrás descargar un PDF',
    'Tus respuestas se guardan en este dispositivo: si se cierra la pestaña, puedes continuar después'
  ];

  /* -------------------------- Loading state -------------------------- */
  if (status === 'loading') {
    return (
      <div
        className="min-h-screen relative overflow-hidden text-white flex items-center justify-center px-4"
        style={{ backgroundColor: '#0b1324', ...themeVars }}
      >
        <DarkBackdrop />
        <div className="relative text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-brand-accent/40 blur-2xl animate-pulse" />
            <Loader2 className="relative w-20 h-20 text-brand-accent animate-spin" />
          </div>
          <h2 className="font-display text-3xl font-black mb-2 text-white text-shadow-sm">Preparando tu examen</h2>
          <p className="text-white/90 font-medium">Cargando preguntas reales…</p>
          {slowHint && (
            <p className="mt-3 text-white/85 text-sm font-medium max-w-xs mx-auto" aria-live="polite">{slowHint}</p>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- Error state --------------------------- */
  if (status === 'error') {
    return (
      <div
        className="min-h-screen relative overflow-hidden text-white flex items-center justify-center px-4"
        style={{ backgroundColor: '#0b1324', ...themeVars }}
      >
        <DarkBackdrop />
        {/* glass-dark (no glass claro): el texto es blanco y debe mantener contraste alto */}
        <div className="relative max-w-md w-full text-center rounded-3xl glass-dark p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-200 flex items-center justify-center mx-auto mb-4 border border-red-300/30">
            <AlertCircle className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2 text-white">No pudimos cargar tu examen</h2>
          <p className="text-white/90 font-medium mb-6">{error}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate(`/${universidad}/registro`)}
              className="min-h-11 px-5 py-2.5 rounded-xl border-2 border-white/30 font-semibold text-white hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Volver
            </button>
            <button
              onClick={handleStartExam}
              className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 rounded-xl bg-brand-accent text-brand-primary-900 font-bold hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reintentar
            </button>
            {canResume && (
              <button
                onClick={handleResumeExam}
                className="min-h-11 px-5 py-2.5 rounded-xl border-2 border-brand-accent/60 font-semibold text-brand-accent hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Continuar el examen que dejaste
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const firstName =
    student.fullName
      ?.split(' ')?.[0]
      ?.toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase()) || 'postulante';


  const primaryCtaClass =
    'group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 min-h-[56px] px-10 py-4 text-lg rounded-2xl btn-accent-gold shine-hover font-black tracking-wide shadow-[0_25px_50px_-12px_rgba(212,175,55,0.5)] motion-safe:hover:-translate-y-1 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70';

  return (
    // hub-clip (overflow: clip) en vez de overflow-hidden: así el CTA sticky funciona.
    <div
      className="min-h-screen relative hub-clip text-white pt-8 pb-10 md:py-14 px-4"
      style={{ backgroundColor: '#0b1324', ...themeVars }}
    >
      <DarkBackdrop />
      {/* Resplandores estáticos (sin animación: cuidan la batería en gama baja) */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-brand-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      {/* --- CONTENT --- */}
      <div className="relative z-20 max-w-3xl mx-auto">
        {/* Encabezado: ilustración encima en celular; a la derecha del título desde 768px */}
        <Reveal className="mb-8 md:mb-10 flex flex-col md:flex-row-reverse items-center md:items-center gap-3 md:gap-6 text-center md:text-left">
          <img
            src={ILLUSTRATIONS_3D.simulacro}
            alt=""
            aria-hidden="true"
            width={512}
            height={512}
            decoding="async"
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            className="illus-3d float-3d shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-52 md:h-52 lg:w-60 lg:h-60"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/25 border border-brand-accent/50 text-brand-accent text-xs font-black tracking-[0.2em] uppercase">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Todo listo
              </span>
              {universidadRegistrada && (
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-xs font-black tracking-[0.12em] uppercase shadow-lg"
                  style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                >
                  {universidadRegistrada.nombreCorto || universidadRegistrada.nombre}
                </span>
              )}
            </div>
            <h1 className="mt-4 font-display text-[2.5rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white text-shadow break-words">
              Es hora,{' '}
              <span className="italic text-brand-accent">{firstName}.</span>
            </h1>
            <p className="mt-4 text-white font-medium text-lg md:text-xl max-w-xl mx-auto md:mx-0 leading-relaxed text-shadow-sm">
              {nPreguntas ? `${nPreguntas} preguntas reales.` : 'Preguntas reales.'} Tu puntaje, calculado como en el examen.
            </p>
          </div>
        </Reveal>

        {/* Perfil del postulante — glass-dark (texto blanco con contraste alto); borde
            superior con el color institucional de la universidad activa */}
        <Reveal delay={80}>
          <div
            className="relative rounded-3xl glass-dark p-5 sm:p-6 md:p-8 border-t-4"
            style={{ borderTopColor: 'var(--uni-primary-safe)' }}
          >
            <div className="corner-accent absolute top-0 right-0 w-16 h-16 pointer-events-none" />
            <h2 className="text-xs font-black uppercase tracking-[0.22em] text-brand-accent mb-4 md:mb-5 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              Perfil del postulante
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { Icon: CreditCard, label: 'DNI', value: student.dni },
                { Icon: User, label: 'Nombre', value: student.fullName },
                { Icon: BookOpen, label: 'Área', value: student.area },
                ...(student.processType
                  ? [{
                      Icon: GraduationCap,
                      label: 'Proceso',
                      value: processLabel(student.processType, universidad, universidadRegistrada) + (student.processType === 'CEPREUNA' ? ' · Cuadernillos' : '')
                    }]
                  : [])
              ].map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-accent/15 text-brand-accent flex items-center justify-center flex-shrink-0 border border-brand-accent/30">
                    <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] font-bold text-white/80">{label}</p>
                    <p className="font-bold text-white truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Datos del examen — el tiempo dice lo mismo que la lista de abajo */}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold">
                <Clock className="w-4 h-4 text-brand-accent" aria-hidden="true" /> Tiempo sugerido: {tiempoSugerido}
              </span>
              {nPreguntas ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold">
                  <BookOpen className="w-4 h-4 text-brand-accent" aria-hidden="true" /> {nPreguntas} preguntas
                </span>
              ) : null}
              {areaConfig && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/25 border border-brand-accent/50 text-brand-accent text-sm font-bold">
                  <Star className="w-4 h-4" aria-hidden="true" /> {areaConfig.totalMaxScore.toLocaleString()} pts máx
                </span>
              )}
            </div>
          </div>
        </Reveal>

        {/* Antes de comenzar */}
        <Reveal delay={160}>
          <div className="relative mt-5 md:mt-6 rounded-2xl p-5 sm:p-6 md:p-7 glass-dark border-l-4 border-l-brand-accent">
            <h2 className="font-display text-xl font-black text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              Antes de comenzar
            </h2>
            <ul className="space-y-3">
              {instructions.map((ins, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-white font-medium leading-relaxed">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center flex-shrink-0 border border-emerald-400/50">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* CTA principal — en celular se queda pegado abajo (sobre la barra de navegación)
            mientras no se vea en su sitio; desde 640px vuelve a su lugar normal. */}
        <div className="hub-sticky-cta mt-6 sm:mt-9 flex justify-center">
          {canResume ? (
            <button onClick={handleResumeExam} className={primaryCtaClass}>
              <Play className="w-6 h-6 fill-current" aria-hidden="true" />
              <span>Continuar donde lo dejaste</span>
            </button>
          ) : (
            <button onClick={handleStartExam} className={primaryCtaClass}>
              <Play className="w-6 h-6 fill-current" aria-hidden="true" />
              <span>Comenzar simulacro</span>
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col items-center gap-2">
          {canResume && (
            <>
              <p className="text-white/90 text-sm font-medium text-center">
                Tienes un simulacro en curso con {answeredSoFar} de {questions.length} preguntas respondidas.
              </p>
              <button
                onClick={handleNewExam}
                className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 font-semibold text-sm transition text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                {confirmRestart ? 'Toca otra vez para empezar de cero (se borran tus respuestas)' : 'Empezar un simulacro nuevo'}
              </button>
            </>
          )}
          <button
            onClick={() => navigate(`/${universidad}/registro`)}
            className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 font-semibold text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Editar datos
          </button>
        </div>

        {/* Footer badge */}
        <div className="mt-8 md:mt-10 flex items-center justify-center text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/25 text-white/90 text-xs sm:text-sm font-medium">
            <Shield className="w-3.5 h-3.5 shrink-0 text-brand-accent" aria-hidden="true" />
            Preguntas reales de exámenes de admisión anteriores
          </span>
        </div>
      </div>
    </div>
  );
}
