// v286 (lot D du système de design, choix de Gabriel : « bulle maison ») — bulle d'information commune à tout le site.
// Remplace la bulle grise du navigateur (attribut title : seulement à la souris, après ~1 s, jamais au clavier ni au doigt)
// sans retoucher les pages :
//   • souris : la bulle apparaît après 200 ms ; le title est mis de côté pendant le survol (pas de double bulle), puis remis ;
//   • clavier : quand un élément porteur d'un title reçoit le focus au clavier, la bulle s'affiche aussitôt ;
//   • doigt : un appui sur un élément non interactif porteur d'un title ouvre la bulle (un autre appui ou 5 s la ferment) ;
//   • Échap, le défilement ou la sortie ferment la bulle ; « réduire les animations » coupe le fondu.
// Un title qui répète le texte déjà visible n'ouvre pas de bulle. Le nom accessible est gardé : un bouton sans texte reçoit
// son title en aria-label avant que le title soit mis de côté.
import { T } from "./theme";

const DELAY = 200;
const INTERACTIVE = "a[href],button,input,select,textarea,label,summary,[role=button],[role=tab],[role=menuitem],[role=radio],[role=checkbox],[contenteditable=true]";
let tip = null, cur = null, timer = null, touchTimer = null;

const calm = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const textOf = el => (el.dataset.etip != null ? el.dataset.etip : el.getAttribute("title")) || "";
const visibleText = el => String(el.innerText || "").replace(/\s+/g, " ").trim();

function ensureTip() {
  if (tip && tip.isConnected) return tip;
  tip = document.createElement("div");
  tip.id = "enogia-tip"; tip.setAttribute("role", "tooltip");
  Object.assign(tip.style, { position: "fixed", zIndex: "10050", maxWidth: "300px", padding: "7px 10px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.4",
    whiteSpace: "pre-line", pointerEvents: "none", opacity: "0", transform: "translateY(3px)", boxShadow: "0 8px 24px rgba(10,20,40,.22)", left: "0", top: "0" });
  document.body.appendChild(tip);
  return tip;
}

function stash(el) { // met le title de côté (garde le nom accessible)
  const t = el.getAttribute("title");
  if (t == null) return;
  if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !visibleText(el) && el.matches(INTERACTIVE)) el.setAttribute("aria-label", t);
  el.dataset.etip = t; el.removeAttribute("title");
}
function restore(el) {
  if (!el || el.dataset.etip == null) return;
  if (!el.hasAttribute("title")) el.setAttribute("title", el.dataset.etip); // si React a changé le title entre-temps, on garde le sien
  delete el.dataset.etip;
}

function show(el) {
  const text = textOf(el).trim();
  if (!text || text === visibleText(el)) return;
  const b = ensureTip();
  b.textContent = text;
  b.style.background = T.ink900; b.style.color = T.card; b.style.fontFamily = T.font;
  b.style.transition = calm() ? "none" : "opacity 120ms ease-out, transform 120ms ease-out";
  const r = el.getBoundingClientRect();
  b.style.opacity = "0"; b.style.left = "0px"; b.style.top = "0px";
  const w = b.offsetWidth, h = b.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
  const below = r.bottom + 8, top = below + h > vh - 8 && r.top - h - 8 > 8 ? r.top - h - 8 : below;
  b.style.left = Math.round(left) + "px"; b.style.top = Math.round(top) + "px";
  el.setAttribute("aria-describedby", "enogia-tip");
  void b.offsetWidth; // reflow forcé (pas de requestAnimationFrame : en arrière-plan il ne part pas)
  b.style.opacity = "1"; b.style.transform = "none";
}
function hide() {
  clearTimeout(timer); clearTimeout(touchTimer);
  if (tip) { tip.style.opacity = "0"; tip.style.transform = "translateY(3px)"; }
  if (cur) { if (cur.getAttribute("aria-describedby") === "enogia-tip") cur.removeAttribute("aria-describedby"); restore(cur); }
  cur = null;
}
const holder = t => (t && t.nodeType === 1 ? t.closest("[title],[data-etip]") : null);

export function initTips() {
  if (typeof document === "undefined" || window.__enogiaTips) return;
  window.__enogiaTips = true;
  document.addEventListener("pointerover", e => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = holder(e.target);
    if (!el || el === cur) return;
    if (el.closest("svg") && el.tagName.toLowerCase() === "title") return;
    hide(); cur = el; stash(el);
    timer = setTimeout(() => { if (cur === el && el.isConnected) show(el); }, DELAY);
  }, true);
  document.addEventListener("pointerout", e => {
    if (!cur || (e.pointerType && e.pointerType !== "mouse")) return;
    if (e.relatedTarget && cur.contains(e.relatedTarget)) return;
    if (holder(e.target) !== cur) return;
    hide();
  }, true);
  document.addEventListener("focusin", e => {
    const el = e.target && e.target.nodeType === 1 && (e.target.hasAttribute("title") || e.target.dataset.etip != null) ? e.target : null;
    let kb = false; try { kb = e.target.matches(":focus-visible"); } catch (x) { kb = true; }
    if (!el || !kb) return;
    hide(); cur = el; stash(el); show(el);
  });
  document.addEventListener("focusout", e => { if (cur && e.target === cur) hide(); });
  document.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") { if (cur) hide(); return; }
    const el = holder(e.target);
    if (cur && el === cur) { hide(); return; }
    hide();
    if (!el || el.closest(INTERACTIVE)) return;
    cur = el; stash(el); show(el);
    touchTimer = setTimeout(hide, 5000);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && cur) hide(); });
  window.addEventListener("scroll", () => { if (cur) hide(); }, { capture: true, passive: true });
}
