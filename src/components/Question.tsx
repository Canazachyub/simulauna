import { CheckCircle, XCircle, Check, Flag, ZoomIn } from 'lucide-react';
import type { Question as QuestionType } from '../types';
import { indexToLetter } from '../utils/calculations';
import clsx from 'clsx';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * REGLAS DE FORMATO PARA EL TEXTO DE LAS PREGUNTAS:
 *
 * En tus celdas de Google Sheets puedes usar:
 *
 * 1. SALTOS DE LÍNEA:
 *    - Usa <br> o presiona Alt+Enter en la celda
 *    - Ejemplo: "Primera línea<br>Segunda línea"
 *
 * 2. NEGRITA:
 *    - Usa <b>texto</b>
 *    - Ejemplo: "El valor de <b>x</b> es igual a..."
 *
 * 3. SUBRAYADO:
 *    - Usa <u>texto</u>
 *    - Ejemplo: "Encuentra <u>la respuesta correcta</u>"
 *
 * 4. RESALTADO/SOMBREADO:
 *    - Usa <mark>texto</mark>
 *    - Ejemplo: "El resultado es <mark>42</mark>"
 *
 * 5. CURSIVA/ITÁLICA:
 *    - Usa <i>texto</i>
 *    - Ejemplo: "Según el <i>teorema de Pitágoras</i>..."
 *
 * 6. COMBINACIONES:
 *    - Puedes combinar: <b><u>texto negrita y subrayado</u></b>
 *    - Ejemplo: "I. <mark>b∈A</mark> II. <b>{b, c} ⊂ A</b>"
 */

/**
 * Preprocesa el LaTeX para restaurar comandos que perdieron la barra invertida
 * Google Sheets y JSON pueden eliminar las barras invertidas
 */
function preprocessLatex(latex: string): string {
  // Lista ordenada de mayor a menor longitud
  // IMPORTANTE: 'in' removido porque causa problemas con 'begin' → 'beg\in'
  const latexCommands = [
    'boldsymbol', 'displaystyle', 'leftrightarrow', 'Leftrightarrow',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
    'underbrace', 'overbrace', 'underline', 'overline', 'stackrel',
    'scriptstyle', 'textstyle', 'emptyset', 'clubsuit', 'spadesuit',
    'triangle', 'diamond', 'partial', 'epsilon', 'textrm', 'textbf',
    'bmatrix', 'pmatrix', 'matrix', 'mathcal', 'mathbf', 'mathit',
    'mathrm', 'mathsf', 'mathtt', 'forall', 'exists', 'subset',
    'supset', 'approx', 'notin', 'equiv', 'wedge', 'nabla', 'infty',
    'theta', 'lambda', 'sigma', 'omega', 'alpha', 'gamma', 'delta',
    'times', 'cdot', 'sqrt', 'frac', 'text', 'hbar', 'quad', 'qquad',
    'begin', 'cases', 'angle', 'space', 'hspace', 'vspace', 'binom',
    'tilde', 'ddot', 'star', 'circ', 'prod', 'beta', 'zeta',
    'iota', 'kappa', 'right', 'left', 'leq', 'geq', 'neq', 'cup',
    'cap', 'vee', 'neg', 'sum', 'int', 'lim', 'log', 'sin', 'cos',
    'tan', 'end', 'div', 'phi', 'psi', 'rho', 'tau', 'chi', 'eta',
    'hat', 'bar', 'vec', 'dot', 'ell', 'aleph', 'wp', 'Re', 'Im',
    'pi', 'mu', 'nu', 'xi', 'pm', 'mp', 'ln'
  ];

  let result = latex;
  for (const cmd of latexCommands) {
    // Sin lookbehind para compatibilidad con todos los navegadores
    // Debe NO estar precedido por \ ni ser parte de otra palabra
    const pattern = new RegExp(`(^|[^\\\\a-zA-Z])(${cmd})([{\\[\\s(]|$)`, 'g');
    result = result.replace(pattern, `$1\\${cmd}$3`);
  }

  // Caso especial: \in - solo si está solo (precedido por espacio/inicio y seguido por espacio/fin)
  result = result.replace(/(^|[^\\a-zA-Z])(in)(\s|$)/g, '$1\\in$3');

  return result;
}

