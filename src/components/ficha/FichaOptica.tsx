/* -------------------------------------------------------------------------- */
/*  Ficha óptica: hoja de respuestas tipo examen de admisión real.            */
/*                                                                            */
/*  Se usa en dos lugares:                                                    */
/*  - Quiz (modo 'marcar'): marcar una burbuja guarda la respuesta igual que  */
/*    tocar la opción en la pregunta; tocar el número lleva a esa pregunta.   */
/*  - Results (modo 'corregida'): verde = correcta, rojo = incorrecta (con la */
/*    correcta indicada con anillo verde), gris = en blanco. Tocar una fila   */
/*    abre la revisión de esa pregunta.                                       */
/*                                                                            */
/*  Responsiva sin escalar con transform: el número de columnas depende del   */
/*  ancho del contenedor (container queries en ficha.css).                    */
/* -------------------------------------------------------------------------- */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import type { Question } from '../../types';
import { prefersReducedMotion } from '../motion/hooks';
import './ficha.css';

const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

export type FichaModo = 'marcar' | 'corregida';

/** Lo mínimo que la ficha necesita de cada pregunta. */
export type FichaPregunta = Pick<Question, 'id' | 'subject' | 'options'> & {
  correctAnswer?: number | null;
};

export interface FichaOpticaProps {
  preguntas: FichaPregunta[];
  /** Opción marcada por índice de pregunta (null = en blanco). */
  marcadas: (number | null)[];
  modo: FichaModo;
  /** Índice de la pregunta actual (marcar) o en revisión (corregida): se resalta su fila. */
  actual?: number | null;
  /** Marcar (opción) o borrar (null) una respuesta. */
  onMarcar?: (index: number, opcion: number | null) => void;
  /** Ir a la pregunta / abrir su revisión. */
  onIr?: (index: number) => void;
  /** Tocar de nuevo la burbuja marcada la borra (solo si el store lo soporta). */
  permitirDesmarcar?: boolean;
  /** Corregida: acierto por pregunta según el servidor (null = sin dato → se compara con la clave). */
  aciertos?: (boolean | null)[];
  universidad: { nombre: string; logoUrl?: string };
  postulante?: { nombre?: string; dni?: string };
  /** Desplaza la hoja hasta la fila actual cuando cambia (drawer / panel del examen). */
  seguirActual?: boolean;
  className?: string;
}

interface GrupoCurso {
  curso: string;
  indices: number[];
}

/** Agrupa preguntas CONSECUTIVAS del mismo curso (el orden del examen manda). */
function agruparPorCurso(preguntas: FichaPregunta[]): GrupoCurso[] {
  const grupos: GrupoCurso[] = [];
  preguntas.forEach((p, i) => {
    const curso = p.subject || 'Preguntas';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.curso === curso) ultimo.indices.push(i);
    else grupos.push({ curso, indices: [i] });
  });
  return grupos;
}

function numOpciones(p: FichaPregunta): number {
  const n = Array.isArray(p.options) ? p.options.length : 0;
  return n > 0 ? Math.min(n, LETRAS.length) : LETRAS.length;
}

/** Clave válida (0-based) o null si la pregunta llegó sin clave (contrato v2 antes de calificar). */
function claveDe(p: FichaPregunta): number | null {
  const c = p.correctAnswer;
  return typeof c === 'number' && c >= 0 && c < numOpciones(p) ? c : null;
}

type EstadoFila = 'ok' | 'mal' | 'blanco' | 'neutra';

