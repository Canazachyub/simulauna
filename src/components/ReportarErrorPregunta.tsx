import { Flag } from 'lucide-react';
import { whatsappUrl, WHATSAPP_INSCRIPCION } from '../constants/contact';

interface Props {
  /** Pregunta mostrada (solo se usan los datos para identificarla en el mensaje). */
  question: { id?: string; questionText?: string | null; subject?: string | null; sourceFile?: string | null };
  /** Número visible de la pregunta en el simulacro / banqueo. */
  numero?: number;
  className?: string;
}

/**
 * Botón «¿Hay algún error en esta pregunta? Repórtalo aquí»: abre WhatsApp (mismo número que las
 * inscripciones) con la pregunta ya identificada y un espacio para que el alumno describa el error.
 */
export function ReportarErrorPregunta({ question, numero, className = '' }: Props) {
  const enunciado = String(question.questionText ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const mensaje = [
    'Hola, encontré un error en una pregunta de Sinapsis Preu.',
    numero ? `• Pregunta N.° ${numero}` : null,
    question.subject ? `• Curso: ${question.subject}` : null,
    question.sourceFile ? `• Fuente: ${question.sourceFile}` : null,
    question.id ? `• Código: ${question.id}` : null,
    enunciado ? `• Enunciado: "${enunciado.slice(0, 140)}${enunciado.length > 140 ? '…' : ''}"` : null,
    '',
    'Describe el error (clave, alternativa, imagen, texto…): ',
  ].filter(l => l !== null).join('\n');

  return (
    <a
      href={whatsappUrl(mensaje, WHATSAPP_INSCRIPCION)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm font-medium hover:bg-amber-100 transition-colors ${className}`}
      aria-label="Reportar un error en esta pregunta por WhatsApp"
    >
      <Flag className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>¿Hay algún error en esta pregunta? <span className="underline font-semibold">Repórtalo aquí</span></span>
    </a>
  );
}
