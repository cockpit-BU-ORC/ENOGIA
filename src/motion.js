// v247 (audit ui-ux-pro-max + animation-principles, demandé : « améliorer les transitions, ouvertures de pop-up ») :
// comportement commun à TOUTES les fenêtres modales du site ([aria-modal="true"]), sans retoucher chaque composant.
//   • Fermeture animée : quand React retire une fenêtre, une copie inerte (aria-hidden, sans clic, sans id, sans iframe ni vidéo)
//     est remise à sa place le temps de jouer la sortie (fond qui s'efface, fenêtre qui descend un peu), puis supprimée.
//     Les fenêtres qui ont déjà leur propre sortie (fiche d'un PJ : .enogia-dlg-backdrop) ne sont pas doublées.
//   • Clavier : à l'ouverture, le focus entre dans la fenêtre (si le composant ne l'a pas déjà placé) ; Tab et Maj+Tab restent
//     dans la fenêtre du dessus ; à la fermeture, le focus revient sur l'élément qui l'avait ouverte.
// « Réduire les animations » coupe la copie de sortie ; la gestion du focus reste.
const OUT_MS = 170;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const calm = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const isModal = el => el && el.nodeType === 1 && el.matches('[aria-modal="true"]') && !el.closest(".enogia-ghost");
const modalsIn = node => node.nodeType !== 1 ? [] : [...(node.matches('[aria-modal="true"]') ? [node] : []), ...node.querySelectorAll('[aria-modal="true"]')].filter(isModal);
const openModals = () => [...document.querySelectorAll('[aria-modal="true"]')].filter(isModal);
const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

const origin = new WeakMap(); // fenêtre → élément qui avait le focus à son ouverture
let lastOutside = null; // dernier élément focalisé hors fenêtre (le composant a souvent déjà déplacé le focus quand on est prévenu)

function onOpen(dlg) {
  const prev = document.activeElement && document.activeElement !== document.body && !dlg.contains(document.activeElement) ? document.activeElement : lastOutside;
  if (prev && !dlg.contains(prev)) origin.set(dlg, prev);
  setTimeout(() => { // laisse le composant placer son propre focus d'abord
    if (!dlg.isConnected || dlg.contains(document.activeElement)) return;
    const first = [...dlg.querySelectorAll(FOCUSABLE)].find(visible);
    // v341 : au doigt, pas de focus dans un champ de texte à l'ouverture (le clavier de la tablette s'ouvrirait)
    const typing = first && (first.tagName === "TEXTAREA" || (first.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|file)$/.test(first.type)));
    let coarse = false; try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) {}
    if (first && first.tagName !== "IFRAME" && !(coarse && typing)) first.focus({ preventScroll: true });
    else { if (!dlg.hasAttribute("tabindex")) dlg.setAttribute("tabindex", "-1"); dlg.focus({ preventScroll: true }); }
  }, 0);
}

// le bloc à rejouer en sortie : le fond plein écran qui porte la fenêtre (position fixe), sinon la fenêtre elle-même
function shellOf(dlg, root) {
  for (let el = dlg; el && el !== root.parentNode; el = el.parentNode) if (el.style && el.style.position === "fixed") return el;
  return null;
}

function ghost(shell, parent, next) {
  if (calm() || !parent || !parent.isConnected) return;
  if (shell.classList.contains("enogia-dlg-backdrop") || shell.querySelector(".enogia-dlg")) return; // sortie déjà gérée
  const c = shell.cloneNode(true);
  c.classList.add("enogia-ghost"); c.setAttribute("aria-hidden", "true"); c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
  c.querySelectorAll("iframe, video, audio").forEach(e => { const p = document.createElement("div"); p.style.cssText = "position:absolute;inset:0;background:#000"; e.replaceWith(p); });
  c.style.pointerEvents = "none";
  try { parent.insertBefore(c, next && next.parentNode === parent ? next : null); } catch (e) { return; }
  setTimeout(() => c.remove(), OUT_MS + 40);
}

function onClose(dlg, removedRoot, parent, next) {
  const back = origin.get(dlg);
  setTimeout(() => {
    const a = document.activeElement;
    if (back && back.isConnected && (!a || a === document.body || !a.isConnected)) back.focus({ preventScroll: true });
  }, 0);
  const shell = shellOf(dlg, removedRoot);
  if (shell) ghost(shell, shell === removedRoot ? parent : document.body, shell === removedRoot ? next : null);
}

function onKey(e) {
  if (e.key !== "Tab") return;
  const list = openModals(); const dlg = list[list.length - 1]; if (!dlg) return;
  const f = [...dlg.querySelectorAll(FOCUSABLE)].filter(visible); if (!f.length) { e.preventDefault(); return; }
  const first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (!dlg.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
}

// v263 (audit apple-design : « une fenêtre part de l'élément qui l'ouvre ») : un menu, une liste ou une bulle qui s'ouvre juste
// après un clic grandit depuis le point le plus proche du bouton cliqué (au lieu de toujours son coin haut gauche).
let lastTrigger = null;
const MENU_SEL = '.enogia-menu, .enogia-flyout, [role="menu"], [role="listbox"], [role="dialog"]:not([aria-modal])';
const menusIn = n => n.nodeType !== 1 ? [] : [...(n.matches(MENU_SEL) ? [n] : []), ...n.querySelectorAll(MENU_SEL)];
function anchorMenu(el) {
  const t = lastTrigger; if (!t || Date.now() - t.at > 800) return;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
  const ox = Math.max(0, Math.min(r.width, t.r.left + t.r.width / 2 - r.left)), oy = t.r.top + t.r.height / 2 < r.top + r.height / 2 ? 0 : r.height;
  el.style.transformOrigin = Math.round(ox) + "px " + Math.round(oy) + "px";
}

export function initMotion() {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined" || window.__enogiaMotion) return;
  window.__enogiaMotion = true;
  new MutationObserver(muts => {
    let closed = false;
    const backs = [];
    muts.forEach(m => {
      m.addedNodes.forEach(n => modalsIn(n).forEach(onOpen));
      m.addedNodes.forEach(n => menusIn(n).forEach(anchorMenu)); // v263
      [...m.removedNodes].filter(n => n.nodeType === 1 && !n.classList.contains("enogia-ghost")).forEach(n => {
        modalsIn(n).forEach(d => { closed = true; onClose(d, n, m.target, m.nextSibling); });
        if (n.getAttribute("aria-hidden") === "true" && n.style.position === "fixed" && n.style.inset === "0px") backs.push([n, m.target, m.nextSibling]);
      });
    });
    // v249 : fond posé à côté de la fenêtre (frère plein écran, aria-hidden) retiré avec elle : il s'efface lui aussi
    if (closed) backs.forEach(([n, p, nx]) => ghost(n, p, nx));
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("focusin", e => { const t = e.target; if (t && t.closest && !t.closest('[aria-modal="true"]')) lastOutside = t; }, true);
  document.addEventListener("pointerdown", e => { const b = e.target && e.target.closest && e.target.closest("button, a, [tabindex]"); if (b && !b.closest('[aria-modal="true"]')) lastOutside = b; if (b) lastTrigger = { r: b.getBoundingClientRect(), at: Date.now() }; }, true);
}
