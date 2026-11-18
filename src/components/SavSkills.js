// v405 : SAV / MES › Compétences — la page « Compétences SAV » (public/competences-sav.html) dans un cadre, reliée à Firestore par le pont
// de src/savSkills.js (galerie ?demo : base en mémoire, rien n'est lu ni écrit dans Firestore).
import React, { useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc, updateDoc, deleteField, FieldPath } from "firebase/firestore";
import { db } from "../firebase";
import { DOC_PFX } from "../appDocs";
import { T } from "../theme";
import { makeSkillsBridge, memoryBackend } from "../savSkills";

const ref = id => doc(db, "planning", DOC_PFX + id);
const firestoreBackend = () => ({
  sub: (id, cb, onErr) => onSnapshot(ref(id), s => cb(s.exists() ? s.data() : null), e => { console.warn("compétences SAV (lecture) :", e && e.message); if (onErr) onErr(e); }),
  set: async (id, field, key, value, extra) => {
    const path = key == null ? field : new FieldPath(field, key), more = extra ? Object.entries(extra).flat() : [];
    try { await updateDoc(ref(id), path, value, ...more); }
    catch (e) { if (e && e.code === "not-found") await setDoc(ref(id), { [field]: key == null ? value : { [key]: value }, ...(extra || {}) }, { merge: true }); else throw e; }
  },
  del: async (id, field, key) => { try { await updateDoc(ref(id), key == null ? field : new FieldPath(field, key), deleteField()); } catch (e) { if (!(e && e.code === "not-found")) throw e; } },
});
const isDemo = () => { try { return process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("demo"); } catch (e) { return false; } };

export default function SavSkills({ me, name, admin, owner, people }) {
  const frame = useRef(null), peopleRef = useRef(people);
  peopleRef.current = people;
  useEffect(() => {
    const br = makeSkillsBridge({ backend: isDemo() ? memoryBackend({}) : firestoreBackend(), me: { email: me, name, admin, owner }, people: [] });
    // la liste des personnes (recherche d'un compte) suit les profils sans relancer la page
    const use = async n => { if (n === "user") { const u = await br.use("user"); const list = () => (peopleRef.current || []).filter(p => p && p.email);
      return { ...u, profiles: async ids => Object.fromEntries((ids || []).map(i => { const p = list().find(x => String(x.email).toLowerCase() === String(i).toLowerCase()); return [i, p ? { name: p.name || p.email } : null]; }).filter(([, v]) => v)),
        search: async q => { const s = String(q || "").toLowerCase(); return list().filter(p => (String(p.name || "") + " " + p.email).toLowerCase().includes(s)).slice(0, 12).map(p => ({ id: String(p.email).toLowerCase(), name: p.name || p.email })); } }; }
      return br.use(n); };
    window.__enogiaSkills = use;
    return () => { br.stop(); if (window.__enogiaSkills === use) delete window.__enogiaSkills; };
  }, [me, name, admin, owner]);
  const theme = T.mode === "dark" ? "dark" : "light";
  const applyTheme = () => { try { const d = frame.current && frame.current.contentDocument; if (d && d.documentElement) d.documentElement.setAttribute("data-theme", theme); } catch (e) { /* cadre pas encore prêt */ } };
  useEffect(applyTheme); // clair / sombre suivi à chaque rendu
  return <iframe ref={frame} title="Compétences SAV" src={(process.env.PUBLIC_URL || "") + "/competences-sav.html"} onLoad={applyTheme}
    style={{ width: "100%", height: "calc(100dvh - 190px)", minHeight: 520, border: "1px solid " + T.line, borderRadius: 12, background: T.card, display: "block" }} />;
}
