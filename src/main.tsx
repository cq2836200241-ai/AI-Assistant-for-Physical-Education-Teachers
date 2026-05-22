import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import './index.css';
import './styles/print.css';

import { registerSW } from 'virtual:pwa-register';

const isDesktop = import.meta.env.VITE_APP_PLATFORM === 'desktop';

if (!isDesktop && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