/**
 * Renderiza expresiones LaTeX en el texto
 * Detecta patrones $...$ y los convierte a HTML usando KaTeX
 */
function renderLatex(text: string): string {
  if (!text || !text.includes('$')) return text;

  const latexPattern = /\$([^$]+)\$/g;

  return text.replace(latexPattern, (match, latex) => {
    try {
      const processedLatex = preprocessLatex(latex.trim());
      return katex.renderToString(processedLatex, {
        throwOnError: false,
        displayMode: false,
        strict: false,
        trust: true,
        macros: {
          "\\text": "\\textrm"
        }
      });
    } catch (error) {
      console.warn('Error renderizando LaTeX:', latex, error);
      return match;
    }
  });
}

/**
 * Formatea automáticamente el texto detectando patrones de numeración
 * para agregar saltos de línea y mejorar la legibilidad
 *
 * Patrones detectados:
 * - Números romanos con punto: I., II., III., IV., V., VI., VII., VIII., IX., X.
 * - Números romanos con paréntesis: I), II), III), IV)
 * - Letras minúsculas en formato de lista: a., b., c., d., e.
 *
 * REGLAS PARA EVITAR FALSOS POSITIVOS:
 * - "empírica. Su" → NO es opción (hay espacio entre "a" y el punto, es fin de palabra)
 * - "verda d. La" → NO es opción (hay espacio ANTES de "d", es error de tipeo)
 * - "cosas.a. Racionalismo" → SÍ es opción (letra PEGADA al punto anterior)
 * - "corresponda: a. Opción" → SÍ es opción (después de dos puntos)
 */
function formatQuestionTextAuto(text: string): string {
  if (!text) return '';

  let formatted = text;

  // 1. Numeración romana con PUNTO: ".I. " o ":I. "
  formatted = formatted.replace(/([.:])(\s*)([IVX]{1,4})\.\s+/g, '$1<br><br><strong>$3.</strong> ');

  // 2. Numeración romana con PARÉNTESIS: ".I) " o ":II) "
  formatted = formatted.replace(/([.:])(\s*)([IVX]{1,4})\)\s+/g, '$1<br><br><strong>$3)</strong> ');

  // 3. Letras después de DOS PUNTOS con espacio: ": a. Opción"
  formatted = formatted.replace(/:(\s+)([a-e])\.\s+/g, ':<br><br><strong>$2.</strong> ');

  // 4. Letras PEGADAS directamente al punto (sin espacio): ".a. Racionalismo"
  // Este es el patrón clave que detecta listas como "cosas.a. Racionalismo.b. Empirismo"
  // NO detecta "empírica. Su" porque tiene espacio después del punto
  // NO detecta "verda d. La" porque la "d" no está pegada al punto
  formatted = formatted.replace(/\.([a-e])\.(\s+)/g, '.<br><br><strong>$1.</strong>$2');

  return formatted;
}

// Función para parsear el texto con formato HTML básico y LaTeX
function parseFormattedText(text: unknown): string {
  // Manejar valores null, undefined, o no-string
  if (text === null || text === undefined) return '';

  // Convertir a string si no lo es
  const textStr = typeof text === 'string' ? text : String(text);

  if (!textStr) return '';

  // 1. Aplicar formateo automático de numeración ANTES de LaTeX
  // (para no romper los SVGs de KaTeX)
  let result = formatQuestionTextAuto(textStr);

  // 2. Reemplazar saltos de línea ANTES de LaTeX
  result = result.replace(/\n/g, '<br>');

  // 3. Renderizar LaTeX ($...$) - genera HTML/SVG que no debe modificarse
  result = renderLatex(result);

  // 4. Permitir tags seguros (incluyendo los de KaTeX)
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'mark', 'br', 'sub', 'sup',
    // Tags de KaTeX
    'span', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac',
    'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'annotation', 'svg', 'path',
    'line', 'g', 'rect', 'use'];

  // 5. Procesar HTML (sin tocar el contenido de KaTeX)
  result = result
    // Agregar clase al mark para el resaltado amarillo
    .replace(/<mark>/gi, '<mark class="bg-yellow-200 px-0.5 rounded">')
    // Limpiar tags no permitidos (pero mantener los de KaTeX)
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
      return allowedTags.includes(tag.toLowerCase()) ? match : '';
    });

  return result;
}

