import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMotion } from './motion';
import { initPan } from './pan';
import { initTips } from './tips';
import { initI18n } from './i18n';

initMotion(); // v247 : sortie animée et focus clavier communs à toutes les fenêtres
initPan(); // v259 : clic droit maintenu = faire défiler, partout
initI18n(); // v319 : version anglaise (drapeaux FR / EN)
initTips(); // v286 : bulle maison à la place des bulles du navigateur (souris, clavier, doigt)
const root = ReactDOM.createRoot(document.getElementById('root'));
// v321 (revue, point 7) : galerie des pages avec données d'exemple, http://localhost:3000/?demo — en développement seulement
// (process.env.NODE_ENV vaut « production » dans le site publié : ce code et la galerie n'y sont pas inclus)
const DemoGallery = process.env.NODE_ENV !== 'production' && /[?&]demo(=|&|$)/.test(window.location.search) ? React.lazy(() => import('./demo/DemoGallery')) : null;
root.render(
  <React.StrictMode>
    {DemoGallery ? <React.Suspense fallback={null}><DemoGallery /></React.Suspense> : <App />}
  </React.StrictMode>
);
