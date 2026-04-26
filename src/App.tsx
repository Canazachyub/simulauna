import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './components/Landing';
import { StudentForm } from './components/StudentForm';
import { ExamConfirmation } from './components/ExamConfirmation';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { Banqueo } from './components/Banqueo';
import { BanqueoCepreuna } from './components/BanqueoCepreuna';
import { BanqueoPorTema } from './components/BanqueoPorTema';
import { SimulacroCepreuna } from './components/SimulacroCepreuna';
import { AuthProvider } from './context/AuthContext';

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/registro" element={<StudentForm />} />
          <Route path="/confirmar" element={<ExamConfirmation />} />
          <Route path="/examen" element={<Quiz />} />
          <Route path="/resultados" element={<Results />} />
          <Route path="/banqueo" element={<Banqueo />} />
          <Route path="/banqueo-cepreuna" element={<BanqueoCepreuna />} />
          <Route path="/banqueo-tema" element={<BanqueoPorTema />} />
          <Route path="/simulacro-cepreuna" element={<SimulacroCepreuna />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
