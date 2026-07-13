import { PracticeSession } from './practice/PracticeSession';
import { banqueoTemaMode } from './practice/practiceModes';

/**
 * Banqueo por Tema: wrapper delgado sobre el motor único de práctica (ver
 * docs/CONTRATO_API_V2.md §5 y src/components/practice/PracticeSession.tsx).
 */
export function BanqueoPorTema() {
  return <PracticeSession mode={banqueoTemaMode} />;
}
