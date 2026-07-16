import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { X, ExternalLink, LoaderCircle, CircleAlert } from 'lucide-react';

/**
 * Visor modal embebido, reutilizable en toda el Aula (Grabaciones, Materiales, Recursos):
 * ES la pieza que cumple "links externos DENTRO de nuestra plataforma" — en vez de mandar al
 * alumno a otra pestaña, el contenido se ve en un iframe dentro de SimulaUNA.
 *
 * Política de embebido (ver docs/AULA_VIRTUAL_DISENO.md, sección v2):
 * - `youtube` y `drive`: se reescribe la URL a su variante embebible
 *   (youtube-nocookie.com/embed/… y drive.google.com/.../preview) — estas SÍ están diseñadas
 *   por el proveedor para vivir dentro de un iframe de terceros.
 * - `web` (enlace genérico de la hoja `recursos`): se intenta igual, pero muchos sitios
 *   mandan la cabecera `X-Frame-Options`/`Content-Security-Policy: frame-ancestors` que el
 *   navegador respeta bloqueando el iframe — eso no se puede "arreglar" desde el cliente
 *   (ni detectar con certeza: un iframe bloqueado no dispara `onError`, y en algunos
 *   navegadores el evento `load` igual se dispara aunque el contenido no se haya pintado).
 *   Por eso el candado es un *heurístico honesto*, no una detección perfecta: si el iframe
 *   no avisa que cargó en `BLOCK_TIMEOUT_MS`, se asume bloqueado y se muestra un fallback
 *   elegante con el botón "Abrir en pestaña nueva" — nunca una pantalla en blanco muda.
 * - Meet/Zoom (clases en vivo) NUNCA pasan por este visor: ambos proveedores rechazan el
 *   embebido de la videollamada en sí (no solo por cabecera, por diseño del producto), así
 *   que esas tarjetas abren directamente en pestaña nueva — ver ClasesEnVivo.tsx.
 */

export type ResourceKind = 'youtube' | 'drive' | 'web';

const BLOCK_TIMEOUT_MS = 3000;

/** Detecta de qué proveedor es una URL para elegir cómo embeberla (o si no se puede). */
export function detectResourceKind(url: string): ResourceKind {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/drive\.google\.com/i.test(url)) return 'drive';
  return 'web';
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/shorts\/([\w-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractDriveFileId(url: string): string | null {
  const patterns = [/\/file\/d\/([\w-]{10,})/i, /[?&]id=([\w-]{10,})/i, /\/d\/([\w-]{10,})/i];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Thumbnail estático de YouTube (sin API key) para las tarjetas de Grabaciones — `null` si
 * la URL no es de YouTube o no se pudo extraer el id (se degrada a un placeholder liso). */
export function extractYoutubeThumb(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Reescribe una URL "de humano" (la que pega el coordinador en la hoja) a su variante
 * embebible. Si no reconoce el patrón, devuelve la URL original (mejor intentarlo que nada). */
export function toEmbedUrl(url: string, kind: ResourceKind): string {
  if (kind === 'youtube') {
    const id = extractYoutubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : url;
  }
  if (kind === 'drive') {
    const id = extractDriveFileId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }
  return url;
}

export interface ResourceViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Subtítulo corto opcional, ej. "Aritmética · Prof. Rosa Quispe". */
  subtitle?: string;
  url: string;
  kind: ResourceKind;
}

/** Visor modal accesible: role=dialog + aria-modal, focus trap (Tab/Shift+Tab), Escape cierra,
 * devuelve el foco a quien abrió el visor al cerrarse (mismo patrón que QuickSwitch/CoachTour). */
export function ResourceViewer({ open, onClose, title, subtitle, url, kind }: ResourceViewerProps) {
  const [status, setStatus] = useState<'cargando' | 'listo' | 'bloqueado'>('cargando');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const embedUrl = toEmbedUrl(url, kind);

  useEffect(() => {
    if (!open) return;
    setStatus('cargando');
    const timeout = window.setTimeout(() => setStatus((s) => (s === 'cargando' ? 'bloqueado' : s)), BLOCK_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [open, embedUrl]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    restoreFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm motion-safe:animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-viewer-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-3xl card-elevated bg-white rounded-2xl overflow-hidden flex flex-col motion-safe:animate-fade-up"
        style={{ maxHeight: 'min(85vh, 720px)' }}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h2 id="resource-viewer-title" className="font-display font-bold text-slate-800 text-sm sm:text-base truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-white min-h-[36px]"
              style={{ backgroundColor: 'var(--uni-primary-safe, #003D7A)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Abrir en pestaña nueva</span>
            </a>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor"
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 min-h-[280px] bg-slate-50">
          {status !== 'bloqueado' && (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={title}
              onLoad={() => setStatus('listo')}
              onError={() => setStatus('bloqueado')}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}

          {status === 'cargando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <LoaderCircle className="w-6 h-6 animate-spin motion-reduce:animate-none" style={{ color: 'var(--uni-primary-safe, #003D7A)' }} aria-hidden="true" />
              <p className="text-xs text-slate-400">Cargando…</p>
            </div>
          )}

          {status === 'bloqueado' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <CircleAlert className="w-8 h-8 text-slate-400" aria-hidden="true" />
              <p className="font-semibold text-slate-700 text-sm max-w-xs">
                Este recurso no permite verse embebido dentro de SimulaUNA.
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Algunos sitios bloquean el visor por seguridad. Ábrelo en una pestaña nueva para verlo completo.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow !px-4 !py-2 text-sm text-white mt-1"
                style={{ backgroundColor: 'var(--uni-primary-safe, #003D7A)' }}
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Abrir en pestaña nueva
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResourceViewer;
