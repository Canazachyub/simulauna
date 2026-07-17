import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, GraduationCap, ArrowRight } from 'lucide-react';
import { useUniversityStore } from '../../hooks/useUniversity';
import { Mascot } from './Mascot';
import { goToUniversidades } from './navHelpers';

const GOLD_GLOW = { '--uni-primary': '#D4AF37' } as CSSProperties;

/**
 * 404 real (reemplaza el antiguo catch-all `*` → Navigate a '/' de App.tsx).
 * Fondo "universo" propio (bg-universo-nebulosa, ya usado en el hero del
 * Landing) con un scrim fuerte para garantizar AA sobre el texto blanco —
 * ver docs/DIRECCION_DISENO_V3.md. La mascota lobito-perdido es puramente
 * decorativa (Mascot ya se auto-retira con onError si el asset aún no
 * existe), así que el resto de la página funciona igual con o sin ella.
 */
export function NotFound() {
  const navigate = useNavigate();
  const registro = useUniversityStore((state) => state.registro);
  const loadRegistro = useUniversityStore((state) => state.loadRegistro);

  useEffect(() => {
    document.title = 'Página no encontrada · SimulaUNA';
  }, []);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  // Mismo criterio de resiliencia que App.tsx (UniversityGate): 'una' siempre
  // navegable aunque el registro v2 no haya cargado todavía; el resto de
  // universidades activas/piloto se suman dinámicamente cuando existan.
  const activasRegistro = registro.filter((u) => u.estado === 'activa' || u.estado === 'piloto');
  const universidades = activasRegistro.some((u) => u.codigo === 'una')
    ? activasRegistro
    : [{ codigo: 'una', nombreCorto: 'UNA Puno' }, ...activasRegistro];

  return (
    <div className="relative min-h-screen flex items-center overflow-hidden bg-[#001529] text-white">
      {/* Fondo "universo" propio — mismo asset que el hero del Landing */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage: "url('/simulauna/illustrations/bg-universo-nebulosa.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Scrim fuerte para garantizar contraste AA del texto blanco sobre la nebulosa */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#001529]/75 via-[#001529]/85 to-[#001529] pointer-events-none" />
      <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
      <div className="absolute inset-0 noise opacity-30 pointer-events-none" />

      <div className="relative container mx-auto px-4 sm:px-6 py-20 md:py-28 max-w-2xl text-center">
        <Mascot
          src="/simulauna/illustrations/lobito-perdido.webp"
          alt="Mascota SimulaUNA: un lobito perdido mirando un mapa al revés"
          className="w-44 sm:w-56 md:w-64 mx-auto mb-6 animate-float-y drop-shadow-2xl select-none"
        />

        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-5 text-brand-accent-300">
          Error 404
        </span>

        <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.5)]">
          Ups, el lobito se perdió buscando esta página
        </h1>

        <p className="mt-5 text-white/85 text-base md:text-lg max-w-prose mx-auto leading-relaxed">
          Este camino no existe o cambió de lugar. Tranquilo, no eres tú — es el mapa. Te ayudamos a
          volver a donde sí puedes practicar.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            style={GOLD_GLOW}
            className="btn-glow bg-brand-accent-500 text-brand-primary-900 min-h-[44px] w-full sm:w-auto"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            Ir al inicio
          </button>
          <button
            onClick={() => goToUniversidades(navigate)}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border-2 border-white/30 font-bold text-white hover:bg-white/10 hover:border-white/60 transition-all min-h-[44px] w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <GraduationCap className="w-5 h-5" aria-hidden="true" />
            Elegir universidad
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {universidades.length > 0 && (
          <div className="mt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-3">
              O ve directo a tu universidad
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {universidades.map((u) => (
                <button
                  key={u.codigo}
                  onClick={() => navigate(`/${u.codigo}`)}
                  className="uni-hover-chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/25 text-white text-xs sm:text-sm font-bold hover:bg-white/20 hover:border-white/50 transition-colors min-h-[44px]"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-brand-accent-300" aria-hidden="true" />
                  {u.nombreCorto}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotFound;
