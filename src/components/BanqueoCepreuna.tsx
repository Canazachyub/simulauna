import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CreditCard, Mail, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Lock, CheckCircle, XCircle,
  RotateCcw, Home, Lightbulb, Clock, FileText, Tag, Send,
  Sparkles, Trophy, Target, Calendar, Layers, BookMarked, LogOut, Zap
} from 'lucide-react';
import {
  checkBanqueoAccess,
  getCepreQuestions,
  CEPRE_COURSES_BY_AREA,
  CEPRE_SEMANAS,
  type CepreQuestion,
  type CepreAreaCode
} from '../services/api';
import { validateDNI } from '../utils/calculations';
import { renderFormattedText, parseJustification } from '../utils/formatText';
import { useAuth } from '../context/AuthContext';
import { CourseSelector, type CourseOption } from './CourseSelector';
import clsx from 'clsx';

type BanqueoStep = 'login' | 'mode' | 'select' | 'quiz' | 'results';
type BanqueoMode = 'cuadernillo' | 'general';
type QuestionCount = 10 | 15 | 20;

interface BanqueoAnswer {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  answeredAt: number;
}

const AREA_LABELS: Record<'ING' | 'BIO' | 'SOC', string> = {
  'ING': 'Ingenierías',
  'BIO': 'Biomédicas',
  'SOC': 'Sociales'
};

