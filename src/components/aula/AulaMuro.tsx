import { Eye } from 'lucide-react';
import { AulaBienvenida } from './AulaBienvenida';
import { HoyEnTuAula } from './HoyEnTuAula';
import { HorarioSemanal } from './HorarioSemanal';
import { MaterialesCurso } from './MaterialesCurso';
import { AnunciosCoordinador } from './AnunciosCoordinador';
import { EstadoPagos } from './EstadoPagos';
import { MiGrupoWhatsapp } from './MiGrupoWhatsapp';
import { MisSimulacrosCiclo } from './MisSimulacrosCiclo';
import { getAulaMock, getProximaClaseMock, getMaterialDestacadoMock } from './aulaMock';

interface AulaMuroProps {
  /** Código de universidad activa (para theming/tono y para armar el mock). */
  universidad: string;
  nombreUniversidad: string;
  /** Enlace de WhatsApp para "reportar pago" / dudas (mismo canal que la lista de espera). */
  whatsappHref: string;
  /** Ruta al simulacro del ciclo (CEPRE) de esta universidad. */
  cepreHref: string;
  /**
   * true = se está mostrando dentro de la vista previa de AulaComingSoon
   * (datos de ejemplo, interacciones deshabilitadas, ribbon visible).
   * false = uso "real" del muro cuando exista un ciclo activo de verdad
   * (backend v2.1, ver docs/AULA_VIRTUAL_DISENO.md §10).
   */
  preview?: boolean;
  /**
   * La mascota debe aparecer UNA sola vez por página. AulaComingSoon ya la
   * muestra en su hero, así que al embeber el muro ahí se pasa `false`.
   */
  showWelcome?: boolean;
}

/**
 * El muro curado del Aula — bento fijo, cero configuración del alumno
 * (docs/AULA_VIRTUAL_DISENO.md §0 y §7). Compone las secciones sobre el
 * agregado `getAulaMock` (espejo exacto de la futura action `getAula`,
 * ver §10 y §12 del documento de diseño).
 */
export function AulaMuro({ universidad, nombreUniversidad, whatsappHref, cepreHref, preview = false, showWelcome = true }: AulaMuroProps) {
  const aula = getAulaMock(universidad, nombreUniversidad);
  const proximaClase = getProximaClaseMock(aula.horario);
  const materialDestacado = getMaterialDestacadoMock(aula.materiales);
  const interactive = !preview;

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
          <p className="text-xs text-slate-400">Así se verá tu aula cuando tengas un ciclo activo matriculado.</p>
        </div>
      )}

      {showWelcome && <AulaBienvenida nombreCiclo={aula.ciclo.nombre} />}

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:grid-flow-row-dense ${preview ? '[filter:saturate(0.88)_blur(0.4px)]' : ''}`}
      >
        <HoyEnTuAula proximaClase={proximaClase} materialDestacado={materialDestacado} interactive={interactive} />
        <HorarioSemanal horario={aula.horario} />
        <AnunciosCoordinador anuncios={aula.anuncios} />
        <MaterialesCurso materiales={aula.materiales} interactive={interactive} />
        <EstadoPagos pagos={aula.pagos} whatsappHref={whatsappHref} interactive={interactive} />
        <MiGrupoWhatsapp grupo={aula.grupoWhatsapp} interactive={interactive} />
        <MisSimulacrosCiclo simulacros={aula.simulacrosCiclo} cepreHref={cepreHref} interactive={interactive} />
      </div>
    </div>
  );
}

export default AulaMuro;
