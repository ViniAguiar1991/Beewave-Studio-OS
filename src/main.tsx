import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AvisoNovaVersao } from './components/AvisoNovaVersao.tsx';
import { iniciarAtualizacaoAutomatica } from './lib/atualizacao.ts';
import './index.css';

iniciarAtualizacaoAutomatica();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <AvisoNovaVersao />
    </ErrorBoundary>
  </StrictMode>,
);



