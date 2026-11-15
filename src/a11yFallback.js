import { useEffect } from "react";

// v165 — Filet d'accessibilité global (règles WCAG 2.2 / UI-UX Pro Max).
// Les composants bien étiquetés ne sont jamais touchés ; ce filet complète ce qui manque :
//   • champs / listes sans étiquette → aria-label déduit du contexte (en-tête de colonne + 1re cellule de la ligne,
//     texte voisin, placeholder) ;
//   • boutons sans nom (icône seule) → aria-label déduit du titre ou de l'en-tête de colonne ;
//   • zones cliquables de moins de 24 px → marquées data-hit : la zone de clic est élargie de 5 px autour du bouton
//     (styles.css), sans rien changer à l'aspect. v282 : la zone est portée à 28 × 28 au moins (--hx / --hy calculés
//     d'après la taille du bouton, 8 px au plus de chaque côté pour ne pas mordre sur les voisins).
const first = s => String(s || "").trim().split("\n")[0].trim();
const clean = s => first(s).replace(/^[＋+]\s*/, "").slice(0, 60);

function contextLabel(el) {
  const td = el.closest("td");
  if (td && td.parentElement) {
    const tbl = td.closest("table");
    const i = [...td.parentElement.children].indexOf(td);
    const th = tbl && tbl.querySelectorAll("thead th")[i];
    const head = th ? clean(th.innerText) : "";
    const row = clean(td.parentElement.children[0] && td.parentElement.children[0].innerText);
    const t = [head, row].filter(Boolean).join(" · ");
    if (t) return t;
  }
  const ph = el.getAttribute("placeholder");
  if (ph) return clean(ph);
  let n = el.previousElementSibling;
  if (n && n.innerText && n.innerText.trim().length <= 40 && !n.querySelector("input,select,textarea")) return clean(n.innerText);
  let p = el.parentElement;
  for (let k = 0; k < 3 && p; k++, p = p.parentElement) {
    const own = [...p.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent.trim()).join(" ").trim();
    if (own && own.length <= 40) return clean(own);
    const lab = p.querySelector(":scope > label, :scope > span, :scope > b");
    if (lab && lab !== el && lab.innerText && lab.innerText.trim().length <= 40 && !lab.contains(el)) return clean(lab.innerText);
  }
  if (el.type === "date") return "Date";
  if (el.tagName === "SELECT") return "Liste de choix";
  return "Champ de saisie";
}

function pass(root) {
  const scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll("input:not([type=hidden]):not([type=file]),select,textarea").forEach(el => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.title) return;
    if (el.id && document.querySelector('label[for="' + el.id.replace(/"/g, '\\"') + '"]')) return;
    if (el.closest("label")) return;
    el.setAttribute("aria-label", contextLabel(el));
  });
  // v285 : un texte coupé par « … » sans infobulle reçoit son texte complet
  scope.querySelectorAll('[style*="ellipsis"]').forEach(el => {
    if (el.title || el.closest("[title]") || el.scrollWidth <= el.clientWidth + 1) return;
    const t = (el.innerText || "").trim(); if (t) el.title = t;
  });
  // v340 (audit Web Interface Guidelines, lot 2) : div / span / ligne cliquables (curseur main, sans rôle ni tabindex)
  // → atteignables par Tab et ouvertes par Entrée / Espace (keyActivate) ; les fonds de fenêtre (position fixe) sont ignorés.
  scope.querySelectorAll('[style*="cursor: pointer"]').forEach(el => {
    if (el.dataset.kbd || el.hasAttribute("tabindex") || el.hasAttribute("role") || el.getAttribute("aria-hidden") === "true") return;
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION)$/.test(el.tagName) || el.closest("button,a,label,[role=button],[contenteditable]")) return;
    if (el.style.position === "fixed" || el.style.inset) return;
    el.dataset.kbd = "1"; el.tabIndex = 0;
    if (!/^(TR|TD|LI)$/.test(el.tagName)) el.setAttribute("role", "button");
    if (!el.getAttribute("aria-label") && !(el.innerText || "").trim() && el.title) el.setAttribute("aria-label", el.title);
  });
  scope.querySelectorAll("button,[role=button]").forEach(b => {
    if (!(b.getAttribute("aria-label") || b.getAttribute("aria-labelledby") || b.title || (b.innerText || "").trim())) {
      const th = b.closest("th");
      b.setAttribute("aria-label", th ? "Trier ou filtrer : " + clean(th.innerText) : "Bouton");
    }
    if (!b.dataset.hit && !b.dataset.hitDone) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        b.dataset.hitDone = "1";
        // v314 : 44 px au doigt (tablette, écran tactile), 28 px à la souris ; jamais plus de 10 px de débord par côté
        const MIN = COARSE() ? 44 : 28, MAXP = COARSE() ? 14 : 8; // v333 : 14 px par côté au doigt (16 px → 44 px)
        if (r.width < MIN || r.height < MIN) {
          b.dataset.hit = "1";
          const pad = v => Math.min(MAXP, Math.max(0, Math.ceil((MIN - v) / 2)));
          b.style.setProperty("--hx", pad(r.width) + "px");
          b.style.setProperty("--hy", pad(r.height) + "px");
        }
      }
    }
  });
}

const COARSE = () => { try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };
export function useA11yFallback() {
  useEffect(() => {
    let t = null;
    const schedule = () => { clearTimeout(t); t = setTimeout(() => { try { pass(document); } catch (e) {} }, 350); };
    schedule();
    const mo = new MutationObserver(muts => { if (muts.some(m => m.addedNodes && m.addedNodes.length)) schedule(); });
    mo.observe(document.body, { childList: true, subtree: true });
    // v340 : Entrée / Espace sur un élément rendu atteignable par le filet = clic
    const keyActivate = e => { const el = e.target; if (!el || !el.dataset || el.dataset.kbd !== "1" || (e.key !== "Enter" && e.key !== " ") || e.repeat) return; e.preventDefault(); el.click(); };
    document.addEventListener("keydown", keyActivate);
    return () => { mo.disconnect(); clearTimeout(t); document.removeEventListener("keydown", keyActivate); };
  }, []);
}