export function BanqueoCepreuna() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login: authLogin, logout: authLogout } = useAuth();

  // Step state
  const [step, setStep] = useState<BanqueoStep>(isAuthenticated ? 'mode' : 'login');
  const [mode, setMode] = useState<BanqueoMode>('cuadernillo');

  // Login form (prefill from auth context if available)
  const [dni, setDni] = useState(user?.dni ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Course selection
  const [selectedArea, setSelectedArea] = useState<'ING' | 'BIO' | 'SOC'>('ING');
  const [selectedSemana, setSelectedSemana] = useState<string>('S1');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  // Quiz state
  const [questions, setQuestions] = useState<CepreQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, BanqueoAnswer>>(new Map());
  const [results, setResults] = useState<BanqueoAnswer[]>([]);

  // Timer state
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // UI state
  const [showAllAnsweredModal, setShowAllAnsweredModal] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (step === 'quiz' && startTime > 0) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, startTime]);

  // Check if all questions are answered
  const allAnswered = questions.length > 0 && answers.size === questions.length;

  // Show modal when all answered
  useEffect(() => {
    if (allAnswered && step === 'quiz' && !showAllAnsweredModal) {
      setShowAllAnsweredModal(true);
    }
  }, [allAnswered, step, showAllAnsweredModal]);

  // Update available courses when area changes
  useEffect(() => {
    setSelectedCourse('');
  }, [selectedArea]);

  // Validations
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get available courses for selected area
  const getAvailableCourses = () => {
    return CEPRE_COURSES_BY_AREA[selectedArea] || [];
  };

  // Login handler
  const handleLogin = async () => {
    setLoginError('');

    if (!dni.trim() || !validateDNI(dni)) {
      setLoginError('Ingresa un DNI válido (8 dígitos)');
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setLoginError('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);

    try {
      const result = await checkBanqueoAccess(dni.trim(), email.trim().toLowerCase());

      if (!result.canAccess) {
        setLoginError(result.reason);
        setIsLoading(false);
        return;
      }

      authLogin(dni.trim(), email.trim().toLowerCase());
      setStep('mode');
    } catch (error) {
      setLoginError('Error de conexión. Intenta de nuevo.');
    }

    setIsLoading(false);
  };

  // Logout handler
  const handleLogout = () => {
    authLogout();
    setDni('');
    setEmail('');
    setSelectedCourse('');
    setQuestions([]);
    setAnswers(new Map());
    setResults([]);
    setStartTime(0);
    setElapsedTime(0);
    setShowAllAnsweredModal(false);
    setLoginError('');
    setStep('login');
  };

  // Start quiz handler
  const handleStartQuiz = async () => {
    if (!selectedCourse) return;

    setIsLoading(true);
    setLoginError('');

    try {
      let result;
      if (mode === 'cuadernillo') {
        // Modo cuadernillo: area + semana + course (sin count - trae TODAS)
        result = await getCepreQuestions(selectedCourse, selectedArea, selectedSemana);
      } else {
        // Modo general: course + ALL areas + count
        result = await getCepreQuestions(selectedCourse, 'ALL', undefined, questionCount);
      }

      if (result.error) {
        setLoginError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.questions.length === 0) {
        setLoginError('No hay preguntas disponibles con los filtros seleccionados.');
        setIsLoading(false);
        return;
      }

      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers(new Map());
      setResults([]);
      setStartTime(Date.now());
      setElapsedTime(0);
      setShowAllAnsweredModal(false);
      setStep('quiz');
    } catch (error) {
      setLoginError('Error al cargar preguntas. Intenta de nuevo.');
    }

    setIsLoading(false);
  };

  // Answer handler
  const handleAnswer = (optionIndex: number) => {
    const question = questions[currentIndex];
    const isCorrect = optionIndex === question.correctAnswer;

    const newAnswers = new Map(answers);
    newAnswers.set(question.id, {
      questionId: question.id,
      selectedOption: optionIndex,
      isCorrect,
      answeredAt: Date.now()
    });
    setAnswers(newAnswers);
  };

  // Finish quiz handler
  const handleFinishQuiz = () => {
    const quizResults: BanqueoAnswer[] = questions.map(q => {
      const answer = answers.get(q.id);
      return answer || {
        questionId: q.id,
        selectedOption: null,
        isCorrect: false,
        answeredAt: 0
      };
    });

    setResults(quizResults);
    setShowAllAnsweredModal(false);
    setStep('results');
  };

  // Reset handler
  const handleReset = () => {
    setSelectedCourse('');
    setQuestionCount(10);
    setQuestions([]);
    setAnswers(new Map());
    setResults([]);
    setStartTime(0);
    setElapsedTime(0);
    setShowAllAnsweredModal(false);
    setStep('mode');
  };

  // Current question data
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
  const answeredCount = answers.size;
  const correctCount = results.filter(r => r.isCorrect).length;

  // Get option class
  const getOptionClass = (optionIndex: number, isAnswered: boolean, selectedOption: number | null, correctAnswer: number) => {
    if (!isAnswered) {
      return 'border-slate-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer';
    }

    const isSelected = selectedOption === optionIndex;
    const isCorrectOption = correctAnswer === optionIndex;

    if (isCorrectOption) {
      return 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20';
    }
    if (isSelected && !isCorrectOption) {
      return 'border-red-500 bg-red-50 ring-2 ring-red-500/20';
    }
    return 'border-slate-200 bg-slate-50 opacity-60';
  };

  // Render login step
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-andean-white relative overflow-hidden py-12 px-4 flex items-center">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-mesh-gold opacity-40 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block" aria-hidden />

        {/* Ilustraciones educativas decorativas */}
        <img
          src="/illustrations/books-stack.svg"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute top-12 left-6 w-36 opacity-25 animate-float-slow pointer-events-none"
        />
        <img
          src="/illustrations/atom.svg"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute bottom-16 right-8 w-28 opacity-20 animate-spin-slow pointer-events-none"
        />

        <div className="max-w-md mx-auto w-full relative z-10">
          <div className="glass rounded-3xl p-8 animate-fade-up shadow-elevation-3 border border-white/40 corner-accent relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-mesh-gold rounded-3xl mb-5 shadow-elevation-2 animate-bounce-in animate-pulse-ring">
                <BookMarked className="w-10 h-10 text-slate-900" />
              </div>
              <span className="chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 mb-3 px-3 py-1">
                <img
                  src="/illustrations/graduation-cap.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-6 h-6 inline-block pointer-events-none"
                />
                <Sparkles className="w-3 h-3" />
                CEPREUNA
              </span>
              <h1 className="inline-block font-display text-4xl font-black text-brand-accent-600 gradient-text-gold leading-tight mb-2">
                Banqueo CEPREUNA
              </h1>
              <p className="font-sans text-slate-600">
                Practica con preguntas de los cuadernillos CEPREUNA por semana
              </p>
            </div>

            {isAuthenticated && user?.dni && (
              <div className="bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-200 flex items-center gap-3 animate-fade-up">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-800 text-sm font-sans flex-1">
                  Continúas como DNI <strong className="font-mono">{user.dni}</strong>
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
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
              <button onClick={() => navigate('/')} className="btn-secondary flex-1">
                <ChevronLeft className="w-5 h-5" />
                Volver
              </button>
              <button
                onClick={handleLogin}
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

  // Render mode selection step
  if (step === 'mode') {
    return (
      <div className="min-h-screen bg-andean-white relative py-12 px-4">
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="card p-8 animate-fade-in shadow-xl">
            <div className="flex justify-end mb-2">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              )}
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl mb-4 shadow-lg">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Elige el modo de práctica
              </h1>
              <p className="text-slate-600">
                ¿Cómo deseas practicar con las preguntas CEPREUNA?
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {/* Modo Cuadernillo */}
              <button
                onClick={() => { setMode('cuadernillo'); setStep('select'); }}
                className={clsx(
                  'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group',
                  'border-teal-200 hover:border-teal-500 hover:bg-teal-50'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Cuadernillo</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Practica con TODAS las preguntas de un cuadernillo específico (semana + área + curso).
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Área</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Semana</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Curso</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">~20-25 preguntas por cuadernillo</p>
              </button>

              {/* Modo General */}
              <button
                onClick={() => { setMode('general'); setStep('select'); }}
                className={clsx(
                  'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group',
                  'border-purple-200 hover:border-purple-500 hover:bg-purple-50'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Curso General</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Mezcla preguntas de las 3 áreas (ING + BIO + SOC) de un curso específico.
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Curso</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Cantidad</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Selecciona 10, 15 o 20 preguntas</p>
              </button>
            </div>

            <button onClick={() => navigate('/')} className="btn-secondary w-full">
              <Home className="w-5 h-5" />
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render selection step
  if (step === 'select') {
    const cuadernilloCourses: CourseOption[] = getAvailableCourses().map(c => ({ name: c }));
    const generalCourses: CourseOption[] = [...new Set(Object.values(CEPRE_COURSES_BY_AREA).flat())]
      .sort()
      .map(c => ({ name: c }));
    return (
      <div className="min-h-screen bg-andean-white relative overflow-hidden py-8 px-4 pb-32">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-mesh-gold opacity-30 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block" aria-hidden />

        {/* Ilustraciones educativas decorativas */}
        <img
          src="/illustrations/calculator.svg"
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute top-24 right-10 w-40 opacity-35 animate-float-y pointer-events-none"
        />
        <img
          src="/illustrations/atom.svg"
          alt=""
          aria-hidden="true"
          className="hidden lg:block absolute bottom-32 left-8 w-32 opacity-20 animate-spin-slow pointer-events-none"
        />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-fade-up">
            <nav className="flex items-center gap-1 text-sm text-slate-500 font-sans">
              <button onClick={() => navigate('/')} className="hover:text-brand-primary-600 transition-colors">
                Inicio
              </button>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => setStep('mode')} className="hover:text-brand-primary-600 transition-colors">
                Banqueo CEPREUNA
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-700 font-semibold">
                {mode === 'cuadernillo' ? 'Cuadernillo' : 'Curso General'}
              </span>
            </nav>
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="chip bg-white/70 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors font-sans"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            )}
          </div>

          {/* Hero */}
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 px-3 py-1">
                <img
                  src="/illustrations/graduation-cap.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-6 h-6 inline-block pointer-events-none"
                />
                <Sparkles className="w-3 h-3" />
                CEPREUNA
              </span>
              <span className="chip bg-white/70 text-brand-primary-700 text-[10px] font-mono">
                {mode === 'cuadernillo' ? <Calendar className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                {mode === 'cuadernillo' ? 'Modo Cuadernillo' : 'Modo Curso General'}
              </span>
            </div>
            <h1 className="inline-block font-display text-4xl md:text-5xl font-black text-brand-accent-600 gradient-text-gold leading-tight mb-3">
              Banqueo CEPREUNA
            </h1>
            <p className="font-sans text-lg text-slate-600 max-w-2xl">
              {mode === 'cuadernillo'
                ? 'Elige área, semana y curso. Carga el cuadernillo completo con todas sus preguntas.'
                : 'Elige tu curso. Mezcla preguntas de las 3 áreas (ING + BIO + SOC).'}
            </p>
          </div>

          {mode === 'cuadernillo' ? (
            <>
              {/* Area Selection */}
              <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-brand-primary-600" />
                  <h3 className="font-display text-lg font-bold text-slate-800">Área</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['ING', 'BIO', 'SOC'] as const).map(area => {
                    const active = selectedArea === area;
                    return (
                      <button
                        key={area}
                        onClick={() => setSelectedArea(area)}
                        className={clsx(
                          'p-4 rounded-2xl border-2 text-center transition-all',
                          active
                            ? 'border-brand-primary-500 bg-brand-primary-50 ring-4 ring-brand-primary-100 scale-[1.02] shadow-elevation-2'
                            : 'border-slate-200 bg-white hover:border-brand-primary-300 hover:bg-slate-50'
                        )}
                      >
                        <span className={clsx(
                          'font-display text-lg font-black block',
                          active ? 'text-brand-primary-700' : 'text-slate-800'
                        )}>
                          {area}
                        </span>
                        <span className="text-xs text-slate-500 font-sans">{AREA_LABELS[area]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Semana Grid S1-S16 */}
              <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-brand-accent-600" />
                  <h3 className="font-display text-lg font-bold text-slate-800">Semana</h3>
                  <span className="chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono ml-auto border border-brand-accent-300">
                    {selectedSemana}
                  </span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {CEPRE_SEMANAS.map(semana => {
                    const active = selectedSemana === semana;
                    return (
                      <button
                        key={semana}
                        onClick={() => setSelectedSemana(semana)}
                        className={clsx(
                          'aspect-square rounded-xl font-mono font-bold text-sm active:scale-95 transition',
                          active
                            ? 'bg-brand-accent text-slate-900 shadow-elevation-2 ring-2 ring-brand-accent-400/60 scale-[1.05]'
                            : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-brand-accent hover:bg-brand-accent-50/40'
                        )}
                      >
                        {semana}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Course */}
              <div className="mb-6 animate-fade-up" style={{ animationDelay: '240ms' }}>
                <CourseSelector
                  courses={cuadernilloCourses}
                  selected={selectedCourse || null}
                  onSelect={setSelectedCourse}
                />
              </div>

              <div className="bg-brand-accent-50 rounded-2xl p-4 mb-6 border border-brand-accent-200 animate-fade-up">
                <p className="text-brand-accent-900 text-sm flex items-center gap-2 font-sans">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  Se cargarán TODAS las preguntas del cuadernillo <strong className="font-mono">{selectedSemana}</strong> <strong className="font-mono">{selectedArea}</strong>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
                <CourseSelector
                  courses={generalCourses}
                  selected={selectedCourse || null}
                  onSelect={setSelectedCourse}
                />
              </div>

              <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-brand-accent-600" />
                  <h3 className="font-display text-lg font-bold text-slate-800">Cantidad de preguntas</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([10, 15, 20] as QuestionCount[]).map(count => {
                    const active = questionCount === count;
                    return (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(count)}
                        className={clsx(
                          'p-5 rounded-2xl border-2 text-center transition-all',
                          active
                            ? 'border-brand-primary-500 bg-brand-primary-50 ring-4 ring-brand-primary-100 scale-[1.02] shadow-elevation-2'
                            : 'border-slate-200 bg-white hover:border-brand-primary-300 hover:bg-slate-50'
                        )}
                      >
                        <span className={clsx(
                          'font-display text-3xl font-black block leading-none mb-1',
                          active ? 'text-brand-primary-700' : 'text-slate-800'
                        )}>
                          {count}
                        </span>
                        <span className="text-xs text-slate-500 font-sans">preguntas</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-brand-primary-50 rounded-2xl p-4 mb-6 border border-brand-primary-200 animate-fade-up">
                <p className="text-brand-primary-900 text-sm flex items-center gap-2 font-sans">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  Se mezclarán preguntas de ING + BIO + SOC aleatoriamente
                </p>
              </div>
            </>
          )}

          {loginError && (
            <div className="bg-red-50 rounded-2xl p-4 mb-6 flex items-start gap-3 border border-red-200 animate-fade-up">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm font-sans">{loginError}</p>
            </div>
          )}

          {/* CTA sticky */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-4 py-3 z-40 shadow-elevation-3">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <button
                onClick={() => setStep('mode')}
                className="btn-secondary hidden sm:inline-flex"
              >
                <ChevronLeft className="w-4 h-4" />
                Cambiar modo
              </button>
              <div className="flex-1 min-w-0 hidden sm:block">
                {selectedCourse ? (
                  <div className="text-sm truncate">
                    <span className="font-display font-bold text-slate-800">{selectedCourse}</span>
                    {mode === 'cuadernillo' && (
                      <span className="ml-2 chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono border border-brand-accent-300">
                        {selectedArea} · {selectedSemana}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 font-sans italic">Selecciona un curso</span>
                )}
              </div>
              <button
                onClick={handleStartQuiz}
                className="btn-accent-gold flex-1 sm:flex-none shine-hover"
                disabled={!selectedCourse || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    Comenzar
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

  // Render quiz step
  if (step === 'quiz' && currentQuestion) {
    const isAnswered = currentAnswer !== null && currentAnswer !== undefined;

    return (
      <div className="min-h-screen bg-andean-white relative py-4 px-4">
        <div className="max-w-3xl mx-auto relative z-10">
          {/* Header Editorial Andino */}
          <div className="card-elevated p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 chip bg-brand-accent text-slate-900 text-[10px] font-mono font-bold border-2 border-brand-accent-700">
              CEPREUNA
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-1.5">
                  <span className="chip bg-brand-primary-50 text-brand-primary-700 text-[10px] font-mono">
                    <BookMarked className="w-3 h-3" />
                    {selectedCourse}
                  </span>
                  {mode === 'cuadernillo' && (
                    <>
                      <span className="chip bg-slate-100 text-slate-700 text-[10px] font-mono">
                        {AREA_LABELS[selectedArea]}
                      </span>
                      <span className="chip bg-brand-accent-50 text-brand-accent-800 text-[10px] font-mono">
                        <Calendar className="w-3 h-3" />
                        {selectedSemana}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-display font-bold text-slate-800 text-sm">
                  Pregunta {currentIndex + 1} de {questions.length}
                </h2>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Clock className="w-4 h-4 text-brand-primary-600" />
                <span className="font-mono text-base font-bold text-slate-800">
                  {formatTime(elapsedTime)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Respondidas</span>
                <p className="font-display font-bold text-base">
                  <span className="text-brand-primary-600">{answeredCount}</span>
                  <span className="text-slate-400">/{questions.length}</span>
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-mesh-brand transition-all duration-300"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="card p-6 mb-4 shadow-lg">
            {/* Metadata */}
            <div className="flex flex-wrap gap-2 mb-4">
              {currentQuestion.sourceFile && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <FileText className="w-3 h-3" />
                  {currentQuestion.sourceFile}
                </span>
              )}
              {currentQuestion.area && (
                <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                  {currentQuestion.area}
                </span>
              )}
              {currentQuestion.semana && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {currentQuestion.semana}
                </span>
              )}
              {currentQuestion.metadata?.tema && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  <Tag className="w-3 h-3" />
                  {currentQuestion.metadata.tema}
                </span>
              )}
            </div>

            {/* Question text */}
            <div
              className="text-lg text-slate-800 mb-6 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderFormattedText(currentQuestion.questionText) }}
            />

            {/* Image if exists */}
            {currentQuestion.imageLink && (
              <div className="mb-6 bg-slate-50 rounded-xl p-4">
                <img
                  src={currentQuestion.imageLink}
                  alt="Imagen de la pregunta"
                  className="max-w-full h-auto rounded-lg mx-auto shadow-md"
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = currentAnswer?.selectedOption === idx;
                const isCorrectOption = currentQuestion.correctAnswer === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => !isAnswered && handleAnswer(idx)}
                    disabled={isAnswered}
                    className={clsx(
                      'w-full p-4 rounded-xl border-2 text-left transition-all duration-300',
                      getOptionClass(idx, isAnswered, currentAnswer?.selectedOption ?? null, currentQuestion.correctAnswer)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={clsx(
                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                        isAnswered && isCorrectOption
                          ? 'bg-emerald-500 text-white'
                          : isAnswered && isSelected && !isCorrectOption
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span
                        className="flex-1"
                        dangerouslySetInnerHTML={{ __html: renderFormattedText(option) }}
                      />
                      {isAnswered && isCorrectOption && (
                        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrectOption && (
                        <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Immediate feedback */}
            {isAnswered && (
              <div className={clsx(
                'mt-6 p-4 rounded-xl animate-fade-in',
                currentAnswer.isCorrect
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {currentAnswer.isCorrect ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-700">¡Correcto!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-700">
                        Incorrecto - La respuesta correcta es: {String.fromCharCode(65 + currentQuestion.correctAnswer)}
                      </span>
                    </>
                  )}
                </div>

                {currentQuestion.justification && (() => {
                  const { text, images } = parseJustification(currentQuestion.justification);
                  return (
                    <div className="mt-3 p-3 bg-white/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-700 text-sm mb-1">Justificación:</p>
                          {text && (
                            <div
                              className="text-slate-600 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: renderFormattedText(text) }}
                            />
                          )}
                          {images.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {images.map((imgUrl, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={imgUrl}
                                  alt={`Imagen justificación ${imgIdx + 1}`}
                                  className="max-w-full h-auto rounded-lg shadow-md"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              className="btn-secondary flex-1"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="btn-primary flex-1"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleFinishQuiz}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                Ver Resultados
                <Trophy className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Question Navigator */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-lg">
            <p className="text-sm text-slate-500 mb-3 font-medium">Navegador de preguntas</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const answer = answers.get(q.id);
                const isCorrect = answer?.isCorrect;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={clsx(
                      'w-10 h-10 rounded-lg font-medium text-sm transition-all',
                      idx === currentIndex
                        ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300'
                        : answer
                        ? isCorrect
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                          : 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal: All questions answered */}
        {showAllAnsweredModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  ¡Completaste todas las preguntas!
                </h2>
                <p className="text-slate-600 mb-6">
                  Has respondido las {questions.length} preguntas. ¿Deseas ver tus resultados finales?
                </p>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {Array.from(answers.values()).filter(a => a.isCorrect).length}
                      </p>
                      <p className="text-xs text-slate-500">Correctas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">
                        {Array.from(answers.values()).filter(a => !a.isCorrect).length}
                      </p>
                      <p className="text-xs text-slate-500">Incorrectas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">
                        {formatTime(elapsedTime)}
                      </p>
                      <p className="text-xs text-slate-500">Tiempo</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAllAnsweredModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Revisar
                  </button>
                  <button
                    onClick={handleFinishQuiz}
                    className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    <Send className="w-5 h-5" />
                    Ver Resultados
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render results step
  if (step === 'results') {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const avgTimePerQuestion = elapsedTime / questions.length;

    return (
      <div className="min-h-screen bg-andean-white relative py-6 px-4">
        <div className="max-w-3xl mx-auto relative z-10">
          {/* Score Hero — Editorial */}
          <div className="card-elevated p-8 mb-6 text-center animate-fade-up bg-aurora andean-overlay relative overflow-hidden">
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono font-bold border border-brand-accent-300">
                CEPREUNA
              </span>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="chip bg-white/70 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-5 animate-bounce-in">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                <circle
                  cx="60" cy="60" r="52"
                  stroke="url(#cepre-grad)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(percentage / 100) * 326.72} 326.72`}
                />
                <defs>
                  <linearGradient id="cepre-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c2410c" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center">
                <p className="inline-block font-display text-4xl font-black text-brand-primary-800 gradient-text-brand leading-none">{percentage}%</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">Acierto</p>
              </div>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-black text-slate-900 mb-2">
              Cuadernillo completado
            </h1>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="chip bg-white/70 text-brand-primary-700 text-xs font-mono">
                {selectedCourse}
              </span>
              {mode === 'cuadernillo' && (
                <>
                  <span className="chip bg-white/70 text-slate-700 text-xs font-mono">
                    {AREA_LABELS[selectedArea]}
                  </span>
                  <span className="chip bg-brand-accent-100 text-brand-accent-900 text-xs font-mono border border-brand-accent-300">
                    {selectedSemana}
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-emerald-200 shadow-elevation-1">
                <p className="font-display text-3xl font-black text-emerald-600 leading-none">{correctCount}</p>
                <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 mt-1">Correctas</p>
              </div>
              <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-red-200 shadow-elevation-1">
                <p className="font-display text-3xl font-black text-red-500 leading-none">{questions.length - correctCount}</p>
                <p className="text-[11px] font-mono uppercase tracking-wider text-red-700 mt-1">Incorrectas</p>
              </div>
              <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-brand-primary-200 shadow-elevation-1">
                <p className="font-display text-3xl font-black text-brand-primary-600 leading-none">{questions.length}</p>
                <p className="text-[11px] font-mono uppercase tracking-wider text-brand-primary-700 mt-1">Total</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm font-sans">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>Tiempo: <strong className="font-mono">{formatTime(elapsedTime)}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Target className="w-4 h-4" />
                <span>Promedio: <strong className="font-mono">{Math.round(avgTimePerQuestion)}s</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={handleReset} className="btn-primary-brand shine-hover">
                <RotateCcw className="w-5 h-5" />
                Otra práctica
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary">
                <Home className="w-5 h-5" />
                Inicio
              </button>
            </div>
          </div>

          {/* Review Questions */}
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            Revisión de respuestas
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const result = results.find(r => r.questionId === q.id);
              const isCorrect = result?.isCorrect;
              const selectedIdx = result?.selectedOption;

              return (
                <div key={q.id} className="card p-6 shadow-md">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={clsx(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-red-100 text-red-600'
                    )}>
                      {isCorrect ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <XCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          Pregunta {idx + 1}
                        </span>
                        {q.area && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                            {q.area}
                          </span>
                        )}
                        {q.semana && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            {q.semana}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-slate-800"
                        dangerouslySetInnerHTML={{ __html: renderFormattedText(q.questionText) }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 ml-13">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedIdx === optIdx;
                      const isCorrectOption = q.correctAnswer === optIdx;

                      return (
                        <div
                          key={optIdx}
                          className={clsx(
                            'p-3 rounded-lg border-2 flex items-center gap-2',
                            isCorrectOption
                              ? 'bg-emerald-50 border-emerald-300'
                              : isSelected
                              ? 'bg-red-50 border-red-300'
                              : 'bg-slate-50 border-slate-200'
                          )}
                        >
                          <span className={clsx(
                            'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                            isCorrectOption
                              ? 'bg-emerald-500 text-white'
                              : isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          )}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span
                            className="flex-1"
                            dangerouslySetInnerHTML={{ __html: renderFormattedText(opt) }}
                          />
                          {isCorrectOption && (
                            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Correcta
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              Tu respuesta
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.justification && (() => {
                    const { text, images } = parseJustification(q.justification);
                    return (
                      <div className="mt-4 ml-13 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-amber-800 text-sm font-semibold mb-1">Justificación:</p>
                            {text && (
                              <div
                                className="text-amber-700 text-sm leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: renderFormattedText(text) }}
                              />
                            )}
                            {images.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {images.map((imgUrl, imgIdx) => (
                                  <img
                                    key={imgIdx}
                                    src={imgUrl}
                                    alt={`Imagen justificación ${imgIdx + 1}`}
                                    className="max-w-full h-auto rounded-lg shadow-md"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
