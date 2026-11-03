import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMotion } from './motion';
import { initPan } from './pan';

initMotion(); // v247 : sortie animée et focus clavier communs à toutes les fenêtres
initPan(); // v259 : clic droit maintenu = faire défiler, partout
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
