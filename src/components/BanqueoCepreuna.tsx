import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useUniversityStore } from '../hooks/useUniversity';
import { PracticeSession } from './practice/PracticeSession';
import { createCepreMode } from './practice/practiceModes';

/**
 * Banqueo/simulacro del proceso CEPRE de la universidad activa: wrapper delgado sobre el motor
 * único de práctica (ver docs/CONTRATO_API_V2.md §5). Es la base elegida para converger lo que
 * antes eran BanqueoCepreuna + SimulacroCepreuna en la ruta única /:universidad/cepre. El
 * nombre visible (cepreNombre, ej. CEPREUNA, CEPRUNSA) viene del registro de universidades, no
 * hardcodeado, por eso construimos el `PracticeMode` vía fábrica en tiempo de render.
 */
export function BanqueoCepreuna() {
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const universidad = activaUniversidad || universidadParam || 'una';
  const registro = useUniversityStore(state => state.registro);
  const cepreNombre = registro.find(u => u.codigo === universidad)?.cepreNombre || 'CEPREUNA';

  const mode = useMemo(() => createCepreMode(cepreNombre), [cepreNombre]);

  return <PracticeSession mode={mode} />;
}
