// v259 (demandé : « mettre sur tout le site le clic droit enfoncé pour se déplacer ») : clic droit maintenu + glisser = faire défiler
// la zone sous la souris (tableau, Gantt, calendrier, page), comme dans le planificateur. Un simple clic droit sans bouger garde son
// menu (ex. menu d'une ligne de la Liste) ; après un glisser, le menu du navigateur n'apparaît pas. Les zones qui gèrent déjà
// leur propre glisser (planificateur : preventDefault au mousedown) ne sont pas touchées.
const scrollable = el => {
  for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const sx = /(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
    const sy = /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
    if (sx || sy) return n;
  }
  return document.scrollingElement || document.documentElement;
};

export function initPan() {
  if (typeof document === "undefined") return;
  let st = null, justPanned = false;
  document.addEventListener("mousedown", e => {
    if (e.button !== 2 || e.defaultPrevented) return;
    if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable=true],iframe")) return;
    st = { el: scrollable(e.target), x: e.clientX, y: e.clientY, moved: false };
  });
  document.addEventListener("mousemove", e => {
    if (!st) return;
    if (!(e.buttons & 2)) { st = null; document.body.style.cursor = ""; return; }
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    st.moved = true; document.body.style.cursor = "grabbing";
    st.el.scrollLeft -= dx; st.el.scrollTop -= dy; st.x = e.clientX; st.y = e.clientY;
  });
  const end = () => { if (st && st.moved) { justPanned = true; setTimeout(() => { justPanned = false; }, 300); } st = null; document.body.style.cursor = ""; };
  document.addEventListener("mouseup", e => { if (e.button === 2) end(); });
  // le menu contextuel arrive après le mouseup (Windows) ou avant (macOS) : dans les deux cas, on le bloque après un glisser
  document.addEventListener("contextmenu", e => { if (justPanned || (st && st.moved)) { e.preventDefault(); e.stopPropagation(); } }, true);
}
