import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('PWA: Nova versão detectada');
    (window as any).refreshAppVersion = () => {
      updateSW(true);
    };
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('PWA: App pronto para uso offline');
  },
  onRegistered(r) {
    console.log('PWA: Service Worker registrado com sucesso:', r);
  },
  onRegisterError(error) {
    console.log('PWA: Erro ao registrar Service Worker:', error);
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);