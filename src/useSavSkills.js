// v412 : données des compétences SAV pour la page du site (SavSkillsPage.js) — mêmes documents que la V405 (savSkills, savSkillsCat,
// savSkillsMe_<adresse>), lus en temps réel ; la galerie ?demo utilise une base en mémoire (rien n'est lu ni écrit dans Firestore).
import { useEffect, useMemo, useRef, useState } from "react";
import { doc as fdoc, onSnapshot, setDoc, updateDoc, deleteField, FieldPath } from "firebase/firestore";
import { db } from "./firebase";
import { DOC_PFX } from "./appDocs";
import { notify } from "./components/SharedUI";

export const meKey = uid => "savSkillsMe_" + String(uid || "").trim().toLowerCase();
const plain = v => (v == null ? v : JSON.parse(JSON.stringify(v)));

const ref = id => fdoc(db, "planning", DOC_PFX + id);
export const firestoreBackend = () => ({
  sub: (id, cb) => onSnapshot(ref(id), s => cb(s.exists() ? s.data() : null), e => { console.warn("compétences SAV (lecture) :", e && e.message); cb(null); }),
  set: async (id, field, key, value, extra) => {
    const path = key == null ? field : new FieldPath(field, key), more = extra ? Object.entries(extra).flat() : [];
    try { await updateDoc(ref(id), path, plain(value), ...more); }
    catch (e) { if (e && e.code === "not-found") await setDoc(ref(id), { [field]: key == null ? plain(value) : { [key]: plain(value) }, ...(extra || {}) }, { merge: true }); else throw e; }
  },
  del: async (id, field, key) => { try { await updateDoc(ref(id), key == null ? field : new FieldPath(field, key), deleteField()); } catch (e) { if (!(e && e.code === "not-found")) throw e; } },
});
export function memoryBackend(seed) {
  const data = JSON.parse(JSON.stringify(seed || {})), subs = {};
  const fire = id => (subs[id] || []).forEach(cb => cb(data[id] ? JSON.parse(JSON.stringify(data[id])) : null));
  return {
    data,
    sub: (id, cb) => { (subs[id] = subs[id] || []).push(cb); setTimeout(() => cb(data[id] ? JSON.parse(JSON.stringify(data[id])) : null), 0); return () => { subs[id] = (subs[id] || []).filter(x => x !== cb); }; },
    set: async (id, field, key, value, extra) => { const d = data[id] = data[id] || {}; if (key == null) d[field] = plain(value); else (d[field] = d[field] || {})[key] = plain(value); if (extra) Object.assign(d, extra); fire(id); },
    del: async (id, field, key) => { const d = data[id]; if (!d) return; if (key == null) delete d[field]; else if (d[field]) delete d[field][key]; fire(id); },
  };
}

// admin = responsable SAV / propriétaire : toute l'équipe ; sinon : la fiche de la personne connectée (email)
export function useSavSkills(backend, email, admin) {
  const [adminDoc, setAdminDoc] = useState(null), [catDoc, setCatDoc] = useState(null), [meDoc, setMeDoc] = useState(null), [selfDocs, setSelfDocs] = useState({});
  const [loaded, setLoaded] = useState({});
  const mark = k => setLoaded(l => (l[k] ? l : { ...l, [k]: true }));
  useEffect(() => { if (!backend) return undefined; const st = backend.sub("savSkillsCat", d => { setCatDoc(d || {}); mark("cat"); }); return st; }, [backend]);
  useEffect(() => { if (!backend || !admin) return undefined; const st = backend.sub("savSkills", d => { setAdminDoc(d || {}); mark("admin"); }); return st; }, [backend, admin]);
  useEffect(() => { if (!backend || !email) return undefined; const st = backend.sub(meKey(email), d => { setMeDoc(d || {}); mark("me"); }); return st; }, [backend, email]);
  // responsable : auto-évaluations des personnes reliées à un compte
  const uids = useMemo(() => [...new Set(Object.values((adminDoc && adminDoc.people) || {}).map(p => p && p.uid).filter(Boolean).map(u => String(u).toLowerCase()))].sort().join(","), [adminDoc]);
  useEffect(() => { if (!backend || !admin || !uids) return undefined;
    const stops = uids.split(",").map(u => backend.sub(meKey(u), d => setSelfDocs(x => ({ ...x, [u]: (d && d.selfeval && d.selfeval.self) || {} }))));
    return () => stops.forEach(f => f()); }, [backend, admin, uids]);
  const bk = useRef(backend); bk.current = backend;
  const api = useMemo(() => {
    const w = async (fn, what) => { try { await fn(bk.current); return true; } catch (e) { console.error(e); notify("Enregistrement impossible (" + what + ") : " + (e && e.message), "error"); return false; } };
    return {
      setPerson: (id, p) => w(b => b.set("savSkills", "people", id, p), "personne"),
      delPerson: id => w(async b => { await b.del("savSkills", "people", id); await b.del("savSkills", "assess", id); }, "personne"),
      setAssess: (id, a) => w(b => b.set("savSkills", "assess", id, a), "évaluation"),
      setTargets: (pid, period, targets) => w(b => b.set("savSkills", "objectives", pid + "_" + period, { personId: pid, period, targets, updatedAt: Date.now() }), "objectif"),
      setSnapshot: (pid, period, scores) => w(b => b.set("savSkills", "snapshots", pid + "_" + period, { personId: pid, period, scores, source: "figé", createdAt: Date.now() }), "trimestre figé"),
      setCat: (id, c) => w(b => b.set("savSkillsCat", "categories", id, c), "catégorie"),
      delCat: id => w(b => b.del("savSkillsCat", "categories", id), "catégorie"),
      setMirror: (u, view) => w(b => b.set(meKey(u), "view", null, view, { email: String(u).toLowerCase() }), "fiche"),
      delMirror: u => w(b => b.del(meKey(u), "view", null), "fiche"),
      setSelf: (u, self) => w(b => b.set(meKey(u), "selfeval", null, { uid: String(u).toLowerCase(), self, updatedAt: Date.now() }), "auto-évaluation"),
    };
  }, []);
  const ready = admin ? !!(loaded.cat && loaded.admin) : !!(loaded.cat && (loaded.me || !email));
  return { adminDoc, catDoc, meDoc, selfDocs, api, ready };
}
