import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, Home } from 'lucide-react';
import { Mascot } from './pages/Mascot';
import { isChunkLoadError } from '../utils/lazyWithRetry';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Si cambia (p.ej. la ruta actual), el boundary se reinicia y vuelve a intentar renderizar. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Red de seguridad global: cualquier error de render (o un chunk lazy que no carga tras un
 * deploy, ver utils/lazyWithRetry.ts) muestra una pantalla amable con el lobito en vez de la
 * pantalla en blanco. No usa React Router (puede estar fuera del Router), por eso los enlaces
 * son <a> normales con el basename /simulauna.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Sinapsis Preu] Error no controlado en la interfaz:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isNewVersion = isChunkLoadError(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-andean-white px-4 py-12">
        <div className="max-w-md w-full text-center">
          <Mascot
            src="/illustrations/lobito-pensando.webp"
            alt="Mascota Sinapsis Preu: un lobito pensativo"
            className="w-40 sm:w-48 mx-auto mb-6 select-none"
          />
          <h1 className="font-display text-3xl font-black text-slate-900 mb-3">
            {isNewVersion ? 'Hay una versión nueva' : 'Algo salió mal'}
          </h1>
          <p className="text-slate-600 font-medium mb-2 leading-relaxed">
            {isNewVersion
              ? 'Actualizamos Sinapsis Preu mientras la tenías abierta. Vuelve a cargar la página para continuar.'
              : 'Tuvimos un problema al mostrar esta pantalla. Vuelve a cargar la página e inténtalo otra vez.'}
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Si estabas dando un simulacro, tus respuestas quedan guardadas en este dispositivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-3 rounded-xl bg-brand-primary-600 text-white font-bold hover:brightness-110 active:scale-[0.98] transition"
            >
              <RotateCcw className="w-4 h-4" />
              Volver a cargar
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
            >
              <Home className="w-4 h-4" />
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
