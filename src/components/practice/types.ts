import type { ReactNode, ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { BanqueoQuestion } from '../../services/api';

/**
 * Motor único de práctica (ver docs/CONTRATO_API_V2.md §5). Un `PracticeQuestion` es el
 * superconjunto de `BanqueoQuestion` (banqueo histórico / por tema) y `CepreQuestion`
 * (banqueo CEPRE, que además trae `area` y `semana`).
 */
export type PracticeQuestion = BanqueoQuestion & {
  area?: string | null;
  semana?: string | null;
};

export type QuestionCount = 10 | 15 | 20;

export interface PracticeAnswer {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  answeredAt: number;
}

/** Metadatos de la selección actual, usados por Quiz/Results para mostrar chips y títulos. */
export interface PracticeQuestionMeta {
  course: string;
  tema?: string;
  area?: string;
  semana?: string;
}

export interface PracticeLoadResult {
  questions: PracticeQuestion[];
  error?: string;
}

/** Props que recibe el paso de selección (filtros) propio de cada modo. */
export interface PracticeSelectStepProps {
  universidad: string;
  isAuthenticated: boolean;
  userDni?: string;
  isLoading: boolean;
  error: string;
  onBack: () => void;
  onLogout: () => void;
  /** El paso de selección arma sus filtros y entrega el loader; PracticeSession lo ejecuta. */
  onSubmit: (meta: PracticeQuestionMeta, loader: () => Promise<PracticeLoadResult>) => void;
}

/** Estilo de chips de metadata mostrados en pregunta (quiz) y en revisión (results). */
export type BadgeStyle = 'topic' | 'cepre';

/**
 * Config de un modo de práctica. `PracticeSession` es el motor genérico (login → selección →
 * quiz → resultados); cada modo sólo aporta textos, un componente de selección de filtros y
 * un puñado de clases de acento visual — nunca lógica de negocio duplicada.
 */
export interface PracticeMode {
  id: 'banqueo' | 'banqueoTema' | 'cepre';

  // --- Login ---
  loginKicker: string;
  loginTitle: string;
  loginSubtitle: string;
  headingGradientClass: string;
  kickerChipClass?: string;
  kickerExtra?: ReactNode;
  renderLoginDecoration?: () => ReactNode;

  // --- Selección de filtros (propio de cada modo) ---
  SelectStep: ComponentType<PracticeSelectStepProps>;

  // --- Quiz ---
  quizBadge: (meta: PracticeQuestionMeta) => string;
  badgeStyle: BadgeStyle;
  courseIcon: LucideIcon;
  optionHoverClass: string;
  nextButtonClass: string;
  navigatorActiveClass: string;
  modalTimeClass: string;

  // --- Resultados ---
  resultsTitle: (meta: PracticeQuestionMeta) => string;
  resultsBadge: (meta: PracticeQuestionMeta) => string;
  resetLabel: string;
  homeLabel: string;
  reviewIconClass: string;
  heroBgClass?: string;
  renderResultsDecoration?: () => ReactNode;
}
