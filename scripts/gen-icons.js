// v350 (audit de performance, Vercel « bundle ») : les icônes Phosphor livraient leurs 6 graisses (134 Ko) alors que le site n'utilise
// que « regular ». Ce script extrait la graisse regular des icônes listées et écrit src/iconPaths.js (quelques Ko).
// Ajouter une icône : l'ajouter à ICONS (nom du site → nom Phosphor), puis `node scripts/gen-icons.js`.
const fs = require("fs"), path = require("path");
const ICONS = { wrench: "Wrench", edit: "PencilSimple", trash: "Trash", bell: "Bell", home: "House", more: "DotsThree", copy: "Copy", arrow: "ArrowRight", at: "At", flag: "Flag", palette: "Palette", changes: "GitDiff", list: "ListBullets", gantt: "ChartBarHorizontal", calendar: "CalendarDots", comments: "ChatsCircle", screen: "Television", euro: "CurrencyEur", sidepanel: "SidebarSimple", popup: "AppWindow", manager: "Briefcase", lock: "LockSimple", layers: "Stack", gauge: "Gauge", check: "Check", chart: "ChartLine", tag: "Tag", warning: "Warning", upload: "UploadSimple", pin: "PushPin", sun: "Sun", factory: "Factory", sunSm: "Sun", moon: "Moon", auto: "CircleHalf", download: "DownloadSimple", inbox: "Tray", logout: "SignOut", clock: "Clock", settings: "GearSix", save: "FloppyDisk", search: "MagnifyingGlass", close: "X", chevronDown: "CaretDown", play: "Play" };
const dir = path.join(__dirname, "..", "node_modules", "@phosphor-icons", "react", "dist", "defs");
const out = {};
for (const [k, name] of Object.entries(ICONS)) {
  let src = fs.readFileSync(path.join(dir, name + ".mjs"), "utf8");
  const imp = src.match(/^import (\w+) from "react";/m); if (!imp) throw new Error("import react : " + name);
  src = src.replace(imp[0], "").replace(/export \{\s*(\w+) as default\s*\};?/, "return $1;");
  const R = { Fragment: "F", createElement: (t, p, ...kids) => ({ t, p: p || {}, kids: kids.flat().filter(Boolean) }) };
  const regular = new Function(imp[1], src)(R).get("regular"); // eslint-disable-line no-new-func
  const els = []; const walk = n => { if (!n) return; if (n.t !== "F") els.push([n.t, n.p]); (n.kids || []).forEach(walk); }; walk(regular);
  if (!els.length) throw new Error("graisse regular introuvable : " + name);
  if (els.length !== 1 || els[0][0] !== "path" || Object.keys(els[0][1]).join() !== "d") throw new Error("forme non prise en charge (un seul tracé attendu) : " + name);
  out[k] = els[0][1].d;
}
const body = "// Généré par scripts/gen-icons.js (Phosphor Icons, MIT, graisse regular, un tracé par icône, viewBox 0 0 256 256) — ne pas modifier à la main.\nexport const ICON_PATHS = " + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "src", "iconPaths.js"), body);
console.log(Object.keys(out).length + " icônes, " + Math.round(body.length / 1024) + " Ko");
