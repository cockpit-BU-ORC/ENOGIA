import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMotion } from './motion';

initMotion(); // v247 : sortie animée et focus clavier communs à toutes les fenêtres
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
