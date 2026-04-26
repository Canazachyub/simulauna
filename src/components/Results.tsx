import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Clock, Target, TrendingUp, RotateCcw,
  CheckCircle, XCircle, User, CreditCard, BookOpen, Calendar,
  Grid3X3, ChevronLeft, ChevronRight, Table2, BarChart3, History, Award, Lightbulb,
  Sparkles, AlertTriangle, Scale, Star, ArrowRight, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line
} from 'recharts';
import { useExamStore } from '../hooks/useExam';
import { PERFORMANCE_MESSAGES } from '../types';
import { formatTimeReadable, formatNumber, formatDate, indexToLetter } from '../utils/calculations';
import { renderFormattedText } from '../utils/formatText';
import { PDFGenerator } from './PDFGenerator';
import { saveScore, getUserHistory, type UserHistory } from '../services/api';
import clsx from 'clsx';

interface ChartDataItem {
  name: string;
  fullName: string;
  percentage: number;
  correct: number;
  total: number;
}

const PHOTOS = {
  desk: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop',
  openBooks: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop',
  graduation: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80&auto=format&fit=crop',
  library: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop',
  studyWoman: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop',
};

// Paleta brand
const BRAND_PRIMARY = '#003D7A';
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

export function Results() {
  const navigate = useNavigate();
  const { result, questions, resetExam } = useExamStore();
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'chart' | 'details' | 'history'>('review');
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showJustification, setShowJustification] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<number | null>(null);
  const [ringProgress, setRingProgress] = useState(0);
  const scoreSaved = useRef(false);

  useEffect(() => {
    if (!result) {
      navigate('/');
      return;
    }

    if (!scoreSaved.current) {
      scoreSaved.current = true;

      const totalCorrect = result.answers.filter(a => a.isCorrect).length;

      const saveAndFetchHistory = async () => {
        setLoadingHistory(true);

        console.log('📊 Guardando puntaje en historial_puntajes...', {
          dni: result.student.dni,
          score: result.totalScore,
          area: result.student.area
        });

        const saveResult = await saveScore({
          dni: result.student.dni,
          score: result.totalScore,
          maxScore: result.maxScore,
          area: result.student.area,
          correct: totalCorrect,
          total: result.answers.length
        });

        console.log('✅ Puntaje guardado:', saveResult);

        await new Promise(resolve => setTimeout(resolve, 500));

        const history = await getUserHistory(result.student.dni);
        setUserHistory(history);
        setLoadingHistory(false);
      };

      saveAndFetchHistory();
    }
  }, [result, navigate]);

  // Trigger animación del anillo
  useEffect(() => {
    if (!result) return;
    const pct = Math.max(0, Math.min(100, (result.totalScore / result.maxScore) * 100));
    const t = setTimeout(() => setRingProgress(pct), 100);
    return () => clearTimeout(t);
  }, [result]);

  if (!result) return null;

  const performanceInfo = PERFORMANCE_MESSAGES[result.performanceLevel];

  const chartData: ChartDataItem[] = result.subjectResults.map((subject) => ({
    name: subject.name.length > 15 ? subject.name.slice(0, 15) + '...' : subject.name,
    fullName: subject.name,
    percentage: subject.percentage,
    correct: subject.correctAnswers,
    total: subject.totalQuestions
  }));

  const handleRestart = () => {
    resetExam();
    navigate('/');
  };

  const totalCorrect = result.answers.filter(a => a.isCorrect).length;
  const totalQuestions = result.answers.length;
  const notAnswered = result.answers.filter(a => a.selectedOption === null).length;
  const incorrectAnswered = totalQuestions - totalCorrect - notAnswered;

  const answerMap = useMemo(() => {
    const map = new Map<string, { selectedOption: number | null; isCorrect: boolean }>();
    result.answers.forEach(answer => {
      map.set(answer.questionId, {
        selectedOption: answer.selectedOption,
        isCorrect: answer.isCorrect
      });
    });
    return map;
  }, [result.answers]);

  const currentQuestion = reviewIndex !== null ? questions[reviewIndex] : null;
  const currentAnswer = currentQuestion ? answerMap.get(currentQuestion.id) : null;

  // ===== HERO helpers =====
  const score = result.totalScore;
  const isExcellent = score >= 2400;
  const isGood = score >= 1800 && score < 2400;
  const isRegular = score >= 1200 && score < 1800;

  const heroTitle = isExcellent
    ? '¡Estás listo!'
    : isGood
      ? 'Muy bien encaminado'
      : isRegular
        ? 'Sigue practicando'
        : 'Hay mucho por mejorar';

  const heroTitleClass = isExcellent
    ? 'inline-block text-brand-accent-600 gradient-text-gold'
    : isGood
      ? 'inline-block text-brand-primary-700 gradient-text-brand'
      : 'text-slate-900';

  const ringStroke = isExcellent ? BRAND_ACCENT : isGood ? BRAND_PRIMARY : isRegular ? '#D97706' : '#DC2626';

  let nextThresholdLabel: string;
  let percentToNext: number;
  if (score < 1200) {
    nextThresholdLabel = `Te faltan ${formatNumber(1200 - score, 0)} pts para Regular`;
    percentToNext = Math.max(0, Math.min(100, (score / 1200) * 100));
  } else if (score < 1800) {
    nextThresholdLabel = `Te faltan ${formatNumber(1800 - score, 0)} pts para Bueno`;
    percentToNext = Math.max(0, Math.min(100, ((score - 1200) / 600) * 100));
  } else if (score < 2400) {
    nextThresholdLabel = `Te faltan ${formatNumber(2400 - score, 0)} pts para Excelente`;
    percentToNext = Math.max(0, Math.min(100, ((score - 1800) / 600) * 100));
  } else {
    nextThresholdLabel = '¡Nivel Excelente alcanzado!';
    percentToNext = 100;
  }

  const confettiItems = [
    { left: '8%', top: '10%', delay: '0s' },
    { left: '22%', top: '22%', delay: '0.2s' },
    { left: '38%', top: '6%', delay: '0.4s' },
    { left: '55%', top: '18%', delay: '0.1s' },
    { left: '72%', top: '8%', delay: '0.3s' },
    { left: '85%', top: '20%', delay: '0.5s' },
    { left: '15%', top: '78%', delay: '0.25s' },
    { left: '80%', top: '72%', delay: '0.15s' }
  ];

  // Anillo SVG
  const ringRadius = 130;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (ringProgress / 100) * ringCirc;

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

  const dropVsPrevious = userHistory && userHistory.history.length >= 2
    ? userHistory.history[0].puntaje - userHistory.history[1].puntaje
    : null;

  // Insights para gráfico
  const sortedByPct = [...result.subjectResults].sort((a, b) => b.percentage - a.percentage);
  const bestSubject = sortedByPct[0];
  const worstSubject = sortedByPct[sortedByPct.length - 1];
  const avgPct = result.subjectResults.length > 0
    ? result.subjectResults.reduce((s, x) => s + x.percentage, 0) / result.subjectResults.length
    : 0;
  const balanceSpread = sortedByPct.length >= 2
    ? sortedByPct[0].percentage - sortedByPct[sortedByPct.length - 1].percentage
    : 0;

  // Nombre corto para greeting
  const firstName = (result.student.fullName || '').trim().split(/\s+/)[0] || 'estudiante';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ============ 1. HERO DEL SCORE ============ */}
        <section className="relative min-h-[80vh] overflow-hidden aurora-bg andean-overlay rounded-3xl p-6 md:p-12 shadow-elevation-3 animate-fade-up">
          {/* Foto de graduación (solo para nivel Excelente) */}
          {isExcellent && (
            <img
              src={PHOTOS.graduation}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none rounded-3xl"
            />
          )}

          {/* Blobs decorativos */}
          <div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-brand-primary-600/20 blur-3xl animate-blob-morph animate-float-slow pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-brand-accent-500/20 blur-3xl animate-blob-morph animate-float-slow pointer-events-none"
            style={{ animationDelay: '1.2s' }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-brand-primary-400/15 blur-3xl animate-blob-morph animate-float-slow pointer-events-none"
            style={{ animationDelay: '2.4s' }}
            aria-hidden="true"
          />

          {/* Ilustraciones educativas decorativas */}
          <img
            src="/illustrations/formulas.svg"
            alt=""
            aria-hidden="true"
            className="hidden md:block absolute inset-0 m-auto w-48 opacity-10 pointer-events-none"
          />
          {isExcellent && (
            <img
              src="/illustrations/graduation-cap.svg"
              alt=""
              aria-hidden="true"
              className="hidden md:block absolute top-6 right-10 w-40 opacity-25 animate-float-y drop-shadow-2xl pointer-events-none"
            />
          )}

          {isExcellent && confettiItems.map((c, i) => (
            <span
              key={i}
              className="absolute text-2xl pointer-events-none animate-confetti-burst"
              style={{ left: c.left, top: c.top, animationDelay: c.delay }}
              aria-hidden="true"
            >
              🎉
            </span>
          ))}

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Greeting */}
            <div className="chip bg-white/70 backdrop-blur text-brand-primary-800 border border-brand-primary-100 mb-6 animate-fade-up">
              <Sparkles className="w-4 h-4 text-brand-accent-500" />
              <span className="font-semibold">¡Hola, {firstName}!</span>
              <span aria-hidden="true">✨</span>
            </div>

            {/* Título dinámico */}
            <h1
              className={clsx(
                'font-display text-5xl md:text-7xl font-black tracking-tightest mb-2 animate-fade-up delay-100',
                heroTitleClass
              )}
            >
              {heroTitle}
            </h1>
            <p className="text-slate-600 max-w-xl mb-8 animate-fade-up delay-200">
              {performanceInfo.message}
            </p>

            {/* Anillo circular */}
            <div className="relative mb-8 animate-fade-up delay-300">
              {isExcellent && (
                <div
                  className="absolute inset-[-20px] rounded-full bg-brand-accent-500/20 animate-score-pulse blur-xl pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Badge nuevo récord */}
              {isNewRecord && (
                <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 z-20 animate-bounce-in">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent-500 text-white shadow-elevation-3 font-bold text-sm">
                    <Star className="w-4 h-4 fill-white" />
                    ¡Nuevo récord!
                  </div>
                </div>
              )}

              <div className="relative w-[220px] h-[220px] md:w-[280px] md:h-[280px]">
                <svg
                  viewBox="0 0 280 280"
                  className="w-full h-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="140"
                    cy="140"
                    r={ringRadius}
                    stroke="#e2e8f0"
                    strokeWidth={14}
                    fill="none"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r={ringRadius}
                    stroke={ringStroke}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </svg>

                {/* Centro */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-6xl md:text-8xl font-black tabular-nums text-slate-900 animate-number-roll leading-none">
                    {formatNumber(result.totalScore, 0)}
                  </span>
                  <span className="mt-2 text-slate-500 text-[10px] md:text-sm uppercase tracking-widest font-semibold">
                    de {formatNumber(result.maxScore, 0)} puntos
                  </span>
                </div>
              </div>
            </div>

            {/* Métricas inline */}
            <div className="grid grid-cols-3 gap-6 md:gap-12 w-full max-w-2xl mb-8 animate-fade-up delay-400">
              <div className="flex flex-col items-center">
                <span className="font-display text-3xl md:text-4xl font-black text-slate-900 tabular-nums">
                  {result.percentage.toFixed(0)}%
                </span>
                <span className="mt-1 text-[10px] md:text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Precisión
                </span>
              </div>
              <div className="flex flex-col items-center border-x border-slate-200">
                <span className="font-display text-3xl md:text-4xl font-black text-slate-900 tabular-nums">
                  {totalCorrect}<span className="text-slate-400">/{totalQuestions}</span>
                </span>
                <span className="mt-1 text-[10px] md:text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Correctas
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-display text-3xl md:text-4xl font-black text-slate-900 tabular-nums font-mono">
                  {timeMM}:{timeSS}
                </span>
                <span className="mt-1 text-[10px] md:text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Tiempo
                </span>
              </div>
            </div>

            {/* Barra progreso siguiente nivel */}
            <div className="w-full max-w-md animate-fade-up delay-500">
              <div className="flex items-center justify-between mb-2 text-xs font-semibold text-slate-600">
                <span>{nextThresholdLabel}</span>
                <span className="font-mono">{Math.round(percentToNext)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-primary-600 via-brand-primary-500 to-brand-accent-500 transition-all duration-[1500ms]"
                  style={{ width: `${percentToNext}%` }}
                />
              </div>

              {dropVsPrevious !== null && dropVsPrevious < 0 && !isNewRecord && (
                <div className="mt-4 inline-flex items-center gap-1.5 chip bg-slate-100 text-slate-600 border border-slate-200">
                  <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                  Bajaste {formatNumber(Math.abs(dropVsPrevious), 0)} pts vs último intento
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ============ DATOS DEL EXAMEN ============ */}
        <section className="card-elevated p-6 animate-fade-up">
          <h2 className="font-display text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-primary-600" />
            Datos del examen
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-slate-600">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <span>DNI: <strong className="text-slate-800">{result.student.dni}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <User className="w-5 h-5 text-slate-400" />
              <span className="truncate">Nombre: <strong className="text-slate-800">{result.student.fullName}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <BookOpen className="w-5 h-5 text-slate-400" />
              <span>Área: <strong className="text-slate-800">{result.student.area}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-sm">{formatDate(result.date)}</span>
            </div>
          </div>
        </section>

        {/* ============ 2. TABS ============ */}
        <div className="flex justify-center animate-fade-up">
          <div className="flex gap-1 p-1.5 rounded-2xl bg-slate-100 w-fit overflow-x-auto max-w-full">
            {([
              { id: 'review', label: 'Revisión', Icon: Grid3X3 },
              { id: 'chart', label: 'Gráfico', Icon: BarChart3 },
              { id: 'details', label: 'Detalle', Icon: Table2 },
              { id: 'history', label: 'Historial', Icon: History }
            ] as const).map(t => {
              const Icon = t.Icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition whitespace-nowrap',
                    active
                      ? 'bg-white shadow-elevation-2 text-brand-primary-800'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ 3. TAB REVISIÓN ============ */}
        {activeTab === 'review' && (
          <section className="card-elevated p-6 animate-fade-up">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-brand-primary-600" />
                Revisión de preguntas
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Toca cualquier pregunta para ver el detalle.
              </p>
            </div>

            {/* Leyenda con conteos */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Correctas <span className="font-bold font-mono">{totalCorrect}</span>
              </div>
              <div className="chip bg-red-50 text-red-700 border border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Incorrectas <span className="font-bold font-mono">{incorrectAnswered}</span>
              </div>
              <div className="chip bg-slate-100 text-slate-600 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                Sin responder <span className="font-bold font-mono">{notAnswered}</span>
              </div>
            </div>

            {/* Grid de preguntas */}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {questions.map((q, idx) => {
                const a = answerMap.get(q.id);
                const isCorrect = a?.isCorrect;
                const isUnanswered = a?.selectedOption === null || a?.selectedOption === undefined;
                const isActive = reviewIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setReviewIndex(idx)}
                    className={clsx(
                      'aspect-square rounded-xl text-xs font-bold transition-all hover:scale-110 shadow-elevation-1',
                      isActive && 'ring-2 ring-offset-2 ring-brand-primary-500 scale-110 z-10',
                      isUnanswered
                        ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        : isCorrect
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-red-500 text-white hover:bg-red-600'
                    )}
                    title={q.subject}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Panel lateral de pregunta */}
            {currentQuestion && (
              <div
                key={reviewIndex}
                className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-elevation-2 p-6 animate-slide-in-right"
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-display text-lg font-bold text-slate-800">
                    Pregunta {(reviewIndex ?? 0) + 1} de {questions.length}
                  </h3>
                  <span className="chip bg-brand-primary-50 text-brand-primary-700 border border-brand-primary-100">
                    {currentQuestion.subject}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-slate-800 leading-relaxed">
                    <span className="font-semibold text-brand-primary-600">P{(reviewIndex ?? 0) + 1}.</span>{' '}
                    <span dangerouslySetInnerHTML={{ __html: renderFormattedText(currentQuestion.questionText) }} />
                  </p>
                </div>

                {currentQuestion.sourceFile && (
                  <div className="mb-4 text-right">
                    <span className="text-xs italic text-slate-400 font-light">
                      Fuente: {currentQuestion.sourceFile}
                    </span>
                  </div>
                )}

                {currentQuestion.imageLink && (
                  <div className="mb-4">
                    <img
                      src={currentQuestion.imageLink}
                      alt="Imagen de la pregunta"
                      className="max-w-full h-auto rounded-lg border border-slate-200 mx-auto"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = currentAnswer?.selectedOption === index;
                    const isCorrectAnswer = currentQuestion.correctAnswer === index;

                    let optionStyle = 'border-slate-200 bg-white';
                    if (isCorrectAnswer) {
                      optionStyle = 'border-emerald-500 bg-emerald-50';
                    } else if (isSelected && !isCorrectAnswer) {
                      optionStyle = 'border-red-500 bg-red-50';
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
                              ? 'bg-emerald-500 text-white'
                              : isSelected
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-200 text-slate-600'
                          )}
                        >
                          {isCorrectAnswer ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            indexToLetter(index)
                          )}
                        </div>
                        <span
                          className={clsx(
                            'flex-1 pt-1 text-sm',
                            isCorrectAnswer
                              ? 'text-emerald-700 font-medium'
                              : isSelected
                                ? 'text-red-700'
                                : 'text-slate-600'
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
                      : 'bg-red-100 text-red-800'
                  )}
                >
                  {currentAnswer?.isCorrect ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Respuesta correcta (+{currentQuestion.points.toFixed(2)} pts)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {currentAnswer?.selectedOption === null
                          ? 'Sin responder'
                          : `Incorrecta — La correcta es: ${indexToLetter(currentQuestion.correctAnswer)}`}
                      </span>
                    </>
                  )}
                </div>

                {currentQuestion.justification && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowJustification(!showJustification)}
                      className="flex items-center gap-2 text-brand-primary-600 hover:text-brand-primary-700 text-sm font-semibold transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {showJustification ? 'Ocultar justificación' : 'Ver justificación'}
                    </button>

                    {showJustification && (
                      <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fade-up">
                        <p className="text-amber-800 text-sm font-semibold mb-1">Justificación:</p>
                        <p className="text-amber-700 text-sm leading-relaxed">
                          {currentQuestion.justification}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setReviewIndex(Math.max(0, (reviewIndex ?? 0) - 1))}
                    disabled={reviewIndex === 0}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all',
                      reviewIndex === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setReviewIndex(Math.min(questions.length - 1, (reviewIndex ?? 0) + 1))}
                    disabled={reviewIndex === questions.length - 1}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all',
                      reviewIndex === questions.length - 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'btn-primary-brand'
                    )}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============ 4. TAB GRÁFICO ============ */}
        {activeTab === 'chart' && (
          <section className="space-y-6 animate-fade-up">
            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-brand-accent-500/15 text-brand-accent-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Mejor asignatura</span>
                </div>
                <p className="font-display text-lg font-black text-slate-900 truncate">{bestSubject?.name ?? '—'}</p>
                <p className="text-sm text-brand-accent-600 font-mono font-bold">
                  {bestSubject ? `${bestSubject.percentage.toFixed(1)}%` : '—'}
                </p>
              </div>

              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">A reforzar</span>
                </div>
                <p className="font-display text-lg font-black text-slate-900 truncate">{worstSubject?.name ?? '—'}</p>
                <p className="text-sm text-red-600 font-mono font-bold">
                  {worstSubject ? `${worstSubject.percentage.toFixed(1)}%` : '—'}
                </p>
              </div>

              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-brand-primary-100 text-brand-primary-700 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Balance</span>
                </div>
                <p className="font-display text-lg font-black text-slate-900">
                  {balanceSpread.toFixed(0)} pts de diferencia
                </p>
                <p className="text-sm text-slate-500 font-mono">Promedio <span className="font-bold">{avgPct.toFixed(1)}%</span></p>
              </div>
            </div>

            {/* Chart card */}
            <div className="card-elevated p-6 relative overflow-hidden">
              <img
                src="/illustrations/compass-geometry.svg"
                alt=""
                aria-hidden="true"
                className="hidden md:block absolute top-3 right-3 w-20 opacity-20 pointer-events-none"
              />
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-primary-600" />
                  Rendimiento por asignatura
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {chartData.length} cursos — identifica fortalezas y vacíos.
                </p>
              </div>

              <div style={{ height: Math.max(400, chartData.length * 45 + 40) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 40, left: 120, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="barGradientHigh" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={BRAND_ACCENT} stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="barGradientLow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.75} />
                        <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#475569"
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                      width={115}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0, 61, 122, 0.04)' }}
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const data = payload[0].payload as ChartDataItem;
                        return (
                          <div className="glass rounded-xl px-4 py-3 shadow-elevation-3 border border-white/40">
                            <p className="font-display font-bold text-slate-800 mb-1">{data.fullName}</p>
                            <p className="font-mono text-sm">
                              <span className="font-bold text-brand-primary-700">
                                {data.percentage.toFixed(1)}%
                              </span>
                              <span className="text-slate-500"> · {data.correct}/{data.total}</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="percentage"
                      radius={[0, 8, 8, 0]}
                      barSize={24}
                      background={{ fill: '#F1F5F9', radius: 8 }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.percentage >= 60 ? 'url(#barGradientHigh)' : 'url(#barGradientLow)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asignaturas a reforzar */}
            {(() => {
              const weakSubjects = result.subjectResults.filter(s => s.percentage < 60);
              if (weakSubjects.length === 0) return null;
              return (
                <div className="card-elevated p-6">
                  <h4 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-brand-accent-500" />
                    Asignaturas a reforzar
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {weakSubjects.map(s => (
                      <div
                        key={s.name}
                        className="card-interactive border-l-4 border-brand-accent-500 p-4 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-bold text-slate-800 truncate">{s.name}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {s.correctAnswers}/{s.totalQuestions} · {s.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/banqueo-tema')}
                          className="shine-hover inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary-800 px-3 py-2 rounded-lg bg-brand-accent-500/15 hover:bg-brand-accent-500/25 active:scale-95 transition whitespace-nowrap"
                        >
                          Practicar
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ============ 5. TAB DETALLE (cards apiladas) ============ */}
        {activeTab === 'details' && (
          <section className="card-elevated p-6 animate-fade-up relative overflow-hidden">
            <img
              src="/illustrations/exam-paper.svg"
              alt=""
              aria-hidden="true"
              className="hidden md:block absolute right-4 top-4 w-24 opacity-15 pointer-events-none"
            />
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <Table2 className="w-5 h-5 text-brand-primary-600" />
                Detalle por asignatura
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Toca cada tarjeta para ver más información.
              </p>
            </div>

            <div className="space-y-2">
              {result.subjectResults.map((subject, index) => {
                const isOpen = expandedDetail === index;
                const subjectQuestions = questions.filter(q => q.subject === subject.name);

                const chipClass = subject.percentage >= 80
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : subject.percentage >= 60
                    ? 'bg-brand-primary-50 text-brand-primary-700 border-brand-primary-100'
                    : subject.percentage >= 40
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-red-100 text-red-700 border-red-200';

                const circleClass = subject.percentage >= 60
                  ? 'bg-emerald-500 text-white'
                  : subject.percentage >= 40
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white';

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-300 hover:shadow-elevation-2"
                  >
                    <button
                      onClick={() => setExpandedDetail(isOpen ? null : index)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm', circleClass)}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-slate-800 truncate">{subject.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {subject.correctAnswers}/{subject.totalQuestions} · {formatNumber(subject.pointsObtained)} pts
                        </div>
                      </div>
                      <span className={clsx('chip border', chipClass)}>
                        {subject.percentage.toFixed(1)}%
                      </span>
                      <ChevronDown
                        className={clsx(
                          'w-5 h-5 text-slate-400 transition-transform duration-300',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    <div
                      className={clsx(
                        'transition-all duration-300 overflow-hidden',
                        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Correctas</div>
                            <div className="font-display font-black text-lg text-emerald-600 font-mono">{subject.correctAnswers}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total</div>
                            <div className="font-display font-black text-lg text-slate-800 font-mono">{subject.totalQuestions}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Puntos</div>
                            <div className="font-display font-black text-lg text-brand-primary-700 font-mono">
                              {formatNumber(subject.pointsObtained, 0)}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Preguntas ({subjectQuestions.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subjectQuestions.map(q => {
                            const globalIdx = questions.indexOf(q);
                            const ans = answerMap.get(q.id);
                            const isUn = ans?.selectedOption === null || ans?.selectedOption === undefined;
                            return (
                              <button
                                key={q.id}
                                onClick={() => { setActiveTab('review'); setReviewIndex(globalIdx); }}
                                className={clsx(
                                  'w-8 h-8 rounded-lg text-xs font-bold transition hover:scale-110',
                                  isUn
                                    ? 'bg-slate-200 text-slate-600'
                                    : ans?.isCorrect
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-red-500 text-white'
                                )}
                              >
                                {globalIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="rounded-2xl bg-gradient-to-r from-brand-primary-700 to-brand-primary-900 text-white p-4 flex items-center gap-3 mt-4 shadow-elevation-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-accent-500 text-brand-primary-900 flex items-center justify-center font-display font-black">
                  Σ
                </div>
                <div className="flex-1">
                  <div className="font-display font-black uppercase tracking-wider text-sm">Total</div>
                  <div className="text-xs text-white/90 font-mono">
                    {totalCorrect}/{totalQuestions} · {formatNumber(result.totalScore, 0)} pts
                  </div>
                </div>
                <span className="chip bg-brand-accent-500 text-brand-primary-900 border-brand-accent-400 font-black">
                  {result.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ============ 6. TAB HISTORIAL ============ */}
        {activeTab === 'history' && (
          <section className="card-elevated p-6 animate-fade-up">
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-brand-primary-600" />
                Tu historial de simulacros
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Visualiza tu progreso a lo largo del tiempo.
              </p>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-brand-primary-200 border-t-brand-primary-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Cargando historial...</p>
              </div>
            ) : userHistory && userHistory.history.length > 0 ? (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="card-elevated p-6 text-center">
                    <Award className="w-7 h-7 text-brand-primary-600 mx-auto mb-3" />
                    <p className="font-display font-black text-4xl text-slate-900 font-mono tabular-nums">
                      {userHistory.totalIntentos}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                      Simulacros
                    </p>
                  </div>
                  <div className="card-elevated p-6 text-center bg-gradient-to-br from-white to-brand-accent-500/5 border-brand-accent-500/30">
                    <Trophy className="w-7 h-7 text-brand-accent-600 mx-auto mb-3" />
                    <p className="inline-block font-display font-black text-4xl text-brand-accent-600 font-mono tabular-nums gradient-text-gold">
                      {formatNumber(userHistory.mejorPuntaje, 0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                      Mejor puntaje
                    </p>
                  </div>
                  <div className="card-elevated p-6 text-center">
                    <TrendingUp className="w-7 h-7 text-brand-primary-600 mx-auto mb-3" />
                    <p className={clsx(
                      'font-display font-black text-4xl font-mono tabular-nums',
                      userHistory.history.length >= 2 && userHistory.history[0].puntaje - userHistory.history[1].puntaje >= 0
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    )}>
                      {userHistory.history.length >= 2
                        ? (userHistory.history[0].puntaje - userHistory.history[1].puntaje > 0 ? '+' : '')
                          + formatNumber(userHistory.history[0].puntaje - userHistory.history[1].puntaje, 0)
                        : '—'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                      vs anterior
                    </p>
                  </div>
                </div>

                {/* LineChart */}
                {userHistory.history.length >= 2 && (
                  <div className="mb-8">
                    <h3 className="font-display text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Evolución de tus puntajes
                    </h3>
                    <div style={{ height: 260 }} className="w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...userHistory.history].reverse().map((h, idx) => ({
                            intento: `#${idx + 1}`,
                            puntaje: h.puntaje,
                            porcentaje: h.porcentaje,
                            isBest: h.puntaje === userHistory.mejorPuntaje,
                            isLatest: idx === userHistory.history.length - 1
                          }))}
                          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" />
                          <XAxis dataKey="intento" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ stroke: BRAND_PRIMARY, strokeWidth: 1, strokeDasharray: '4 4' }}
                            content={({ payload }) => {
                              if (!payload || payload.length === 0) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="glass rounded-xl px-4 py-3 shadow-elevation-3 border border-white/40">
                                  <p className="font-display font-bold text-slate-800">{data.intento}</p>
                                  <p className="font-mono text-brand-primary-700 font-bold">
                                    {formatNumber(data.puntaje, 0)} pts
                                  </p>
                                  <p className="font-mono text-slate-500 text-xs">{data.porcentaje}% correctas</p>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="puntaje"
                            stroke={BRAND_PRIMARY}
                            strokeWidth={3}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            dot={((props: any) => {
                              const { cx, cy, payload, index } = props;
                              if (cx === undefined || cy === undefined || !payload) {
                                return <g key={`dot-empty-${index ?? 0}`} />;
                              }
                              const fill = payload.isBest ? BRAND_ACCENT : payload.isLatest ? BRAND_PRIMARY : '#fff';
                              const stroke = payload.isBest ? BRAND_ACCENT : BRAND_PRIMARY;
                              const r = payload.isBest || payload.isLatest ? 7 : 5;
                              return (
                                <circle
                                  key={`dot-${index ?? 0}`}
                                  cx={cx}
                                  cy={cy}
                                  r={r}
                                  fill={fill}
                                  stroke={stroke}
                                  strokeWidth={2}
                                />
                              );
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            }) as any}
                            activeDot={{ r: 9, fill: BRAND_ACCENT, stroke: BRAND_PRIMARY, strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
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
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : pct >= 60
                        ? 'bg-brand-primary-50 text-brand-primary-700 border-brand-primary-100'
                        : pct >= 40
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-red-100 text-red-700 border-red-200';

                    return (
                      <div
                        key={index}
                        className={clsx(
                          'rounded-xl border p-3 flex items-center gap-3 transition',
                          isLatest
                            ? 'border-brand-primary-200 bg-brand-primary-50/40'
                            : 'border-slate-200 bg-white hover:shadow-elevation-2'
                        )}
                      >
                        <div className={clsx(
                          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm',
                          isBest ? 'bg-brand-accent-500 text-brand-primary-900' : 'bg-slate-100 text-slate-600'
                        )}>
                          {isBest ? <Trophy className="w-5 h-5" /> : userHistory.totalIntentos - index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-slate-800">
                              {formatRelativeDate(entry.fecha)}
                            </span>
                            {isLatest && (
                              <span className="chip bg-brand-primary-600 text-white text-[10px] px-2 py-0.5">
                                Actual
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="chip bg-slate-100 text-slate-600 border-slate-200 text-[11px] py-0.5">
                              {entry.area}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {entry.correctas}/{entry.total}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-black text-lg text-slate-900 font-mono tabular-nums">
                            {formatNumber(entry.puntaje, 0)}
                          </div>
                          <span className={clsx('chip border text-[10px] py-0.5', pctChipClass)}>
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
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold">Este es tu primer simulacro</p>
                <p className="text-sm text-slate-400 mt-1">
                  Vuelve a practicar para ver tu progreso aquí.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ============ 7. CTA FINAL ============ */}
        <section className="relative rounded-3xl overflow-hidden bg-[#003D7A] bg-mesh-brand animate-gradient shadow-elevation-4 animate-fade-up">
          <img
            src={PHOTOS.library}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
          <img
            src="/illustrations/lightbulb-idea.svg"
            alt=""
            aria-hidden="true"
            className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 w-48 opacity-25 drop-shadow-xl pointer-events-none"
          />
          <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 text-white">
            <div className="flex-1">
              <div className="chip bg-white/15 text-white border border-white/20 mb-3 backdrop-blur">
                <Sparkles className="w-4 h-4 text-brand-accent-300" />
                ¿Qué sigue?
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-black tracking-tighter mb-2">
                Practica tus puntos débiles
              </h3>
              <p className="text-white/90 max-w-md">
                Refuerza las asignaturas donde bajaste puntos en Banqueo por Tema.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate('/banqueo-tema')}
                className="btn-accent-gold shine-hover inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap"
              >
                Practicar puntos débiles
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                <div className="flex-1 [&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border [&_button]:!border-white/30 [&_button]:hover:!bg-white/20 [&_button]:!rounded-xl [&_button]:!px-4 [&_button]:!py-3 [&_button]:!font-semibold [&_button]:!backdrop-blur">
                  <PDFGenerator result={result} />
                </div>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur transition whitespace-nowrap"
                  title="Nuevo simulacro"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-slate-400 text-sm font-display">
          SimulaUNA · Universidad Nacional del Altiplano
        </p>
      </div>
    </div>
  );
}
