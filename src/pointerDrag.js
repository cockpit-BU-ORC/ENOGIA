// v263 (audit apple-design, demandé : « toutes ») : glisser-déposer « maison » qui remplace le glisser natif du navigateur
// (image fantôme grise, aucune réaction en route). L'élément lui-même suit la souris au pixel près, à l'endroit où on l'a
// attrapé ; la cible survolée s'allume ; au lâcher, la copie se fond sur place si le dépôt est accepté, sinon elle revient à
// son point de départ (même chemin dans les deux sens). Échap annule. Un clic sans mouvement (moins de 5 px) reste un clic.
//   const dnd = usePointerDnD();
//   <div {...dnd.dragProps(payload, { ghost: el => el.closest(".ligne") })} />   élément à attraper (ghost : ce qui suit la souris)
//   <div {...dnd.dropProps(cle, payload => accepte, payload => déposer)} />        cible ; dnd.over === cle quand elle est visée
//   dnd.drag = payload en cours de glisser (null sinon)
import { useCallback, useEffect, useRef, useState } from "react";

const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const SKIP = "input,select,textarea,[contenteditable=true],[data-no-drag]";

export function usePointerDnD() {
  const [drag, setDrag] = useState(null), [over, setOver] = useState(null);
  const drops = useRef({}), st = useRef(null);
  const overRef = useRef(null);

  const finish = useCallback(cancel => {
    const s = st.current; st.current = null;
    window.removeEventListener("pointermove", s && s.move); window.removeEventListener("pointerup", s && s.up);
    window.removeEventListener("pointercancel", s && s.cancel); window.removeEventListener("keydown", s && s.key, true);
    if (!s || !s.on) return;
    if (s.raf) clearTimeout(s.raf);
    document.body.style.cursor = ""; document.body.style.userSelect = "";
    const key = overRef.current, t = key != null && drops.current[key];
    const ok = !cancel && t && t.accepts(s.payload);
    const clone = s.clone, src = s.src;
    const done = () => { clone.remove(); src.style.opacity = s.op; };
    if (reduced()) done();
    else if (ok) { clone.style.transition = "opacity 120ms ease-out"; clone.style.opacity = "0"; setTimeout(done, 130); }
    else { clone.style.transition = "transform 180ms cubic-bezier(.2,.8,.2,1)"; clone.style.transform = "translate(0px,0px)"; setTimeout(done, 190); }
    // le clic qui suit un glisser ne doit pas ouvrir l'élément
    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("click", stop, true); setTimeout(() => window.removeEventListener("click", stop, true), 0);
    overRef.current = null; setOver(null); setDrag(null);
    if (ok) t.onDrop(s.payload);
  }, []);

  useEffect(() => () => { if (st.current) finish(true); }, [finish]);

  const dragProps = (payload, opt = {}) => ({
    onPointerDown: e => {
      if (e.button !== 0 || (e.target.closest && e.target.closest(SKIP)) || st.current) return;
      const el = e.currentTarget, src = (opt.ghost && opt.ghost(el)) || el;
      const s = { payload, src, x0: e.clientX, y0: e.clientY, on: false };
      s.move = ev => {
        const dx = ev.clientX - s.x0, dy = ev.clientY - s.y0;
        if (!s.on) {
          if (Math.abs(dx) + Math.abs(dy) < 5) return;
          const r = src.getBoundingClientRect(), c = src.cloneNode(true);
          Object.assign(c.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: "0", boxSizing: "border-box", pointerEvents: "none", zIndex: "10050", opacity: "0.96", boxShadow: "0 10px 28px rgba(10,20,30,.22)", transition: "none", willChange: "transform" });
          c.removeAttribute("id"); c.setAttribute("aria-hidden", "true"); document.body.appendChild(c);
          s.clone = c; s.op = src.style.opacity; src.style.opacity = "0.35"; s.on = true;
          document.body.style.cursor = "grabbing"; document.body.style.userSelect = "none"; setDrag(payload);
        }
        s.clone.style.transform = "translate(" + dx + "px," + dy + "px)";
        s.last = { x: ev.clientX, y: ev.clientY }; s.hit(ev.clientX, ev.clientY);
        if (!s.raf) s.raf = setTimeout(s.tick, 16);
      };
      // cible la plus proche qui accepte (une carte dans une colonne : la carte d'abord, sinon la colonne)
      s.hit = (x, y) => {
        let z = document.elementFromPoint(x, y), k2 = null;
        while (z && z.closest && (z = z.closest("[data-dnd-drop]"))) { const key = z.getAttribute("data-dnd-drop"), t = drops.current[key]; if (t && t.accepts(payload)) { k2 = key; break; } z = z.parentElement; }
        if (k2 !== overRef.current) { overRef.current = k2; setOver(k2); }
      };
      // près d'un bord (zone qui défile ou fenêtre), la page défile toute seule, comme avec le glisser du navigateur
      s.tick = () => {
        if (st.current !== s || !s.on) { s.raf = 0; return; }
        const { x, y } = s.last, E = 40, step = d => Math.ceil((E - d) / E * 18);
        let moved = false;
        const scroll = (el, r) => {
          let vx = 0, vy = 0;
          if (y - r.top < E && el.scrollTop > 0) vy = -step(y - r.top); else if (r.bottom - y < E && el.scrollTop + el.clientHeight < el.scrollHeight) vy = step(r.bottom - y);
          if (x - r.left < E && el.scrollLeft > 0) vx = -step(x - r.left); else if (r.right - x < E && el.scrollLeft + el.clientWidth < el.scrollWidth) vx = step(r.right - x);
          if (vx || vy) { el.scrollLeft += vx; el.scrollTop += vy; moved = true; }
        };
        for (let n = document.elementFromPoint(x, y); n && n !== document.body && !moved; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if ((/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1)) scroll(n, n.getBoundingClientRect());
        }
        if (!moved) { const se = document.scrollingElement || document.documentElement; scroll(se, { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }); }
        if (moved) s.hit(x, y);
        s.raf = setTimeout(s.tick, 16);
      };
      s.up = () => finish(false); s.cancel = () => finish(true);
      s.key = ev => { if (ev.key === "Escape" && s.on) { ev.preventDefault(); ev.stopPropagation(); finish(true); } };
      st.current = s;
      window.addEventListener("pointermove", s.move); window.addEventListener("pointerup", s.up);
      window.addEventListener("pointercancel", s.cancel); window.addEventListener("keydown", s.key, true);
    },
  });
  const dropProps = (key, accepts, onDrop) => { drops.current[key] = { accepts, onDrop }; return { "data-dnd-drop": key }; };
  return { drag, over, dragProps, dropProps };
}

// Atterrissage (FLIP) : un élément qui vient de changer de place repart de l'endroit d'où on l'a lâché (rect, coordonnées de
// l'écran) et glisse jusqu'à sa nouvelle place, sans rebond.
export function landFrom(el, rect, ms = 180) {
  if (!el || !rect || reduced()) return;
  const r = el.getBoundingClientRect(), dx = rect.left - r.left, dy = rect.top - r.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  el.style.transition = "none"; el.style.transform = "translate(" + dx + "px," + dy + "px)";
  void el.offsetWidth; // le navigateur prend en compte la position de départ avant la transition
  el.style.transition = "transform " + ms + "ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = "";
  setTimeout(() => { el.style.transition = ""; }, ms + 20);
}
