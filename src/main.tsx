import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { reloadOnceForChunkError } from './utils/lazyWithRetry';
import './index.css';

// Vite emite `vite:preloadError` cuando falla la precarga de un chunk/CSS (típico tras un
// deploy: los hashes viejos ya no existen). Recargamos UNA vez para traer el index.html nuevo;
// si ya se recargó hace poco, dejamos que el error llegue al ErrorBoundary.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForChunkError()) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
