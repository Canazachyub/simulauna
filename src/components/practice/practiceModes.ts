import { createElement } from 'react';
import { BookOpen, BookMarked } from 'lucide-react';
import { BanqueoCourseSelect } from './selects/BanqueoCourseSelect';
import { BanqueoTemaSelect } from './selects/BanqueoTemaSelect';
import { CepreSelect } from './selects/CepreSelect';
import type { PracticeMode } from './types';

/** Modo "Banqueo histórico": sólo filtro de curso, preguntas de exámenes anteriores. */
export const banqueoMode: PracticeMode = {
  id: 'banqueo',
  loginKicker: 'Banqueo histórico',
  loginTitle: 'Banqueo histórico',
  loginSubtitle: 'Practica con preguntas reales de exámenes anteriores',
  headingGradientClass: 'text-brand-primary-800 gradient-text-brand',
  renderLoginDecoration: () => createElement('div', null,
    createElement('img', { src: '/illustrations/books-stack.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute top-10 left-6 w-40 opacity-30 pointer-events-none' }),
    createElement('img', { src: '/illustrations/lightbulb-idea.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute bottom-10 right-6 w-32 opacity-25 pointer-events-none' })
  ),
  SelectStep: BanqueoCourseSelect,
  quizBadge: () => 'MODO BANQUEO',
  badgeStyle: 'topic',
  courseIcon: BookOpen,
  optionHoverClass: 'hover:border-[var(--uni-primary-safe)] hover:bg-[var(--uni-primary-soft)]',
  nextButtonClass: '',
  navigatorActiveClass: 'bg-[var(--uni-primary-safe)] text-white shadow-md ring-2 ring-[var(--uni-primary-safe)]',
  modalTimeClass: 'text-[var(--uni-primary-safe)]',
  resultsTitle: () => 'Práctica completada',
  resultsBadge: () => 'BANQUEO',
  resetLabel: 'Practicar otro curso',
  homeLabel: 'Ver mis puntos débiles',
  reviewIconClass: 'text-primary-600',
  heroBgClass: 'bg-white',
  renderResultsDecoration: () => createElement('div', null,
    createElement('img', { src: '/illustrations/formulas.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute inset-0 m-auto w-64 opacity-10 pointer-events-none' }),
    createElement('img', { src: '/illustrations/graduation-cap.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute bottom-6 right-8 w-24 opacity-40 animate-float-y pointer-events-none' })
  ),
};

/** Modo "Banqueo por Tema": filtro curso → tema (stepper). */
export const banqueoTemaMode: PracticeMode = {
  id: 'banqueoTema',
  loginKicker: 'Por Tema',
  loginTitle: 'Banqueo por Tema',
  loginSubtitle: 'Practica preguntas filtradas por curso y tema',
  headingGradientClass: 'gradient-text-brand',
  SelectStep: BanqueoTemaSelect,
  quizBadge: () => 'BANQUEO',
  badgeStyle: 'topic',
  courseIcon: BookOpen,
  optionHoverClass: 'hover:border-orange-400 hover:bg-orange-50',
  nextButtonClass: 'bg-gradient-to-r from-orange-500 to-amber-600',
  navigatorActiveClass: 'bg-orange-600 text-white shadow-md ring-2 ring-orange-300',
  modalTimeClass: 'text-orange-600',
  resultsTitle: () => 'Tema completado',
  resultsBadge: () => 'BANQUEO',
  resetLabel: 'Otro tema',
  homeLabel: 'Inicio',
  reviewIconClass: 'text-orange-600',
  heroBgClass: 'bg-white',
};

/**
 * Modo CEPRE: fábrica porque los textos dependen de `cepreNombre` (registro de universidades,
 * ver docs/CONTRATO_API_V2.md §5), sólo conocido en tiempo de render del wrapper.
 */
export function createCepreMode(cepreNombre: string): PracticeMode {
  return {
    id: 'cepre',
    loginKicker: cepreNombre,
    loginTitle: `Banqueo ${cepreNombre}`,
    loginSubtitle: `Practica con preguntas de los cuadernillos ${cepreNombre} por semana`,
    headingGradientClass: 'text-brand-accent-600 gradient-text-gold',
    kickerChipClass: 'chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 mb-3 px-3 py-1',
    kickerExtra: createElement('img', { src: '/illustrations/graduation-cap.svg', alt: '', 'aria-hidden': 'true', className: 'w-6 h-6 inline-block pointer-events-none' }),
    renderLoginDecoration: () => createElement('div', null,
      createElement('div', { className: 'absolute -top-20 -left-20 w-72 h-72 bg-mesh-gold opacity-40 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block', 'aria-hidden': true }),
      createElement('img', { src: '/illustrations/books-stack.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute top-12 left-6 w-36 opacity-25 animate-float-slow pointer-events-none' }),
      createElement('img', { src: '/illustrations/atom.svg', alt: '', 'aria-hidden': 'true', className: 'hidden md:block absolute bottom-16 right-8 w-28 opacity-20 animate-spin-slow pointer-events-none' })
    ),
    SelectStep: CepreSelect,
    quizBadge: () => cepreNombre,
    badgeStyle: 'cepre',
    courseIcon: BookMarked,
    optionHoverClass: 'hover:border-primary-400 hover:bg-primary-50',
    nextButtonClass: '',
    navigatorActiveClass: 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300',
    modalTimeClass: 'text-primary-600',
    resultsTitle: () => 'Cuadernillo completado',
    resultsBadge: () => cepreNombre,
    resetLabel: 'Otra práctica',
    homeLabel: 'Inicio',
    reviewIconClass: 'text-teal-600',
    heroBgClass: 'bg-aurora andean-overlay',
  };
}
