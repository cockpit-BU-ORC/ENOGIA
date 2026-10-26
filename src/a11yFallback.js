import { useEffect } from "react";

// v165 — Filet d'accessibilité global (règles WCAG 2.2 / UI-UX Pro Max).
// Les composants bien étiquetés ne sont jamais touchés ; ce filet complète ce qui manque :
//   • champs / listes sans étiquette → aria-label déduit du contexte (en-tête de colonne + 1re cellule de la ligne,
//     texte voisin, placeholder) ;
//   • boutons sans nom (icône seule) → aria-label déduit du titre ou de l'en-tête de colonne ;
//   • zones cliquables de moins de 24 px → marquées data-hit : la zone de clic est élargie de 5 px autour du bouton
//     (styles.css), sans rien changer à l'aspect.
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
  scope.querySelectorAll("button,[role=button]").forEach(b => {
    if (!(b.getAttribute("aria-label") || b.getAttribute("aria-labelledby") || b.title || (b.innerText || "").trim())) {
      const th = b.closest("th");
      b.setAttribute("aria-label", th ? "Trier ou filtrer : " + clean(th.innerText) : "Bouton");
    }
    if (!b.dataset.hit && !b.dataset.hitDone) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        b.dataset.hitDone = "1";
        if (r.width < 24 || r.height < 24) b.dataset.hit = "1";
      }
    }
  });
}

export function useA11yFallback() {
  useEffect(() => {
    let t = null;
    const schedule = () => { clearTimeout(t); t = setTimeout(() => { try { pass(document); } catch (e) {} }, 350); };
    schedule();
    const mo = new MutationObserver(muts => { if (muts.some(m => m.addedNodes && m.addedNodes.length)) schedule(); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); clearTimeout(t); };
  }, []);
}
