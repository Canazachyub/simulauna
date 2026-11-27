/* -------------------------------------------------------------------------- */
/*  Footer del Landing. Universidades derivadas del registro maestro.         */
/* -------------------------------------------------------------------------- */
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { scrollToSection, useLandingUniversities } from './landingData';

const linkBtn = 'inline-flex items-center min-h-[40px] text-left hover:text-white transition-colors';

export function LandingFooter() {
  const { activas, proximas } = useLandingUniversities();

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
                <span className="block font-display font-black text-white text-lg leading-none">Sinapsis Preu</span>
                <span className="block text-xs text-white/60 mt-0.5">Simulacros de admisión</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Simulacros de examen de admisión y banqueo de preguntas con exámenes pasados de la UNA Puno, la UNSA, San Marcos, la UNT, la UNC y la UNCP.
            </p>
          </div>

          <div>
            <p className="font-bold text-white uppercase tracking-wider text-xs mb-3">Universidades</p>
            <ul className="text-sm">
              {activas.map(u => (
                <li key={u.codigo}>
                  <Link to={`/${u.codigo}`} className={linkBtn}>
                    Simulacro {u.nombreCorto}
                    {u.estado === 'piloto' && <span className="ml-1 text-xs text-white/60">· Beta</span>}
                  </Link>
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
              <li><Link to="/una/cepre" className={linkBtn}>Simulacro y banqueo CEPREUNA</Link></li>
              <li><Link to="/una/banqueo-tema" className={linkBtn}>Banqueo por tema</Link></li>
              <li><Link to="/una/banqueo" className={linkBtn}>Banqueo histórico</Link></li>
              <li><a href="/una/preguntas/" className={linkBtn}>Preguntas por curso</a></li>
              <li><a href="/una/examenes/" className={linkBtn}>Exámenes por año</a></li>
              <li><Link to="/una/aula" className={linkBtn}>Aula virtual</Link></li>
              <li>
                <a href="https://ceprem.unap.edu.pe" target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  Web oficial CEPREUNA
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-white uppercase tracking-wider text-xs mb-3">Sinapsis Preu</p>
            <ul className="text-sm">
              <li><Link to="/nosotros" className={linkBtn}>Nosotros</Link></li>
              <li><Link to="/preguntas-frecuentes" className={linkBtn}>Preguntas frecuentes</Link></li>
              <li><Link to="/terminos" className={linkBtn}>Términos y privacidad</Link></li>
              <li>
                <a href={whatsappUrl('Hola, quiero información sobre Sinapsis Preu')} target="_blank" rel="noopener noreferrer" className={linkBtn}>
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
          <p>© {new Date().getFullYear()} Sinapsis Preu · Todos los derechos reservados</p>
          <p>Hecho en Puno, Perú — para los postulantes de todo el país</p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
