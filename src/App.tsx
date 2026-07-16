import { useEffect, Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useUniversityStore } from './hooks/useUniversity';

// Todas las rutas son lazy (ver docs/CONTRATO_API_V2.md §5) para no cargar el bundle completo
// en la landing nacional.
const Landing = lazy(() => import('./components/Landing').then(m => ({ default: m.Landing })));
const UniversityPage = lazy(() => import('./components/UniversityPage').then(m => ({ default: m.UniversityPage })));
const StudentForm = lazy(() => import('./components/StudentForm').then(m => ({ default: m.StudentForm })));
const ExamConfirmation = lazy(() => import('./components/ExamConfirmation').then(m => ({ default: m.ExamConfirmation })));
const Quiz = lazy(() => import('./components/Quiz').then(m => ({ default: m.Quiz })));
const Results = lazy(() => import('./components/Results').then(m => ({ default: m.Results })));
const Banqueo = lazy(() => import('./components/Banqueo').then(m => ({ default: m.Banqueo })));
const BanqueoPorTema = lazy(() => import('./components/BanqueoPorTema').then(m => ({ default: m.BanqueoPorTema })));
// BanqueoCepreuna es la base elegida para converger BanqueoCepreuna + SimulacroCepreuna en
// la ruta única /:universidad/cepre (ver componente para el detalle de la decisión).
const CepreSession = lazy(() => import('./components/BanqueoCepreuna').then(m => ({ default: m.BanqueoCepreuna })));
// Placeholder del Aula virtual (LMS aún no construido, ver docs/DIRECCION_DISENO_V3.md §Aulas virtuales).
const AulaComingSoon = lazy(() => import('./components/AulaComingSoon').then(m => ({ default: m.AulaComingSoon })));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-andean-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-primary-200 border-t-brand-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-sans text-sm">Cargando…</p>
      </div>
    </div>
  );
}

/**
 * Valida :universidad contra el registro maestro (getUniversidades) y la marca como activa
 * en useUniversityStore antes de renderizar sus rutas hijas. Universidad inexistente u
 * 'oculta' → redirect a '/'. Si el registro no pudo cargarse (backend v2 aún no desplegado),
 * NO bloqueamos: dejamos pasar para que 'una' (y cualquier :universidad) siga funcionando —
 * "UNA Puno no se cae nunca" también aplica al frontend.
 */
function UniversityGate({ children }: { children: ReactNode }) {
  const { universidad } = useParams<{ universidad: string }>();
  const registro = useUniversityStore(state => state.registro);
  const loading = useUniversityStore(state => state.loading);
  const loadRegistro = useUniversityStore(state => state.loadRegistro);
  const setActiva = useUniversityStore(state => state.setActiva);
  const getUniversidad = useUniversityStore(state => state.getUniversidad);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  useEffect(() => {
    if (universidad) setActiva(universidad);
  }, [universidad, setActiva]);

  if (loading && registro.length === 0) {
    return <RouteFallback />;
  }

  if (registro.length > 0) {
    const uni = getUniversidad(universidad || '');
    if (!uni || uni.estado === 'oculta') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Bloquear clic derecho
    const handleContextMenu = (e: Event) => e.preventDefault();
    // Bloquear atajos de teclado para copiar/ver código fuente
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J'))
      ) {
        // Permitir Ctrl+C en inputs y textareas
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
      }
    };
    // Bloquear arrastrar texto
    const handleDragStart = (e: Event) => e.preventDefault();
    // Bloquear copiar
    const handleCopy = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter basename="/simulauna">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Landing nacional */}
            <Route path="/" element={<Landing />} />

            {/* Rutas por universidad */}
            <Route path="/:universidad" element={<UniversityGate><UniversityPage /></UniversityGate>} />
            <Route path="/:universidad/registro" element={<UniversityGate><StudentForm /></UniversityGate>} />
            <Route path="/:universidad/confirmar" element={<UniversityGate><ExamConfirmation /></UniversityGate>} />
            <Route path="/:universidad/examen" element={<UniversityGate><Quiz /></UniversityGate>} />
            <Route path="/:universidad/resultados" element={<UniversityGate><Results /></UniversityGate>} />
            <Route path="/:universidad/banqueo" element={<UniversityGate><Banqueo /></UniversityGate>} />
            <Route path="/:universidad/banqueo-tema" element={<UniversityGate><BanqueoPorTema /></UniversityGate>} />
            <Route path="/:universidad/cepre" element={<UniversityGate><CepreSession /></UniversityGate>} />
            <Route path="/:universidad/aula" element={<UniversityGate><AulaComingSoon /></UniversityGate>} />

            {/* Redirects legados EXACTOS (react-router-dom v6 prioriza rutas estáticas sobre
                :universidad aunque estén declaradas después, así que estos paths ganan). */}
            <Route path="/registro" element={<Navigate to="/una/registro" replace />} />
            <Route path="/confirmar" element={<Navigate to="/una/confirmar" replace />} />
            <Route path="/examen" element={<Navigate to="/una/examen" replace />} />
            <Route path="/resultados" element={<Navigate to="/una/resultados" replace />} />
            <Route path="/banqueo" element={<Navigate to="/una/banqueo" replace />} />
            <Route path="/banqueo-cepreuna" element={<Navigate to="/una/cepre" replace />} />
            <Route path="/banqueo-tema" element={<Navigate to="/una/banqueo-tema" replace />} />
            <Route path="/simulacro-cepreuna" element={<Navigate to="/una/cepre" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
