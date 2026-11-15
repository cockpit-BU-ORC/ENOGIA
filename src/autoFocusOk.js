// v341 (audit Web Interface Guidelines, lot 5) : autoFocus seulement avec une souris — au doigt (tablette), il ouvrirait
// le clavier dès l'ouverture d'une fenêtre. Utilisation : <input autoFocus={AF} … />.
export const AF = (() => { try { return !window.matchMedia("(pointer: coarse)").matches; } catch (e) { return true; } })();