// Componente para renderizar texto formateado
function FormattedText({ text, className }: { text: string; className?: string }) {
  const formattedHtml = parseFormattedText(text);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
}

interface QuestionProps {
  question: QuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  showFeedback: boolean;
  isCorrect: boolean | null;
  onSelectAnswer: (index: number) => void;
}

// Paleta suavizada Editorial Andino para círculos A-E
const LETTER_BG_IDLE = [
  'bg-blue-500/50 text-white',    // A
  'bg-rose-400/50 text-white',    // B
  'bg-amber-500/50 text-white',   // C
  'bg-emerald-500/50 text-white', // D
  'bg-purple-500/50 text-white',  // E
];

export function Question({
  question,
  questionNumber,
  selectedAnswer,
  showFeedback,
  isCorrect,
  onSelectAnswer
}: QuestionProps) {
  // Formatea número con cero a la izquierda: 01, 02, ...
  const numberPadded = String(questionNumber).padStart(2, '0');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Card contenedora con riqueza visual */}
      <div className="card-elevated p-6 md:p-10 relative overflow-hidden rounded-2xl bg-white">
        {/* Patrón sutil de puntos brand detrás de todo */}
        <div
          className="dots-bg-brand absolute inset-0 opacity-30 pointer-events-none"
          aria-hidden="true"
        />

        {/* Accent dorado en esquina superior derecha */}
        <div className="corner-accent absolute top-0 right-0 pointer-events-none" aria-hidden="true" />

        {/* Contenido (z-10 para quedar sobre las decoraciones) */}
        <div className="relative z-10">
          {/* Cabecera editorial */}
          <div className="mb-6 md:mb-8 animate-fade-up">
            <div className="flex items-end gap-4">
              {/* Número con halo dorado + círculo animado */}
              <div className="relative flex-shrink-0">
                {/* Halo dorado difuso */}
                <div
                  className="absolute inset-0 -m-3 rounded-full bg-brand-accent/20 blur-2xl pointer-events-none"
                  aria-hidden="true"
                />
                {/* Círculo acento decorativo */}
                <div
                  className="absolute -inset-2 rounded-full border-2 border-brand-accent/30 animate-pulse-ring pointer-events-none"
                  aria-hidden="true"
                />
                <span
                  className="relative inline-block font-display text-5xl md:text-6xl font-black text-brand-accent-600 gradient-text-gold leading-none tabular-nums select-none"
                  aria-label={`Pregunta ${questionNumber}`}
                >
                  {numberPadded}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="chip bg-brand-primary-50 text-brand-primary-700 border border-brand-primary-200">
                  {question.subject}
                </span>
                {question.sourceFile && (
                  <span className="chip bg-slate-100 text-slate-600 border border-slate-200">
                    {question.sourceFile}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Texto de la pregunta */}
          <div className="mb-6 md:mb-8 animate-fade-up delay-75">
            <h2 className="font-sans text-xl md:text-2xl leading-relaxed text-slate-900 font-medium">
              <FormattedText text={question.questionText} />
            </h2>
          </div>

          {/* Imagen con marco decorativo */}
          {question.imageLink && (
            <div className="mb-6 md:mb-8 animate-fade-up delay-100">
              <div className="rounded-2xl border-4 border-brand-accent/20 p-2 bg-gradient-to-br from-white to-slate-50 shadow-elevation-1">
                <div className="rounded-xl bg-white p-2 md:p-3">
                  <img
                    src={question.imageLink}
                    alt="Imagen de la pregunta"
                    className="max-h-96 object-contain mx-auto rounded-lg cursor-zoom-in"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-sans">
                    <ZoomIn className="w-3 h-3" aria-hidden="true" />
                    <span>Clic para ampliar</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Opciones tipo flashcard */}
          <div className="space-y-3 animate-fade-up delay-150">
            {question.options.map((option, index) => {
              const letter = indexToLetter(index);
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = question.correctAnswer === index;

              // Determinar el estado visual de la opción
              let optionState: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
              if (showFeedback) {
                if (isCorrectAnswer) {
                  optionState = 'correct';
                } else if (isSelected && !isCorrectAnswer) {
                  optionState = 'incorrect';
                }
              } else if (isSelected) {
                optionState = 'selected';
              }

              // Clases para el círculo de letra
              const letterCircleClass = clsx(
                'relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base transition-all duration-150',
                {
                  // Idle: color suavizado por índice
                  [LETTER_BG_IDLE[index] || 'bg-slate-400/50 text-white']:
                    optionState === 'default',
                  // Selected: brand primary + ring glow + pulse ring breve
                  'bg-brand-primary text-white ring-4 ring-brand-primary/20 animate-pulse-ring':
                    optionState === 'selected',
                  // Correct
                  'bg-emerald-500 text-white': optionState === 'correct',
                  // Incorrect
                  'bg-red-500 text-white': optionState === 'incorrect',
                }
              );

              return (
                <button
                  key={index}
                  onClick={() => onSelectAnswer(index)}
                  disabled={showFeedback}
                  aria-pressed={isSelected}
                  aria-label={`Opción ${letter}`}
                  className={clsx(
                    'relative w-full rounded-2xl p-4 md:p-5 text-left transition-all duration-150 flex items-center gap-4 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 shine-hover overflow-hidden',
                    {
                      'border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-elevation-2':
                        optionState === 'default',
                      'border-2 border-brand-primary bg-brand-primary-50 shadow-elevation-2 scale-[1.02]':
                        optionState === 'selected',
                      'border-2 border-emerald-500 bg-emerald-50':
                        optionState === 'correct',
                      'border-2 border-red-500 bg-red-50':
                        optionState === 'incorrect',
                      'cursor-not-allowed opacity-75':
                        showFeedback && optionState === 'default',
                    }
                  )}
                >
                  {/* Círculo letra */}
                  <div className={letterCircleClass}>
                    {optionState === 'correct' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : optionState === 'incorrect' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      letter
                    )}
                  </div>

                  {/* Texto de la opción */}
                  <span
                    className={clsx('flex-1 font-sans text-base md:text-[17px] leading-relaxed', {
                      'text-slate-800': optionState === 'default',
                      'text-brand-primary-800 font-medium': optionState === 'selected',
                      'text-emerald-800 font-medium': optionState === 'correct',
                      'text-red-800': optionState === 'incorrect',
                    })}
                  >
                    <FormattedText text={option} />
                  </span>

                  {/* Check animado al seleccionar (check lateral original) */}
                  {optionState === 'selected' && (
                    <>
                      <Check
                        className="flex-shrink-0 w-5 h-5 text-brand-primary animate-bounce-in"
                        aria-hidden="true"
                      />
                      {/* Check dorado en esquina sup. derecha */}
                      <span
                        className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-accent text-white shadow-elevation-1 animate-bounce-in"
                        aria-hidden="true"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback message */}
          {showFeedback && (
            <div
              className={clsx(
                'mt-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in',
                {
                  'bg-emerald-100 text-emerald-800': isCorrect,
                  'bg-red-100 text-red-800': !isCorrect,
                }
              )}
            >
              {isCorrect ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <span className="font-medium">¡Correcto! +{question.points.toFixed(2)} puntos</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span className="font-medium">
                    {selectedAnswer === null
                      ? 'Tiempo agotado. '
                      : 'Incorrecto. '}
                    La respuesta correcta es la opción {indexToLetter(question.correctAnswer)}.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Reportar error (ghost discreto) con tooltip */}
          <div className="mt-8 flex justify-end">
            <a
              href="https://wa.link/40zqta"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Reportar error en esta pregunta"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Reportar error</span>
              {/* Tooltip */}
              <span className="pointer-events-none absolute right-0 bottom-full mb-2 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-elevation-2 z-30">
                ¿Error en la pregunta?
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
