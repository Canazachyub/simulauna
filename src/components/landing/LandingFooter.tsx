/* -------------------------------------------------------------------------- */
/*  Footer del Landing. Universidades derivadas del registro maestro.         */
/* -------------------------------------------------------------------------- */
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { scrollToSection, useLandingUniversities } from './landingData';

const linkBtn = 'inline-flex items-center min-h-[40px] text-left hover:text-white transition-colors';

export function LandingFooter() {
  const navigate = useNavigate();
  const { activas, proximas, irAUniversidad } = useLandingUniversities();

  return (
    <footer className="bg-slate-900 text-white/75 pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-xl bg-brand-accent-500 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-brand-primary-900" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-display font-black text-white text-lg leading-none">SimulaUNA</span>
                <span className="block text-xs text-white/60 mt-0.5">por SINAPSIS</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Simulacros y bancos de preguntas con exámenes de admisión pasados de las universidades del Perú.
            </p>
          </div>

          <div>
            <p className="font-bold text-white uppercase tracking-wider text-xs mb-3">Universidades</p>
            <ul className="text-sm">
              {activas.map(u => (
                <li key={u.codigo}>
                  <button type="button" onClick={() => irAUniversidad(u.codigo)} className={linkBtn}>
                    {u.nombreCorto}
                    {u.estado === 'piloto' && <span className="ml-1 text-xs text-white/60">· Beta</span>}
                  </button>
                </li>
              ))}
              {proximas.length > 0 && (
                <li>
                  <button type="button" onClick={() => scrollToSection('universidades')} className={linkBtn}>
                    +{proximas.length} llegan pronto
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="font-bold text-white uppercase tracking-wider text-xs mb-3">Practicar · UNA Puno</p>
            <ul className="text-sm">
              <li><button type="button" onClick={() => navigate('/una/cepre')} className={linkBtn}>Simulacro y banqueo CEPREUNA</button></li>
              <li><button type="button" onClick={() => navigate('/una/banqueo-tema')} className={linkBtn}>Banqueo por tema</button></li>
              <li><button type="button" onClick={() => navigate('/una/banqueo')} className={linkBtn}>Banqueo histórico</button></li>
              <li><button type="button" onClick={() => navigate('/una/aula')} className={linkBtn}>Aula virtual</button></li>
              <li>
                <a href="https://ceprem.unap.edu.pe" target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  Web oficial CEPREUNA
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-white uppercase tracking-wider text-xs mb-3">SimulaUNA</p>
            <ul className="text-sm">
              <li><button type="button" onClick={() => navigate('/nosotros')} className={linkBtn}>Nosotros</button></li>
              <li><button type="button" onClick={() => navigate('/preguntas-frecuentes')} className={linkBtn}>Preguntas frecuentes</button></li>
              <li><button type="button" onClick={() => navigate('/terminos')} className={linkBtn}>Términos y privacidad</button></li>
              <li>
                <a href={whatsappUrl('Hola, quiero información sobre SimulaUNA')} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  WhatsApp
                </a>
              </li>
            </ul>
            <p className="text-xs mt-3 text-white/60">
              Proyecto independiente, no afiliado oficialmente a ninguna universidad. Preguntas de exámenes públicos.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/60 text-center">
          <p>© {new Date().getFullYear()} SimulaUNA · Todos los derechos reservados</p>
          <p>Hecho en Puno, Perú — para los postulantes de todo el país</p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
