import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CreditCard, Mail, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Lock, CheckCircle, XCircle,
  RotateCcw, Home, Lightbulb, Clock, FileText, Tag, Send,
  Trophy, Target, Calendar, GraduationCap, Cpu, Heart, Scale,
  Award, Sparkles, Zap
} from 'lucide-react';
import {
  checkBanqueoAccess,
  getCepreSimulacro,
  type CepreQuestion,
  type AreaType
} from '../services/api';
import { validateDNI } from '../utils/calculations';
import { renderFormattedText, parseJustification } from '../utils/formatText';
import clsx from 'clsx';

type SimulacroStep = 'login' | 'select' | 'quiz' | 'results';

interface SimulacroAnswer {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  answeredAt: number;
}

// Semanas CEPREUNA
const CEPRE_SEMANAS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'];

const AREA_CONFIG: Record<AreaType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'Ingenierías': { label: 'Ingenierías', icon: Cpu, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'Biomédicas': { label: 'Biomédicas', icon: Heart, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  'Sociales': { label: 'Sociales', icon: Scale, color: 'text-amber-600', bgColor: 'bg-amber-100' }
};

export function SimulacroCepreuna() {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<SimulacroStep>('login');

  // Login form
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Exam selection
  const [selectedArea, setSelectedArea] = useState<AreaType>('Ingenierías');
  const [selectedSemana, setSelectedSemana] = useState<string>('');
  const [usarTodasSemanas, setUsarTodasSemanas] = useState(true);

  // Quiz state
  const [questions, setQuestions] = useState<CepreQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, SimulacroAnswer>>(new Map());
  const [results, setResults] = useState<SimulacroAnswer[]>([]);

  // Timer state
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // UI state
  const [showAllAnsweredModal, setShowAllAnsweredModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

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

      setStep('select');
    } catch (error) {
      setLoginError('Error de conexión. Intenta de nuevo.');
    }

    setIsLoading(false);
  };

  // Start exam handler
  const handleStartExam = async () => {
    setIsLoading(true);
    setLoginError('');

    try {
      const semanaParam = usarTodasSemanas ? undefined : selectedSemana;
      const result = await getCepreSimulacro(selectedArea, semanaParam);

      if (result.error) {
        setLoginError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.questions.length === 0) {
        setLoginError('No hay preguntas disponibles para esta configuración.');
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
      setShowFinishConfirm(false);
      setStep('quiz');
    } catch (error) {
      setLoginError('Error al cargar el examen. Intenta de nuevo.');
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

  // Finish exam handler
  const handleFinishExam = () => {
    const examResults: SimulacroAnswer[] = questions.map(q => {
      const answer = answers.get(q.id);
      return answer || {
        questionId: q.id,
        selectedOption: null,
        isCorrect: false,
        answeredAt: 0
      };
    });

    setResults(examResults);
    setShowAllAnsweredModal(false);
    setShowFinishConfirm(false);
    setStep('results');
  };

  // Reset handler
  const handleReset = () => {
    setSelectedSemana('');
    setUsarTodasSemanas(true);
    setQuestions([]);
    setAnswers(new Map());
    setResults([]);
    setStartTime(0);
    setElapsedTime(0);
    setShowAllAnsweredModal(false);
    setShowFinishConfirm(false);
    setStep('select');
  };

  // Current question data
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
  const answeredCount = answers.size;
  const correctCount = results.filter(r => r.isCorrect).length;

  // Calculate score (simplified - using equal points per question)
  const totalPoints = 3000; // Same as regular exam
  const pointsPerQuestion = questions.length > 0 ? totalPoints / questions.length : 0;
  const finalScore = correctCount * pointsPerQuestion;

  // Get option class
  const getOptionClass = (optionIndex: number, isAnswered: boolean, selectedOption: number | null, correctAnswer: number) => {
    if (!isAnswered) {
      return 'border-slate-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer';
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
      <div className="min-h-screen bg-[#001f3f] bg-mesh-deep paper-bg relative overflow-hidden py-12 px-4 flex items-center">
        <div className="andean-bold text-white/10 absolute inset-0 pointer-events-none" aria-hidden />
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-mesh-gold opacity-30 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block" aria-hidden />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-blob-brand opacity-25 animate-float-slow pointer-events-none" aria-hidden />

        <div className="max-w-md mx-auto w-full relative z-10">
          <div className="glass rounded-3xl p-8 animate-fade-up shadow-elevation-3 border border-white/40 corner-accent relative">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-mesh-gold rounded-3xl mb-5 shadow-elevation-2 animate-bounce-in animate-pulse-ring">
                <GraduationCap className="w-10 h-10 text-slate-900" />
              </div>
              <span className="chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 mb-3 px-3 py-1">
                <Award className="w-3 h-3" />
                Simulacro oficial
              </span>
              <h1 className="inline-block font-display text-4xl md:text-5xl font-black text-brand-accent-400 gradient-text-gold leading-tight mb-2">
                Simulacro CEPREUNA
              </h1>
              <p className="font-sans text-slate-600">
                Examen completo de 60 preguntas · 3h · preguntas de los cuadernillos CEPREUNA
              </p>
            </div>

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
                className="btn-accent-gold flex-1 shine-hover"
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

  // Render selection step
  if (step === 'select') {
    const AREA_GRADIENT: Record<AreaType, string> = {
      'Ingenierías': 'from-blue-500 via-indigo-500 to-blue-700',
      'Biomédicas': 'from-rose-500 via-pink-500 to-rose-700',
      'Sociales': 'from-amber-500 via-orange-500 to-amber-700',
    };

    return (
      <div className="min-h-screen bg-andean-white relative">
        {/* Dramatic header */}
        <div
          className="bg-[#001f3f] bg-mesh-deep text-white relative overflow-hidden py-12 px-4"
          style={{ backgroundColor: '#001529' }}
        >
          <div className="andean-bold text-white/10 absolute inset-0 pointer-events-none" aria-hidden />
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-mesh-gold opacity-25 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block" aria-hidden />
          <div className="absolute -bottom-16 -right-10 w-72 h-72 bg-blob-brand opacity-30 animate-float-slow pointer-events-none" aria-hidden />
          <div className="bg-constellation absolute inset-0 opacity-30 pointer-events-none" aria-hidden />

          {/* Ilustraciones educativas decorativas */}
          <img
            src="/illustrations/study-hero.svg"
            alt=""
            aria-hidden="true"
            className="hidden lg:block absolute top-10 right-20 w-72 opacity-20 animate-float-slow drop-shadow-xl pointer-events-none"
          />
          <img
            src="/illustrations/formulas.svg"
            alt=""
            aria-hidden="true"
            className="hidden md:block absolute bottom-8 left-10 w-48 opacity-15 drop-shadow-xl pointer-events-none"
          />
          <img
            src="/illustrations/atom.svg"
            alt=""
            aria-hidden="true"
            className="hidden md:block absolute bottom-6 right-28 w-32 opacity-25 animate-spin-slow drop-shadow-xl pointer-events-none"
          />

          <div className="max-w-3xl mx-auto relative z-10">
            <nav className="flex items-center gap-1 text-xs text-white/90 font-sans mb-4">
              <button onClick={() => navigate('/')} className="hover:text-white transition-colors">
                Inicio
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-semibold">Simulacro CEPREUNA</span>
            </nav>

            <span className="chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 px-3 py-1 mb-4 inline-flex">
              <Award className="w-3 h-3" />
              Simulacro oficial · 60 preguntas · 3h
            </span>
            <h1 className="inline-block font-display text-4xl md:text-6xl font-black text-brand-accent-400 gradient-text-gold leading-tight mb-3 animate-fade-up">
              Simulacro oficial CEPREUNA
            </h1>
            <p className="font-sans text-lg text-white/90 max-w-2xl animate-fade-up">
              Examen completo con preguntas reales de los cuadernillos CEPREUNA. Mide tu nivel como en el día D.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto py-10 px-4 relative z-10">
          {/* Area Selection - big gradient cards */}
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-brand-primary-600" />
              <h3 className="font-display text-lg font-bold text-slate-800">1. Elige tu área</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(AREA_CONFIG) as AreaType[]).map((area, idx) => {
                const config = AREA_CONFIG[area];
                const Icon = config.icon;
                const active = selectedArea === area;
                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={clsx(
                      'relative overflow-hidden rounded-2xl p-6 text-left transition-all group animate-fade-up shine-hover',
                      active
                        ? 'ring-4 ring-brand-accent/50 scale-[1.03] shadow-elevation-3'
                        : 'shadow-elevation-1 hover:shadow-elevation-2 hover:scale-[1.01]'
                    )}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className={clsx(
                      'absolute inset-0 bg-gradient-to-br opacity-95 transition-opacity',
                      AREA_GRADIENT[area],
                      !active && 'opacity-85 group-hover:opacity-95'
                    )} />
                    <div className="absolute inset-0 bg-constellation opacity-20 mix-blend-overlay" />

                    {/* Ilustraciones educativas por área */}
                    {area === 'Ingenierías' && (
                      <>
                        <img
                          src="/illustrations/calculator.svg"
                          alt=""
                          aria-hidden="true"
                          className="hidden md:block absolute top-2 right-2 w-20 opacity-25 drop-shadow-xl pointer-events-none"
                        />
                        <img
                          src="/illustrations/compass-geometry.svg"
                          alt=""
                          aria-hidden="true"
                          className="hidden md:block absolute bottom-2 right-4 w-20 opacity-20 drop-shadow-xl pointer-events-none"
                        />
                      </>
                    )}
                    {area === 'Biomédicas' && (
                      <img
                        src="/illustrations/atom.svg"
                        alt=""
                        aria-hidden="true"
                        className="hidden md:block absolute -bottom-2 -right-2 w-28 opacity-30 drop-shadow-xl pointer-events-none"
                      />
                    )}
                    {area === 'Sociales' && (
                      <>
                        <img
                          src="/illustrations/books-stack.svg"
                          alt=""
                          aria-hidden="true"
                          className="hidden md:block absolute top-2 right-2 w-20 opacity-25 drop-shadow-xl pointer-events-none"
                        />
                        <img
                          src="/illustrations/graduation-cap.svg"
                          alt=""
                          aria-hidden="true"
                          className="hidden md:block absolute bottom-2 right-4 w-20 opacity-25 drop-shadow-xl pointer-events-none"
                        />
                      </>
                    )}

                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-elevation-1">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="font-display text-xl font-black text-white mb-1 drop-shadow-sm">{config.label}</h4>
                      <p className="text-xs font-mono text-white/90 font-semibold uppercase tracking-wider">Área {area === 'Ingenierías' ? 'ING' : area === 'Biomédicas' ? 'BIO' : 'SOC'}</p>
                      {active && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-white/25 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-white">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Seleccionada
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Semana Selection */}
          <div className="card-elevated p-6 md:p-8 mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Calendar className="w-5 h-5 text-brand-accent-600" />
              <h3 className="font-display text-lg font-bold text-slate-800">2. Semanas del cuadernillo</h3>
              <label className="ml-auto flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={usarTodasSemanas}
                  onChange={(e) => setUsarTodasSemanas(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-primary-600 focus:ring-brand-primary-500"
                />
                <span>Todas las semanas (recomendado)</span>
              </label>
            </div>

            {!usarTodasSemanas && (
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
            )}
            {usarTodasSemanas && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800 font-sans">
                  Se mezclarán preguntas de las <strong>16 semanas</strong> — máxima cobertura.
                </p>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="card-elevated p-5 mb-8 animate-fade-up bg-mesh-warm/40" style={{ animationDelay: '260ms' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-brand-accent-700" />
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-800 mb-2">Formato del examen</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-600 font-sans">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 60 preguntas por asignatura</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Cuadernillos CEPREUNA oficiales</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Puntuación máxima: 3000 pts</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Retroalimentación inmediata</li>
                </ul>
              </div>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 rounded-2xl p-4 mb-6 flex items-start gap-3 border border-red-200 animate-fade-up">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm font-sans">{loginError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/')} className="btn-secondary sm:flex-none">
              <Home className="w-5 h-5" />
              Inicio
            </button>
            <button
              onClick={handleStartExam}
              className="btn-accent-gold flex-1 shine-hover text-base md:text-lg px-8 py-4"
              disabled={isLoading || (!usarTodasSemanas && !selectedSemana)}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <GraduationCap className="w-5 h-5" />
                  Iniciar simulacro
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
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
          {/* Header */}
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    CEPREUNA - {selectedArea}
                  </span>
                  {currentQuestion.subject && (
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      {currentQuestion.subject}
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-slate-800">
                  Pregunta {currentIndex + 1} de {questions.length}
                </h2>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span className="font-mono text-xl font-bold text-slate-800">
                  {formatTime(elapsedTime)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500">Respondidas</span>
                <p className="font-bold text-lg">
                  <span className="text-emerald-600">{answeredCount}</span>
                  <span className="text-slate-400">/{questions.length}</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
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
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                Finalizar Examen
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
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
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

        {/* Modal: Finish Confirm */}
        {showFinishConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  ¿Finalizar el examen?
                </h2>
                <p className="text-slate-600 mb-4">
                  Has respondido {answeredCount} de {questions.length} preguntas.
                  {answeredCount < questions.length && (
                    <span className="text-amber-600 block mt-1">
                      Las preguntas sin responder se contarán como incorrectas.
                    </span>
                  )}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFinishConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    Continuar
                  </button>
                  <button
                    onClick={handleFinishExam}
                    className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    <Send className="w-5 h-5" />
                    Finalizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      <p className="text-2xl font-bold text-emerald-600">
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
                    onClick={handleFinishExam}
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
          {/* Score Card */}
          <div className="card p-8 mb-6 text-center animate-fade-in shadow-xl bg-gradient-to-br from-white to-slate-50">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-full mb-4 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Resultados del Simulacro CEPREUNA
            </h1>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="inline-block text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                {selectedArea}
              </span>
              <span className="inline-block text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                {usarTodasSemanas ? 'Todas las semanas' : selectedSemana}
              </span>
            </div>

            {/* Score display */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 mb-6 text-white">
              <p className="text-6xl font-bold mb-1">{finalScore.toFixed(0)}</p>
              <p className="text-emerald-100">de {totalPoints} puntos</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                <p className="text-4xl font-bold text-emerald-600">{correctCount}</p>
                <p className="text-sm text-emerald-700">Correctas</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                <p className="text-4xl font-bold text-red-500">{questions.length - correctCount}</p>
                <p className="text-sm text-red-700">Incorrectas</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <p className="text-4xl font-bold text-blue-600">{percentage}%</p>
                <p className="text-sm text-blue-700">Porcentaje</p>
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>Tiempo total: <strong>{formatTime(elapsedTime)}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Target className="w-4 h-4" />
                <span>Promedio: <strong>{Math.round(avgTimePerQuestion)}s/preg</strong></span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={handleReset} className="btn-secondary">
                <RotateCcw className="w-5 h-5" />
                Otro Simulacro
              </button>
              <button onClick={() => navigate('/')} className="btn-primary bg-gradient-to-r from-emerald-500 to-teal-600">
                <Home className="w-5 h-5" />
                Inicio
              </button>
            </div>
          </div>

          {/* Review Questions */}
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
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
                        {q.subject && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {q.subject}
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
