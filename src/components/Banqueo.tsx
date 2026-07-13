import { PracticeSession } from './practice/PracticeSession';
import { banqueoMode } from './practice/practiceModes';

/**
 * Banqueo histórico: wrapper delgado sobre el motor único de práctica (ver
 * docs/CONTRATO_API_V2.md §5 y src/components/practice/PracticeSession.tsx).
 */
export function Banqueo() {
  return <PracticeSession mode={banqueoMode} />;
}
