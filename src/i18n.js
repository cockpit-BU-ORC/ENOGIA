// v319 (demandé : « une version full en anglais, drapeaux FR et EN en haut à droite ») — traduction de l'affichage.
// Principe : le site reste écrit en français ; en anglais, les textes affichés (nœuds de texte, placeholder, title, aria-label)
// sont remplacés à la volée d'après le dictionnaire src/i18n/en.js (texte français exact → anglais) et ses motifs (textes avec
// des nombres). Un texte absent du dictionnaire reste en français : on complète le dictionnaire page par page.
// Les données saisies (commentaires, noms, champs de saisie) ne sont jamais traduites : zones marquées data-no-i18n,
// input / textarea / contenteditable ignorés. Dates et nombres « fr-FR » passent en « en-GB ».
import { EN, EN_PATTERNS } from "./i18n/en";

export const LANG_KEY = "enogia_lang";
export const LANG = (() => { try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "fr"; } catch (e) { return "fr"; } })();
export function setLang(l) {
  if (l === LANG) return;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* stockage indisponible */ }
  window.location.reload();
}

const norm = s => s.replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const DICT = new Map(Object.entries(EN).map(([k, v]) => [norm(k), v]));
export function tr(s) {
  if (typeof s !== "string") return s;
  const k = norm(s); if (!k) return s;
  const hit = DICT.get(k);
  if (hit != null) return hit;
  for (const [re, out] of EN_PATTERNS) { const m = k.match(re); if (m) return typeof out === "function" ? out(...m.slice(1)) : k.replace(re, out); }
  return s;
}
// Pour le code : t("Texte") renvoie la traduction si l'anglais est choisi.
export const t = s => (LANG === "en" ? tr(s) : s);

const ATTRS = ["placeholder", "title", "aria-label", "data-tip"];
const skip = el => !el || !!(el.closest && el.closest("[data-no-i18n],textarea,input,[contenteditable='true'],script,style,code"));
function textNode(n) {
  const v = n.nodeValue; if (!v || !/[A-Za-zÀ-ÿ]/.test(v)) return;
  if (skip(n.parentElement)) return;
  const out = tr(v); if (out === v) return;
  const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
  const next = lead + out + trail; if (next !== v) n.nodeValue = next;
}
function attrs(el) {
  if (el.nodeType !== 1 || (el.closest && el.closest("[data-no-i18n]"))) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const o = tr(v); if (o !== v) el.setAttribute(a, o); } }
  if ((el.tagName === "INPUT" && (el.type === "button" || el.type === "submit")) && el.value) { const o = tr(el.value); if (o !== el.value) el.value = o; }
}
function walk(root) {
  if (root.nodeType === 3) { textNode(root); return; }
  if (root.nodeType !== 1) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
}

export function initI18n() {
  if (LANG !== "en") return;
  document.documentElement.lang = "en";
  // Dates et nombres écrits « fr-FR » dans le code → anglais
  const swap = l => (typeof l === "string" && /^fr/i.test(l) ? "en-GB" : Array.isArray(l) ? l.map(swap) : l);
  const D = Date.prototype, N = Number.prototype;
  ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"].forEach(f => { const o = D[f]; D[f] = function (l, opt) { return o.call(this, swap(l), opt); }; });
  const on = N.toLocaleString; N.toLocaleString = function (l, opt) { return on.call(this, swap(l), opt); };
  const start = () => {
    walk(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === "characterData") textNode(m.target);
        else if (m.type === "attributes") attrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  if (document.title) document.title = tr(document.title);
}
