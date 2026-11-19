// v405 (demandé : « rajoute ces compétences SAV dans l'onglet SAV / MES ») : la page « Compétences SAV » (public/competences-sav.html,
// faite à l'origine comme artefact Claude avec sa propre base) tourne dans le Cockpit. Elle appelle window.claude.use("db" | "user") ; le
// cadre lui passe ce pont, qui range ses données dans Firestore (préfixe beta_ en bêta) :
//   planning/savSkills          { people, assess, objectives, snapshots }  — responsable SAV (Admin sur SAV) et propriétaire seulement
//   planning/savSkillsCat       { categories }                             — lu par tout compte ENOGIA, écrit par le responsable SAV
//   planning/savSkillsMe_<mail> { view, selfeval, email }                  — la fiche d'une personne : lue par elle et le responsable,
//                                                                             « selfeval » (auto-évaluation) écrit par elle seule
// Les évaluations ne sont donc pas lisibles par tous les comptes (règles Firestore).
export const SKILL_ADMIN_COLL = ["people", "assess", "objectives", "snapshots"];
// v411 : les objets viennent du cadre de la page (autre « fenêtre ») : Firestore les refuse (« custom Object object ») — on les recopie en objets simples
export const plain = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
export const meKey = uid => "savSkillsMe_" + String(uid || "").trim().toLowerCase();

// où ranger un chemin « collection/id » de la page
export function placeOf(path) {
  const [c, id] = String(path || "").split("/");
  if (!id) return null;
  if (SKILL_ADMIN_COLL.includes(c)) return { doc: "savSkills", field: c, id };
  if (c === "categories") return { doc: "savSkillsCat", field: "categories", id };
  if (c === "view" || c === "selfeval") return { doc: meKey(id), field: c, id, whole: true };
  return null;
}
const docsOf = m => ({ docs: Object.entries(m || {}).map(([id, v]) => ({ id, data: () => v })) });

// backend = { sub(docId, cb(data|null), onErr) → stop, set(docId, field, id|null, value, extra), del(docId, field, id|null) }
export function makeSkillsBridge({ backend, me, people }) {
  const stops = new Set(), keep = f => { stops.add(f); return () => { try { f(); } catch (e) { /* déjà arrêté */ } stops.delete(f); }; };
  const doc = path => {
    const p = placeOf(path);
    return {
      set: async data => { if (!p) throw new Error("Chemin inconnu : " + path); return backend.set(p.doc, p.field, p.whole ? null : p.id, plain(data), p.whole && p.field === "view" ? { email: String(p.id).toLowerCase() } : null); },
      delete: async () => { if (!p) return; return backend.del(p.doc, p.field, p.whole ? null : p.id); },
      onSnapshot: (cb, onErr) => { if (!p) { cb({ exists: false, id: path, data: () => null }); return () => {}; }
        return keep(backend.sub(p.doc, d => { const v = d ? (p.whole ? d[p.field] : (d[p.field] || {})[p.id]) : null; cb({ exists: v != null, id: p.id, data: () => v }); }, onErr)); },
    };
  };
  const collection = name => ({
    onSnapshot: (cb, onErr) => {
      if (name === "categories") return keep(backend.sub("savSkillsCat", d => cb(docsOf(d && d.categories)), onErr));
      if (SKILL_ADMIN_COLL.includes(name)) return keep(backend.sub("savSkills", d => cb(docsOf(d && d[name])), onErr));
      if (name === "selfeval") { // une fiche par personne reliée à un compte : on suit celles de la liste des personnes
        const cur = new Map(), vals = {}; const emit = () => cb(docsOf(vals)); emit();
        const stopPeople = backend.sub("savSkills", d => {
          const uids = new Set(Object.values((d && d.people) || {}).map(p => p && p.uid).filter(Boolean).map(u => String(u).toLowerCase()));
          [...cur.keys()].forEach(u => { if (!uids.has(u)) { cur.get(u)(); cur.delete(u); delete vals[u]; } });
          uids.forEach(u => { if (!cur.has(u)) cur.set(u, backend.sub(meKey(u), x => { if (x && x.selfeval) vals[u] = x.selfeval; else delete vals[u]; emit(); }, () => {})); });
          emit();
        }, onErr);
        return keep(() => { stopPeople(); cur.forEach(f => f()); });
      }
      cb(docsOf({})); return () => {};
    },
  });
  const list = () => (people || []).filter(p => p && p.email);
  const user = {
    me: async () => ({ id: String(me.email || "").toLowerCase(), name: me.name || me.email || "", canEdit: !!me.admin, isOwner: !!me.owner }),
    profiles: async ids => Object.fromEntries((ids || []).map(i => { const p = list().find(x => String(x.email).toLowerCase() === String(i).toLowerCase()); return [i, p ? { name: p.name || p.email } : null]; }).filter(([, v]) => v)),
    search: async q => { const s = String(q || "").toLowerCase(); return list().filter(p => (String(p.name || "") + " " + p.email).toLowerCase().includes(s)).slice(0, 12).map(p => ({ id: String(p.email).toLowerCase(), name: p.name || p.email })); },
  };
  return {
    use: async n => (n === "db" ? { doc, collection } : n === "user" ? user : null),
    stop: () => [...stops].forEach(f => { try { f(); } catch (e) { /* rien */ } stops.clear(); }),
  };
}

// base en mémoire (galerie ?demo, tests) : même interface que Firestore
export function memoryBackend(seed) {
  const data = JSON.parse(JSON.stringify(seed || {})), subs = {};
  const fire = id => (subs[id] || []).forEach(cb => cb(data[id] ? JSON.parse(JSON.stringify(data[id])) : null));
  return {
    data,
    sub: (id, cb) => { (subs[id] = subs[id] || []).push(cb); setTimeout(() => cb(data[id] ? JSON.parse(JSON.stringify(data[id])) : null), 0); return () => { subs[id] = (subs[id] || []).filter(x => x !== cb); }; },
    set: async (id, field, key, value, extra) => { const d = data[id] = data[id] || {}; if (key == null) d[field] = value; else (d[field] = d[field] || {})[key] = value; if (extra) Object.assign(d, extra); fire(id); },
    del: async (id, field, key) => { const d = data[id]; if (!d) return; if (key == null) delete d[field]; else if (d[field]) delete d[field][key]; fire(id); },
  };
}
