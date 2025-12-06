import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CreditCard, Mail, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Lock, CheckCircle, XCircle,
  RotateCcw, Home, Lightbulb, Clock, FileText, Tag, Send,
  Trophy, Target, Calendar, GraduationCap, Cpu, Heart, Scale
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="card p-8 animate-fade-in shadow-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl mb-4 shadow-lg">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Simulacro CEPREUNA
              </h1>
              <p className="text-slate-600">
                Examen completo de 60 preguntas con preguntas de los cuadernillos CEPREUNA
              </p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 mt-0.5" />
                <p className="text-emerald-800 text-sm">
                  El Simulacro CEPREUNA es exclusivo para usuarios inscritos.
                  Ingresa tus datos para verificar tu acceso.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  DNI
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ingresa tu DNI"
                  className="input"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="label">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="input"
                />
              </div>

              {loginError && (
                <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3 border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-red-700 text-sm">{loginError}</p>
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
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 animate-fade-in shadow-xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl mb-4 shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Configurar Simulacro CEPREUNA
              </h1>
              <p className="text-slate-600">
                Selecciona el área y opcionalmente una semana específica
              </p>
            </div>

            {/* Area Selection */}
            <div className="mb-6">
              <label className="label mb-3">Selecciona tu Área</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(AREA_CONFIG) as AreaType[]).map(area => {
                  const config = AREA_CONFIG[area];
                  const Icon = config.icon;
                  return (
                    <button
                      key={area}
                      onClick={() => setSelectedArea(area)}
                      className={clsx(
                        'p-4 rounded-xl border-2 text-center transition-all',
                        selectedArea === area
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      )}
                    >
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2',
                        config.bgColor
                      )}>
                        <Icon className={clsx('w-6 h-6', config.color)} />
                      </div>
                      <span className="font-medium text-slate-800">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Semana Selection */}
            <div className="mb-6">
              <label className="label mb-3">Semanas del Cuadernillo</label>

              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarTodasSemanas}
                    onChange={(e) => setUsarTodasSemanas(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700">
                    Usar preguntas de <strong>todas las semanas</strong> (recomendado)
                  </span>
                </label>
              </div>

              {!usarTodasSemanas && (
                <select
                  value={selectedSemana}
                  onChange={(e) => setSelectedSemana(e.target.value)}
                  className="input text-lg"
                >
                  <option value="">-- Selecciona una semana --</option>
                  {CEPRE_SEMANAS.map(semana => (
                    <option key={semana} value={semana}>
                      Semana {semana.replace('S', '')} ({semana})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Info box */}
            <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-200">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="text-emerald-800 text-sm">
                  <p className="font-semibold mb-1">Formato del Examen:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>60 preguntas distribuidas por asignatura</li>
                    <li>Preguntas de cuadernillos CEPREUNA</li>
                    <li>Puntuación máxima: 3000 puntos</li>
                    <li>Retroalimentación inmediata después de cada respuesta</li>
                  </ul>
                </div>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 rounded-xl p-4 mb-6 flex items-start gap-3 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <p className="text-red-700 text-sm">{loginError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate('/')} className="btn-secondary flex-1">
                <Home className="w-5 h-5" />
                Inicio
              </button>
              <button
                onClick={handleStartExam}
                className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={isLoading || (!usarTodasSemanas && !selectedSemana)}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <GraduationCap className="w-5 h-5" />
                    Iniciar Examen
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-4 px-4">
        <div className="max-w-3xl mx-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-6 px-4">
        <div className="max-w-3xl mx-auto">
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
