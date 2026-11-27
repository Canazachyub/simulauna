import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUniversityStore } from '../hooks/useUniversity';
import {
  Trophy, Target, TrendingUp, RotateCcw,
  CheckCircle, XCircle, BookOpen, Calendar, Clock,
  ChevronLeft, ChevronRight, BarChart3, History, Award, Lightbulb,
  Sparkles, AlertTriangle, Scale, Star, ArrowRight, MinusCircle, FileCheck, X,
  BadgeCheck, MessageCircle
} from 'lucide-react';
import { whatsappUrl, WHATSAPP_INSCRIPCION } from '../constants/contact';
import { ReportarErrorPregunta } from './ReportarErrorPregunta';
// Recharts vive en su propio chunk lazy (ver src/components/results/ResultsCharts.tsx):
// solo se descarga cuando el alumno llega a la sección de análisis (CuandoVisible).
import type { ChartDataItem } from './results/ResultsCharts';
import {
  AnilloPuntaje, BarraAnimada, StatMarcador, CuandoVisible
} from './results/ResultsParts';
import { FichaOptica } from './ficha/FichaOptica';
import { Reveal } from './motion/motion';
import { prefersReducedMotion } from './motion/hooks';
import { Mascot } from './pages/Mascot';
import { useExamStore, useExamHydrated } from '../hooks/useExam';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { formatNumber, formatDate, indexToLetter } from '../utils/calculations';
import { renderFormattedText } from '../utils/formatText';
import { PDFGenerator } from './PDFGenerator';
import { saveScore, getUserHistory, normalizarSubjectResults, type UserHistory } from '../services/api';
import { resolveThemeVars } from '../utils/universityTheme';
import { resolveLogoUrl } from '../utils/logos';
import clsx from 'clsx';

const SubjectBarChart = lazyWithRetry(() =>
  import('./results/ResultsCharts').then(m => ({ default: m.SubjectBarChart }))
);
const HistoryLineChart = lazyWithRetry(() =>
  import('./results/ResultsCharts').then(m => ({ default: m.HistoryLineChart }))
);

/** Placeholder mientras se descarga el chunk de Recharts (respeta reduced-motion vía animate-pulse global). */
function ChartSkeleton() {
  return <div className="w-full h-full rounded-xl bg-slate-100 animate-pulse" aria-hidden="true" />;
}


// Paleta brand (solo el dorado semántico del nivel Excelente; el resto del
// acento viene del tema institucional vía resolveThemeVars)
const BRAND_ACCENT = '#D4AF37';

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Color semántico por porcentaje (el tramo 60-79 usa el color de la universidad). */
function colorPorcentaje(pct: number): string {
  if (pct >= 80) return '#059669';
  if (pct >= 60) return 'var(--uni-primary-safe, #003D7A)';
  if (pct >= 40) return '#D97706';
  return '#DC2626';
}

/** Variante para TEXTO sobre blanco (AA): tonos un paso más oscuros que las barras. */
function textoPorcentaje(pct: number): string {
  if (pct >= 80) return '#047857';
  if (pct >= 60) return 'var(--uni-primary-safe, #003D7A)';
  if (pct >= 40) return '#B45309';
  return '#B91C1C';
}

/** ¿La pregunta trae una clave real (0-based) tras calificar? (contrato v2: -1/ausente = sin clave) */
function tieneClave(q: { correctAnswer?: number | null; options: string[] }): boolean {
  return typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < q.options.length;
}

