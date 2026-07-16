import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Eye,
  Home,
  Video,
  Clapperboard,
  BookMarked,
  CalendarDays,
  Megaphone,
  Trophy,
  Wallet,
  Users,
  Compass,
  type LucideIcon,
} from 'lucide-react';
import { AulaBienvenida } from './AulaBienvenida';
import { InicioResumen } from './InicioResumen';
import { ClasesEnVivo } from './ClasesEnVivo';
import { Grabaciones } from './Grabaciones';
import { MaterialesCurso } from './MaterialesCurso';
import { HorarioSemanal } from './HorarioSemanal';
import { AnunciosCoordinador } from './AnunciosCoordinador';
import { MisSimulacrosCiclo } from './MisSimulacrosCiclo';
import { EstadoPagos } from './EstadoPagos';
import { MiGrupoWhatsapp } from './MiGrupoWhatsapp';
import { RecursosExternos } from './RecursosExternos';
import { getAulaMock } from './aulaMock';

export type SectionId =
  | 'inicio'
  | 'clases'
  | 'grabaciones'
  | 'materiales'
  | 'horario'
  | 'anuncios'
  | 'simulacros'
  | 'pagos'
  | 'grupo'
  | 'recursos';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'clases', label: 'Clases en vivo', icon: Video },
  { id: 'grabaciones', label: 'Grabaciones', icon: Clapperboard },
  { id: 'materiales', label: 'Materiales', icon: BookMarked },
  { id: 'horario', label: 'Horario', icon: CalendarDays },
  { id: 'anuncios', label: 'Anuncios', icon: Megaphone },
  { id: 'simulacros', label: 'Mis simulacros', icon: Trophy },
  { id: 'pagos', label: 'Mis pagos', icon: Wallet },
  { id: 'grupo', label: 'Mi grupo', icon: Users },
  { id: 'recursos', label: 'Recursos', icon: Compass },
];

function seccionInicialDesdeHash(): SectionId {
  if (typeof window === 'undefined') return 'inicio';
  const hash = window.location.hash.replace('#', '');
  return SECTIONS.some((s) => s.id === hash) ? (hash as SectionId) : 'inicio';
}

interface AulaShellProps {
  universidad: string;
  nombreUniversidad: string;
  whatsappHref: string;
  cepreHref: string;
  /** true = vista previa (AulaComingSoon): datos de ejemplo, CTAs reales deshabilitados,
   * ribbon "Vista previa" visible — pero la navegación entre secciones SÍ funciona, para que
   * el alumno sienta la plataforma completa, no solo una captura. */
  preview?: boolean;
  /**
   * La mascota debe aparecer UNA sola vez por página. `AulaComingSoon` ya la muestra en su
   * propio hero, así que al embeber el shell ahí se pasa `showWelcome={false}` (mismo
   * patrón que ya usaba `AulaMuro` en v1).
   */
  showWelcome?: boolean;
}

/**
 * Plataforma del Aula con navegación INTERNA entre secciones (docs/AULA_VIRTUAL_DISENO.md,
 * "Arquitectura de navegación del aula (v2)") — reemplaza al antiguo `AulaMuro` de un solo
 * muro. Tabs horizontales scrollables en móvil + barra lateral compacta en ≥lg. El estado de
 * sección activa es interno (useState), con un hash opcional (`#seccion`) solo para
 * deep-linking — NO se registran rutas nuevas en el router (ver App.tsx, fuera de alcance).
 */
export function AulaShell({ universidad, nombreUniversidad, whatsappHref, cepreHref, preview = false, showWelcome = true }: AulaShellProps) {
  const aula = getAulaMock(universidad, nombreUniversidad);
  const interactive = !preview;
  const [seccion, setSeccion] = useState<SectionId>(seccionInicialDesdeHash);

  // Deep-link opcional: refleja la sección activa en el hash sin generar entradas de
  // historial nuevas (replaceState) y sin depender del router — funciona igual embebido en
  // la vista previa de AulaComingSoon o, el día de mañana, montado directo en /:universidad/aula.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.hash = seccion;
    window.history.replaceState(window.history.state, '', url);
  }, [seccion]);

  const irA = (id: SectionId) => setSeccion(id);

  const single = (node: ReactNode, maxWidth = 'max-w-2xl') => <div className={maxWidth}>{node}</div>;

  const contenido: Record<SectionId, ReactNode> = {
    inicio: <InicioResumen aula={aula} interactive={interactive} onIrASeccion={irA} />,
    clases: <ClasesEnVivo clases={aula.clasesEnVivo} interactive={interactive} />,
    grabaciones: <Grabaciones grabaciones={aula.grabaciones} interactive={interactive} />,
    materiales: <MaterialesCurso materiales={aula.materiales} interactive={interactive} />,
    horario: <HorarioSemanal horario={aula.horario} />,
    anuncios: single(<AnunciosCoordinador anuncios={aula.anuncios} />, 'max-w-2xl'),
    simulacros: single(<MisSimulacrosCiclo simulacros={aula.simulacrosCiclo} cepreHref={cepreHref} interactive={interactive} />, 'max-w-2xl'),
    pagos: single(<EstadoPagos pagos={aula.pagos} whatsappHref={whatsappHref} interactive={interactive} />, 'max-w-2xl'),
    grupo: single(<MiGrupoWhatsapp grupo={aula.grupoWhatsapp} interactive={interactive} />, 'max-w-md'),
    recursos: <RecursosExternos recursos={aula.recursos} interactive={interactive} />,
  };

  return (
    <div className="relative">
      {preview && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 bg-white"
            style={{ borderColor: 'var(--uni-secondary-safe)', color: 'var(--uni-primary-safe)' }}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            Vista previa · datos de ejemplo
          </span>
          <p className="text-xs text-slate-400">
            Navega entre secciones para ver cómo funciona — así se verá tu aula cuando tengas un ciclo activo matriculado.
          </p>
        </div>
      )}

      {showWelcome && <AulaBienvenida nombreCiclo={aula.ciclo.nombre} />}

      <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-6 lg:items-start">
        <nav aria-label="Secciones del aula" className="mb-5 lg:mb-0 lg:sticky lg:top-4">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = seccion === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => irA(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 lg:w-full flex items-center gap-2 px-4 py-2.5 rounded-full lg:rounded-xl text-sm font-bold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                    active ? 'text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  style={
                    {
                      ...(active ? { backgroundColor: 'var(--uni-primary-safe)' } : {}),
                      '--tw-ring-color': 'var(--uni-primary-safe)',
                    } as CSSProperties
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">{contenido[seccion]}</div>
      </div>
    </div>
  );
}

export default AulaShell;
