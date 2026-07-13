import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkBanqueoAccess } from '../../services/api';
import { validateDNI } from '../../utils/calculations';
import { useAuth } from '../../context/AuthContext';
import { useUniversityStore } from '../../hooks/useUniversity';
import { resolveThemeVars } from '../../utils/universityTheme';
import { PracticeLogin } from './PracticeLogin';
import { PracticeQuiz } from './PracticeQuiz';
import { PracticeResults } from './PracticeResults';
import type {
  PracticeAnswer, PracticeLoadResult, PracticeMode, PracticeQuestion, PracticeQuestionMeta
} from './types';

type Step = 'login' | 'select' | 'quiz' | 'results';

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Motor único de práctica (ver docs/CONTRATO_API_V2.md §5): orquesta login → selección de
 * filtros (delegada al `SelectStep` de cada `PracticeMode`) → quiz con feedback inmediato →
 * resultados con revisión. Banqueo.tsx, BanqueoPorTema.tsx y BanqueoCepreuna.tsx son wrappers
 * delgados que sólo aportan un `PracticeMode`.
 */
export function PracticeSession({ mode }: { mode: PracticeMode }) {
  const navigate = useNavigate();
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const registroUniversidades = useUniversityStore(state => state.registro);
  const universidad = activaUniversidad || universidadParam || 'una';
  const themeVars = resolveThemeVars(universidad, registroUniversidades);
  const { user, isAuthenticated, login: authLogin, logout: authLogout } = useAuth();

  const [step, setStep] = useState<Step>(isAuthenticated ? 'select' : 'login');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [meta, setMeta] = useState<PracticeQuestionMeta>({ course: '' });
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, PracticeAnswer>>(new Map());
  const [results, setResults] = useState<PracticeAnswer[]>([]);

  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showAllAnsweredModal, setShowAllAnsweredModal] = useState(false);

  // Racha de aciertos consecutivos (solo estado en memoria, ver docs/CONTRATO_API_V2.md §5):
  // sube con cada respuesta correcta según el orden en que el usuario va respondiendo, se
  // reinicia en cualquier incorrecta y al empezar una sesión nueva.
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Timer del quiz
  useEffect(() => {
    if (step !== 'quiz' || startTime === 0) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, startTime]);

  // Modal "todas respondidas"
  const allAnswered = questions.length > 0 && answers.size === questions.length;
  useEffect(() => {
    if (allAnswered && step === 'quiz' && !showAllAnsweredModal) {
      setShowAllAnsweredModal(true);
    }
  }, [allAnswered, step, showAllAnsweredModal]);

  const goHome = useCallback(() => navigate(`/${universidad}`), [navigate, universidad]);

  const handleLoginSubmit = async (dni: string, email: string) => {
    setLoginError('');

    if (!dni || !validateDNI(dni)) {
      setLoginError('Ingresa un DNI válido (8 dígitos)');
      return;
    }
    if (!email || !validateEmail(email)) {
      setLoginError('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    try {
      const emailNorm = email.toLowerCase();
      const result = await checkBanqueoAccess(dni, emailNorm, universidad);
      if (!result.canAccess) {
        setLoginError(result.reason);
        setIsLoading(false);
        return;
      }
      authLogin(dni, emailNorm);
      setStep('select');
    } catch {
      setLoginError('Error de conexión. Intenta de nuevo.');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    authLogout();
    setMeta({ course: '' });
    setQuestions([]);
    setAnswers(new Map());
    setResults([]);
    setStartTime(0);
    setElapsedTime(0);
    setShowAllAnsweredModal(false);
    setLoginError('');
    setStreak(0);
    setBestStreak(0);
    setStep('login');
  };

  const handleSelectSubmit = async (
    selectedMeta: PracticeQuestionMeta,
    loader: () => Promise<PracticeLoadResult>
  ) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const result = await loader();
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
      setMeta(selectedMeta);
      setQuestions(result.questions);
      setCurrentIndex(0);
      setAnswers(new Map());
      setResults([]);
      setStartTime(Date.now());
      setElapsedTime(0);
      setShowAllAnsweredModal(false);
      setStreak(0);
      setBestStreak(0);
      setStep('quiz');
    } catch {
      setLoginError('Error al cargar preguntas. Intenta de nuevo.');
    }
    setIsLoading(false);
  };

  const handleAnswer = (optionIndex: number) => {
    const question = questions[currentIndex];
    const isCorrect = optionIndex === question.correctAnswer;
    const newAnswers = new Map(answers);
    newAnswers.set(question.id, { questionId: question.id, selectedOption: optionIndex, isCorrect, answeredAt: Date.now() });
    setAnswers(newAnswers);
    // Racha de aciertos consecutivos según el orden en que se responde (no el orden de las
    // preguntas): sube con cada acierto, se reinicia con cualquier fallo.
    setStreak(prev => {
      const next = isCorrect ? prev + 1 : 0;
      setBestStreak(best => Math.max(best, next));
      return next;
    });
  };

  const handleFinishQuiz = () => {
    const quizResults: PracticeAnswer[] = questions.map(q => {
      return answers.get(q.id) || { questionId: q.id, selectedOption: null, isCorrect: false, answeredAt: 0 };
    });
    setResults(quizResults);
    setShowAllAnsweredModal(false);
    setStep('results');
  };

  const handleReset = () => {
    setQuestions([]);
    setAnswers(new Map());
    setResults([]);
    setStartTime(0);
    setElapsedTime(0);
    setShowAllAnsweredModal(false);
    setLoginError('');
    setStreak(0);
    setBestStreak(0);
    setStep('select');
  };

  // Theming institucional coherente en los 4 pasos: se aplica una sola vez en el contenedor
  // raíz (las CSS vars heredan por el DOM, ver src/utils/universityTheme.ts) para no duplicar
  // la resolución de tema en cada paso ni en Quiz.tsx.
  let content: ReactNode;

  if (step === 'login') {
    content = (
      <PracticeLogin
        mode={mode}
        isAuthenticated={isAuthenticated}
        userDni={user?.dni}
        loginError={loginError}
        isLoading={isLoading}
        onSubmit={handleLoginSubmit}
        onLogout={handleLogout}
        onBack={goHome}
      />
    );
  } else if (step === 'select') {
    const SelectStep = mode.SelectStep;
    content = (
      <SelectStep
        universidad={universidad}
        isAuthenticated={isAuthenticated}
        userDni={user?.dni}
        isLoading={isLoading}
        error={loginError}
        onBack={goHome}
        onLogout={handleLogout}
        onSubmit={handleSelectSubmit}
      />
    );
  } else if (step === 'quiz') {
    content = (
      <PracticeQuiz
        mode={mode}
        meta={meta}
        questions={questions}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        answers={answers}
        onAnswer={handleAnswer}
        onFinish={handleFinishQuiz}
        elapsedTimeLabel={formatTime(elapsedTime)}
        showAllAnsweredModal={showAllAnsweredModal}
        setShowAllAnsweredModal={setShowAllAnsweredModal}
        streak={streak}
      />
    );
  } else {
    // step === 'results'
    content = (
      <PracticeResults
        mode={mode}
        meta={meta}
        questions={questions}
        results={results}
        elapsedTimeLabel={formatTime(elapsedTime)}
        elapsedTimeSeconds={elapsedTime}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onReset={handleReset}
        onHome={goHome}
        bestStreak={bestStreak}
      />
    );
  }

  return <div style={themeVars}>{content}</div>;
}