export function Results() {
  const navigate = useNavigate();
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const registroUniversidades = useUniversityStore(state => state.registro);
  const { result, resultSource, questions, startTime, resetExam } = useExamStore();
  const hydrated = useExamHydrated();
  const universidad = activaUniversidad || universidadParam || result?.universidad || 'una';
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'history'>('chart');
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showJustification, setShowJustification] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const scoreSaved = useRef(false);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  // true cuando la revisión se abrió desde la ficha: entonces se desplaza hasta el panel
  const scrollToReview = useRef(false);

  useEffect(() => {
    // Esperar a rehidratar el store (localStorage) antes de decidir que "no hay resultado":
    // así recargar /resultados sigue mostrando la nota en vez de expulsar al alumno.
    if (!hydrated) return;

    if (!result) {
      // Examen sin calificar (en curso o envío fallido) → de vuelta al examen; si no, al inicio.
      const hasPendingExam = questions.length > 0 && !!startTime;
      navigate(hasPendingExam ? `/${universidad}/examen` : `/${universidad}`, { replace: true });
      return;
    }

    if (!scoreSaved.current) {
      scoreSaved.current = true;

      const totalCorrect = result.answers.filter(a => a.isCorrect).length;
      const resultUniversidad = result.universidad || universidad;

      const saveAndFetchHistory = async () => {
        setLoadingHistory(true);

        // Si calificó el servidor (submitExam), el backend YA persistió el intento en el
        // historial: llamar saveScore lo duplicaba. saveScore (@deprecated, solo 'una') queda
        // únicamente para el caso de calificación local (resultSource === 'local'), que solo
        // ocurre si todas las preguntas traían su clave.
        if (resultSource === 'local') {
          await saveScore({
            dni: result.student.dni,
            score: result.totalScore,
            maxScore: result.maxScore,
            area: result.student.area,
            correct: totalCorrect,
            total: result.answers.length,
            universidad: resultUniversidad
          });
        }

        const history = await getUserHistory(result.student.dni, resultUniversidad, result.proceso);
        setUserHistory(history);
        setLoadingHistory(false);
      };

      saveAndFetchHistory();
    }
  }, [hydrated, result, resultSource, questions.length, startTime, navigate, universidad]);

  const answerMap = useMemo(() => {
    const map = new Map<string, { selectedOption: number | null; isCorrect: boolean }>();
    result?.answers.forEach(answer => {
      map.set(answer.questionId, {
        selectedOption: answer.selectedOption,
        isCorrect: answer.isCorrect
      });
    });
    return map;
  }, [result?.answers]);

  // Datos de la ficha corregida. `questions` ya viene "parchada" con la clave que devolvió
  // submitExam (useExam.finishExam → patchedQuestions); si alguna pregunta quedó sin clave, su
  // acierto se deja en null y la ficha la muestra neutral en vez de pintarla roja.
  const { fichaMarcadas, fichaAciertos } = useMemo(() => {
    const reviewIds = new Set((result?.review ?? []).map(r => r.questionId));
    return {
      fichaMarcadas: questions.map(q => answerMap.get(q.id)?.selectedOption ?? null),
      fichaAciertos: questions.map(q => {
        const a = answerMap.get(q.id);
        if (!a) return null;
        return tieneClave(q) || reviewIds.has(q.id) ? a.isCorrect : null;
      }),
    };
  }, [questions, answerMap, result?.review]);

  // Abrir la revisión desde la ficha: desplazar hasta el panel
  useEffect(() => {
    if (reviewIndex === null || !scrollToReview.current) return;
    scrollToReview.current = false;
    reviewPanelRef.current?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [reviewIndex]);

  const openReview = useCallback((index: number) => {
    scrollToReview.current = true;
    setShowJustification(false);
    setReviewIndex(index);
  }, []);

  // Modal "Nuevo simulacro": Escape cierra
  useEffect(() => {
    if (!showRestartModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRestartModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showRestartModal]);

  if (!result) return null;

  // resultados guardados antes del arreglo de forma (subject/correct/total) también se muestran
  const subjectResults = normalizarSubjectResults(result.subjectResults);

  const chartData: ChartDataItem[] = subjectResults.map((subject) => ({
    name: subject.name.length > 15 ? subject.name.slice(0, 15) + '...' : subject.name,
    fullName: subject.name,
    percentage: subject.percentage,
    correct: subject.correctAnswers,
    total: subject.totalQuestions
  }));

  const handleRestart = () => {
    setShowRestartModal(false);
    resetExam();
    navigate(`/${universidad}`);
  };

  const totalCorrect = result.answers.filter(a => a.isCorrect).length;
  const totalQuestions = result.answers.length;
  const notAnswered = result.answers.filter(a => a.selectedOption === null).length;
  const incorrectAnswered = totalQuestions - totalCorrect - notAnswered;

  const currentQuestion = reviewIndex !== null ? questions[reviewIndex] : null;
  const currentAnswer = currentQuestion ? answerMap.get(currentQuestion.id) : null;
  const currentHasKey = currentQuestion ? tieneClave(currentQuestion) : false;

  // ===== HERO helpers =====
  // Umbrales SIEMPRE desde result.umbrales (escala.umbrales de getConfig), nunca constantes
  // fijas: cada universidad puede tener una escala totalmente distinta (ver docs/CONTRATO_API_V2.md §5).
  const { excelente: umbralExcelente, bueno: umbralBueno, regular: umbralRegular } = result.umbrales;
  const score = result.totalScore;
  const isExcellent = score >= umbralExcelente;
  const isGood = score >= umbralBueno && score < umbralExcelente;
  const isRegular = score >= umbralRegular && score < umbralBueno;

  // Escalas chicas (p.ej. vigesimal) muestran decimales; las grandes y enteras, enteros (como antes).
  // Una escala grande con decimales (UNT: 407,9) los muestra para no redondear el máximo oficial.
  const escalaEntera = Number.isInteger(Math.round(result.maxScore * 100) / 100);
  const scoreDecimals = Number.isInteger(score) || (result.maxScore > 100 && escalaEntera) ? 0 : 2;

  const heroTitle = isExcellent
    ? '¡Estás listo!'
    : isGood
      ? 'Muy bien encaminado'
      : isRegular
        ? 'Vas por buen camino'
        : 'Tu punto de partida';

  // Nivel actual (chip) y escala completa 0..máx con las marcas de cada nivel
  const nivelActual = isExcellent ? 'Excelente' : isGood ? 'Bueno' : isRegular ? 'Regular' : 'En formación';
  const maxEscala = result.maxScore > 0 ? result.maxScore : Math.max(umbralExcelente, score, 1);
  const posEscala = (v: number) => Math.max(0, Math.min(100, (v / maxEscala) * 100));
  const marcasEscala = [
    { valor: umbralRegular, etiqueta: 'Regular' },
    { valor: umbralBueno, etiqueta: 'Bueno' },
    { valor: umbralExcelente, etiqueta: 'Excelente' },
  ].filter(m => m.valor > 0 && m.valor <= maxEscala);

  // Mensaje humano por nivel (lo "dice" el lobito)
  const heroMessage = isExcellent
    ? 'Lo hiciste increíble. Con este puntaje estás en zona de ingreso: mantén el ritmo y cuida los detalles el día del examen.'
    : isGood
      ? 'Vas muy bien. Unos cuantos aciertos más y llegas a Excelente: revisa en tu ficha las preguntas que fallaste.'
      : isRegular
        ? 'Ya tienes una base. Enfócate en los cursos con menor porcentaje y vuelve a intentarlo: cada simulacro cuenta.'
        : 'Todo gran ingreso empieza por aquí. Este simulacro te dice qué estudiar: empieza por tu curso más bajo y vuelve pronto.';


  // "Bueno" usa el gradiente institucional (--uni-primary → --uni-primary-deep) en vez del
  // gradiente fijo de marca, para que el título del hero también refleje la universidad activa.
  const heroTitleClass = isExcellent
    ? 'inline-block text-brand-accent-600 gradient-text-gold'
    : isGood
      ? 'inline-block bg-clip-text text-transparent'
      : 'text-slate-900';
  const heroTitleStyle = isGood
    ? { backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }
    : undefined;

  // Acento por universidad: el anillo de resultados, tabs y gráficos usan SIEMPRE el tema
  // institucional resuelto vía src/theme/universityThemes.ts (única fuente de theming) — los
  // colores del registro maestro tienen precedencia, con fallback local si aún no está
  // registrada. El resto de la escala de desempeño (excelente=dorado, regular=ámbar,
  // bajo=rojo) es semántica y no cambia por universidad (ver docs/CONTRATO_API_V2.md §5).
  const universidadRegistrada = registroUniversidades.find(u => u.codigo === universidad);
  const themeVars = resolveThemeVars(universidad, registroUniversidades);
  const uniPrimaryAccessible = (themeVars as Record<string, string>)['--uni-primary-safe'];

  const ringStroke = isExcellent ? BRAND_ACCENT : isGood ? uniPrimaryAccessible : isRegular ? '#D97706' : '#DC2626';

  let nextThresholdLabel: string;
  if (score < umbralRegular) {
    nextThresholdLabel = `Te faltan ${formatNumber(umbralRegular - score, scoreDecimals)} pts para llegar a Regular (${formatNumber(umbralRegular, 0)} pts)`;
  } else if (score < umbralBueno) {
    nextThresholdLabel = `Te faltan ${formatNumber(umbralBueno - score, scoreDecimals)} pts para llegar a Bueno (${formatNumber(umbralBueno, 0)} pts)`;
  } else if (score < umbralExcelente) {
    nextThresholdLabel = `Te faltan ${formatNumber(umbralExcelente - score, scoreDecimals)} pts para llegar a Excelente (${formatNumber(umbralExcelente, 0)} pts)`;
  } else {
    nextThresholdLabel = '¡Nivel Excelente alcanzado!';
  }


  const ringPercent = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;

  // Tiempo total formateado mm:ss
  const totalSeconds = Math.floor(result.totalTime);
  const timeMM = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const timeSS = String(totalSeconds % 60).padStart(2, '0');

  // Historial: mejor/anterior
  const isNewRecord = !!(userHistory
    && userHistory.history.length >= 2
    && result.totalScore >= userHistory.mejorPuntaje
    && userHistory.history[0].puntaje === result.totalScore
    && userHistory.history.some((h, i) => i > 0 && h.puntaje < result.totalScore));

  // Usuario nuevo = este es su primer simulacro registrado (sin historial previo): se le ofrece
  // el botón de inscripción por WhatsApp.
  const esUsuarioNuevo = !userHistory || (userHistory.totalIntentos ?? userHistory.history.length) <= 1;

  const dropVsPrevious = userHistory && userHistory.history.length >= 2
    ? userHistory.history[0].puntaje - userHistory.history[1].puntaje
    : null;

  // Insights para gráfico
  const sortedByPct = [...subjectResults].sort((a, b) => b.percentage - a.percentage);
  const bestSubject = sortedByPct[0];
  const worstSubject = sortedByPct[sortedByPct.length - 1];
  const avgPct = subjectResults.length > 0
    ? subjectResults.reduce((s, x) => s + x.percentage, 0) / subjectResults.length
    : 0;
  const balanceSpread = sortedByPct.length >= 2
    ? sortedByPct[0].percentage - sortedByPct[sortedByPct.length - 1].percentage
    : 0;


  // Cabecera de la ficha corregida
  const fichaUniversidad = {
    nombre: universidadRegistrada?.nombre ?? universidad.toUpperCase(),
    logoUrl: resolveLogoUrl(universidad, universidadRegistrada?.logo),
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 px-4 overflow-x-hidden" style={themeVars}>
      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">

        {/* ============ 1. ENCABEZADO DEL INFORME + PUNTAJE ============ */}
        <section
          aria-labelledby="informe-titulo"
          className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-elevation-2 animate-fade-up"
        >
          {/* Franja institucional */}
          <div
            className="px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 text-white"
            style={{
              backgroundColor: 'var(--uni-primary-safe)',
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.25) 100%)',
            }}
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/75 font-semibold">
                {universidadRegistrada?.nombre || 'Universidad Nacional del Altiplano'}
              </p>
              <h1 id="informe-titulo" className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Informe de resultados
              </h1>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Simulacro {(result.proceso || 'ORDINARIO').toUpperCase() === 'CEPRE' ? 'CEPRE' : 'Ordinario'}
            </span>
          </div>

          {/* Datos del postulante */}
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 px-5 sm:px-8 py-4 border-b border-slate-200 bg-slate-50/70 text-sm">
            <div className="col-span-2 min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Postulante</dt>
              <dd className="font-semibold text-slate-900 truncate">{result.student.fullName}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">DNI</dt>
              <dd className="font-semibold text-slate-900 font-mono">{result.student.dni}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Área</dt>
              <dd className="font-semibold text-slate-900">{result.student.area}</dd>
            </div>
            <div className="col-span-2 lg:col-span-4">
              <dt className="sr-only">Fecha</dt>
              <dd className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Rendido el {formatDate(result.date)}
              </dd>
            </div>
          </dl>

          {/* Puntaje */}
          <div className="px-5 sm:px-8 py-6 sm:py-8 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
            <div className="relative mx-auto">
              <AnilloPuntaje
                porcentaje={ringPercent}
                puntaje={result.totalScore}
                maximo={result.maxScore}
                decimales={scoreDecimals}
                color={ringStroke}
              >
                {isNewRecord && (
                  <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 z-20 animate-bounce-in">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent-600 text-white shadow-elevation-3 font-bold text-sm">
                      <Star className="w-4 h-4 fill-white" aria-hidden="true" />
                      ¡Nuevo récord!
                    </div>
                  </div>
                )}
              </AnilloPuntaje>
            </div>

            <div className="min-w-0 text-center md:text-left">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: ringStroke }}
              >
                Nivel: {nivelActual}
              </span>
              <h2
                className={clsx('mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight', heroTitleClass)}
                style={heroTitleStyle}
              >
                {heroTitle}
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed max-w-xl mx-auto md:mx-0">
                {heroMessage}
              </p>

              {/* Escala 0..máx con marcas de nivel */}
              <div className="mt-5 max-w-xl mx-auto md:mx-0 text-left">
                <p className="text-sm font-semibold text-slate-700 mb-2">{nextThresholdLabel}</p>
                <div
                  className="relative h-3 rounded-full bg-slate-200/90"
                  role="img"
                  aria-label={`Obtuviste ${formatNumber(score, scoreDecimals)} de ${formatNumber(maxEscala, 0)} puntos. ${nextThresholdLabel}`}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000"
                    style={{ width: `${posEscala(score)}%`, backgroundColor: ringStroke }}
                  />
                  {marcasEscala.map(m => (
                    <div key={m.etiqueta} className="absolute -top-1 -bottom-1 w-0.5 bg-slate-500/70" style={{ left: `${posEscala(m.valor)}%` }} aria-hidden="true" />
                  ))}
                  <div
                    className="absolute -top-1.5 w-6 h-6 -ml-3 rounded-full border-[3px] border-white shadow-elevation-2"
                    style={{ left: `${posEscala(score)}%`, backgroundColor: ringStroke }}
                    aria-hidden="true"
                  />
                </div>
                <div className="relative h-9 mt-1.5 text-[11px] text-slate-500" aria-hidden="true">
                  <span className="absolute left-0">0</span>
                  {marcasEscala.map(m => (
                    <span key={m.etiqueta} className="absolute -translate-x-1/2 text-center leading-tight" style={{ left: `${posEscala(m.valor)}%` }}>
                      <span className="block font-semibold text-slate-600">{m.etiqueta}</span>
                      {formatNumber(m.valor, 0)}
                    </span>
                  ))}
                  <span className="absolute right-0">{formatNumber(maxEscala, 0)}</span>
                </div>
                {dropVsPrevious !== null && dropVsPrevious < 0 && !isNewRecord && (
                  <div className="mt-2 inline-flex items-center gap-1.5 chip bg-slate-100 text-slate-700 border border-slate-200">
                    <TrendingUp className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
                    Bajaste {formatNumber(Math.abs(dropVsPrevious), scoreDecimals)} pts vs último intento
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============ 2. MARCADOR ============ */}
        <section aria-labelledby="marcador-titulo">
          <h2 id="marcador-titulo" className="sr-only">Marcador</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatMarcador
              icono={<Target className="w-5 h-5" />}
              valor={totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0}
              complemento="%"
              etiqueta="Precisión"
              color="var(--uni-primary-safe)"
              fondoIcono="var(--uni-primary-soft)"
            />
            <StatMarcador
              icono={<CheckCircle className="w-5 h-5" />}
              valor={totalCorrect}
              complemento={`/${totalQuestions}`}
              etiqueta="Correctas"
              color="#047857"
              fondoIcono="#D1FAE5"
              delay={80}
            />
            <StatMarcador
              icono={<XCircle className="w-5 h-5" />}
              valor={incorrectAnswered}
              etiqueta="Incorrectas"
              color="#DC2626"
              fondoIcono="#FEE2E2"
              delay={160}
            />
            <StatMarcador
              icono={<MinusCircle className="w-5 h-5" />}
              valor={notAnswered}
              etiqueta="En blanco"
              color="#475569"
              fondoIcono="#F1F5F9"
              delay={240}
            />
          </div>
          <Reveal variant="fade" delay={300} className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
            <span className="chip bg-white text-slate-700 border border-slate-200">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Tiempo <strong className="font-mono tabular-nums">{timeMM}:{timeSS}</strong>
            </span>
          </Reveal>
        </section>

        {/* ============ 3. POR CURSO ============ */}
        <section className="card-elevated p-4 sm:p-6" aria-labelledby="cursos-titulo">
          <Reveal variant="up">
            <h2 id="cursos-titulo" className="font-display text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
              Tu desempeño por curso
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-4 sm:mb-5">
              Aciertos y puntaje en cada curso: empieza a reforzar por las barras más cortas.
            </p>
          </Reveal>

          {/* Móvil/tablet: tarjetas apiladas */}
          <ul className="md:hidden space-y-3">
            {subjectResults.map((s, i) => (
              <li key={s.name} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display font-bold text-slate-900 leading-snug min-w-0 break-words">{s.name}</span>
                  <span className="shrink-0 font-mono font-bold text-sm tabular-nums" style={{ color: textoPorcentaje(s.percentage) }}>
                    {s.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm text-slate-600 tabular-nums">
                  <span>{s.correctAnswers}/{s.totalQuestions} correctas</span>
                  <span><strong className="text-slate-800">{formatNumber(s.pointsObtained)}</strong> / {formatNumber(s.maxPoints)} pts</span>
                </div>
                <BarraAnimada
                  valor={s.percentage}
                  color={colorPorcentaje(s.percentage)}
                  etiqueta={`${s.name}: ${s.percentage.toFixed(0)} % de aciertos`}
                  delay={Math.min(i, 6) * 60}
                  className="mt-2.5"
                />
              </li>
            ))}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-2.5 pr-3 font-semibold">Curso</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold text-right">Aciertos</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold text-right">Puntaje</th>
                  <th scope="col" className="py-2.5 pl-3 font-semibold w-[34%]">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {subjectResults.map((s, i) => (
                  <tr key={s.name} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="py-3 pr-3 font-display font-bold text-slate-900">{s.name}</th>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">{s.correctAnswers}/{s.totalQuestions}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      <strong className="text-slate-900">{formatNumber(s.pointsObtained)}</strong>
                      <span className="text-slate-500"> / {formatNumber(s.maxPoints)}</span>
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        <BarraAnimada
                          valor={s.percentage}
                          color={colorPorcentaje(s.percentage)}
                          etiqueta={`${s.name}: ${s.percentage.toFixed(0)} % de aciertos`}
                          delay={Math.min(i, 8) * 60}
                          className="flex-1"
                        />
                        <span className="w-12 text-right font-mono font-bold text-sm tabular-nums text-slate-700">
                          {s.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <th scope="row" className="py-3 pr-3 font-display font-black uppercase tracking-wider text-sm text-slate-900">Total</th>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{totalCorrect}/{totalQuestions}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatNumber(result.totalScore, scoreDecimals)}
                    <span className="text-slate-500 font-normal"> / {formatNumber(result.maxScore, scoreDecimals)}</span>
                  </td>
                  <td className="py-3 pl-3 font-mono font-bold text-sm text-slate-700">{result.percentage.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ============ 4. FICHA CORREGIDA + REVISIÓN ============ */}
        <section className="card-elevated p-3 sm:p-6" aria-labelledby="ficha-corregida-titulo">
          <Reveal variant="up" className="px-1 sm:px-0">
            <h2 id="ficha-corregida-titulo" className="font-display text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
              Tu ficha corregida
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-4">
              Así quedó tu hoja de respuestas. Toca cualquier pregunta para ver su revisión.
            </p>
          </Reveal>

          <FichaOptica
            preguntas={questions}
            marcadas={fichaMarcadas}
            aciertos={fichaAciertos}
            modo="corregida"
            actual={reviewIndex}
            onIr={openReview}
            universidad={fichaUniversidad}
            postulante={{ nombre: result.student.fullName, dni: result.student.dni }}
          />

          {/* Revisión pregunta por pregunta */}
          {currentQuestion && (
            <div
              ref={reviewPanelRef}
              key={reviewIndex}
              className="mt-6 scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-elevation-2 p-4 sm:p-6 animate-fade-in"
              aria-live="polite"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Pregunta {(reviewIndex ?? 0) + 1} de {questions.length}
                </h3>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="chip border truncate max-w-[45vw] sm:max-w-none"
                    style={{ backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)', borderColor: 'var(--uni-primary-soft)' }}
                  >
                    {currentQuestion.subject}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReviewIndex(null)}
                    className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Cerrar revisión"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-slate-800 leading-relaxed">
                  <span className="font-semibold" style={{ color: 'var(--uni-primary-safe)' }}>P{(reviewIndex ?? 0) + 1}.</span>{' '}
                  <span dangerouslySetInnerHTML={{ __html: renderFormattedText(currentQuestion.questionText) }} />
                </p>
              </div>

              {currentQuestion.sourceFile && (
                <div className="mb-4 text-right">
                  <span className="text-xs italic text-slate-500">
                    Fuente: {currentQuestion.sourceFile}
                  </span>
                </div>
              )}

              {currentQuestion.imageLink && (
                <div className="mb-4">
                  <img
                    src={currentQuestion.imageLink}
                    alt="Imagen de la pregunta"
                    loading="lazy"
                    className="max-w-full h-auto rounded-lg border border-slate-200 mx-auto"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}

              <div className="space-y-2 mb-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentAnswer?.selectedOption === index;
                  const isCorrectAnswer = currentHasKey && currentQuestion.correctAnswer === index;

                  let optionStyle = 'border-slate-200 bg-white';
                  if (isCorrectAnswer) {
                    optionStyle = 'border-emerald-500 bg-emerald-50';
                  } else if (isSelected && currentHasKey) {
                    optionStyle = 'border-red-500 bg-red-50';
                  } else if (isSelected) {
                    optionStyle = 'border-slate-400 bg-slate-50';
                  }

                  return (
                    <div
                      key={index}
                      className={clsx(
                        'p-3 rounded-xl border-2 flex items-start gap-3 transition',
                        optionStyle
                      )}
                    >
                      <div
                        className={clsx(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                          isCorrectAnswer
                            ? 'bg-emerald-700 text-white'
                            : isSelected
                              ? currentHasKey ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {isCorrectAnswer ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isSelected && currentHasKey ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          indexToLetter(index)
                        )}
                      </div>
                      <span
                        className={clsx(
                          'flex-1 pt-1 text-sm',
                          isCorrectAnswer
                            ? 'text-emerald-800 font-medium'
                            : isSelected && currentHasKey
                              ? 'text-red-700'
                              : 'text-slate-700'
                        )}
                      >
                        {option}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className={clsx(
                  'p-3 rounded-xl flex items-center gap-2',
                  currentAnswer?.isCorrect
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentAnswer?.selectedOption === null || currentAnswer?.selectedOption === undefined || !currentHasKey
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-red-100 text-red-800'
                )}
              >
                {currentAnswer?.isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Respuesta correcta (+{currentQuestion.points.toFixed(2)} pts)</span>
                  </>
                ) : (
                  <>
                    {currentAnswer?.selectedOption === null || currentAnswer?.selectedOption === undefined
                      ? <MinusCircle className="w-5 h-5 shrink-0" />
                      : <XCircle className="w-5 h-5 shrink-0" />}
                    <span className="font-medium">
                      {currentAnswer?.selectedOption === null || currentAnswer?.selectedOption === undefined
                        ? (currentHasKey
                          ? `Sin responder — La correcta es: ${indexToLetter(currentQuestion.correctAnswer)}`
                          : 'Sin responder')
                        : currentHasKey
                          ? `Incorrecta — La correcta es: ${indexToLetter(currentQuestion.correctAnswer)}`
                          : 'No tenemos la clave de esta pregunta'}
                    </span>
                  </>
                )}
              </div>

              {currentQuestion.justification && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowJustification(!showJustification)}
                    aria-expanded={showJustification}
                    className="flex items-center gap-2 min-h-11 text-sm font-semibold transition-colors hover:opacity-80"
                    style={{ color: 'var(--uni-primary-safe)' }}
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showJustification ? 'Ocultar justificación' : 'Ver justificación'}
                  </button>

                  {showJustification && (
                    <div className="mt-2 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fade-in">
                      <p className="text-amber-900 text-sm font-semibold mb-1">Justificación:</p>
                      <p className="text-amber-900 text-sm leading-relaxed">
                        {currentQuestion.justification}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <ReportarErrorPregunta question={currentQuestion} numero={(reviewIndex ?? 0) + 1} />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setShowJustification(false); setReviewIndex(Math.max(0, (reviewIndex ?? 0) - 1)); }}
                  disabled={reviewIndex === 0}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 min-h-11 py-2.5 rounded-xl font-semibold transition-all',
                    reviewIndex === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => { setShowJustification(false); setReviewIndex(Math.min(questions.length - 1, (reviewIndex ?? 0) + 1)); }}
                  disabled={reviewIndex === questions.length - 1}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 min-h-11 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98]',
                    reviewIndex === questions.length - 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-white'
                  )}
                  style={
                    reviewIndex === questions.length - 1
                      ? undefined
                      : { backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }
                  }
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ============ 5. ANÁLISIS: GRÁFICO / HISTORIAL ============ */}
        <section aria-labelledby="analisis-titulo" className="space-y-5">
          <Reveal variant="up" className="flex flex-col items-center gap-4">
            <h2 id="analisis-titulo" className="font-display text-xl sm:text-2xl font-bold text-slate-900 text-center">
              Analiza tu progreso
            </h2>
            <div className="flex gap-1 p-1.5 rounded-2xl bg-slate-200/70 w-fit max-w-full" role="tablist" aria-label="Análisis">
              {([
                { id: 'chart', label: 'Gráfico', Icon: BarChart3 },
                { id: 'history', label: 'Historial', Icon: History }
              ] as const).map(t => {
                const Icon = t.Icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(t.id)}
                    className={clsx(
                      'flex items-center gap-2 min-h-11 px-4 sm:px-5 rounded-xl font-semibold text-sm transition whitespace-nowrap',
                      active
                        ? 'bg-white shadow-elevation-2'
                        : 'text-slate-700 hover:text-slate-900'
                    )}
                    style={active ? { color: 'var(--uni-primary-safe)' } : undefined}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Gráfico (Recharts lazy: el chunk se pide recién al acercarse a esta sección) */}
          {activeTab === 'chart' && (
            <div className="space-y-6 animate-fade-in" role="tabpanel">
              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-elevated p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-brand-accent-500/15 text-brand-accent-700 flex items-center justify-center">
                      <Trophy className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">Mejor asignatura</span>
                  </div>
                  <p className="font-display text-lg font-black text-slate-900 truncate">{bestSubject?.name ?? '—'}</p>
                  <p className="text-sm text-brand-accent-700 font-mono font-bold">
                    {bestSubject ? `${bestSubject.percentage.toFixed(1)}%` : '—'}
                  </p>
                </div>

                <div className="card-elevated p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">A reforzar</span>
                  </div>
                  <p className="font-display text-lg font-black text-slate-900 truncate">{worstSubject?.name ?? '—'}</p>
                  <p className="text-sm text-red-700 font-mono font-bold">
                    {worstSubject ? `${worstSubject.percentage.toFixed(1)}%` : '—'}
                  </p>
                </div>

                <div className="card-elevated p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)' }}
                    >
                      <Scale className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">Balance</span>
                  </div>
                  <p className="font-display text-lg font-black text-slate-900">
                    {balanceSpread.toFixed(0)} pts de diferencia
                  </p>
                  <p className="text-sm text-slate-600 font-mono">Promedio <span className="font-bold">{avgPct.toFixed(1)}%</span></p>
                </div>
              </div>

              {/* Chart card */}
              <div className="card-elevated p-4 sm:p-6 relative overflow-hidden">
                <img
                  src="/illustrations/compass-geometry.svg"
                  alt=""
                  aria-hidden="true"
                  width={80}
                  height={80}
                  loading="lazy"
                  className="hidden md:block absolute top-3 right-3 w-20 opacity-20 pointer-events-none"
                />
                <div className="mb-6">
                  <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
                    Rendimiento por asignatura
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {chartData.length} cursos — identifica fortalezas y vacíos.
                  </p>
                </div>

                <CuandoVisible
                  className="w-full"
                  placeholder={<div style={{ height: Math.max(400, chartData.length * 45 + 40) }}><ChartSkeleton /></div>}
                >
                  <div style={{ height: Math.max(400, chartData.length * 45 + 40) }} className="w-full">
                    <Suspense fallback={<ChartSkeleton />}>
                      <SubjectBarChart
                        chartData={chartData}
                        accent={uniPrimaryAccessible}
                        gold={BRAND_ACCENT}
                      />
                    </Suspense>
                  </div>
                </CuandoVisible>
              </div>

              {/* Asignaturas a reforzar */}
              {(() => {
                const weakSubjects = subjectResults.filter(s => s.percentage < 60);
                if (weakSubjects.length === 0) return null;
                return (
                  <div className="card-elevated p-4 sm:p-6">
                    <h4 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-brand-accent-600" aria-hidden="true" />
                      Asignaturas a reforzar
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {weakSubjects.map(s => (
                        <div
                          key={s.name}
                          className="card-interactive border-l-4 border-brand-accent-500 p-4 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-display font-bold text-slate-900 truncate">{s.name}</div>
                            <div className="text-sm text-slate-600 font-mono">
                              {s.correctAnswers}/{s.totalQuestions} · {s.percentage.toFixed(1)}%
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/${universidad}/banqueo-tema`)}
                            className="shine-hover inline-flex items-center gap-1.5 min-h-11 text-sm font-bold text-brand-primary-800 px-3 py-2 rounded-lg bg-brand-accent-500/15 hover:bg-brand-accent-500/25 active:scale-95 transition whitespace-nowrap"
                          >
                            Practicar
                            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div className="card-elevated p-4 sm:p-6 animate-fade-in" role="tabpanel">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
                  Tu historial de simulacros
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Visualiza tu progreso a lo largo del tiempo.
                </p>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-4 border-brand-primary-200 border-t-brand-primary-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Cargando historial...</p>
                </div>
              ) : userHistory && userHistory.history.length > 0 ? (
                <>
                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
                    <div className="card-elevated p-3 sm:p-6 text-center">
                      <Award className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-2 sm:mb-3" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
                      <p className="font-display font-black text-2xl sm:text-4xl text-slate-900 font-mono tabular-nums">
                        {userHistory.totalIntentos}
                      </p>
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-600 mt-1">
                        Simulacros
                      </p>
                    </div>
                    <div className="card-elevated p-3 sm:p-6 text-center bg-gradient-to-br from-white to-brand-accent-500/5 border-brand-accent-500/30">
                      <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-brand-accent-600 mx-auto mb-2 sm:mb-3" aria-hidden="true" />
                      <p className="inline-block font-display font-black text-2xl sm:text-4xl text-brand-accent-600 font-mono tabular-nums gradient-text-gold">
                        {formatNumber(userHistory.mejorPuntaje, scoreDecimals)}
                      </p>
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-600 mt-1">
                        Mejor puntaje
                      </p>
                    </div>
                    <div className="card-elevated p-3 sm:p-6 text-center">
                      <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-2 sm:mb-3" style={{ color: 'var(--uni-primary-safe)' }} aria-hidden="true" />
                      <p className={clsx(
                        'font-display font-black text-2xl sm:text-4xl font-mono tabular-nums',
                        userHistory.history.length >= 2 && userHistory.history[0].puntaje - userHistory.history[1].puntaje >= 0
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      )}>
                        {userHistory.history.length >= 2
                          ? (userHistory.history[0].puntaje - userHistory.history[1].puntaje > 0 ? '+' : '')
                            + formatNumber(userHistory.history[0].puntaje - userHistory.history[1].puntaje, scoreDecimals)
                          : '—'}
                      </p>
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-600 mt-1">
                        vs anterior
                      </p>
                    </div>
                  </div>

                  {/* LineChart */}
                  {userHistory.history.length >= 2 && (
                    <div className="mb-8">
                      <h4 className="font-display text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Evolución de tus puntajes
                      </h4>
                      <div style={{ height: 260 }} className="w-full">
                        <Suspense fallback={<ChartSkeleton />}>
                          <HistoryLineChart
                            data={[...userHistory.history].reverse().map((h, idx) => ({
                              intento: `#${idx + 1}`,
                              puntaje: h.puntaje,
                              porcentaje: h.porcentaje,
                              isBest: h.puntaje === userHistory.mejorPuntaje,
                              isLatest: idx === userHistory.history.length - 1
                            }))}
                            accent={uniPrimaryAccessible}
                            gold={BRAND_ACCENT}
                          />
                        </Suspense>
                      </div>
                    </div>
                  )}

                  {/* Rows */}
                  <div className="space-y-2">
                    {userHistory.history.map((entry, index) => {
                      const isLatest = index === 0;
                      const isBest = entry.puntaje === userHistory.mejorPuntaje;
                      const pct = entry.total > 0 ? (entry.correctas / entry.total) * 100 : entry.porcentaje;

                      const pctChipClass = pct >= 80
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : pct >= 60
                          ? 'border'
                          : pct >= 40
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-red-100 text-red-800 border-red-200';
                      const pctChipStyle = pct >= 60 && pct < 80
                        ? { backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)', borderColor: 'var(--uni-primary-soft)' }
                        : undefined;

                      return (
                        <div
                          key={index}
                          className={clsx(
                            'rounded-xl border p-3 flex items-center gap-3 transition',
                            !isLatest && 'border-slate-200 bg-white hover:shadow-elevation-2'
                          )}
                          style={isLatest ? { borderColor: 'var(--uni-primary-soft)', backgroundColor: 'var(--uni-primary-soft)' } : undefined}
                        >
                          <div className={clsx(
                            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm',
                            isBest ? 'bg-brand-accent-500 text-brand-primary-900' : 'bg-slate-100 text-slate-700'
                          )}>
                            {isBest ? <Trophy className="w-5 h-5" aria-label="Mejor puntaje" /> : userHistory.totalIntentos - index}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-bold text-slate-900">
                                {formatRelativeDate(entry.fecha)}
                              </span>
                              {isLatest && (
                                <span
                                  className="chip text-white text-xs px-2 py-0.5"
                                  style={{ backgroundColor: 'var(--uni-primary-safe)' }}
                                >
                                  Actual
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                              <span className="chip bg-slate-100 text-slate-700 border-slate-200 text-xs py-0.5 truncate">
                                {entry.area}
                              </span>
                              <span className="text-sm text-slate-600 font-mono">
                                {entry.correctas}/{entry.total}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display font-black text-lg text-slate-900 font-mono tabular-nums">
                              {formatNumber(entry.puntaje, scoreDecimals)}
                            </div>
                            <span className={clsx('chip border text-xs py-0.5', pctChipClass)} style={pctChipStyle}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-slate-700 font-semibold">Este es tu primer simulacro</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Vuelve a practicar para ver tu progreso aquí.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ============ 7. CTA FINAL ============ */}
        {/* Fondo con el color institucional (--uni-primary-safe, AA con blanco) + velo oscuro */}
        <Reveal
          as="section"
          variant="zoom"
          className="relative rounded-2xl overflow-hidden shadow-elevation-2"
          style={{
            backgroundColor: 'var(--uni-primary-safe)',
            backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.40) 100%)',
          }}
        >
          <div className="relative z-10 p-5 sm:p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 text-white">
            <div className="flex-1 min-w-0">
              <div className="chip bg-white/15 text-white border border-white/25 mb-3 backdrop-blur">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                ¿Qué sigue?
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-black tracking-tighter mb-2">
                Practica tus puntos débiles
              </h3>
              <p className="text-white/90 max-w-md">
                Refuerza las asignaturas donde bajaste puntos en Banqueo por Tema.
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/85 max-w-md">
                <BadgeCheck className="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true" />
                Todas las preguntas son de exámenes de admisión reales de años pasados.
              </p>
              {esUsuarioNuevo && (
                <div className="mt-4">
                  <a
                    href={whatsappUrl('Hola, acabo de dar mi simulacro en Sinapsis Preu y quiero inscribirme para tener acceso completo.', WHATSAPP_INSCRIPCION)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl font-bold whitespace-nowrap bg-[#25D366] text-white hover:bg-[#1ebe5b] shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    ¿Eres nuevo? Inscríbete aquí · 989 855 026
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate(`/${universidad}/banqueo-tema`)}
                className="btn-accent-gold shine-hover inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl font-bold whitespace-nowrap"
              >
                Practicar puntos débiles
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex gap-2">
                <div className="flex-1 [&_button]:!w-full [&_button]:!min-h-12 [&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border [&_button]:!border-white/30 [&_button]:hover:!bg-white/20 [&_button]:!rounded-xl [&_button]:!px-4 [&_button]:!py-3 [&_button]:!font-semibold [&_button]:!backdrop-blur">
                  <PDFGenerator
                    result={result}
                    accentColor={uniPrimaryAccessible}
                    universidadNombre={universidadRegistrada?.nombre}
                    history={userHistory}
                  />
                </div>
                <button
                  onClick={() => setShowRestartModal(true)}
                  className="inline-flex items-center justify-center gap-2 min-h-12 min-w-12 px-4 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur transition whitespace-nowrap"
                  aria-label="Nuevo simulacro"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <p className="text-center text-slate-600 text-sm font-display">
          Sinapsis Preu · {universidadRegistrada?.nombre || 'Universidad Nacional del Altiplano'}
        </p>
      </div>

      {/* ============ MODAL nuevo simulacro ============ */}
      {showRestartModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="results-restart-title"
          onClick={() => setShowRestartModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-elevation-4 max-w-sm w-full p-6 text-center animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            <Mascot
              src="/illustrations/lobito-pensando.webp"
              alt=""
              className="w-24 h-24 mx-auto mb-3 select-none"
            />
            <h2 id="results-restart-title" className="font-display text-2xl font-bold text-slate-900 mb-2">
              ¿Empezar un nuevo simulacro?
            </h2>
            <p className="text-slate-700 mb-6">
              Este resultado dejará de verse en esta pantalla. Si quieres conservarlo, descarga antes tu PDF.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={handleRestart}
                className="w-full min-h-12 py-3 rounded-xl font-semibold text-white active:scale-[0.99] transition"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
                autoFocus
              >
                Sí, empezar uno nuevo
              </button>
              <button
                onClick={() => setShowRestartModal(false)}
                className="w-full min-h-11 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Quedarme en mis resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