export function FichaOptica({
  preguntas,
  marcadas,
  modo,
  actual = null,
  onMarcar,
  onIr,
  permitirDesmarcar = false,
  aciertos,
  universidad,
  postulante,
  seguirActual = false,
  className,
}: FichaOpticaProps) {
  const zonaRef = useRef<HTMLDivElement>(null);
  const [logoRoto, setLogoRoto] = useState(false);
  // Solo la burbuja recién marcada se anima (no todas al abrir el drawer)
  const [recienMarcada, setRecienMarcada] = useState<string | null>(null);

  const grupos = useMemo(() => agruparPorCurso(preguntas), [preguntas]);
  const corregida = modo === 'corregida';

  // Estado por fila en modo corregida
  const estados = useMemo<EstadoFila[]>(() => {
    if (!corregida) return [];
    return preguntas.map((p, i) => {
      const sel = marcadas[i] ?? null;
      if (sel === null) return 'blanco';
      const clave = claveDe(p);
      const acierto = clave !== null ? (aciertos?.[i] ?? sel === clave) : (aciertos?.[i] ?? null);
      if (acierto === true) return 'ok';
      if (acierto === false && clave !== null) return 'mal';
      return 'neutra';
    });
  }, [corregida, preguntas, marcadas, aciertos]);

  const totalMarcadas = useMemo(() => marcadas.filter(m => m !== null && m !== undefined).length, [marcadas]);

  // Seguir la fila actual (sin mover la página cuando la hoja está fuera de pantalla)
  useEffect(() => {
    if (!seguirActual || actual === null || actual === undefined) return;
    const fila = zonaRef.current?.querySelector<HTMLElement>(`[data-fila="${actual}"]`);
    fila?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [actual, seguirActual]);

  const marcar = (index: number, opcion: number) => {
    if (!onMarcar) return;
    if (marcadas[index] === opcion) {
      if (permitirDesmarcar) {
        setRecienMarcada(null);
        onMarcar(index, null);
      }
      return;
    }
    setRecienMarcada(`${index}-${opcion}`);
    onMarcar(index, opcion);
  };

  const renderFilaMarcar = (index: number, par: boolean) => {
    const p = preguntas[index];
    const sel = marcadas[index] ?? null;
    const esActual = actual === index;
    const n = numOpciones(p);
    return (
      <div
        key={p.id}
        data-fila={index}
        className={clsx('ficha-fila', par && 'ficha-fila--par', esActual && 'ficha-fila--actual')}
        aria-current={esActual ? 'step' : undefined}
      >
        <button
          type="button"
          className="ficha-num"
          onClick={() => onIr?.(index)}
          aria-label={`Ir a la pregunta ${index + 1}${esActual ? ' (actual)' : ''}`}
        >
          {index + 1}
        </button>
        {LETRAS.slice(0, n).map((letra, o) => {
          const marcada = sel === o;
          return (
            <button
              key={letra}
              type="button"
              className={clsx(
                'ficha-burbuja',
                marcada && 'is-marcada',
                marcada && recienMarcada === `${index}-${o}` && 'bubble-fill'
              )}
              aria-label={`Pregunta ${index + 1}, opción ${letra}`}
              aria-pressed={marcada}
              onClick={() => marcar(index, o)}
            >
              {letra}
            </button>
          );
        })}
      </div>
    );
  };

  const renderFilaCorregida = (index: number, par: boolean) => {
    const p = preguntas[index];
    const sel = marcadas[index] ?? null;
    const clave = claveDe(p);
    const estado = estados[index];
    const n = numOpciones(p);
    const enRevision = actual === index;

    const partes = [
      `Pregunta ${index + 1}`,
      sel === null ? 'en blanco' : `marcaste ${LETRAS[sel] ?? '?'}`,
    ];
    if (estado === 'ok') partes.push('correcta');
    if (estado === 'mal') partes.push('incorrecta');
    if (clave !== null && estado !== 'ok') partes.push(`la correcta es ${LETRAS[clave]}`);
    if (clave === null) partes.push('sin clave disponible');
    const descripcion = partes.join(', ');

    const burbujas = LETRAS.slice(0, n).map((letra, o) => {
      const esMarcada = sel === o;
      const clase = esMarcada
        ? estado === 'ok' ? 'ficha-burbuja--ok' : estado === 'mal' ? 'ficha-burbuja--mal' : 'ficha-burbuja--neutra'
        : clave === o ? 'ficha-burbuja--clave' : undefined;
      return (
        <span key={letra} className={clsx('ficha-burbuja', clase)} aria-hidden="true">
          {esMarcada && estado === 'ok' ? (
            <Check className="w-3.5 h-3.5" strokeWidth={3.5} />
          ) : esMarcada && estado === 'mal' ? (
            <X className="w-3.5 h-3.5" strokeWidth={3.5} />
          ) : (
            letra
          )}
        </span>
      );
    });

    const clases = clsx(
      'ficha-fila',
      par && 'ficha-fila--par',
      estado === 'blanco' && 'ficha-fila--blanco',
      enRevision && 'ficha-fila--revisando'
    );

    if (onIr) {
      return (
        <button
          key={p.id}
          type="button"
          data-fila={index}
          className={clsx(clases, 'ficha-fila--boton')}
          onClick={() => onIr(index)}
          aria-label={`${descripcion}. Ver revisión`}
          aria-current={enRevision ? 'true' : undefined}
        >
          <span className="ficha-num" aria-hidden="true">{index + 1}</span>
          {burbujas}
        </button>
      );
    }
    return (
      <div key={p.id} data-fila={index} className={clases} role="group" aria-label={descripcion}>
        <span className="ficha-num" aria-hidden="true">{index + 1}</span>
        {burbujas}
      </div>
    );
  };

  const renderFila = corregida ? renderFilaCorregida : renderFilaMarcar;

  return (
    <section
      className={clsx('ficha', corregida && 'ficha--corregida', className)}
      aria-label={corregida ? 'Ficha de respuestas corregida' : 'Ficha de respuestas'}
    >
      {/* Cabecera institucional */}
      <header className="ficha-cabecera">
        {universidad.logoUrl && !logoRoto && (
          <img
            src={universidad.logoUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="ficha-logo"
            onError={() => setLogoRoto(true)}
          />
        )}
        <div className="ficha-cabecera-textos">
          <span className="ficha-universidad">{universidad.nombre}</span>
          <h3 className="ficha-titulo">HOJA DE RESPUESTAS</h3>
          <span className="ficha-subtitulo">
            Simulacro de admisión · {preguntas.length} preguntas
            {!corregida && ` · ${totalMarcadas} marcadas`}
          </span>
        </div>
      </header>

      {postulante && (postulante.nombre || postulante.dni) && (
        <div className="ficha-datos">
          <div className="ficha-dato">
            <span className="ficha-dato-etiqueta">Postulante</span>
            <span className="ficha-dato-valor" title={postulante.nombre}>{postulante.nombre || '—'}</span>
          </div>
          <div className="ficha-dato">
            <span className="ficha-dato-etiqueta">DNI</span>
            <span className="ficha-dato-valor ficha-dato-valor--mono">{postulante.dni || '—'}</span>
          </div>
        </div>
      )}

      {corregida ? (
        <div className="ficha-leyenda" aria-label="Leyenda">
          <span className="ficha-leyenda-item">
            <span className="ficha-muestra ficha-muestra--ok" aria-hidden="true"><Check className="w-3 h-3" strokeWidth={3.5} /></span>
            Correcta
          </span>
          <span className="ficha-leyenda-item">
            <span className="ficha-muestra ficha-muestra--mal" aria-hidden="true"><X className="w-3 h-3" strokeWidth={3.5} /></span>
            Incorrecta
          </span>
          <span className="ficha-leyenda-item">
            <span className="ficha-muestra ficha-muestra--clave" aria-hidden="true">A</span>
            Respuesta correcta
          </span>
          <span className="ficha-leyenda-item">
            <span className="ficha-muestra ficha-muestra--blanco" aria-hidden="true">A</span>
            En blanco
          </span>
        </div>
      ) : (
        <p className="ficha-instrucciones">
          <strong>Instrucciones:</strong> rellena el círculo completamente{' '}
          <span className="ficha-instrucciones-ejemplo" aria-hidden="true">
            <span className="ficha-muestra ficha-muestra--llena">C</span>
          </span>{' '}
          y marca una sola alternativa por pregunta.
          {permitirDesmarcar && ' Toca de nuevo una burbuja para borrarla.'} Toca el número para ir a esa pregunta.
        </p>
      )}

      {/* Filas en columnas (orden vertical, como la hoja de papel) */}
      <div className="ficha-zona" ref={zonaRef}>
        <div className="ficha-columnas">
          {grupos.map(grupo => {
            const conteo = corregida
              ? `${grupo.indices.filter(i => estados[i] === 'ok').length}/${grupo.indices.length}`
              : `${grupo.indices.filter(i => marcadas[i] !== null && marcadas[i] !== undefined).length}/${grupo.indices.length}`;
            const [primero, ...resto] = grupo.indices;
            return (
              <Fragment key={`${grupo.curso}-${primero}`}>
                <div className="ficha-curso-inicio">
                  <h4 className="ficha-curso">
                    <span className="ficha-curso-nombre">{grupo.curso}</span>
                    <span className="ficha-curso-conteo">
                      <span aria-hidden="true">{conteo}</span>
                      <span className="sr-only">{corregida ? `${conteo} correctas` : `${conteo} marcadas`}</span>
                    </span>
                  </h4>
                  {renderFila(primero, primero % 2 === 1)}
                </div>
                {resto.map(i => renderFila(i, i % 2 === 1))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FichaOptica;
