// v324 (audit Vercel « bundle-conditional ») : logique des Nouveautés déjà vues, sans les textes (releaseNotes.js / releaseCatalog.js,
// ≈ 35 Ko compressés) : App la charge au démarrage, les textes et le pop-up sont chargés à la demande.
import { useState, useEffect, useMemo, useCallback } from "react";

// Nouveautés à la connexion : une fois par personne et par poste, jusqu'à ce qu'une nouvelle entrée soit ajoutée dans releaseNotes.js.
const KEY = u => "enogia_releaseSeen_" + String(u || "anon").toLowerCase();
const read = u => { try { return localStorage.getItem(KEY(u)) || null; } catch (e) { return null; } };
const write = (u, v) => { try { localStorage.setItem(KEY(u), v); } catch (e) { /* stockage indisponible : le message reviendra */ } };
// v146.18 : on mémorise aussi la DATE de la dernière nouveauté vue. Si son identifiant a disparu de la liste (publication remplacée,
// notes du code retirées…), on ne ré-affiche pas tout : seules les nouveautés plus récentes que cette date comptent.
const KEYD = u => KEY(u) + "_date";
const readDate = u => { try { return localStorage.getItem(KEYD(u)) || null; } catch (e) { return null; } };
const writeDate = (u, v) => { try { localStorage.setItem(KEYD(u), v || ""); } catch (e) { /* idem */ } };

// Liste effective : publications enregistrées depuis l'appli (planning/overrides.releaseNotes) + celles du code (releaseNotes.js) ; à id égal, l'appli l'emporte.
export function mergeReleases(stored, code = []) {
  const st = Array.isArray(stored) ? stored.filter(r => r && r.id && Array.isArray(r.items)) : [];
  // Une publication « catalogue » (replaceCode) remplace les notes du code datées du même jour ou avant : on n'annonce que ce qui a été coché.
  // Même désactivée (off = préparée, pas encore affichée), elle masque ces notes : rien ne s'affiche tant qu'on ne l'active pas.
  // v146.18 : dès qu'une publication « catalogue » existe, les notes du code ne s'affichent plus du tout : seul ce qui a été coché et publié est annoncé.
  const catalogue = st.some(r => r.replaceCode);
  const all = [...st, ...code.filter(c => !st.some(r => r.id === c.id) && !catalogue)];
  return all.map((r, i) => ({ r, i })).sort((a, b) => String(b.r.date || "").localeCompare(String(a.r.date || "")) || a.i - b.i).map(x => x.r);
}

export function pickUnseen(releases, seenId, isAdmin, seenDate) {
  releases = releases.filter(r => !r.off);
  if (!releases.length) return [];
  const idx = seenId ? releases.findIndex(r => r.id === seenId) : -1;
  // Identifiant connu : tout ce qui est avant lui. Inconnu mais date connue : ce qui est strictement plus récent. Sinon (première visite) : les 3 dernières.
  const base = idx !== -1 ? releases.slice(0, idx) : seenId && seenDate ? releases.filter(r => String(r.date || "") > seenDate) : releases;
  const fresh = base.slice(0, 3);
  return fresh.map(r => ({ ...r, items: r.items.filter(i => !i.hidden && (!i.admin || isAdmin)) })).filter(r => r.items.length);
}

export function useUnseenReleases(userKey, isAdmin, releases = []) {
  const [seen, setSeen] = useState(() => ({ id: read(userKey), date: readDate(userKey) }));
  useEffect(() => { setSeen({ id: read(userKey), date: readDate(userKey) }); }, [userKey]);
  const unseen = useMemo(() => (userKey ? pickUnseen(releases, seen.id, isAdmin, seen.date) : []), [seen, userKey, isAdmin, releases]);
  const markSeen = useCallback(() => {
    if (!userKey || !releases.length) return;
    const top = releases.find(r => !r.off) || releases[0]; write(userKey, top.id); writeDate(userKey, top.date); setSeen({ id: top.id, date: top.date || null });
  }, [userKey, releases]);
  return { unseen, markSeen };
}
