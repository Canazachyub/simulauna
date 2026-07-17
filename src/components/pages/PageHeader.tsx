import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';

/**
 * Header minimal y consistente para las páginas nacionales (Nosotros, FAQ,
 * Términos): logo que vuelve al inicio + un "Inicio" explícito. No es la
 * LandingNavbar completa (esa vive solo en Landing.tsx) — estas páginas no
 * necesitan scrollspy ni menú hamburguesa, solo una salida clara.
 */
export function PageHeader() {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-brand-primary-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-4 h-4 text-white" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-black text-display-tight text-brand-primary-700">
            SimulaUNA
          </span>
        </button>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-brand-primary-700 transition-colors min-h-[44px] px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Inicio
        </button>
      </div>
    </header>
  );
}

export default PageHeader;
