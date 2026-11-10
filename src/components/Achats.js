// v262 (demandé : « un onglet spécial pour les Achats / Appro, pour le suivi des appros des composants qu'on installe sur nos ORC ;
// le responsable achats travaille le fond sur son Claude, je lui fournis la forme, comme pour Jérémie ») : page « Achats / Appro ».
// Forme de départ : Accueil (chiffres, à traiter en premier), Par PJ, Commandes, Composants, Fournisseurs, Réglages (propriétaire).
// Les dates de besoin partent de l'arrivée de chaque PJ dans le planning (moins une marge réglable). Données : document Firestore
// planning/achats (préfixe beta_ en bêta), une entrée par élément. Le planning n'est que lu (rows).
// La partie entre les repères DÉBUT PAGE / FIN PAGE est échangée avec le Claude du responsable achats (npm run kit:achats /
// npm run import:achats) : elle n'importe que React, le thème, PageHead et NavIcon.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { T, FZF } from "../theme";
import { PageHead, NavIcon } from "./SharedUI";

// ===== DÉBUT PAGE (kit Achats : tout ce qui suit jusqu’à FIN PAGE est échangé avec le Claude du responsable achats — scripts/achats-kit.js / achats-import.js) =====

/* ---------- Modèle de données ----------
   fournisseurs { [id]: { nom, ltJ, ltTransportJ, note } }      LT en jours calendaires ; LT transport toujours appliqué (transport géré par Enogia)
                (anciens champs contact, email, tel conservés s'ils existent, plus affichés : doublon avec l'ERP)
   composants   { [id]: { ref, designation, type, famille, fournisseurId, delaiJ, actif, scopes, enfants: [{ ref, qte }], note } }   = articles
                type = "achat" (défaut) ou "orc" (machine produite : pas de fournisseur, LT ni scope) ; ancien champ orc (true/false) encore lu
                famille = scope de l'article d'achat (nom d'un scope de params.scopes)
                scopes (machine ORC) = { [scope]: { actif, decalJ } } : actif = ligne vide créée dans chaque nouvelle fiche si la nomenclature
                n'a aucun composant dans ce scope ; decalJ = arrivée souhaitée du scope par rapport à l'arrivée machine (− avant, + après)
                ref = code article : clé fonctionnelle, unique, non modifiable après création
                delaiJ = LT article : remplace le LT fournisseur s'il vaut plus de 1 (vide, 0 ou 1 = LT du fournisseur)
                type "orc" : proposé comme modèle dans les fiches ; actif = false : masqué des listes, gardé pour l'historique
                enfants = nomenclature de l'article : [{ ref, qte, option }] (ancien format { composantId, qte } encore lu)
                option = nom d'un groupe d'options (vide = composant standard, toujours ajouté). Les composants d'un même groupe sont des
                alternatives : un seul est retenu à la configuration de la machine. Groupe d'un seul composant = facultatif (inclure ou non).
   projets      { [id]: { projet, machine, modele, marge, dateDebut, note } }       une fiche par machine ; projet = n° de projet de l'ordo (figé) ;
                machine = « projet-texte libre », unique ; modele = réf d'un article ORC ; note = commentaire libre ;
                dateDebut = date d'arrivée retenue, figée sur la fiche (reprise de l'ordo à la création, mise à jour manuelle, modifiable pour simuler).
                Ancienne fiche sans dateDebut : arrivée de l'ordo (machine, sinon projet) jusqu'à ce qu'elle soit figée.
                scopesDecal = { [scope]: decalJ } : décalages des scopes copiés du modèle ORC à la création, puis figés
                config = { statut: "brouillon" | "finalisee", choix: { [clé de groupe]: ref retenue } } : configuration machine si le modèle a des options ;
                clé = nom du groupe (options du modèle, lignes N1) ou « réf N1 › groupe » (options de la nomenclature d'un N1, lignes N2).
                En brouillon, la nomenclature n'est pas encore créée dans la fiche.
                verrou = true : configuration verrouillée (verrouLe = date ISO) : plus d'ajout, de modification ni de suppression de lignes ;
                attribution des PO, date d'arrivée, marge et commentaire restent modifiables.
   lignes       { [id]: { projetId, parentId, ref, composantId, designation, famille, fournisseurId, qte, dateBesoin, lieuLiv, poId, note, pj } }
                nomenclature de la fiche, parentId vide = niveau 1. Structure copiée à la création puis figée : une nomenclature modifiée ensuite
                ne change pas les fiches existantes. Désignation, fournisseur et LT suivent l'article (lien par ref) ; designation et fournisseurId
                ne servent que de secours ou pour une réf hors catalogue. ref vide = famille standard à configurer.
                Une ligne avec un PO attribué (non annulé) est verrouillée : il faut retirer le PO pour la modifier ou la supprimer.
                lieuLiv : plus affiché ni exigé (sujet à revoir côté nomenclatures pour les N2 expédiés chez les sous-traitants), conservé s'il existe.
                optKey = clé du groupe d'options dont la ligne est issue (vide = composant standard ou ajout manuel)
                famille = scope ; decalJ = décalage propre à cette machine, en jours, toujours modifiable (même verrouillée).
                (anciens champs encore lus s'ils existent : po, statut, datePrevue, dateRecue)
   po           { [id]: { numero, ligne, ref, designation, qte, dateCommande, dateLivraison, statut, projet,
                          source, odooId, qteRecue, annule, majOdoo } }
                saisie manuelle : id = p<numero>_<ligne>, source vide ; import Odoo : id = o<id de purchase.order.line>, source = "odoo", lecture seule ici
   params       { marge, scopes, scopeNiveaux, odoo, odooDemande }   scopes = liste ordonnée des noms de scope (défaut : SCOPES_DEF) ;
                scopeNiveaux = { [scope]: "N1" | "N2" } (absent = N1). Scope N1 : suivi par les chefs de projet, créé par défaut dans les fiches,
                réglé sur les machines ORC. Scope N2 : classement des composants N2, suivi par les achats uniquement ;   marge par défaut des nouvelles fiches (jours) ;
                odoo = { domaine, base, login, protocole, champProjet, depuis, seulementFiches, auto } : connexion Odoo SANS la clé API ;
                odooDemande = date ISO écrite par le bouton « Synchroniser maintenant »
   odooSync     { etat, debut, fin, nb, ajoutees, maj, annulees, message, cle }   compte rendu écrit UNIQUEMENT par le serveur (jamais par la page)
   access       [ e-mails ]     qui voit et modifie la page (en plus du propriétaire)
   Date de besoin (si non saisie) : N1 = arrivée machine + décalage du scope (fiche) + décalage de la ligne ;
                                    N2 = commande au plus tard du N1 + décalage de la ligne (tous les composants doivent être
                                    disponibles au passage de la commande du N1, pour être envoyés chez son fournisseur).
   Rétro-planning : N1 : livraison cible = besoin − marge ; N2 : livraison cible = besoin (pas de marge en plus).
   Dans les deux cas : commande au plus tard = livraison cible − LT (article, sinon fournisseur) − LT transport du fournisseur.
   Rien de calculé n'est enregistré : tout est recalculé à chaque affichage.

   ---------- Synchronisation Odoo : contrat pour la fonction serveur (à écrire par Gabriel, hors de cette page) ----------
   La page n'appelle jamais Odoo et ne voit jamais la clé API. Une fonction serveur (Cloud Function ou tâche planifiée) :
   - lit la clé dans un coffre de secrets (ex. secret ODOO_API_KEY), jamais dans Firestore ni dans le dépôt ;
   - se déclenche la nuit si params.odoo.auto, et quand params.odooDemande devient plus récent que odooSync.fin ;
   - lit dans Odoo (domaine params.odoo.domaine, base, login ; protocole "jsonrpc" Odoo 14 à 18 ou "json2" Odoo 19+) :
       purchase.order.line [id, order_id, sequence, product_id, name, product_qty, qty_received, date_planned, state, <champProjet>]
       purchase.order      [name, date_approve, date_order, state] ; product.product [default_code]
     filtre : commandes non annulées depuis params.odoo.depuis ; si seulementFiches, n° de projet présent dans projets.*.projet ;
   - écrit chaque ligne dans po["o" + id] : numero = order.name ; ligne = rang de la ligne dans la commande (tri sequence puis id) ;
     ref = default_code ; designation = name ; qte = product_qty ; qteRecue = qty_received ; dateCommande = date_approve sinon date_order (AAAA-MM-JJ) ;
     dateLivraison = date_planned (AAAA-MM-JJ) ; projet = valeur du champ champProjet ; source = "odoo" ; odooId = id ; majOdoo = date ISO ;
     statut : brouillon ou à approuver → "apasser" ; demande de prix envoyée → "envoyee" ; commande confirmée → "attente" ; qteRecue ≥ qte → "livre" ;
   - ligne annulée ou disparue d'Odoo : annule = true si elle est affectée à une ligne de nomenclature (poId), sinon suppression ;
   - ne modifie jamais les lignes source vide (saisies à la main) ni le champ poId des lignes de nomenclature ;
   - écrit en fin de passage odooSync = { etat: "ok" | "erreur" | "en_cours", debut, fin, nb, ajoutees, maj, annulees, message, cle: true si le secret existe }. */
export const EMPTY_ACHATS = { composants: {}, lignes: {}, fournisseurs: {}, projets: {}, po: {}, params: { marge: 10 }, access: [] };
export const STATUTS = [["apasser", "Cde à passer"], ["envoyee", "Cde envoyée"], ["attente", "Attente de livraison"], ["livre", "Livré"]];
const ST_LABEL = Object.fromEntries(STATUTS);
const LEGACY_ST = { besoin: "apasser", consult: "apasser", commande: "envoyee", confirme: "attente", expedie: "attente", recu: "livre" };
const SCOPES_DEF = ["SKID", "ARMOIRE", "POMPE CYCLE", "AIR COOLER", "VOLUTE", "TURBINE", "POMPE DE LUB", "POMPE DE COOLING"];   // liste de départ, modifiable dans Configuration
const up = s => String(s == null ? "" : s).trim().toUpperCase();
const fmtJ = n => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0") + " j";

/* ---------- Dates et utilitaires ---------- */
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const isoOf = v => { if (!v) return ""; const s = String(v); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(s); return isNaN(d) ? "" : iso(d); };
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const fd = s => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(2, 4) : "—");
const newId = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const low = s => String(s == null ? "" : s).trim().toLowerCase();
const cmpNat = (a, b) => String(a == null ? "" : a).localeCompare(String(b == null ? "" : b), "fr", { numeric: true, sensitivity: "base" });
const safeKey = s => String(s == null ? "" : s).trim().replace(/[^A-Za-z0-9-]/g, "_");
const poKey = (n, l) => "p" + safeKey(n) + "_" + safeKey(l);
const projOf = m => String(m || "").trim().replace(/-\d+$/, "");
const uniq = a => [...new Set(a.filter(Boolean))];
const isActif = a => !!a && a.actif !== false;
const fdt = s => { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? "—" : fd(iso(d)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const PROTOCOLES = [["jsonrpc", "JSON-RPC (Odoo 14 à 18)"], ["json2", "API JSON-2 (Odoo 19 et plus)"]];

/* ---------- Lecture des tableaux collés depuis Excel ou des fichiers CSV ---------- */
const normH = s => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const parseBool = s => { const x = normH(s); if (!x) return null; if (["1", "true", "t", "vrai", "v", "oui", "o", "yes", "y", "x"].includes(x)) return true; if (["0", "false", "f", "faux", "non", "n", "no"].includes(x)) return false; return undefined; };
const parseNum = s => { const x = String(s == null ? "" : s).trim().replace(/\s/g, "").replace(",", "."); if (!x) return null; const n = Number(x); return isNaN(n) ? undefined : n; };
// Cellules copiées depuis Excel (tabulations) ou CSV (point-virgule ou virgule), guillemets gérés
const parseTable = txt => {
  const s = String(txt || "").replace(/^\uFEFF/, ""); if (!s.trim()) return [];
  const first = s.split(/\r?\n/)[0], sep = first.includes("\t") ? "\t" : (first.split(";").length >= first.split(",").length ? ";" : ",");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === "") q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch; }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

// Date de besoin : saisie sur la ligne, sinon date de début de prod de la machine (row.dateDebut, ou arrivée du PJ dans l'ordo)
export function besoinOf(line, row, params) {
  if (line && line.dateBesoin) return line.dateBesoin;
  return row ? isoOf(row.dateDebut || row.arrivee) : "";
}
// Calculs d'une ligne de nomenclature (jours calendaires) :
//   livraison cible = besoin − marge ; commande au plus tard = livraison cible − LT fournisseur − LT transport
// ext = { four (fournisseur), poLine (ligne de PO affectée), besoin (date déjà résolue), ltArticle (LT de l'article), sansMarge (ligne N2 : cible = besoin) }
// k : done (livré), nc, late (commande ou livraison en retard), soon (commande à passer sous 14 j), todo (à passer), ok (commandé, dans les temps)
export function lineState(line, row, params, todayIso, ext) {
  const x = ext || {}, t = todayIso || iso(today0()), l = line || {};
  const besoin = x.besoin != null ? x.besoin : besoinOf(l, row, params);
  const mf = num(row && row.marge), marge = x.sansMarge ? 0 : mf != null ? mf : (num(params && params.marge) || 0);
  const cible = besoin ? addDays(besoin, -marge) : "";
  const la = num(x.ltArticle), ltSrc = la != null && la > 1 ? "article" : "fournisseur";
  const lt = ltSrc === "article" ? la : num(x.four && x.four.ltJ), ltT = num(x.four && x.four.ltTransportJ);
  const auPlusTard = cible && lt != null ? addDays(cible, -lt - (ltT || 0)) : "";
  const p = x.poLine || null;
  const statut = p ? (p.statut || "envoyee") : l.statut === "nc" ? "nc" : (LEGACY_ST[l.statut] || "apasser");
  const prevue = p ? (p.dateLivraison || "") : (l.datePrevue || "");
  const base = { besoin, cible, auPlusTard, lt, ltSrc, ltT, marge, prevue, statut, retardJ: 0 };
  if (statut === "livre") return { ...base, k: "done", l: "Livré" };
  if (statut === "nc") return { ...base, k: "nc", l: "Non conforme" };
  if (statut === "apasser") {
    if (!besoin) return { ...base, k: "todo", l: "Date de besoin manquante" };
    if (!x.four) return { ...base, k: "todo", l: "Fournisseur manquant" };
    if (lt == null) return { ...base, k: "todo", l: "LT manquant" };
    const d = daysBetween(t, auPlusTard);
    if (d < 0) return { ...base, k: "late", l: "Cde en retard", retardJ: -d };
    if (d <= 14) return { ...base, k: "soon", l: d === 0 ? "Cde à passer aujourd'hui" : "Cde à passer sous " + d + " j" };
    return { ...base, k: "todo", l: "Cde à passer" };
  }
  const ref = prevue || (cible && t > cible ? t : "");
  const r = cible && ref && ref > cible ? daysBetween(cible, ref) : 0;
  if (r > 0) return { ...base, k: "late", l: "Retard livraison", retardJ: r };
  return { ...base, k: "ok", l: ST_LABEL[statut] || "Commandé" };
}
const TONE = () => ({
  late: { bg: T.red100, ink: T.red600 }, nc: { bg: T.red100, ink: T.red600 },
  soon: { bg: T.amber100, ink: T.amber600 }, todo: { bg: T.surfaceAlt, ink: T.ink700 },
  ok: { bg: T.emerald100, ink: T.emerald600 }, done: { bg: T.surfaceAlt, ink: T.ink500 },
});

/* ---------- Petits composants ---------- */
const CARD = () => ({ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "12px 14px", boxSizing: "border-box" });
const BACKDROP = { position: "fixed", inset: 0, zIndex: 10010, background: "rgba(10,20,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const btn = primary => ({ minHeight: 30, padding: "0 12px", borderRadius: 8, border: "1px solid " + (primary ? T.ink900 : T.line), background: primary ? T.ink900 : T.card, color: primary ? T.card : T.ink700, fontFamily: T.font, fontSize: FZF.sm, fontWeight: 700, cursor: "pointer" });
const sbtn = () => ({ ...btn(false), minHeight: 26, padding: "0 8px", fontSize: FZF.xs });
const field = () => ({ padding: "5px 8px", minHeight: 32, borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontFamily: T.font, fontSize: FZF.sm, boxSizing: "border-box", width: "100%" });
const th = right => ({ textAlign: right ? "right" : "left", padding: "8px 10px", fontSize: 12, fontWeight: 500, color: T.ink500, borderBottom: "1px solid " + T.line, whiteSpace: "nowrap", position: "sticky", top: 0, background: T.card });
const td = () => ({ padding: "6px 10px", borderBottom: "1px solid " + T.line, fontSize: FZF.sm, color: T.ink900, verticalAlign: "middle" });
const empty = () => ({ ...td(), color: T.ink500, textAlign: "center", padding: 18 });
const SR = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
const LBL = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.ink700 };
function Pill({ k, l }) { const t = TONE()[k] || TONE().todo; return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 999, background: t.bg, color: t.ink, fontSize: FZF.xs, fontWeight: 700, whiteSpace: "nowrap" }}>{l}</span>; }
function useEscape(onClose) {
  const ref = useRef(onClose); ref.current = onClose;
  useEffect(() => { const k = e => { if (e.key === "Escape") ref.current(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
}
const sugList = s => { const seen = new Set(); return (s || []).map(x => (Array.isArray(x) ? x : [x, ""])).filter(([v]) => v && !seen.has(v) && seen.add(v)); };

// Fenêtre de saisie commune : fields = [{ k, l, type: text|number|date|select|textarea|static, opts, req, ro, hint, warn, suggest, val }]
// opts, suggest, ro, hint, warn peuvent dépendre des valeurs (fonction). derive(nouvelles valeurs, anciennes, champ) remplit d'autres champs.
// onSave peut renvoyer un texte d'erreur ; extra = [[libellé, fonction(valeurs)]] : boutons supplémentaires (ex. Dupliquer).
// Configuration machine : un groupe par option (boutons radio « choisir 1 », case à cocher si facultatif).
// plan(choix) renvoie { n1, groups, manquants } ; « Enregistrer le brouillon » garde les choix sans créer la nomenclature.
function ConfigDialog({ titre, sousTitre, plan, initial, brouillon, onDraft, onApply, onClose }) {
  const [c, setC] = useState(initial || {}); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEscape(() => { if (!busy) onClose(); });
  const P = plan(c), multi = P.groups.filter(g => g.multi), faits = multi.length - P.manquants.length, std = P.n1.filter(x => !x.optKey);
  const run = async fn => { setErr(""); setBusy(true); const r = await fn(c); setBusy(false); if (typeof r === "string") setErr(r); };
  return (<div onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }} style={BACKDROP}>
    <div role="dialog" aria-modal="true" aria-label={titre} style={{ ...CARD(), width: "min(720px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, padding: "16px 18px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, color: T.ink900 }}>{titre}</div>
      <div style={{ fontSize: FZF.sm, color: T.ink500 }}>{sousTitre}</div>
      <div role="status" style={{ fontSize: FZF.sm, fontWeight: 700, color: P.manquants.length ? T.amber600 : T.emerald600, margin: "8px 0 10px", fontVariantNumeric: "tabular-nums" }}>
        {multi.length ? faits + " choix sur " + multi.length + " faits" : "Aucun choix obligatoire"}{P.manquants.length ? " · reste : " + P.manquants.map(g => g.nom + (g.parent ? " (" + g.parent.ref + ")" : "")).join(", ") : " · configuration complète"}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {P.groups.map(g => { const miss = P.manquants.includes(g); return (
          <fieldset key={g.key} style={{ border: "1px solid " + (miss ? T.amber600 : T.line), borderRadius: 8, padding: "6px 12px 8px", margin: 0, background: miss ? T.amber100 : T.card }}>
            <legend style={{ fontSize: FZF.sm, fontWeight: 700, color: T.ink900, padding: "0 4px" }}>{g.nom}{g.parent && <span style={{ fontWeight: 400, color: T.ink700 }}> · dans {g.parent.ref}</span>} <span style={{ fontWeight: 400, color: T.ink500, fontSize: FZF.xs }}>{g.multi ? "choisir 1 parmi " + g.items.length : "facultatif"}</span></legend>
            {g.items.map(i => { const on = low(g.val) === low(i.ref), dis = !i.art; return (
              <label key={i.ref} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30, cursor: dis ? "default" : "pointer", fontSize: FZF.sm, color: dis ? T.ink500 : T.ink900 }}>
                <input type={g.multi ? "radio" : "checkbox"} name={"opt-" + g.key} checked={on} disabled={dis} onChange={e => setC(o => ({ ...o, [g.key]: g.multi ? i.ref : (e.target.checked ? i.ref : "") }))} style={{ width: 16, height: 16, margin: 0 }} />
                <span style={{ fontFamily: T.fontMono, fontWeight: 700 }}>{i.ref}</span>
                <span style={{ color: T.ink700, flex: 1, minWidth: 0 }}>{i.art ? i.art.designation : "absent des articles"}</span>
                <span style={{ color: T.ink500, fontVariantNumeric: "tabular-nums" }}>× {i.qte}</span>
              </label>); })}
          </fieldset>); })}
        {!P.groups.length && <div style={{ fontSize: FZF.sm, color: T.ink500 }}>Ce modèle n'a pas d'options.</div>}
      </div>
      <details style={{ marginTop: 12, fontSize: FZF.sm, color: T.ink700 }}>
        <summary style={{ cursor: "pointer", minHeight: 24 }}>Composants standard, toujours inclus ({std.length})</summary>
        <div style={{ marginTop: 6, display: "grid", gap: 2, fontVariantNumeric: "tabular-nums" }}>{std.map(x => <div key={x.k.ref}><span style={{ fontFamily: T.fontMono }}>{x.k.ref}</span> {x.k.art ? x.k.art.designation : ""} × {x.k.qte}</div>)}</div>
      </details>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false)} disabled={busy} onClick={onClose}>Annuler</button>
        {brouillon && <button type="button" style={btn(false)} disabled={busy} onClick={() => run(onDraft)}>Enregistrer le brouillon</button>}
        <button type="button" style={btn(true)} disabled={busy || P.manquants.length > 0} onClick={() => run(onApply)}>{brouillon ? "Créer la nomenclature" : "Appliquer les changements"}</button>
      </div>
      <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 8 }}>{brouillon ? "Le brouillon garde vos choix sans créer la nomenclature : vous la créerez quand toutes les options seront choisies." : "Seules les lignes des options modifiées sont remplacées. Impossible pour une option dont la ligne a un PO attribué."}</div>
    </div>
  </div>);
}

// Paramètres par scope d'une machine ORC : créé par défaut (oui/non) et arrivée souhaitée (jours par rapport à l'arrivée machine)
function ScopesEditor({ value, scopes, onChange }) {
  const v = value || {}, set = (s, x) => onChange({ ...v, [s]: { actif: true, decalJ: 0, ...(v[s] || {}), ...x } });
  return (<div style={{ border: "1px solid " + T.line, borderRadius: 8, overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
    <thead><tr><th style={th()}>Scope</th><th style={th()}>Créé par défaut</th><th style={th(true)}>Arrivée (j)</th></tr></thead>
    <tbody>{scopes.map(s => { const c = v[s] || { actif: false, decalJ: 0 }; return (<tr key={s} style={{ height: 36 }}>
      <td style={{ ...td(), fontWeight: 700 }}>{s}</td>
      <td style={td()}><input type="checkbox" checked={!!c.actif} aria-label={"Scope " + s + " créé par défaut"} onChange={e => set(s, { actif: e.target.checked })} style={{ width: 16, height: 16 }} /></td>
      <td style={{ ...td(), textAlign: "right" }}><input type="number" step={1} value={c.decalJ == null ? "" : c.decalJ} aria-label={"Arrivée du scope " + s + ", en jours par rapport à l'arrivée machine"} onChange={e => set(s, { decalJ: e.target.value === "" ? "" : Number(e.target.value) })} style={{ ...field(), width: 80, textAlign: "right" }} /></td>
    </tr>); })}</tbody>
  </table></div>);
}

function FormDialog({ title, vals, fields: allFields, onSave, onDelete, deleteLabel, derive, extra, lecture, note, onClose }) {
  const [v, setV] = useState(vals); const [err, setErr] = useState(""); const [conf, setConf] = useState(false); const [busy, setBusy] = useState(false);
  useEscape(onClose);
  const fields = allFields.filter(f => !f.show || f.show(v));
  const set = (k, val) => setV(o => { const n = { ...o, [k]: val }; return derive ? derive(n, o, k) : n; });
  const save = async () => {
    const miss = fields.find(f => f.req && f.type !== "static" && f.type !== "scopes" && !String(v[f.k] == null ? "" : v[f.k]).trim());
    if (miss) { setErr("« " + miss.l + " » est obligatoire."); return; }
    setErr(""); setBusy(true); const r = await onSave(v); setBusy(false); if (typeof r === "string") setErr(r);
  };
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={BACKDROP}>
    <div role="dialog" aria-modal="true" aria-label={title} style={{ ...CARD(), width: "min(620px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, padding: "16px 18px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, marginBottom: note ? 4 : 12, color: T.ink900 }}>{title}</div>
      {note && <div style={{ fontSize: FZF.sm, color: T.ink500, marginBottom: 12 }}>{note}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        {fields.map(f => {
          const ro = lecture || (typeof f.ro === "function" ? f.ro(v) : !!f.ro), hint = typeof f.hint === "function" ? f.hint(v) : f.hint, warn = f.warn ? f.warn(v) : "";
          const opts = typeof f.opts === "function" ? f.opts(v) : f.opts, sug = typeof f.suggest === "function" ? f.suggest(v) : f.suggest;
          const wide = f.type === "textarea" || f.type === "scopes" || f.wide, val = v[f.k] == null ? "" : v[f.k];
          const roStyle = ro ? { background: T.surfaceAlt, color: T.ink700 } : null;
          const ctl = f.type === "select" ? <select value={val} disabled={ro} onChange={e => set(f.k, e.target.value)} style={{ ...field(), ...roStyle }}>{opts.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>
            : f.type === "textarea" ? <textarea rows={3} value={val} readOnly={ro} onChange={e => set(f.k, e.target.value)} style={{ ...field(), resize: "vertical" }} />
              : f.type === "scopes" ? <ScopesEditor value={v[f.k]} scopes={f.scopes} onChange={x => set(f.k, x)} />
              : f.type === "static" ? <span style={{ fontWeight: 400, fontSize: FZF.sm, color: T.ink900, minHeight: 32, display: "flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>{f.val(v)}</span>
                : <><input type={f.type || "text"} value={val} readOnly={ro} list={sug ? "dl-" + f.k : undefined} onChange={e => set(f.k, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} style={{ ...field(), ...roStyle, fontFamily: f.mono ? T.fontMono : T.font }} />
                  {sug && <datalist id={"dl-" + f.k}>{sugList(sug).map(([s, l]) => <option key={s} value={s}>{l}</option>)}</datalist>}</>;
          const Wrap = f.type === "static" || f.type === "scopes" ? "div" : "label";
          return <Wrap key={f.k} style={{ ...LBL, gridColumn: wide ? "1 / -1" : undefined }}><span>{f.l}{f.req ? " *" : ""}</span>{ctl}{warn ? <span style={{ fontWeight: 600, color: T.red600 }}>{warn}</span> : hint && <span style={{ fontWeight: 400, color: T.ink500 }}>{hint}</span>}</Wrap>;
        })}
      </div>
      {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {!lecture && onDelete && (conf ? <button type="button" style={{ ...btn(false), color: T.red600, borderColor: T.red600 }} onClick={onDelete}>Confirmer la suppression</button>
          : <button type="button" style={{ ...btn(false), color: T.red600 }} onClick={() => setConf(true)}>{deleteLabel || "Supprimer"}</button>)}
        {(extra || []).map(([l, fn]) => <button key={l} type="button" style={btn(false)} onClick={() => fn(v)}>{l}</button>)}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(!!lecture)} onClick={onClose}>{lecture ? "Fermer" : "Annuler"}</button>
        {!lecture && <button type="button" style={btn(true)} disabled={busy} onClick={save}>Enregistrer</button>}
      </div>
    </div>
  </div>);
}

// Import par lot : coller des cellules Excel (avec la ligne d'en-tête) ou choisir un fichier CSV, vérifier, puis importer.
// cols = [{ k, l, req, alias: [en-têtes acceptés, sans accents ni espaces] }] ; analyze(lignes) → { lignes: [texte], err: [texte], n, apply(progression) }
function ImportDialog({ title, intro, cols, exemple, fichier, analyze, onClose }) {
  const [txt, setTxt] = useState(""), [res, setRes] = useState(null), [busy, setBusy] = useState(false), [prog, setProg] = useState("");
  useEscape(() => { if (!busy) onClose(); });
  const lire = file => { if (!file) return; const fr = new FileReader();
    fr.onload = () => { const t = String(fr.result || ""); if (!t.includes("\uFFFD")) { setTxt(t); setRes(null); return; }
      const f2 = new FileReader(); f2.onload = () => { setTxt(String(f2.result || "")); setRes(null); }; f2.readAsText(file, "windows-1252"); };
    fr.readAsText(file, "utf-8"); };
  const analyser = () => {
    const t = parseTable(txt); if (t.length < 2) { setRes({ err: ["Rien à importer : collez les cellules avec la ligne d'en-tête et au moins une ligne."] }); return; }
    const head = t[0].map(normH), idx = {}; cols.forEach(c => { idx[c.k] = head.findIndex(h => c.alias.includes(h)); });
    const miss = cols.filter(c => c.req && idx[c.k] < 0);
    if (miss.length) { setRes({ err: ["Colonne(s) introuvable(s) : " + miss.map(c => c.l).join(", ") + ". En-tête lu : " + t[0].join(" | ")] }); return; }
    const rows = t.slice(1).map((r, i) => { const o = { _ligne: i + 2 }; cols.forEach(c => { o[c.k] = idx[c.k] >= 0 ? String(r[idx[c.k]] == null ? "" : r[idx[c.k]]).trim() : null; }); return o; })
      .filter(o => cols.some(c => o[c.k]));
    setRes(analyze(rows));
  };
  const go = async () => { setBusy(true); const ok = await res.apply(setProg); setBusy(false); if (ok) onClose(); };
  const trame = () => { const csv = "\uFEFF" + [cols.map(c => c.l), ...exemple].map(r => r.join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a");
    a.href = url; a.download = fichier; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); };
  const errs = (res && res.err) || [];
  return (<div onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }} style={BACKDROP}>
    <div role="dialog" aria-modal="true" aria-label={title} style={{ ...CARD(), width: "min(760px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, padding: "16px 18px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, color: T.ink900, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: FZF.sm, color: T.ink700, marginBottom: 8 }}>{intro}</div>
      <div style={{ fontSize: FZF.sm, color: T.ink700, marginBottom: 10 }}>Colonnes : <span style={{ fontFamily: T.fontMono }}>{cols.map(c => c.l + (c.req ? " *" : "")).join(" ; ")}</span>
        <button type="button" style={{ ...sbtn(), marginLeft: 8 }} onClick={trame}>Télécharger la trame</button></div>
      <label style={LBL}>Cellules copiées depuis Excel (Ctrl+C puis Ctrl+V ici), ligne d'en-tête comprise
        <textarea rows={7} value={txt} onChange={e => { setTxt(e.target.value); setRes(null); }} style={{ ...field(), resize: "vertical", fontFamily: T.fontMono, fontSize: FZF.xs }} /></label>
      <label style={{ ...LBL, marginTop: 8 }}>Ou un fichier CSV (Excel : Enregistrer sous › CSV)
        <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={e => lire(e.target.files && e.target.files[0])} style={{ fontFamily: T.font, fontSize: FZF.sm, color: T.ink700, minHeight: 28 }} /></label>
      {res && <div role="status" style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, background: T.surfaceAlt, fontSize: FZF.sm, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>
        {(res.lignes || []).filter(Boolean).map(l => <div key={l}>{l}</div>)}
        {errs.length > 0 && <div style={{ color: T.red600, marginTop: res.lignes ? 6 : 0 }}>{errs.slice(0, 12).map((e, i) => <div key={i}>{e}</div>)}{errs.length > 12 && <div>… et {errs.length - 12} autre(s).</div>}</div>}
      </div>}
      {prog && <div style={{ marginTop: 8, fontSize: FZF.sm, color: T.ink700, fontVariantNumeric: "tabular-nums" }}>Import en cours : {prog}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false)} disabled={busy} onClick={onClose}>Annuler</button>
        <button type="button" style={btn(false)} disabled={busy || !txt.trim()} onClick={analyser}>Vérifier</button>
        <button type="button" style={btn(true)} disabled={busy || !res || !res.apply || !res.n} onClick={go}>{res && res.n ? "Importer (" + res.n + ")" : "Importer"}</button>
      </div>
    </div>
  </div>);
}

// Choix d'une ligne de PO pour une ligne de nomenclature : on saisit le n° de PO, on voit toutes ses lignes avec la quantité déjà affectée,
// on en choisit une. Une ligne de PO entièrement affectée est grisée et ne peut plus être choisie ; ses affectations peuvent être retirées ici.
function PoPicker({ line, po, affects, onPick, onClear, onUnassign, canEdit, onClose }) {
  const [q, setQ] = useState(line.poNum || ""); const inRef = useRef(null);
  useEscape(onClose);
  useEffect(() => { if (inRef.current) inRef.current.focus(); }, []);
  const s = low(q), maQte = num(line.qte) || 0;
  const res = useMemo(() => (!s ? [] : po.filter(p => low(p.numero).includes(s)).sort((a, b) => cmpNat(a.numero, b.numero) || cmpNat(a.ligne, b.ligne))), [po, s]);
  const shown = res.slice(0, 60);
  return (<div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={BACKDROP}>
    <div role="dialog" aria-modal="true" aria-label="Affecter une ligne de PO" style={{ ...CARD(), width: "min(980px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, padding: "16px 18px" }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.lg, fontWeight: 600, color: T.ink900 }}>Affecter une ligne de PO</div>
      <div style={{ fontSize: FZF.sm, color: T.ink500, marginBottom: 10 }}><span style={{ fontFamily: T.fontMono }}>{line.refEff || "—"}</span> {line.desEff}, quantité {line.qte || "—"}</div>
      <label style={{ ...LBL, maxWidth: 280, marginBottom: 10 }}>N° de PO
        <input ref={inRef} type="search" value={q} onChange={e => setQ(e.target.value)} style={{ ...field(), fontFamily: T.fontMono }} /></label>
      {!s ? <div style={{ color: T.ink500, fontSize: FZF.sm, padding: "8px 0" }}>Saisissez un n° de PO pour voir ses lignes.</div>
        : !res.length ? <div style={{ color: T.ink500, fontSize: FZF.sm, padding: "8px 0" }}>Aucun PO ne correspond. Vérifiez le numéro ou créez la ligne dans l'onglet PO.</div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
            <thead><tr><th style={th()}>N° PO</th><th style={th()}>Ligne</th><th style={th()}>Référence</th><th style={th()}>Désignation</th><th style={th(true)}>Qté</th><th style={th(true)}>Affectée</th><th style={th()}>Livraison</th><th style={th()}>Statut</th><th style={th()}>Projet</th><th style={th()}><span style={SR}>Action</span></th></tr></thead>
            <tbody>{shown.map(p => {
              const cur = p.id === line.poId, same = p.ref && low(p.ref) === low(line.refEff), a = affects[p.id] || { qte: 0, lines: [] }, pq = num(p.qte);
              const plein = pq != null && pq > 0 && a.qte >= pq && !cur, depasse = !cur && !plein && pq != null && pq > 0 && a.qte + maQte > pq;
              const g = plein ? { color: T.ink500 } : null, tdx = x => ({ ...td(), ...x, ...g, borderBottom: a.lines.length ? "none" : td().borderBottom });
              return (<React.Fragment key={p.id}>
                <tr onClick={plein ? undefined : () => onPick(p.id)} style={{ cursor: plein ? "default" : "pointer", height: 36, background: cur || plein ? T.surfaceAlt : "transparent" }}>
                  <td style={tdx({ fontFamily: T.fontMono, fontWeight: 700 })}>{p.numero}</td><td style={tdx({ fontFamily: T.fontMono })}>{p.ligne}</td>
                  <td style={tdx({ fontFamily: T.fontMono })}>{p.ref || "—"}{same && <span style={{ marginLeft: 6, fontFamily: T.font, fontSize: FZF.xs, fontWeight: 700, color: plein ? T.ink500 : T.emerald600 }}>même réf.</span>}</td>
                  <td style={tdx()}>{p.designation || "—"}</td><td style={tdx({ textAlign: "right" })}>{pq == null ? "—" : pq}</td>
                  <td style={tdx({ textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: plein ? T.ink500 : depasse ? T.amber600 : T.ink700 })}>{a.qte} / {pq == null ? "—" : pq}</td>
                  <td style={tdx({ whiteSpace: "nowrap" })}>{fd(p.dateLivraison)}</td><td style={tdx({ whiteSpace: "nowrap", color: T.ink700 })}>{ST_LABEL[p.statut] || "—"}</td>
                  <td style={tdx({ fontFamily: T.fontMono, color: T.ink700 })}>{p.projet || "—"}</td>
                  <td style={tdx({ whiteSpace: "nowrap", textAlign: "right" })}>{cur ? <span style={{ fontSize: FZF.xs, color: T.ink500, fontWeight: 700 }}>Affectée ici</span>
                    : plein ? <span style={{ fontSize: FZF.xs, fontWeight: 700 }}>Complète</span>
                      : <>{depasse && <span style={{ fontSize: FZF.xs, color: T.amber600, fontWeight: 700, marginRight: 6 }}>dépassera</span>}<button type="button" style={sbtn()} onClick={e => { e.stopPropagation(); onPick(p.id); }}>Choisir</button></>}</td>
                </tr>
                {a.lines.length > 0 && <tr style={{ background: cur || plein ? T.surfaceAlt : "transparent" }}><td colSpan={10} style={{ ...td(), paddingTop: 0, fontSize: FZF.xs, color: T.ink700 }}>
                  <span style={{ color: T.ink500, marginRight: 6 }}>Affectée à :</span>
                  {a.lines.map(x => <span key={x.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 10, whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: T.fontMono }}>{x.machine}</span> · <span style={{ fontFamily: T.fontMono }}>{x.ref}</span> × {x.qte}{x.id === line.id ? " (cette ligne)" : ""}
                    {canEdit && <button type="button" aria-label={"Retirer l'affectation de " + x.ref + " sur " + x.machine} style={{ ...sbtn(), minHeight: 24, padding: "0 6px" }} onClick={() => onUnassign(x.id)}>Retirer</button>}</span>)}
                </td></tr>}
              </React.Fragment>); })}</tbody>
          </table></div>}
      {res.length > shown.length && <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 6 }}>{shown.length} premières lignes sur {res.length} : précisez le numéro.</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {line.poId && <button type="button" style={{ ...btn(false), color: T.red600 }} onClick={onClear}>Retirer le PO de cette ligne</button>}
        <span style={{ flex: 1 }} />
        <button type="button" style={btn(false)} onClick={onClose}>Fermer</button>
      </div>
    </div>
  </div>);
}

// Réglages de la connexion Odoo : tout sauf la clé API, qui reste côté serveur
function OdooReglages({ odoo, sync, texte, demandeEnCours, onSave, onSync }) {
  const [v, setV] = useState(() => ({ domaine: "", base: "", login: "", protocole: "jsonrpc", champProjet: "", depuis: "", seulementFiches: true, auto: true, ...odoo }));
  const [err, setErr] = useState("");
  const set = (k, x) => { setV(o => ({ ...o, [k]: x })); setErr(""); };
  const save = () => {
    const domaine = String(v.domaine || "").trim().replace(/^[a-z]+:\/\//i, "").replace(/\/+$/, "");
    if (!domaine || !String(v.base || "").trim() || !String(v.login || "").trim()) { setErr("Domaine, base de données et identifiant sont obligatoires."); return; }
    if (/[\s/]/.test(domaine)) { setErr("Domaine seul, sans chemin ni espace (par exemple enogia.odoo.com)."); return; }
    onSave({ ...v, domaine, base: String(v.base).trim(), login: String(v.login).trim(), champProjet: String(v.champProjet || "").trim() });
  };
  const inp = (k, l, extra, hint) => <label style={LBL}>{l}<input value={v[k] || ""} onChange={e => set(k, e.target.value)} style={{ ...field(), ...(extra || {}) }} />{hint && <span style={{ fontWeight: 400, color: T.ink500 }}>{hint}</span>}</label>;
  const chk = (k, l) => <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZF.sm, color: T.ink700, minHeight: 28, cursor: "pointer" }}><input type="checkbox" checked={!!v[k]} onChange={e => set(k, e.target.checked)} style={{ width: 16, height: 16 }} />{l}</label>;
  const pret = !!(odoo && odoo.domaine && odoo.base && odoo.login);
  return (<div style={{ display: "grid", gap: 10 }}>
    <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.md, fontWeight: 600, color: T.ink900 }}>Connexion Odoo (PO)</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
      {inp("domaine", "Domaine Odoo *", { fontFamily: T.fontMono }, "Par exemple enogia.odoo.com. Connexion toujours chiffrée.")}
      {inp("base", "Base de données *", { fontFamily: T.fontMono })}
      {inp("login", "Identifiant du compte technique *", null, "Compte Odoo dédié, en lecture seule sur les achats.")}
      <label style={LBL}>Version de l'API<select value={v.protocole || "jsonrpc"} onChange={e => set("protocole", e.target.value)} style={field()}>{PROTOCOLES.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select></label>
      {inp("champProjet", "Champ Odoo du n° de projet", { fontFamily: T.fontMono }, "Nom technique, à demander à l'administrateur Odoo.")}
      <label style={LBL}>Commandes depuis<input type="date" value={v.depuis || ""} onChange={e => set("depuis", e.target.value)} style={field()} /><span style={{ fontWeight: 400, color: T.ink500 }}>Vide : toutes les commandes.</span></label>
    </div>
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>{chk("seulementFiches", "Seulement les projets ayant une fiche machine")}{chk("auto", "Synchronisation automatique chaque nuit")}</div>
    <div role="note" style={{ borderRadius: 8, padding: "8px 10px", fontSize: FZF.sm, background: sync.cle ? T.emerald100 : T.amber100, color: sync.cle ? T.emerald600 : T.amber600 }}>
      <b>Clé API : {sync.cle ? "enregistrée sur le serveur." : "pas encore enregistrée sur le serveur."}</b> Elle ne se saisit jamais dans cette page : tout ce qui est enregistré ici est lisible par les utilisateurs de la page. Gabriel la range dans le coffre de secrets du serveur, seul endroit d'où Odoo est appelé.
    </div>
    <div style={{ fontSize: FZF.sm, color: sync.etat === "erreur" && !demandeEnCours ? T.red600 : T.ink700, fontVariantNumeric: "tabular-nums" }}>{pret ? texte : "Connexion pas encore enregistrée."}</div>
    {err && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm }}>{err}</div>}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={btn(true)} onClick={save}>Enregistrer la connexion</button>
      <button type="button" style={btn(false)} disabled={!pret || demandeEnCours || sync.etat === "en_cours"} onClick={onSync}>Synchroniser maintenant</button>
    </div>
  </div>);
}

const TABS = [["projets", "Projets"], ["po", "PO"], ["fournisseurs", "Fournisseurs"], ["articles", "Articles"], ["nomenclatures", "Nomenclatures"], ["configuration", "Configuration"], ["reglages", "Réglages"]];
const PAGE = 25;
const COLS_ART = [
  { k: "ref", l: "REF", req: true, alias: ["ref", "refenogia", "reference", "code", "codearticle", "article"] },
  { k: "designation", l: "DESIGNATION", alias: ["designation", "libelle", "description"] },
  { k: "type", l: "TYPE", alias: ["type", "typearticle"] },
  { k: "famille", l: "SCOPE", alias: ["scope", "famille", "family"] },
  { k: "fournisseur", l: "FOURNISSEUR", alias: ["fournisseur", "frs", "supplier"] },
  { k: "lt", l: "LT", alias: ["lt", "leadtime", "ltarticle", "ltjours", "delai"] },
  { k: "orc", l: "ORC", alias: ["orc"] },
  { k: "actif", l: "ACTIF", alias: ["actif", "active"] },
];
const COLS_NOM = [
  { k: "compose", l: "COMPOSE", req: true, alias: ["compose", "refcompose", "refenogiacompose", "parent"] },
  { k: "composant", l: "COMPOSANT", req: true, alias: ["composant", "refcomposant", "refenogiacomposant", "ref", "refenogia"] },
  { k: "qte", l: "QTE", alias: ["qte", "quantite", "qty", "quantity"] },
  { k: "option", l: "OPTION", alias: ["option", "groupe", "groupeoption", "variante"] },
];

/* ---------- Page ---------- */
// doc : document planning/achats ; api : put(collection, id, data), del(collection, id), setParams(p), setAccess(liste)
// rows : lignes du planning (pj, nomProjet, gamme, etat, arrivee, depart), en lecture seule ; canEdit : modifier ; owner : propriétaire
export function Achats({ doc, api, rows, canEdit, owner }) {
  const S = useMemo(() => { const d = doc || {}, o = { ...EMPTY_ACHATS, ...d, params: { ...EMPTY_ACHATS.params, ...(d.params || {}) }, access: Array.isArray(d.access) ? d.access : [] };
    ["composants", "lignes", "fournisseurs", "projets", "po"].forEach(c => { o[c] = Object.fromEntries(Object.entries(d[c] || {}).map(([k, v]) => [k, { ...v, id: k }])); }); return o; }, [doc]);
  const byPj = useMemo(() => { const m = {}; (rows || []).forEach(r => { if (r && r.pj) m[r.pj] = r; }); return m; }, [rows]);
  const tIso = iso(today0());
  const pref = (k, ok, def) => { try { const v = localStorage.getItem(k); return ok.includes(v) ? v : def; } catch (e) { return def; } };
  const [tab, setTab] = useState(() => pref("enogia_achats_tab", TABS.map(t => t[0]), "projets"));
  const [vue, setVue] = useState(() => pref("enogia_achats_vue", ["tableau", "cartes", "gantt"], "tableau"));
  useEffect(() => { try { localStorage.setItem("enogia_achats_tab", tab); localStorage.setItem("enogia_achats_vue", vue); } catch (e) { /* stockage indisponible */ } }, [tab, vue]);
  const [cfg, setCfg] = useState(null);
  const [seulDiff, setSeulDiff] = useState(false), [deverr, setDeverr] = useState(false);
  const [ficheSel, setFicheSel] = useState(null), [qFiche, setQFiche] = useState(""), [qFour, setQFour] = useState(""), [qPo, setQPo] = useState(""), [poLimit, setPoLimit] = useState(PAGE);
  const [typeArt, setTypeArt] = useState("tous"), [delScope, setDelScope] = useState(null), [newScope, setNewScope] = useState(""), [newNiv, setNewNiv] = useState("N1"), [scopeErr, setScopeErr] = useState("");
  const [qArt, setQArt] = useState(""), [artLimit, setArtLimit] = useState(50), [voirInactifs, setVoirInactifs] = useState(false);
  const [nomSel, setNomSel] = useState(null), [qNom, setQNom] = useState(""), [nomAdd, setNomAdd] = useState({ ref: "", qte: 1 }), [nomErr, setNomErr] = useState(""), [nomDel, setNomDel] = useState(false);
  const [form, setForm] = useState(null), [pick, setPick] = useState(null), [imp, setImp] = useState(null), [toast, setToast] = useState(null); const tRef = useRef(null);
  const notify = (msg, err) => { setToast({ msg, err }); clearTimeout(tRef.current); tRef.current = setTimeout(() => setToast(null), err ? 5200 : 3000); };
  const write = async (c, id, data) => { const d = { ...data }; delete d.id; return api.put(c, id, d); };
  const put = async (c, id, data) => { const ok = await write(c, id, data); notify(ok ? "Enregistré." : "Enregistrement impossible, réessayez dans un instant.", !ok); return ok; };
  const del = async (c, id) => { const ok = await api.del(c, id); notify(ok ? "Supprimé." : "Suppression impossible, réessayez dans un instant.", !ok); return ok; };

  /* ---- articles (clé : code article) et nomenclatures ---- */
  const arts = useMemo(() => Object.values(S.composants), [S]);
  const artByRef = useMemo(() => { const m = {}; arts.forEach(a => { const k = low(a.ref); if (k && !m[k]) m[k] = a; }); return m; }, [arts]);
  // Scopes : liste ordonnée (Configuration) ; paramètres par machine ORC (créé par défaut, arrivée en jours)
  const scopeList = useMemo(() => (Array.isArray(S.params.scopes) && S.params.scopes.length ? S.params.scopes : SCOPES_DEF), [S]);
  const scIdx = f => { const i = scopeList.indexOf(up(f)); return i < 0 ? 99 : i; };
  const niveauOf = s => ((S.params.scopeNiveaux || {})[up(s)] === "N2" ? "N2" : "N1");
  const scopesN1 = scopeList.filter(s => niveauOf(s) === "N1");
  // Choix de scope : niv = "N1" ou "N2" pour ne proposer que ce niveau (plus la valeur actuelle) ; sans niv, tous, avec leur niveau
  const scOpts = (cur, niv) => [["", "—"], ...uniq([...scopeList.filter(s => !niv || niveauOf(s) === niv), up(cur)]).map(x => [x, niv ? x : x + " (" + niveauOf(x) + ")"])];
  const isOrc = a => !!a && (a.type ? a.type === "orc" : !!a.orc);
  const cfgOf = a => { const c = isOrc(a) && a.scopes; return Object.fromEntries(scopeList.map(s => [s, niveauOf(s) === "N2" ? { actif: false, decalJ: 0 }
    : c ? { actif: !!(c[s] && c[s].actif), decalJ: num(c[s] && c[s].decalJ) || 0 } : { actif: true, decalJ: 0 }])); };
  const decalsOf = a => Object.fromEntries(Object.entries(cfgOf(a)).filter(([, c]) => c.decalJ).map(([s, c]) => [s, c.decalJ]));
  const kidsOf = a => (a && Array.isArray(a.enfants) ? a.enfants : []).map(e => { const ref = e.ref || ((S.composants[e.composantId] || {}).ref) || "";
    return { ref, qte: num(e.qte) || 1, option: up(e.option), art: artByRef[low(ref)] || null }; }).filter(e => e.ref);
  // Groupes d'options d'une nomenclature : [{ nom, items, multi }] ; multi = choisir 1 parmi plusieurs, sinon facultatif
  const groupsOf = a => { const m = {}; kidsOf(a).forEach(k => { if (k.option) (m[k.option] = m[k.option] || []).push(k); });
    return Object.keys(m).sort(cmpNat).map(nom => ({ nom, items: m[nom], multi: m[nom].length > 1 })); };
  const hasOptions = a => groupsOf(a).length > 0 || kidsOf(a).some(k => k.art && groupsOf(k.art).length > 0);
  // Plan de configuration d'une machine : lignes N1 retenues (standard + options choisies) et groupes à choisir (modèle, puis N1)
  const planOf = (mArt, choix) => { const c = choix || {}, groups = [], n1 = [];
    kidsOf(mArt).filter(k => !k.option).forEach(k => n1.push({ k, optKey: "" }));
    groupsOf(mArt).forEach(g => { const v = c[g.nom] || ""; groups.push({ key: g.nom, nom: g.nom, parent: null, items: g.items, multi: g.multi, val: v });
      const it = g.items.find(i => low(i.ref) === low(v)); if (it) n1.push({ k: it, optKey: g.nom }); });
    n1.forEach(x => { if (x.k.art) groupsOf(x.k.art).forEach(g => { const key = x.k.art.ref + " › " + g.nom; groups.push({ key, nom: g.nom, parent: x.k.art, items: g.items, multi: g.multi, val: c[key] || "" }); }); });
    return { n1, groups, manquants: groups.filter(g => g.multi && !g.items.some(i => i.art && low(i.ref) === low(g.val))) }; };
  const artOf = l => (l.ref && artByRef[low(l.ref)]) || (!l.ref && l.composantId && S.composants[l.composantId]) || null;
  const actifs = useMemo(() => arts.filter(isActif).sort((a, b) => cmpNat(a.ref, b.ref)), [arts]);
  const refSugg = actifs.filter(a => !isOrc(a)).map(a => [a.ref, a.designation || ""]);
  const orcArts = actifs.filter(isOrc);

  /* ---- fiches machine (dates reprises de l'ordo à chaque affichage) ---- */
  const ordoOf = (machine, projet) => byPj[String(machine || "").trim()] || byPj[String(projet || "").trim()] || null;
  const fiches = useMemo(() => Object.values(S.projets).map(f => { const r = ordoOf(f.machine, f.projet), m = num(f.marge), ordoDate = r ? isoOf(r.arrivee) : "", fige = isoOf(f.dateDebut);
    return { ...f, row: r, ordoDate, fige: !!fige, dateDebutEff: fige || ordoDate, ecartOrdo: fige && ordoDate && fige !== ordoDate ? daysBetween(ordoDate, fige) : 0, modeleEff: f.modele || (r && r.gamme) || "", margeEff: m != null ? m : (num(S.params.marge) || 0),
      decal: f.scopesDecal && typeof f.scopesDecal === "object" ? f.scopesDecal : decalsOf(artByRef[low(f.modele)]) }; })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ordoOf / decalsOf dépendent de byPj, artByRef, scopeList (déjà listés)
    .sort((a, b) => cmpNat(a.projet, b.projet) || cmpNat(a.machine, b.machine)), [S, byPj, artByRef, scopeList]);
  const ficheById = useMemo(() => Object.fromEntries(fiches.map(f => [f.id, f])), [fiches]);
  const ficheByMachine = useMemo(() => Object.fromEntries(fiches.map(f => [f.machine, f])), [fiches]);

  /* ---- calcul de toutes les lignes de nomenclature (jamais figé) ---- */
  const calc = useMemo(() => {
    const out = {};
    const one = (l, depth) => {
      if (out[l.id]) return out[l.id];
      const pRaw = depth < 2 && l.parentId && l.parentId !== l.id ? S.lignes[l.parentId] : null;
      const parent = pRaw ? one(pRaw, depth + 1) : null;
      const fi = (l.projetId && ficheById[l.projetId]) || (!l.projetId && l.pj && ficheByMachine[l.pj]) || (parent && parent.fiche) || null;
      const art = artOf(l), four = (art && S.fournisseurs[art.fournisseurId]) || S.fournisseurs[l.fournisseurId] || null;
      const poRaw = (l.poId && S.po[l.poId]) || null, poAnnule = !!(poRaw && poRaw.annule), poLine = poAnnule ? null : poRaw;
      const famEff = l.famille || (art && art.famille) || "", dLigne = num(l.decalJ) || 0, dScope = !parent && fi ? (num(fi.decal[up(famEff)]) || 0) : 0;
      const besoin = l.dateBesoin || (parent ? (parent.st.auPlusTard ? addDays(parent.st.auPlusTard, dLigne) : "") : fi && fi.dateDebutEff ? addDays(fi.dateDebutEff, dScope + dLigne) : "");
      const st = lineState(l, fi ? { dateDebut: fi.dateDebutEff, marge: fi.margeEff } : null, S.params, tIso, { four, poLine, besoin, ltArticle: art && art.delaiJ, sansMarge: !!parent });
      const refEff = l.ref || (art && art.ref) || "";
      const manque = [!refEff && "référence", !four && "fournisseur", four && st.lt == null && "LT", !st.besoin && "date de besoin", !(num(l.qte) > 0) && "quantité", poAnnule && "PO annulé dans Odoo"].filter(Boolean);
      const r = { ...l, fiche: fi, art, four, poLine, poAnnule, poVerrou: !!poRaw && !poAnnule, parent, st, manque, refEff, desEff: (art && art.designation) || l.designation || "",
        famEff, decScope: dScope, decLigne: dLigne, poNum: poRaw ? poRaw.numero : (l.po || ""), poLig: poRaw ? poRaw.ligne : "" };
      out[l.id] = r; return r;
    };
    Object.values(S.lignes).forEach(l => one(l, 0));
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- artOf dépend de artByRef (déjà listé)
  }, [S, artByRef, ficheById, ficheByMachine, tIso, scopeList]);
  const allLines = useMemo(() => Object.values(calc), [calc]);
  const linesByFiche = useMemo(() => { const m = {}; allLines.forEach(l => { if (l.fiche) (m[l.fiche.id] = m[l.fiche.id] || []).push(l); }); return m; }, [allLines]);
  // Affectations par ligne de PO : quantité affectée (somme des qté des lignes de nomenclature) et détail
  const affects = useMemo(() => { const m = {}; allLines.forEach(l => { if (!l.poId) return; const a = m[l.poId] = m[l.poId] || { qte: 0, n: 0, lines: [] };
    a.qte += num(l.qte) || 0; a.n++; a.lines.push({ id: l.id, machine: l.fiche ? l.fiche.machine : (l.pj || "?"), ref: l.refEff || l.famEff || "—", qte: num(l.qte) || 0 }); }); return m; }, [allLines]);
  const poUsage = useMemo(() => Object.fromEntries(Object.entries(affects).map(([k, a]) => [k, a.n])), [affects]);
  const poPlein = p => { const q = num(p && p.qte), a = affects[p && p.id]; return q != null && q > 0 && !!a && a.qte >= q; };
  const poList = useMemo(() => Object.values(S.po), [S]);
  const odoo = S.params.odoo || {}, sync = (doc && doc.odooSync) || {}, odooPret = !!(odoo.domaine && odoo.base && odoo.login);
  // v295 : une demande restée sans réponse plus de 5 min (serveur pas encore en place, arrêté…) ne bloque plus le bouton
  const demandeOuverte = !!S.params.odooDemande && (!sync.fin || String(sync.fin) < String(S.params.odooDemande)) && sync.etat !== "erreur";
  const demandeSansReponse = demandeOuverte && Date.now() - Date.parse(S.params.odooDemande) > 5 * 60 * 1000;
  const demandeEnCours = demandeOuverte && !demandeSansReponse;
  const demanderSync = async () => { const ok = await api.setParams({ ...S.params, odooDemande: new Date().toISOString() });
    notify(ok ? "Synchronisation demandée : le serveur la traite dans quelques instants." : "Demande impossible, réessayez dans un instant.", !ok); };
  const syncTexte = () => sync.etat === "en_cours" ? "Synchronisation en cours depuis " + fdt(sync.debut) + "."
    : demandeEnCours ? "Synchronisation demandée le " + fdt(S.params.odooDemande) + ", en attente du serveur."
    : demandeSansReponse ? "La demande du " + fdt(S.params.odooDemande) + " est restée sans réponse du serveur : cliquez de nouveau sur « Synchroniser maintenant »."
      : sync.fin ? "Dernière synchronisation " + fdt(sync.fin) + (sync.etat === "erreur" ? " en échec" + (sync.message ? " : " + sync.message : ".") : " : " + (sync.nb || 0) + " ligne(s), " + (sync.ajoutees || 0) + " ajoutée(s), " + (sync.maj || 0) + " mise(s) à jour, " + (sync.annulees || 0) + " annulée(s)." + (sync.message ? " " + sync.message : ""))
        : "Jamais synchronisé.";
  // Ordre de la nomenclature : niveau 1 par famille puis référence, chaque ligne suivie de ses sous-lignes (niveau 2)
  const tree = list => { const ids = new Set(list.map(l => l.id)), kids = {};
    list.forEach(l => { if (l.parentId && ids.has(l.parentId)) (kids[l.parentId] = kids[l.parentId] || []).push(l); });
    const res = []; list.filter(l => !(l.parentId && ids.has(l.parentId))).sort((a, b) => scIdx(a.famEff) - scIdx(b.famEff) || cmpNat(a.famEff, b.famEff) || cmpNat(a.refEff, b.refEff))
      .forEach(r => { res.push({ ...r, niv: 1 }); (kids[r.id] || []).sort((a, b) => cmpNat(a.refEff, b.refEff)).forEach(k => res.push({ ...k, niv: 2 })); });
    return res; };
  const fourOpts = [["", "—"], ...Object.values(S.fournisseurs).sort((a, b) => cmpNat(a.nom, b.nom)).map(f => [f.id, f.nom])];

  /* ---- création de lignes depuis le catalogue (copie figée de la nomenclature) ---- */
  const lineFrom = (fiche, art, qte, extra) => ({ projetId: fiche.id, pj: fiche.machine, parentId: "", composantId: art ? art.id : "", ref: art ? art.ref : "", designation: art ? art.designation || "" : "",
    famille: art ? String(art.famille || "").toUpperCase() : "", fournisseurId: (art && art.fournisseurId) || "", qte, dateBesoin: "", lieuLiv: "", poId: "", note: "", ...extra });
  // Sous-lignes d'un N1 : composants standard + options retenues dans choix (clé « réf N1 › groupe ») ; sans choix, options ignorées
  const addKids = async (fiche, parentId, art, qteParent, lieu, choix) => { let n = 0;
    for (const e of kidsOf(art)) { if (!e.art || e.art.id === art.id) continue; let optKey = "";
      if (e.option) { const key = art.ref + " › " + e.option; if (!choix || low(choix[key]) !== low(e.ref)) continue; optKey = key; }
      if (await write("lignes", newId(), lineFrom(fiche, e.art, e.qte * qteParent, { parentId, lieuLiv: lieu || "", optKey }))) n++; }
    return n; };
  const addN1 = async (fiche, art, qte, optKey, choix) => { const id = newId(); if (!(await write("lignes", id, lineFrom(fiche, art, qte, { optKey: optKey || "" })))) return 0; return 1 + await addKids(fiche, id, art, qte, "", choix); };
  const scopesManquants = (modele, fams) => { const c = cfgOf(artByRef[low(modele)]); return scopeList.filter(s => c[s].actif && !fams.has(s)); };
  const addStd = async (fiche, modele, fams) => { let n = 0; for (const s of scopesManquants(modele, fams)) if (await write("lignes", newId(), lineFrom(fiche, null, 1, { famille: s }))) n++; return n; };
  const famsN1 = L => new Set(L.filter(l => !l.parentId).map(l => String(l.famEff || "").toUpperCase()));

  /* ---- fiche machine ---- */
  const openFiche = f => {
    const isNew = !f, raw = isNew ? { id: newId(), projet: "", machine: "", modele: "", marge: S.params.marge, dateDebut: "", note: "" } : { ...S.projets[f.id], dateDebut: isoOf(S.projets[f.id].dateDebut) || f.dateDebutEff || "" };
    const live = (rows || []).filter(r => r && r.pj && r.etat !== "SHIPPED" && r.etat !== "SLOT_LIBRE");
    const projList = uniq([...live.map(r => projOf(r.pj)), ...(isNew ? [] : [raw.projet])]).sort(cmpNat);
    const taken = fiches.filter(x => x.id !== raw.id).map(x => low(x.machine));
    const machinesOf = pr => live.filter(r => projOf(r.pj) === pr && r.pj !== pr && !taken.includes(low(r.pj))).map(r => r.pj).sort(cmpNat);
    const modOpts = orcArts.length ? orcArts.map(a => [a.ref, a.ref + (a.designation ? " · " + a.designation : "")])
      : uniq([...(rows || []).map(r => r && r.gamme), ...fiches.map(x => x.modele)]).sort(cmpNat).map(x => [x, x]);
    if (raw.modele && !modOpts.some(o => o[0] === raw.modele)) modOpts.push([raw.modele, raw.modele]);
    const modeleFromOrdo = r => { if (!r || !r.gamme) return ""; if (!orcArts.length) return r.gamme; const a = orcArts.find(a => low(a.ref) === low(r.gamme) || low(a.designation) === low(r.gamme)); return a ? a.ref : ""; };
    const autoModele = (n, o) => { const mO = modeleFromOrdo(ordoOf(o.machine, o.projet)), mN = modeleFromOrdo(ordoOf(n.machine, n.projet)); return mN && (!o.modele || o.modele === mO) ? mN : n.modele; };
    const machineErr = v => { const m = String(v.machine || "").trim(), pr = String(v.projet || "").trim();
      if (!pr || !m || low(m) === low(pr + "-")) return "";
      if (!low(m).startsWith(low(pr) + "-")) return "Le n° de machine doit commencer par « " + pr + "- ».";
      return taken.includes(low(m)) ? "« " + m + " » est déjà utilisé par une autre fiche." : ""; };
    const ordoD = v => { const r = ordoOf(v.machine, v.projet); return r ? isoOf(r.arrivee) : ""; };
    const withDate = (n, o) => (!o.dateDebut || o.dateDebut === ordoD(o) ? { ...n, dateDebut: ordoD(n) || n.dateDebut } : n);
    const lines = linesByFiche[raw.id] || [];
    setForm({ title: isNew ? "Nouvelle fiche machine" : "Fiche " + raw.machine, vals: raw,
      derive: (n0, o, k) => {
        const n = k === "projet" || k === "machine" ? withDate(n0, o) : n0;
        if (k === "projet") { const suf = o.projet && low(o.machine).startsWith(low(o.projet) + "-") ? o.machine.slice(o.projet.length + 1) : "";
          const m = !n.projet ? "" : suf ? n.projet + "-" + suf : (machinesOf(n.projet)[0] || n.projet + "-"); const x = withDate({ ...n, machine: m }, o); return { ...x, modele: autoModele(x, o) }; }
        if (k === "machine") return { ...n, modele: autoModele(n, o) };
        return n; },
      fields: [
        { k: "projet", l: "N° projet", type: "select", req: true, ro: !isNew, opts: [["", "— choisir"], ...projList.map(x => [x, x])], hint: isNew ? "Projets présents dans l'ordo. Figé après création." : "Figé." },
        { k: "machine", l: "N° machine", req: true, mono: true, suggest: v => machinesOf(v.projet), warn: machineErr, hint: v => "Forme " + (v.projet || "PJXXX") + "-texte libre, unique." },
        { k: "modele", l: "Modèle machine", type: "select", opts: [["", "—"], ...modOpts],
          hint: v => { if (!isNew) return "Changer le modèle ne modifie pas la nomenclature déjà créée."; const k = kidsOf(artByRef[low(v.modele)]).length;
            const sc = scopeList.filter(s => cfgOf(artByRef[low(v.modele)])[s].actif).length;
            const mo = artByRef[low(v.modele)], op = isOrc(mo) && hasOptions(mo);
            return (orcArts.length ? "Machines ORC actives. " : "Aucune machine ORC : liste tirée de l'ordo. ") + (op ? "Ce modèle a des options : la configuration machine s'ouvrira après l'enregistrement pour les choisir. " : k ? "Sa nomenclature (" + k + " article(s)) sera copiée" : "Pas de nomenclature") + (op ? "" : ", plus les scopes actifs sans composant (" + sc + " scope(s) actif(s)).") + " Décalages d'arrivée par scope copiés et figés."; } },
        { k: "marge", l: "Marge (jours)", type: "number", hint: "Lignes N1 : livraison cible = date de besoin moins la marge." },
        { k: "dateDebut", l: "Date d'arrivée (fiche)", type: "date", req: true,
          hint: v => { const r = ordoOf(v.machine, v.projet); if (!r) return "Absente de l'ordo : saisissez la date.";
            const od = isoOf(r.arrivee); return "Ordo (" + r.pj + ") : " + fd(od) + (v.dateDebut && v.dateDebut !== od ? ", écart de " + daysBetween(od, v.dateDebut) + " j." : ".") + " Figée sur la fiche, mise à jour manuelle."; } },
        { k: "note", l: "Commentaire", type: "textarea" },
      ],
      note: isNew ? null : raw.verrou ? "Configuration verrouillée : suppression de la fiche impossible." : lines.some(l => l.poVerrou) ? "Des PO sont attribués : retirez-les avant de pouvoir supprimer la fiche." : null,
      deleteLabel: lines.length ? "Supprimer la fiche et ses " + lines.length + " ligne(s)" : "Supprimer la fiche",
      onDelete: isNew || raw.verrou || lines.some(l => l.poVerrou) ? null : async () => { for (const l of lines) await api.del("lignes", l.id); if (await del("projets", raw.id)) { setFicheSel(null); setForm(null); } },
      onSave: async v => {
        const pr = String(v.projet || "").trim(), m0 = String(v.machine || "").trim();
        const e = machineErr(v); if (e) return e;
        if (m0.length <= pr.length + 1) return "Complétez le n° de machine après « " + pr + "- ».";
        const machine = pr + m0.slice(pr.length);
        const d = { projet: pr, machine, modele: v.modele || "", marge: num(v.marge) == null ? "" : num(v.marge), dateDebut: v.dateDebut, note: v.note || "" };
        if (!isNew) { if (await put("projets", v.id, d)) setForm(null); return; }
        d.scopesDecal = decalsOf(artByRef[low(d.modele)]);
        const mArt = artByRef[low(d.modele)], avecOptions = isOrc(mArt) && hasOptions(mArt);
        if (avecOptions) d.config = { statut: "brouillon", choix: {} };
        if (!(await write("projets", v.id, d))) { notify("Enregistrement impossible, réessayez dans un instant.", true); return; }
        if (avecOptions) { notify("Fiche créée : choisissez les options de la machine."); setFicheSel(v.id); setForm(null); setCfg(v.id); return; }
        const fi = { id: v.id, machine }, fams = new Set(); let n = 0;
        for (const k of kidsOf(mArt)) { if (!k.art || k.option || k.art.id === (mArt && mArt.id)) continue; n += await addN1(fi, k.art, k.qte); if (k.art.famille) fams.add(String(k.art.famille).toUpperCase()); }
        n += await addStd(fi, d.modele, fams);
        notify("Fiche créée avec " + n + " ligne(s)."); setFicheSel(v.id); setForm(null);
      } });
  };
  // Configuration machine : en brouillon, crée la nomenclature (standard + options retenues + scopes vides) ;
  // fiche déjà créée, remplace seulement les lignes des groupes dont le choix a changé (refusé si un PO y est attribué).
  const appliquerConfig = async (fiche, choix) => {
    const raw = S.projets[fiche.id], brouillon = !raw.config || raw.config.statut !== "finalisee", mArt = artByRef[low(fiche.modele)], P = planOf(mArt, choix);
    if (P.manquants.length) return "Il reste à choisir : " + P.manquants.map(g => g.nom).join(", ") + ".";
    const fi = { id: fiche.id, machine: fiche.machine }, L = linesByFiche[fiche.id] || [];
    let n = 0, s = 0;
    if (brouillon) {
      const fams = famsN1(L);
      for (const x of P.n1) { if (!x.k.art || x.k.art.id === (mArt && mArt.id)) continue; n += await addN1(fi, x.k.art, x.k.qte, x.optKey, choix); if (x.k.art.famille) fams.add(up(x.k.art.famille)); }
      n += await addStd(fi, fiche.modele, fams);
    } else {
      const lock = l => l.poVerrou || L.some(k => k.parentId === l.id && k.poVerrou), changes = [];
      for (const g of P.groups) {
        const par = g.parent ? L.find(l => !l.parentId && low(l.refEff) === low(g.parent.ref)) : null;
        if (g.parent && !par) continue;
        const cur = L.filter(l => l.optKey === g.key && (g.parent ? l.parentId === par.id : !l.parentId)), cible = g.items.find(i => i.art && low(i.ref) === low(g.val)) || null;
        if (cur.length === (cible ? 1 : 0) && (!cible || low(cur[0].refEff) === low(cible.ref))) continue;
        if (cur.some(lock)) return "Option « " + g.nom + " » : un PO est attribué à la ligne actuelle. Retirez-le avant de changer cette option.";
        changes.push({ g, par, cur, cible });
      }
      const supprimes = new Set();
      for (const { g, par, cur, cible } of changes) {
        if (par && supprimes.has(par.id)) continue;
        for (const l of cur) { for (const k of L.filter(k => k.parentId === l.id)) { await api.del("lignes", k.id); supprimes.add(k.id); } await api.del("lignes", l.id); supprimes.add(l.id); s++; }
        if (cible && !g.parent) n += await addN1(fi, cible.art, cible.qte, g.key, choix);
        if (cible && g.parent && await write("lignes", newId(), lineFrom(fi, cible.art, cible.qte * (num(par.qte) || 1), { parentId: par.id, optKey: g.key }))) n++;
      }
    }
    const ok = await write("projets", fiche.id, { ...raw, config: { statut: "finalisee", choix } });
    notify(!ok ? "Enregistrement impossible, réessayez dans un instant." : brouillon ? "Nomenclature créée : " + n + " ligne(s)." : n || s ? "Options appliquées : " + s + " ligne(s) retirée(s), " + n + " ajoutée(s)." : "Aucun changement.", !ok);
    return ok;
  };
  const saveFiche = (f, patch) => put("projets", f.id, { ...S.projets[f.id], ...patch });
  const verrouiller = async (f, on) => { const ok = await write("projets", f.id, { ...S.projets[f.id], verrou: on, verrouLe: on ? new Date().toISOString() : "" });
    notify(ok ? (on ? "Configuration verrouillée." : "Configuration déverrouillée.") : "Enregistrement impossible, réessayez dans un instant.", !ok); setDeverr(false); };
  const completeStd = async fiche => { if (fiche.verrou) return; const n = await addStd(fiche, fiche.modele, famsN1(linesByFiche[fiche.id] || [])); notify(n + " scope(s) ajouté(s)."); };

  /* ---- ligne de nomenclature d'une fiche ---- */
  const openLine = (l, fiche, parent) => {
    if (!l && fiche.verrou) return;
    const isNew = !l, stored = !isNew && S.lignes[l.id];
    const lockFiche = !isNew && !!fiche.verrou, lockPo = !isNew && !!l.poVerrou, lecture = lockFiche || lockPo;
    const raw = isNew ? { id: newId(), projetId: fiche.id, parentId: parent ? parent.id : "", composantId: "", ref: "", designation: "", famille: "", fournisseurId: "", qte: 1, dateBesoin: "", lieuLiv: parent ? (parent.lieuLiv || "") : "", poId: "", note: "" }
      : { ...stored, ref: stored.ref || l.refEff, designation: l.desEff, famille: stored.famille || l.famEff, fournisseurId: l.four ? l.four.id : (stored.fournisseurId || "") };
    const dScopeOf = v => (parent ? 0 : num(fiche.decal[up(v.famille || (A0(v) && A0(v).famille))]) || 0);
    const autoB = v => { const dl = num(v.decalJ) || 0; return parent ? (parent.st.auPlusTard ? addDays(parent.st.auPlusTard, dl) : "") : fiche.dateDebutEff ? addDays(fiche.dateDebutEff, dScopeOf(v) + dl) : ""; };
    const kids = isNew ? [] : Object.values(S.lignes).filter(x => x.parentId === raw.id);
    const A = v => artByRef[low(v.ref)] || null, A0 = A;
    const kidsPo = kids.filter(k => k.poId && S.po[k.poId] && !S.po[k.poId].annule).length;
    setForm({ lecture,
      note: lockFiche ? "Configuration de la machine verrouillée le " + fdt(fiche.verrouLe) + ". Seule l'attribution du PO reste possible."
        : lockPo ? "PO " + l.poNum + (l.poLig ? " ligne " + l.poLig : "") + " attribué : ligne verrouillée. Retirez le PO pour la modifier."
          : kidsPo ? kidsPo + " sous-ligne(s) ont un PO attribué : suppression impossible tant qu'ils ne sont pas retirés." : null,
      extra: isNew ? null : [[l.poId ? "Changer ou retirer le PO" : "Attribuer PO", () => { setForm(null); setPick(l.id); }]],
      title: isNew ? (parent ? "Sous-ligne de " + (parent.refEff || "la ligne") : "Nouvelle ligne · " + fiche.machine) : (l.famEff || "Ligne") + (raw.ref ? " · " + raw.ref : "") + " · " + fiche.machine, vals: raw,
      derive: (n, o, k) => { if (k !== "ref") return n; const a = A(n);
        return a ? { ...n, composantId: a.id, designation: a.designation || "", famille: n.famille || String(a.famille || "").toUpperCase(), fournisseurId: a.fournisseurId || n.fournisseurId } : { ...n, composantId: "" }; },
      fields: [
        { k: "ref", l: "Réf Enogia", req: true, mono: true, suggest: refSugg,
          hint: v => { const a = A(v); if (!String(v.ref || "").trim()) return "Choisissez un article du catalogue (liste des articles actifs).";
            if (!a) return "Hors catalogue : désignation et fournisseur saisis sur la ligne.";
            const k = kidsOf(a).length; return (isActif(a) ? "Article du catalogue." : "Article inactif.") + (!parent && k ? " Sa nomenclature (" + k + ") sera ajoutée en niveau 2." : ""); } },
        { k: "designation", l: "Désignation", ro: v => !!A(v), hint: v => (A(v) ? "Suit l'article." : "") },
        { k: "famille", l: "Scope", type: "select", opts: v => scOpts(v.famille, parent ? "N2" : "N1") },
        { k: "fournisseurId", l: "Fournisseur", type: "select", opts: fourOpts, ro: v => { const a = A(v); return !!(a && a.fournisseurId); }, hint: v => { const a = A(v); return a && a.fournisseurId ? "Fournisseur de l'article." : ""; } },
        { k: "qte", l: "Quantité", type: "number", req: true },
        { k: "decalJ", l: "Décalage propre à cette machine (j)", type: "number", hint: v => (parent ? "S'ajoute à la date de commande au plus tard du N1." : "S'ajoute au décalage du scope (" + fmtJ(dScopeOf(v)) + ").") + " Négatif = plus tôt, positif = plus tard." },
        { k: "dateBesoin", l: "Date de besoin", type: "date", hint: v => "Vide : " + (parent ? "commande au plus tard du N1" : "arrivée machine") + " + décalages = " + fd(autoB(v)) + ", suivie automatiquement. Une date saisie est fixe et ignore les décalages." + (parent ? " Composant à envoyer chez le fournisseur du N1 au passage de sa commande : pas de marge en plus." : "") },
        { k: "_calc", l: "Rétro-planning", type: "static", val: v => { const a = A(v), four = (a && S.fournisseurs[a.fournisseurId]) || S.fournisseurs[v.fournisseurId] || null;
          const s = lineState(v, { dateDebut: fiche.dateDebutEff, marge: fiche.margeEff }, S.params, tIso, { four, poLine: (v.poId && S.po[v.poId]) || null, besoin: v.dateBesoin || autoB(v), ltArticle: a && a.delaiJ, sansMarge: !!parent });
          return "Besoin " + fd(s.besoin) + ", livraison cible " + fd(s.cible) + ", commande au plus tard " + fd(s.auPlusTard) + (s.lt == null ? " (LT inconnu)" : " (LT " + s.ltSrc + " " + s.lt + " j + transport " + (s.ltT || 0) + " j)"); } },
        { k: "note", l: "Note", type: "textarea" },
      ],
      deleteLabel: kids.length ? "Supprimer avec ses " + kids.length + " sous-ligne(s)" : "Supprimer",
      onDelete: isNew || lecture || kidsPo ? null : async () => { for (const k of kids) await api.del("lignes", k.id); if (await del("lignes", raw.id)) setForm(null); },
      onSave: async v => {
        const a = A(v);
        if (!(a && a.fournisseurId) && !v.fournisseurId) return a ? "L'article n'a pas de fournisseur : choisissez-en un." : "Choisissez un fournisseur.";
        const d = { ...v, decalJ: num(v.decalJ) == null ? "" : Math.round(num(v.decalJ)), projetId: fiche.id, pj: fiche.machine, ref: a ? a.ref : String(v.ref).trim(), composantId: a ? a.id : "", famille: v.famille || (a ? String(a.famille || "").toUpperCase() : "") };
        delete d._calc;
        if (!(await write("lignes", d.id, d))) { notify("Enregistrement impossible, réessayez dans un instant.", true); return; }
        const nouveau = a && !d.parentId && !Object.values(S.lignes).some(x => x.parentId === d.id);
        const n = nouveau ? await addKids(fiche, d.id, a, num(d.qte) || 1, d.lieuLiv) : 0, go = nouveau ? groupsOf(a).length : 0;
        notify((n ? "Enregistré, " + n + " sous-ligne(s) ajoutée(s)." : "Enregistré.") + (go ? " " + go + " groupe(s) d'options non ajouté(s) : ajoutez le composant voulu avec ＋ Sous-ligne." : "")); setForm(null);
      } });
  };
  // Décalage propre à une ligne : modifiable même si la ligne ou la fiche est verrouillée (planification, pas configuration)
  const saveDecal = async (l, val) => { const v = String(val).trim() === "" ? "" : Math.round(Number(val)); if (v !== "" && isNaN(v)) return;
    const raw = S.lignes[l.id]; if (!raw || String(v) === String(raw.decalJ == null ? "" : raw.decalJ)) return; await put("lignes", l.id, { ...raw, decalJ: v }); };
  const assignPo = async (lineId, poId) => { const raw = S.lignes[lineId]; if (!raw) return; if (await put("lignes", lineId, { ...raw, poId })) setPick(null); };
  const unassign = async lineId => { const raw = S.lignes[lineId]; if (!raw) return; const ok = await write("lignes", lineId, { ...raw, poId: "" }); notify(ok ? "Affectation retirée." : "Enregistrement impossible, réessayez dans un instant.", !ok); };

  /* ---- article ---- */
  const openComp = (c, copy) => {
    const isNew = !c, src = c ? S.composants[c.id] : copy;
    const raw = c ? { ...src } : { id: newId(), ref: "", designation: copy ? copy.designation || "" : "", type: copy && isOrc(copy) ? "orc" : "achat", famille: copy ? up(copy.famille) : "", fournisseurId: copy ? copy.fournisseurId || "" : "",
      delaiJ: copy ? copy.delaiJ : "", actif: true, scopes: copy && copy.scopes ? copy.scopes : null, enfants: copy ? kidsOf(copy).map(e => ({ ref: e.ref, qte: e.qte })) : [], note: "" };
    const used = isNew ? 0 : Object.values(S.lignes).filter(l => (l.ref && low(l.ref) === low(raw.ref)) || l.composantId === raw.id).length;
    const nk = kidsOf(raw).length, ORC = v => v.type === "orc", ACH = v => v.type !== "orc";
    setForm({ title: copy ? "Copie de " + copy.ref : isNew ? "Nouvel article" : "Article " + (raw.ref || raw.designation),
      vals: { ...raw, type: isOrc(raw) ? "orc" : "achat", actif: raw.actif === false ? "non" : "oui", scopes: cfgOf({ ...raw, type: "orc" }) },
      fields: [{ k: "ref", l: "Réf Enogia", req: true, mono: true, ro: !isNew, hint: isNew ? "Code article : unique, non modifiable ensuite." : "Code article, non modifiable." },
        { k: "type", l: "Type d'article", type: "select", opts: [["achat", "Achat"], ["orc", "Machine ORC"]], hint: v => (ORC(v) ? "Machine produite par Enogia : modèle des fiches machine." : "Composant acheté, placé dans un scope.") },
        { k: "designation", l: "Désignation", req: true, wide: true },
        { k: "famille", l: "Scope", type: "select", opts: v => scOpts(v.famille), show: ACH, hint: "N1 : suivi projet ; N2 : classement achats des sous-composants." },
        { k: "fournisseurId", l: "Fournisseur", type: "select", opts: fourOpts, show: ACH },
        { k: "delaiJ", l: "LT article (jours)", type: "number", hint: "Vide, 0 ou 1 : LT du fournisseur.", show: ACH },
        { k: "actif", l: "Actif", type: "select", opts: [["oui", "Oui"], ["non", "Non"]], hint: "Non : masqué des listes, conservé dans les fiches existantes." },
        { k: "scopes", l: "Scopes N1 de la machine", type: "scopes", scopes: scopesN1, show: ORC,
          hint: "Créé par défaut : une ligne vide est créée dans chaque nouvelle fiche si la nomenclature n'a aucun composant dans ce scope. Arrivée : jours par rapport à l'arrivée machine (−5 = 5 jours avant)." },
        { k: "_nom", l: "Nomenclature", type: "static", val: () => (nk ? nk + " composant(s)" + (groupsOf(raw).length ? ", dont " + groupsOf(raw).length + " groupe(s) d'options" : "") + (copy ? ", copiée avec l'article" : "") + ". Modifiable dans l'onglet Nomenclatures." : "Aucune. À définir dans l'onglet Nomenclatures.") },
        { k: "note", l: "Note", type: "textarea" }],
      extra: isNew ? null : [["Dupliquer", v => openComp(null, { ...src, designation: v.designation, type: v.type, famille: v.famille, fournisseurId: v.fournisseurId, delaiJ: v.delaiJ, scopes: v.scopes })]],
      deleteLabel: used ? "Supprimer (utilisé sur " + used + " ligne(s), préférez Inactif)" : "Supprimer",
      onDelete: isNew ? null : async () => { if (await del("composants", raw.id)) setForm(null); },
      onSave: async v => { const ref = String(v.ref).trim();
        if (arts.some(x => x.id !== v.id && low(x.ref) === low(ref))) return "La référence " + ref + " existe déjà.";
        const orc = v.type === "orc";
        const sc = orc ? Object.fromEntries(scopesN1.map(s => { const x = (v.scopes || {})[s] || {}; return [s, { actif: !!x.actif, decalJ: Math.round(num(x.decalJ) || 0) }]; })) : null;
        const d = { ...v, ref, type: orc ? "orc" : "achat", famille: orc ? "" : up(v.famille), fournisseurId: orc ? "" : v.fournisseurId || "", delaiJ: orc || num(v.delaiJ) == null ? "" : Math.max(0, num(v.delaiJ)), actif: v.actif !== "non", scopes: sc };
        delete d._nom; delete d.orc;
        if (await put("composants", v.id, d)) setForm(null); } });
  };

  /* ---- scopes (Configuration) ---- */
  const setScopes = async (list, niveaux) => { const nv = { ...(S.params.scopeNiveaux || {}), ...(niveaux || {}) }; Object.keys(nv).forEach(k => { if (!list.includes(k) || nv[k] !== "N2") delete nv[k]; });
    const ok = await api.setParams({ ...S.params, scopes: list, scopeNiveaux: nv }); notify(ok ? "Scopes enregistrés." : "Enregistrement impossible, réessayez dans un instant.", !ok); return ok; };
  // Renommer un scope met à jour articles, lignes de fiches, paramètres des machines ORC et décalages figés des fiches
  const openScope = old => setForm({ title: "Renommer le scope " + old, vals: { id: "scope-" + old, nom: old },
    fields: [{ k: "nom", l: "Nouveau nom", req: true, hint: "Mis à jour partout : articles, fiches machine (même verrouillées) et paramètres des machines ORC." }],
    onSave: async v => { const nouv = up(v.nom); if (nouv === old) { setForm(null); return; } if (scopeList.includes(nouv)) return nouv + " existe déjà.";
      let ko = 0, n = 0;
      for (const a of arts) { const d = { ...a }; let ch = false;
        if (up(a.famille) === old) { d.famille = nouv; ch = true; }
        if (a.scopes && a.scopes[old]) { const sc = { ...a.scopes }; sc[nouv] = sc[old]; delete sc[old]; d.scopes = sc; ch = true; }
        if (ch) { n++; if (!(await write("composants", a.id, d))) ko++; } }
      for (const l of Object.values(S.lignes)) if (up(l.famille) === old) { n++; if (!(await write("lignes", l.id, { ...l, famille: nouv }))) ko++; }
      for (const f of Object.values(S.projets)) if (f.scopesDecal && Object.prototype.hasOwnProperty.call(f.scopesDecal, old)) {
        const sc = { ...f.scopesDecal }; sc[nouv] = sc[old]; delete sc[old]; n++; if (!(await write("projets", f.id, { ...f, scopesDecal: sc }))) ko++; }
      const nv = { ...(S.params.scopeNiveaux || {}) }; if (nv[old]) { nv[nouv] = nv[old]; delete nv[old]; }
      const ok = await api.setParams({ ...S.params, scopes: scopeList.map(s => (s === old ? nouv : s)), scopeNiveaux: nv });
      notify(ko || !ok ? "Renommage incomplet : relancez-le." : "Scope renommé (" + n + " élément(s) mis à jour).", !!(ko || !ok)); setForm(null); } });

  /* ---- fournisseur ---- */
  const openFour = f => {
    const isNew = !f, raw = isNew ? { id: newId(), nom: "", ltJ: "", ltTransportJ: "", note: "" } : { ...S.fournisseurs[f.id] };
    const used = allLines.filter(l => l.four && l.four.id === raw.id).length;
    setForm({ title: isNew ? "Nouveau fournisseur" : raw.nom, vals: raw,
      fields: [{ k: "nom", l: "Nom", req: true, wide: true }, { k: "ltJ", l: "LT fournisseur (jours)", type: "number", hint: "Remplacé par le LT de l'article s'il est défini." }, { k: "ltTransportJ", l: "LT transport (jours)", type: "number", hint: "Toujours appliqué (transport géré par Enogia)." },
        { k: "note", l: "Note", type: "textarea" }],
      deleteLabel: used ? "Supprimer (utilisé sur " + used + " ligne(s))" : "Supprimer",
      onDelete: isNew ? null : async () => { if (await del("fournisseurs", raw.id)) setForm(null); },
      onSave: async v => { const nom = String(v.nom).trim();
        if (Object.values(S.fournisseurs).some(x => x.id !== v.id && low(x.nom) === low(nom))) return "Un fournisseur porte déjà ce nom.";
        if (await put("fournisseurs", v.id, { ...v, nom, ltJ: num(v.ltJ) == null ? "" : Math.max(0, num(v.ltJ)), ltTransportJ: num(v.ltTransportJ) == null ? "" : Math.max(0, num(v.ltTransportJ)) })) setForm(null); } });
  };

  /* ---- ligne de PO ---- */
  const openPo = p => {
    const isNew = !p, raw = isNew ? { id: "", numero: qPo.trim(), ligne: "", ref: "", designation: "", qte: "", dateCommande: tIso, dateLivraison: "", statut: "envoyee", projet: "" } : { ...S.po[p.id] };
    const used = isNew ? 0 : (poUsage[raw.id] || 0), fromOdoo = raw.source === "odoo";
    setForm({ title: isNew ? "Nouvelle ligne de PO" : "PO " + raw.numero + " · ligne " + raw.ligne, vals: raw, lecture: fromOdoo,
      note: fromOdoo ? (raw.annule ? "Annulée dans Odoo. " : "") + "Importée d'Odoo le " + fdt(raw.majOdoo) + ". Modifiable uniquement dans Odoo." + (used ? " Affectée à " + used + " ligne(s)." : "") : null,
      fields: [{ k: "numero", l: "N° PO", req: true, mono: true, ro: !isNew }, { k: "ligne", l: "N° ligne", req: true, mono: true, ro: !isNew, hint: isNew ? "N° de PO et de ligne ne se modifient plus ensuite." : undefined },
        { k: "ref", l: "Référence", mono: true, suggest: refSugg }, { k: "designation", l: "Désignation" }, { k: "qte", l: "Quantité", type: "number" },
        { k: "statut", l: "Statut PO", type: "select", opts: STATUTS }, { k: "dateCommande", l: "Date de commande", type: "date" }, { k: "dateLivraison", l: "Date de livraison", type: "date" },
        { k: "projet", l: "N° projet", suggest: fiches.flatMap(x => [x.projet, x.machine]) },
        ...(fromOdoo ? [{ k: "qteRecue", l: "Quantité reçue", type: "number" }] : [])],
      deleteLabel: used ? "Supprimer (affectée à " + used + " ligne(s))" : "Supprimer",
      onDelete: isNew ? null : async () => { for (const l of Object.values(S.lignes).filter(l => l.poId === raw.id)) await write("lignes", l.id, { ...l, poId: "" }); if (await del("po", raw.id)) setForm(null); },
      onSave: async v => { const numero = String(v.numero).trim(), ligne = String(v.ligne).trim(), id = isNew ? poKey(numero, ligne) : v.id;
        if (isNew && S.po[id]) return "La ligne " + ligne + " du PO " + numero + " existe déjà.";
        if (await put("po", id, { ...v, numero, ligne })) setForm(null); } });
  };

  /* ---- nomenclatures du catalogue ---- */
  const setKids = async (a, list, quiet) => { const d = { ...S.composants[a.id], enfants: list.map(e => (e.option ? { ref: e.ref, qte: e.qte, option: up(e.option) } : { ref: e.ref, qte: e.qte })) }; return quiet ? write("composants", a.id, d) : put("composants", a.id, d); };
  const openNomNew = () => setForm({ title: "Nouvelle nomenclature", vals: { cible: "" },
    fields: [{ k: "cible", l: "Article composé", req: true, mono: true, suggest: actifs.filter(a => !kidsOf(a).length).map(a => [a.ref, a.designation || ""]), hint: "Machine ORC ou article. Ses composants se saisissent ensuite." }],
    onSave: async v => { const a = artByRef[low(v.cible)]; if (!a) return "Article introuvable : créez-le d'abord dans l'onglet Articles.";
      setNomSel(a.id); setNomErr(""); setForm(null); } });
  const openNomDup = a => setForm({ title: "Dupliquer la nomenclature de " + a.ref, vals: { cible: "" },
    fields: [{ k: "cible", l: "Vers l'article", req: true, mono: true, suggest: actifs.filter(x => x.id !== a.id).map(x => [x.ref, x.designation || ""]),
      warn: v => { const c = artByRef[low(v.cible)]; return c && kidsOf(c).length ? "Sa nomenclature actuelle (" + kidsOf(c).length + ") sera remplacée." : ""; } }],
    onSave: async v => { const c = artByRef[low(v.cible)]; if (!c) return "Article introuvable."; if (c.id === a.id) return "Choisissez un autre article.";
      if (await setKids(c, kidsOf(a).filter(k => low(k.ref) !== low(c.ref)))) { setNomSel(c.id); setForm(null); } } });

  /* ---- imports ---- */
  const analyzeArticles = rows => {
    const err = [], seen = {}, newFours = {}, fourByName = {}, famInc = new Set();
    Object.values(S.fournisseurs).forEach(f => { fourByName[low(f.nom)] = f; });
    rows.forEach(r => {
      const ref = r.ref; if (!ref) { err.push("Ligne " + r._ligne + " : référence vide, ignorée."); return; }
      const ty = normH(r.type), typ = !ty ? null : ["orc", "machineorc", "machine"].includes(ty) ? "orc" : ["achat", "achats", "buy"].includes(ty) ? "achat" : undefined;
      if (typ === undefined) err.push("Ligne " + r._ligne + " : TYPE « " + r.type + " » illisible (Achat ou ORC), ignoré.");
      const key = low(ref), lt = r.lt == null ? null : parseNum(r.lt), orc = r.orc == null ? null : parseBool(r.orc), act = r.actif == null ? null : parseBool(r.actif);
      if (seen[key]) err.push("Ligne " + r._ligne + " : " + ref + " déjà présente plus haut, cette ligne complète la précédente.");
      if (lt === undefined) err.push("Ligne " + r._ligne + " : LT « " + r.lt + " » illisible, ignoré.");
      if (orc === undefined) err.push("Ligne " + r._ligne + " : ORC « " + r.orc + " » illisible (T/F, oui/non), ignoré.");
      if (act === undefined) err.push("Ligne " + r._ligne + " : ACTIF « " + r.actif + " » illisible (T/F, oui/non), ignoré.");
      let fid = "";
      if (r.fournisseur) { const f = fourByName[low(r.fournisseur)]; if (f) fid = f.id; else { const k = low(r.fournisseur); newFours[k] = newFours[k] || { id: newId(), nom: r.fournisseur.trim() }; fid = newFours[k].id; } }
      const d = seen[key] ? seen[key] : artByRef[key] ? { ...artByRef[key] } : { id: newId(), ref: ref.trim(), designation: "", type: "achat", famille: "", fournisseurId: "", delaiJ: "", actif: true, enfants: [], note: "" };
      if (r.designation) d.designation = r.designation;
      if (r.famille) { d.famille = up(r.famille); if (!scopeList.includes(d.famille)) famInc.add(d.famille); }
      if (fid) d.fournisseurId = fid;
      if (lt != null && lt !== undefined) d.delaiJ = Math.max(0, Math.round(lt));
      if (typ) d.type = typ; else if (orc === true || orc === false) d.type = orc ? "orc" : "achat";
      if (d.type === "orc") { d.famille = ""; d.fournisseurId = ""; d.delaiJ = ""; }
      delete d.orc;
      if (act === true || act === false) d.actif = act;
      seen[key] = d;
    });
    const F = ["designation", "type", "famille", "fournisseurId", "delaiJ", "actif"];
    const all = Object.entries(seen), nouveaux = all.filter(([k]) => !artByRef[k]).map(e => e[1]);
    const modifs = all.filter(([k, d]) => artByRef[k] && F.some(f => String(artByRef[k][f] == null ? "" : artByRef[k][f]) !== String(d[f] == null ? "" : d[f]))).map(e => e[1]);
    const nf = Object.values(newFours), ops = [...nouveaux, ...modifs];
    if (famInc.size) err.push("Scope(s) absent(s) de la Configuration, acceptés : " + [...famInc].join(", ") + ". Ajoutez-les dans l'onglet Configuration.");
    return { err, n: ops.length + nf.length,
      lignes: [all.length + " article(s) lu(s) : " + nouveaux.length + " nouveau(x), " + modifs.length + " mis à jour, " + (all.length - nouveaux.length - modifs.length) + " inchangé(s).",
        nf.length ? nf.length + " fournisseur(s) créé(s), LT à renseigner : " + nf.map(f => f.nom).join(", ") + "." : "", "Cellule vide = valeur actuelle conservée."],
      apply: async prog => { let i = 0, ko = 0; const tot = nf.length + ops.length;
        for (const f of nf) { if (!(await write("fournisseurs", f.id, { nom: f.nom, ltJ: "", ltTransportJ: "", note: "" }))) ko++; prog(++i + " / " + tot); }
        for (const d of ops) { if (!(await write("composants", d.id, d))) ko++; prog(++i + " / " + tot); }
        notify(ko ? ko + " écriture(s) en échec sur " + tot + ". Relancez l'import." : "Import terminé : " + ops.length + " article(s), " + nf.length + " fournisseur(s).", !!ko); return !ko; } };
  };
  const analyzeNomenclatures = rows => {
    const err = [], groups = {};
    rows.forEach(r => {
      const L = "Ligne " + r._ligne + " : ";
      if (!r.compose || !r.composant) { err.push(L + "composé ou composant vide, ignorée."); return; }
      const pa = artByRef[low(r.compose)], ka = artByRef[low(r.composant)];
      if (!pa) { err.push(L + "composé " + r.compose + " absent des articles, ignorée."); return; }
      if (!ka) { err.push(L + "composant " + r.composant + " absent des articles, ignorée."); return; }
      if (pa.id === ka.id) { err.push(L + r.compose + " ne peut pas se contenir lui-même."); return; }
      const q = r.qte == null || r.qte === "" ? 1 : parseNum(r.qte);
      if (q === undefined || q == null || q <= 0) { err.push(L + "quantité « " + r.qte + " » illisible, ignorée."); return; }
      const opt = up(r.option), g = groups[pa.id] = groups[pa.id] || { art: pa, items: {} }, prev = g.items[low(ka.ref)];
      if (prev && prev.option !== opt) { err.push(L + ka.ref + " apparaît deux fois dans " + pa.ref + " avec des options différentes, ligne ignorée."); return; }
      if (prev) err.push(L + ka.ref + " en double dans " + pa.ref + ", quantités additionnées.");
      g.items[low(ka.ref)] = { ref: ka.ref, qte: (prev ? prev.qte : 0) + q, option: opt };
    });
    const G = Object.values(groups), nNew = G.filter(g => !kidsOf(g.art).length).length, nl = G.reduce((s, g) => s + Object.keys(g.items).length, 0);
    const nOpt = G.reduce((s, g) => s + new Set(Object.values(g.items).map(i => i.option).filter(Boolean)).size, 0);
    return { err, n: G.length,
      lignes: [G.length + " nomenclature(s), " + nl + " ligne(s) : " + nNew + " nouvelle(s), " + (G.length - nNew) + " remplacée(s) en entier.", nOpt ? nOpt + " groupe(s) d'options." : "", "Les fiches machine existantes ne changent pas."],
      apply: async prog => { let i = 0, ko = 0;
        for (const g of G) { if (!(await setKids(g.art, Object.values(g.items), true))) ko++; prog(++i + " / " + G.length); }
        notify(ko ? ko + " nomenclature(s) en échec. Relancez l'import." : "Import terminé : " + G.length + " nomenclature(s).", !!ko); return !ko; } };
  };
  const IMPORTS = {
    articles: { title: "Importer des articles", cols: COLS_ART, fichier: "trame-articles.csv", analyze: analyzeArticles,
      exemple: [["ART-001", "Exemple de désignation", "Achat", "SKID", "Fournisseur exemple", "60", "", "T"]],
      intro: "Crée les références nouvelles et met à jour les existantes (même REF). TYPE : Achat ou ORC. Fournisseur reconnu par son nom, créé s'il n'existe pas. ACTIF : T/F ou oui/non (ancienne colonne ORC encore acceptée)." },
    nomenclatures: { title: "Importer des nomenclatures", cols: COLS_NOM, fichier: "trame-nomenclatures.csv", analyze: analyzeNomenclatures,
      exemple: [["ORC-EXEMPLE", "SKID-EXEMPLE", "1", ""], ["ORC-EXEMPLE", "POMPE-A", "1", "POMPE CYCLE"], ["ORC-EXEMPLE", "POMPE-B", "1", "POMPE CYCLE"]],
      intro: "Une ligne par composant. OPTION (facultative) : même nom de groupe = alternatives, un seul composant retenu à la configuration de la machine ; vide = composant standard. Chaque composé présent dans le fichier voit sa nomenclature remplacée en entier. Composés et composants doivent exister dans les articles." },
  };

  /* ---- affichage ---- */
  const visibleTabs = TABS.filter(t => t[0] !== "reglages" || owner);
  const nDiff = fiches.filter(f => f.ecartOrdo).length;
  const fichesF = fiches.filter(f => (!seulDiff || f.ecartOrdo) && (!low(qFiche) || [f.machine, f.projet, f.modeleEff].some(s => low(s).includes(low(qFiche)))));
  const cur = (ficheSel && ficheById[ficheSel]) || fichesF[0] || null;
  const addBtn = !canEdit ? null : tab === "projets" ? ["＋ Fiche machine", () => openFiche(null)] : tab === "po" ? ["＋ Ligne de PO", () => openPo(null)]
    : tab === "fournisseurs" ? ["＋ Fournisseur", () => openFour(null)] : tab === "articles" ? ["＋ Article", () => openComp(null)] : tab === "nomenclatures" ? ["＋ Nomenclature", openNomNew] : null;
  const dateCell = (s, color) => <td style={{ ...td(), whiteSpace: "nowrap", color: color || T.ink900 }}>{fd(s)}</td>;
  const toolbar = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 };

  const renderTableau = (fiche, list) => (<div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
      <thead><tr>
        <th style={th()}>Réf Enogia</th><th style={th()}>Désignation</th><th style={th()}>Fournisseur</th><th style={th()}>Scope</th><th style={th(true)}>Qté</th>
        <th style={th()}>Décalage (j)</th><th style={th()}>Date besoin</th><th style={th(true)}>LT</th><th style={th(true)}>LT transp.</th><th style={th()}>Liv. cible</th><th style={th()}>Cde au plus tard</th>
        <th style={th()}>PO</th><th style={th()}>Ligne PO</th><th style={th()}>Statut appro</th><th style={th()}>Liv. prévue</th>
        <th style={th()}><span style={SR}>Actions</span></th>
      </tr></thead>
      <tbody>
        {list.map(l => { const s = l.st, n2 = l.niv === 2; return (
          <tr key={l.id} onClick={canEdit ? () => openLine(l, fiche, l.parent) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36, background: n2 ? T.surface : "transparent" }}>
            <td style={{ ...td(), fontFamily: T.fontMono, fontWeight: n2 ? 500 : 700, whiteSpace: "nowrap", paddingLeft: n2 ? 30 : 10 }}>{l.refEff || <span style={{ fontFamily: T.font, fontWeight: 700, color: T.red600 }}>À attribuer</span>}</td>
            <td style={{ ...td(), color: n2 ? T.ink700 : T.ink900 }}>{l.desEff || "—"}</td>
            <td style={{ ...td(), color: l.four ? T.ink700 : T.red600, whiteSpace: "nowrap" }}>{l.four ? l.four.nom : "—"}</td>
            <td style={{ ...td(), color: T.ink700, whiteSpace: "nowrap" }}>{l.famEff || "—"}</td>
            <td style={{ ...td(), textAlign: "right" }}>{l.qte === "" || l.qte == null ? "—" : l.qte}</td>
            <td style={{ ...td(), whiteSpace: "nowrap", color: T.ink700 }} onClick={e => e.stopPropagation()} title={l.dateBesoin ? "Date de besoin fixée : décalages ignorés." : undefined}>
              {!n2 && <span style={{ fontSize: FZF.xs, color: T.ink500, marginRight: 4 }} title="Décalage du scope (modèle)">{fmtJ(l.decScope)} +</span>}
              {canEdit ? <input key={l.id + ":" + (l.decalJ == null ? "" : l.decalJ)} type="number" step={1} defaultValue={l.decalJ == null ? "" : l.decalJ} placeholder="0" aria-label={"Décalage propre à cette machine pour " + (l.refEff || l.famEff) + ", en jours"}
                onBlur={e => saveDecal(l, e.target.value)} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...field(), width: 64, minHeight: 28, padding: "2px 6px", textAlign: "right", display: "inline-block" }} /> : fmtJ(l.decLigne)}
            </td>
            <td style={{ ...td(), whiteSpace: "nowrap" }}>{fd(s.besoin)}{l.dateBesoin && <span style={{ marginLeft: 6, fontSize: FZF.xs, color: T.ink500 }}>fixée</span>}</td>
            <td style={{ ...td(), textAlign: "right", color: T.ink700, whiteSpace: "nowrap" }} title={s.lt == null ? undefined : "LT " + s.ltSrc}>{s.lt == null ? "—" : <>{s.ltSrc === "article" && <span style={{ fontSize: FZF.xs, color: T.ink500, marginRight: 4 }}>art.</span>}{s.lt} j</>}</td>
            <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{s.ltT == null ? "—" : s.ltT + " j"}</td>
            {dateCell(s.cible)}
            {dateCell(s.auPlusTard, s.statut === "apasser" ? (s.k === "late" ? T.red600 : s.k === "soon" ? T.amber600 : null) : T.ink500)}
            <td style={{ ...td(), fontFamily: T.fontMono, color: l.poAnnule ? T.red600 : T.ink700, whiteSpace: "nowrap" }}>{l.poNum || "—"}{l.poAnnule && <span style={{ fontFamily: T.font, fontSize: FZF.xs, fontWeight: 700, marginLeft: 6 }}>annulé</span>}</td>
            <td style={{ ...td(), fontFamily: T.fontMono, color: T.ink700 }}>{l.poLig || "—"}</td>
            <td style={{ ...td(), whiteSpace: "nowrap" }}><Pill k={s.k} l={s.l} />{s.retardJ > 0 && <span style={{ marginLeft: 6, fontSize: FZF.xs, color: T.red600, fontWeight: 700 }}>+{s.retardJ} j</span>}</td>
            {dateCell(s.prevue, s.k === "late" && s.statut !== "apasser" ? T.red600 : null)}
            <td style={{ ...td(), whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
              {canEdit && <button type="button" style={sbtn()} onClick={() => setPick(l.id)}>{l.poId ? "Changer PO" : "Affecter PO"}</button>}
              {canEdit && !n2 && !fiche.verrou && !l.poVerrou && <button type="button" style={{ ...sbtn(), marginLeft: 4 }} aria-label={"Ajouter une sous-ligne à " + (l.refEff || l.famEff || "cette ligne")} onClick={() => openLine(null, fiche, l)}>＋ Sous-ligne</button>}
            </td>
          </tr>); })}
        {!list.length && <tr><td colSpan={16} style={empty()}>Nomenclature vide. Ajoutez les lignes de niveau 1 avec « ＋ Ligne ».</td></tr>}
      </tbody>
    </table>
  </div>);

  // Vue cartes : niveau 1 seulement ; carte rouge si la configuration est incomplète
  const renderCartes = (fiche, list) => { const n1 = list.filter(l => l.niv === 1);
    if (!n1.length) return <div style={{ color: T.ink500, fontSize: FZF.sm, padding: 18, textAlign: "center" }}>Nomenclature vide. Ajoutez les lignes de niveau 1 avec « ＋ Ligne ».</div>;
    return (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
      {n1.map(l => { const s = l.st, bad = l.manque.length > 0, Tag = canEdit ? "button" : "div";
        return (<Tag key={l.id} {...(canEdit ? { type: "button", onClick: () => openLine(l, fiche, null) } : {})}
          aria-label={canEdit ? "Modifier " + (l.famEff || "la ligne") + (l.desEff ? ", " + l.desEff : "") : undefined}
          style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 12, minHeight: 128, boxSizing: "border-box",
            border: "1px solid " + (bad ? T.red600 : T.line), background: bad ? T.red100 : T.card, cursor: canEdit ? "pointer" : "default", fontFamily: T.font, color: T.ink900 }}>
          <span style={{ fontFamily: T.fontDisplay, fontSize: FZF.md, fontWeight: 700, lineHeight: 1.2 }}>{l.famEff || "Sans scope"}</span>
          <span style={{ fontSize: FZF.xs, color: bad ? T.ink700 : T.ink500, lineHeight: 1.35 }}>{l.desEff || (l.refEff ? l.refEff : "Référence non attribuée")}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: FZF.sm, color: T.ink700 }}>Livraison prévue <b style={{ fontVariantNumeric: "tabular-nums", color: s.k === "late" && s.statut !== "apasser" ? T.red600 : T.ink900 }}>{fd(s.prevue)}</b></span>
          <span><Pill k={s.k} l={s.l} />{s.retardJ > 0 && <span style={{ marginLeft: 6, fontSize: FZF.xs, color: T.red600, fontWeight: 700 }}>+{s.retardJ} j</span>}</span>
          {bad && <span style={{ fontSize: FZF.xs, fontWeight: 700, color: T.red600 }}>À configurer : {l.manque.join(", ")}</span>}
        </Tag>); })}
    </div>); };

  // Vue Gantt, deux pistes par ligne (N1 et N2) :
  //   théorique (en haut, pastel) : commande au plus tard → production (LT fournisseur, info) → transport (violet) → livraison cible ;
  //   réel (barre pleine, en bas) : date de commande du PO → livraison prévue du PO, verte si à temps, rouge si après la livraison cible.
  // Trait vertical = arrivée de la machine ; pointillé = aujourd'hui.
  const renderGantt = (fiche, list) => {
    const G = list.map(l => { const s = l.st, th = !!(s.auPlusTard && s.cible && s.lt != null), dep = th ? addDays(s.cible, -(s.ltT || 0)) : "", p = l.poLine;
      return { l, s, th, deb: s.auPlusTard, dep, fin: s.cible, cde: p ? isoOf(p.dateCommande) : "", liv: s.prevue || "" }; });
    if (!G.some(g => g.th || g.liv)) return <div style={{ color: T.ink500, fontSize: FZF.sm, padding: 18, textAlign: "center" }}>Aucune ligne datée : il manque la date d'arrivée, le fournisseur ou le LT.</div>;
    const ds = [tIso, fiche.dateDebutEff, ...G.flatMap(g => [g.th && g.deb, g.th && g.fin, g.cde, g.liv])].filter(Boolean).sort();
    const d0 = addDays(ds[0], -21), d1 = addDays(ds[ds.length - 1], 21), nj = Math.max(1, daysBetween(d0, d1));
    const px = Math.max(3, Math.min(14, 1000 / nj)), W = Math.round(nj * px), LW = 250, x = d => daysBetween(d0, d) * px;
    const mois = []; const m = new Date(d0 + "T12:00:00"); m.setDate(1); m.setMonth(m.getMonth() + 1);
    while (iso(m) <= d1) { mois.push(iso(m)); m.setMonth(m.getMonth() + 1); }
    const nomMois = s => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const dm = s => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "");
    const arr = fiche.dateDebutEff, LabelTag = canEdit ? "button" : "div";
    const sw = (st, txt) => <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ display: "inline-block", width: 16, height: 9, borderRadius: 4, boxSizing: "border-box", ...st }} />{txt}</span>;
    const pt = (left, top, color, title) => <span title={title} style={{ position: "absolute", left: left - 4, top, width: 8, height: 8, borderRadius: 999, background: color, border: "1px solid " + T.card, zIndex: 1 }} />;
    const lab = (style, color, txt) => <span style={{ position: "absolute", top: 23, fontSize: FZF.xs, lineHeight: "12px", color, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", ...style }}>{txt}</span>;
    return (<div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: FZF.xs, color: T.ink700, marginBottom: 8, alignItems: "center" }}>
        <b style={{ color: T.ink900 }}>Théorique</b>
        {sw({ background: T.info100, border: "1px solid " + T.info500 }, "Production (LT fournisseur)")}{sw({ background: T.violet100, border: "1px solid " + T.violet500 }, "Transport")}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: T.ink700 }} />Cde au plus tard / livraison cible</span>
        <b style={{ color: T.ink900, marginLeft: 6 }}>Réel (PO)</b>
        {sw({ background: T.emerald600 }, "Commande → livraison prévue, à temps")}{sw({ background: T.red600 }, "en retard")}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 2, height: 12, background: T.ink900 }} />Arrivée {fd(arr)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 0, height: 12, borderLeft: "1px dashed " + T.ink500 }} />Aujourd'hui</span>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid " + T.line, borderRadius: 8 }}>
        <div style={{ position: "relative", width: LW + W, minWidth: "100%" }}>
          <div style={{ display: "flex", height: 28 }}>
            <div style={{ width: LW, flex: "0 0 " + LW + "px", position: "sticky", left: 0, zIndex: 3, background: T.card, borderRight: "1px solid " + T.line, padding: "0 8px", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 500, color: T.ink500 }}>Élément</div>
            <div style={{ position: "relative", width: W, flex: "0 0 " + W + "px" }}>
              {mois.map(s => <span key={s} style={{ position: "absolute", left: x(s), top: 0, bottom: 0, borderLeft: "1px solid " + T.line, paddingLeft: 4, fontSize: FZF.xs, color: T.ink500, lineHeight: "28px", whiteSpace: "nowrap" }}>{nomMois(s)}</span>)}
            </div>
          </div>
          {G.map(({ l, s, th, deb, dep, fin, cde, liv }) => {
            const n2 = l.niv === 2, enRetard = liv && fin && liv > fin, done = s.k === "done", reelCol = done ? T.ink500 : enRetard ? T.red600 : T.emerald600;
            const cdeRetard = s.statut === "apasser" && deb && deb < tIso;
            return (<div key={l.id} style={{ display: "flex", height: 44, borderTop: "1px solid " + T.line }}>
              <LabelTag {...(canEdit ? { type: "button", onClick: () => openLine(l, fiche, l.parent), "aria-label": "Ouvrir " + (l.refEff || l.famEff) } : {})}
                style={{ width: LW, flex: "0 0 " + LW + "px", position: "sticky", left: 0, zIndex: 2, background: n2 ? T.surface : T.card, border: "none", borderRight: "1px solid " + T.line, padding: "0 8px 0 " + (n2 ? 24 : 8) + "px",
                  display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "left", cursor: canEdit ? "pointer" : "default", fontFamily: T.font, minWidth: 0 }}>
                <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: FZF.xs, fontWeight: n2 ? 500 : 700, fontFamily: l.refEff ? T.fontMono : T.font, color: l.refEff ? T.ink900 : T.red600 }}>{l.refEff || l.famEff + " · à attribuer"}</span>
                <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: FZF.xs, color: T.ink500 }}>{[l.famEff, l.desEff, l.poNum && "PO " + l.poNum].filter(Boolean).join(" · ")}</span>
              </LabelTag>
              <div style={{ position: "relative", width: W, flex: "0 0 " + W + "px" }}>
                {th ? <>
                  <div title={"Production (LT fournisseur) : commande au plus tard " + fd(deb) + ", départ " + fd(dep) + " (" + s.lt + " j)"} style={{ position: "absolute", top: 7, height: 11, left: x(deb), width: Math.max(2, x(dep) - x(deb)), boxSizing: "border-box", background: T.info100, border: "1px solid " + T.info500, borderRadius: s.ltT ? "3px 0 0 3px" : 3 }} />
                  {s.ltT > 0 && <div title={"Transport : départ " + fd(dep) + ", livraison cible " + fd(fin) + " (" + s.ltT + " j)"} style={{ position: "absolute", top: 7, height: 11, left: x(dep), width: Math.max(2, x(fin) - x(dep)), boxSizing: "border-box", background: T.violet100, border: "1px solid " + T.violet500, borderLeft: "none", borderRadius: "0 3px 3px 0" }} />}
                  {pt(x(deb), 8.5, cdeRetard ? T.red600 : T.ink700, "Commande au plus tard " + fd(deb))}{pt(x(fin), 8.5, T.ink700, "Livraison cible " + fd(fin))}
                </> : <span style={{ position: "absolute", left: 8, top: 4, fontSize: FZF.xs, color: T.ink500, whiteSpace: "nowrap" }}>Théorique incomplet{l.manque.length ? " : " + l.manque.join(", ") : ""}</span>}
                {cde && liv ? <>
                  <div title={"Réel : commandé le " + fd(cde) + ", livraison prévue " + fd(liv) + (enRetard ? ", " + daysBetween(fin, liv) + " j après la cible" : "")} style={{ position: "absolute", top: 23, height: 12, left: x(cde), width: Math.max(3, x(liv) - x(cde)), background: reelCol, borderRadius: 4 }} />
                  {lab({ right: W - x(cde) + 4 }, T.ink700, dm(cde))}{lab({ left: x(liv) + 4, fontWeight: 700 }, reelCol, dm(liv) + (enRetard && !done ? " +" + daysBetween(fin, liv) + " j" : ""))}
                </> : liv ? <>
                  {pt(x(liv), 25, reelCol, "Livraison prévue " + fd(liv) + " (date de commande inconnue)")}{lab({ left: x(liv) + 6, fontWeight: 700 }, reelCol, dm(liv))}
                </> : th ? lab({ left: x(deb) + 2 }, cdeRetard ? T.red600 : T.ink500, cdeRetard ? "Non commandé, en retard" : "Non commandé") : null}
              </div>
            </div>); })}
          {arr && <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: LW + x(arr) - 1, width: 2, background: T.ink900, zIndex: 1 }}>
            <span style={{ position: "absolute", top: 5, left: 5, fontSize: FZF.xs, fontWeight: 700, color: T.ink900, background: T.card, padding: "0 4px", borderRadius: 4, whiteSpace: "nowrap" }}>Arrivée {fd(arr)}</span></div>}
          <div aria-hidden="true" style={{ position: "absolute", top: 28, bottom: 0, left: LW + x(tIso), borderLeft: "1px dashed " + T.ink500, zIndex: 1 }} />
        </div>
      </div>
    </div>);
  };

  const segBtn = on => ({ ...sbtn(), borderRadius: 0, border: "none", background: on ? T.surfaceAlt : T.card, color: on ? T.ink900 : T.ink500, minHeight: 28, padding: "0 10px" });

  return (<div style={{ fontFamily: T.font, color: T.ink900 }}>
    <PageHead kicker="Gestion" title="Achats / Appro" sub="Nomenclatures par machine et rétro-planning des approvisionnements" right={addBtn ? <button type="button" style={btn(true)} onClick={addBtn[1]}>{addBtn[0]}</button> : null} />
    <div role="tablist" aria-label="Sous-pages" style={{ display: "flex", gap: 18, borderBottom: "1px solid " + T.line, marginBottom: 14, flexWrap: "wrap" }}>
      {visibleTabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{ border: "none", background: "transparent", padding: "8px 0", minHeight: 32, cursor: "pointer", fontFamily: T.font, fontSize: FZF.sm, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.ink900 : T.ink500, borderBottom: "2px solid " + (tab === id ? T.ink900 : "transparent"), marginBottom: -1 }}>{l}</button>)}
    </div>

    {tab === "projets" && <div style={{ display: "grid", gridTemplateColumns: "minmax(210px,260px) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
      <nav aria-label="Fiches machine" style={{ ...CARD(), padding: 6, maxHeight: "75vh", overflow: "auto" }}>
        <input type="search" placeholder="Rechercher" aria-label="Rechercher une machine ou un projet" value={qFiche} onChange={e => setQFiche(e.target.value)} style={{ ...field(), marginBottom: 6 }} />
        {nDiff > 0 && <div role="note" style={{ background: T.amber100, color: T.amber600, borderRadius: 8, padding: "6px 8px", fontSize: FZF.xs, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <NavIcon name="warning" size={13} />{nDiff} fiche(s) avec une arrivée différente de l'ordo
          <button type="button" aria-pressed={seulDiff} style={{ ...sbtn(), minHeight: 24, marginLeft: "auto" }} onClick={() => setSeulDiff(x => !x)}>{seulDiff ? "Tout voir" : "Voir"}</button></div>}
        {fichesF.map(f => { const L = linesByFiche[f.id] || [], bad = L.filter(l => l.st.k === "late" || l.st.k === "nc").length, cfg = L.filter(l => !l.parentId && l.manque.length).length, on = cur && cur.id === f.id; return (
          <button key={f.id} type="button" onClick={() => { setFicheSel(f.id); setDeverr(false); }} aria-current={on ? "true" : undefined} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, border: "none", borderRadius: 8, padding: "6px 8px", minHeight: 36, background: on ? T.surfaceAlt : "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
            <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontFamily: T.fontMono, fontSize: FZF.sm }}>{f.machine}</b>
              <span style={{ display: "block", fontSize: FZF.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[f.modeleEff, "arrivée " + fd(f.dateDebutEff), f.verrou && "verrouillée"].filter(Boolean).join(" · ")}</span>
              {f.config && f.config.statut !== "finalisee" && <span style={{ display: "block", fontSize: FZF.xs, color: T.amber600, fontWeight: 700 }}>Configuration en brouillon</span>}
              {f.ecartOrdo !== 0 && <span style={{ display: "block", fontSize: FZF.xs, color: T.amber600, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>≠ ordo ({(f.ecartOrdo > 0 ? "+" : "") + f.ecartOrdo} j)</span>}</span>
            <span style={{ fontSize: FZF.xs, color: bad || cfg ? T.red600 : T.ink500, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{bad ? bad + " en retard" : cfg ? cfg + " à configurer" : L.length ? L.length + " l." : "—"}</span>
          </button>); })}
        {!fiches.length && <div style={{ padding: 10, color: T.ink500, fontSize: FZF.sm }}>Aucune fiche. Créez une fiche par machine avec « ＋ Fiche machine ».</div>}
        {fiches.length > 0 && !fichesF.length && <div style={{ padding: 10, color: T.ink500, fontSize: FZF.sm }}>Aucune fiche ne correspond.</div>}
      </nav>
      {cur ? (() => { const L = linesByFiche[cur.id] || [], late = L.filter(l => l.st.k === "late" || l.st.k === "nc").length, soon = L.filter(l => l.st.k === "soon").length, todo = L.filter(l => l.st.statut === "apasser").length, done = L.filter(l => l.st.k === "done").length;
        const cfg = L.filter(l => !l.parentId && l.manque.length).length, fams = famsN1(L), missStd = scopesManquants(cur.modele, fams), brouillon = !!(cur.config && cur.config.statut !== "finalisee");
        return (<section aria-label={"Fiche " + cur.machine} style={{ ...CARD(), minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.md }}>{cur.machine}</b>
            <span style={{ color: T.ink500, fontSize: FZF.sm, fontVariantNumeric: "tabular-nums" }}>{[cur.projet && "projet " + cur.projet, cur.modeleEff, "arrivée " + fd(cur.dateDebutEff) + (cur.fige ? " (fiche)" : cur.row ? " (ordo)" : ""), "marge " + cur.margeEff + " j"].filter(Boolean).join(" · ")}</span>
            <span style={{ flex: 1 }} />
            <div role="group" aria-label="Affichage de la nomenclature" style={{ display: "inline-flex", border: "1px solid " + T.line, borderRadius: 8, overflow: "hidden" }}>
              <button type="button" aria-pressed={vue === "tableau"} style={segBtn(vue === "tableau")} onClick={() => setVue("tableau")}>Tableau</button>
              <button type="button" aria-pressed={vue === "cartes"} style={{ ...segBtn(vue === "cartes"), borderLeft: "1px solid " + T.line }} onClick={() => setVue("cartes")}>Cartes</button>
              <button type="button" aria-pressed={vue === "gantt"} style={{ ...segBtn(vue === "gantt"), borderLeft: "1px solid " + T.line }} onClick={() => setVue("gantt")}>Gantt</button>
            </div>
            {canEdit && <button type="button" style={sbtn()} onClick={() => openFiche(cur)}>Modifier la fiche</button>}
            {canEdit && !cur.verrou && !brouillon && hasOptions(artByRef[low(cur.modele)]) && <button type="button" style={sbtn()} onClick={() => setCfg(cur.id)}>Options machine</button>}
            {canEdit && !cur.verrou && <button type="button" style={sbtn()} onClick={() => verrouiller(cur, true)}>Verrouiller la configuration</button>}
            {canEdit && !cur.verrou && <button type="button" style={btn(false)} onClick={() => openLine(null, cur, null)}>＋ Ligne</button>}
          </div>
          {canEdit ? <textarea key={"n" + cur.id + ":" + (cur.note || "")} rows={1} defaultValue={cur.note || ""} placeholder="Commentaire libre" aria-label={"Commentaire de la fiche " + cur.machine}
              onBlur={e => { if (e.target.value !== (cur.note || "")) saveFiche(cur, { note: e.target.value }); }} style={{ ...field(), resize: "vertical", margin: "4px 0 8px", color: T.ink700 }} />
            : cur.note ? <div style={{ fontSize: FZF.sm, color: T.ink700, margin: "2px 0 8px", whiteSpace: "pre-wrap" }}>{cur.note}</div> : null}
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", fontSize: FZF.sm, color: T.ink700, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>Arrivée retenue (fiche)
              {canEdit ? <input type="date" key={"d" + cur.id + ":" + cur.dateDebutEff} defaultValue={cur.dateDebutEff} onBlur={e => { const v = e.target.value; if (v && v !== isoOf(cur.dateDebut)) saveFiche(cur, { dateDebut: v }); }}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...field(), width: 160, fontFamily: T.fontDisplay, fontWeight: 700 }} />
                : <b style={{ fontFamily: T.fontDisplay, color: T.ink900 }}>{fd(cur.dateDebutEff)}</b>}</label>
            <span>Arrivée ordo{cur.row ? " (" + cur.row.pj + ")" : ""} : <b style={{ fontFamily: T.fontDisplay, color: T.ink900 }}>{cur.row ? fd(cur.ordoDate) : "absente de l'ordo"}</b></span>
            {cur.ecartOrdo !== 0 ? <span style={{ fontWeight: 700, color: T.amber600 }}>{(cur.ecartOrdo > 0 ? "+" : "") + cur.ecartOrdo} j par rapport à l'ordo</span>
              : cur.fige && cur.row ? <span style={{ fontWeight: 700, color: T.emerald600 }}>Identique à l'ordo</span> : null}
          </div>
          {Object.keys(cur.decal).some(s => cur.decal[s] && niveauOf(s) === "N1") && <div style={{ fontSize: FZF.sm, color: T.ink700, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ fontWeight: 600 }}>Arrivée par scope{cur.scopesDecal ? "" : " (modèle " + (cur.modele || "—") + ")"} : </span>
            {scopesN1.filter(s => cur.decal[s]).concat(Object.keys(cur.decal).filter(s => cur.decal[s] && !scopeList.includes(s))).map(s => s + " " + fmtJ(cur.decal[s])).join(" · ")}</div>}
          {cur.ecartOrdo !== 0 && <div role="note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: T.amber100, color: T.amber600, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, fontWeight: 600, margin: "6px 0" }}>
            <NavIcon name="warning" size={14} />L'arrivée de la fiche ({fd(cur.dateDebutEff)}) diffère de l'ordo ({fd(cur.ordoDate)}). Tous les calculs utilisent la date de la fiche.
            {canEdit && <button type="button" style={sbtn()} onClick={() => saveFiche(cur, { dateDebut: cur.ordoDate })}>Reprendre la date de l'ordo</button>}</div>}
          {!cur.fige && cur.dateDebutEff && <div role="note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: T.surfaceAlt, color: T.ink700, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, margin: "6px 0" }}>
            Date d'arrivée pas encore figée : elle suit l'ordo.{canEdit && <button type="button" style={sbtn()} onClick={() => saveFiche(cur, { dateDebut: cur.ordoDate })}>La figer au {fd(cur.ordoDate)}</button>}</div>}
          {!cur.dateDebutEff && <div role="note" style={{ background: T.amber100, color: T.amber600, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, fontWeight: 600, margin: "6px 0" }}>Date d'arrivée inconnue : les dates de la nomenclature ne peuvent pas être calculées. Saisissez-la ci-dessus.</div>}
          {cur.verrou && <div role="note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: T.surfaceAlt, color: T.ink900, border: "1px solid " + T.line, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, margin: "6px 0" }}>
            <b>Configuration verrouillée{cur.verrouLe ? " le " + fdt(cur.verrouLe) : ""}.</b><span style={{ color: T.ink700 }}>Lignes, quantités et sous-lignes ne sont plus modifiables. Attribution des PO, date d'arrivée et commentaire restent possibles.</span>
            {canEdit && (deverr ? <button type="button" style={{ ...sbtn(), color: T.red600, borderColor: T.red600 }} onClick={() => verrouiller(cur, false)}>Confirmer le déverrouillage</button>
              : <button type="button" style={sbtn()} onClick={() => setDeverr(true)}>Déverrouiller</button>)}</div>}
          {brouillon && (() => { const P = planOf(artByRef[low(cur.modele)], cur.config.choix), m = P.groups.filter(g => g.multi).length;
            return (<div role="note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: T.amber100, color: T.amber600, borderRadius: 8, padding: "8px 10px", fontSize: FZF.sm, fontWeight: 600, margin: "6px 0" }}>
              <NavIcon name="warning" size={14} />Configuration machine en brouillon : {m - P.manquants.length} choix sur {m} faits. La nomenclature sera créée une fois les options choisies.
              {canEdit && !cur.verrou && <button type="button" style={btn(true)} onClick={() => setCfg(cur.id)}>Configurer la machine</button>}</div>); })()}
          {canEdit && !cur.verrou && !brouillon && missStd.length > 0 && <div role="note" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: T.surfaceAlt, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, color: T.ink700, margin: "6px 0" }}>
            Scopes actifs du modèle absents : {missStd.join(", ")}.<button type="button" style={sbtn()} onClick={() => completeStd(cur)}>Les ajouter</button></div>}
          <div style={{ fontSize: FZF.sm, color: T.ink700, margin: "2px 0 10px", fontVariantNumeric: "tabular-nums" }}>
            {L.length ? <>{L.length} ligne(s) · {done} livrée(s) · {todo} commande(s) à passer{soon ? <>, dont <b style={{ color: T.amber600 }}>{soon} sous 14 j</b></> : null}{late ? <> · <b style={{ color: T.red600 }}>{late} en retard</b></> : null}{cfg ? <> · <b style={{ color: T.red600 }}>{cfg} à configurer</b></> : null}</> : "Aucune ligne pour l'instant."}
          </div>
          {vue === "cartes" ? renderCartes(cur, tree(L)) : vue === "gantt" ? renderGantt(cur, tree(L)) : renderTableau(cur, tree(L))}
        </section>); })()
        : <section style={{ ...CARD(), color: T.ink500, fontSize: FZF.sm }}>Sélectionnez ou créez une fiche machine.</section>}
    </div>}

    {tab === "po" && (() => { const s = low(qPo);
      const list = poList.filter(p => !s || low(p.numero).includes(s)).sort((a, b) => cmpNat(a.numero, b.numero) || String(a.dateLivraison || "9").localeCompare(String(b.dateLivraison || "9")) || cmpNat(a.ligne, b.ligne));
      const shown = list.slice(0, poLimit);
      return (<section aria-label="PO" style={CARD()}>
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: sync.etat === "erreur" && !demandeEnCours ? T.red100 : T.surfaceAlt, borderRadius: 8, padding: "6px 10px", marginBottom: 10, fontSize: FZF.sm, color: sync.etat === "erreur" && !demandeEnCours ? T.red600 : T.ink700, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ color: T.ink900 }}>Odoo</b>
          <span style={{ flex: 1, minWidth: 200 }}>{odooPret ? syncTexte() : "Connexion non configurée" + (owner ? " : voir Réglages." : " : à faire par le propriétaire de la page.")}</span>
          {canEdit && odooPret && <button type="button" style={sbtn()} disabled={demandeEnCours || sync.etat === "en_cours"} onClick={demanderSync}>Synchroniser maintenant</button>}
        </div>
        <div style={toolbar}>
          <input type="search" placeholder="N° de PO" aria-label="Filtrer par n° de PO" value={qPo} onChange={e => { setQPo(e.target.value); setPoLimit(PAGE); }} style={{ ...field(), width: 220, fontFamily: T.fontMono }} />
          <span style={{ fontSize: FZF.sm, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{list.length ? shown.length + " ligne(s) affichée(s) sur " + list.length : ""}</span>
        </div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr><th style={th()}>N° PO</th><th style={th()}>Ligne</th><th style={th()}>Référence</th><th style={th()}>Désignation</th><th style={th(true)}>Qté</th><th style={th()}>Commande</th><th style={th()}>Livraison</th><th style={th()}>Statut PO</th><th style={th()}>Projet</th><th style={th()}>Source</th><th style={th(true)}>Affectée / qté</th></tr></thead>
          <tbody>{shown.map(p => { const lateLiv = p.statut !== "livre" && p.dateLivraison && p.dateLivraison < tIso, a = affects[p.id], pq = num(p.qte), plein = poPlein(p);
            const c = (x, col) => ({ ...td(), ...x, color: plein ? T.ink500 : col || T.ink900 }); return (
            <tr key={p.id} onClick={canEdit ? () => openPo(p) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36, background: plein ? T.surfaceAlt : "transparent" }}>
              <td style={c({ fontFamily: T.fontMono, fontWeight: 700, whiteSpace: "nowrap" })}>{p.numero}</td><td style={c({ fontFamily: T.fontMono })}>{p.ligne}</td>
              <td style={c({ fontFamily: T.fontMono }, T.ink700)}>{p.ref || "—"}</td><td style={c()}>{p.designation || "—"}</td>
              <td style={c({ textAlign: "right" })}>{pq == null ? "—" : pq}</td>
              <td style={c({ whiteSpace: "nowrap" }, T.ink700)}>{fd(p.dateCommande)}</td><td style={c({ whiteSpace: "nowrap" }, lateLiv ? T.red600 : null)}>{fd(p.dateLivraison)}</td>
              <td style={c({ whiteSpace: "nowrap", fontWeight: p.annule ? 700 : 400 }, p.annule ? T.red600 : p.statut === "livre" ? T.ink500 : T.ink700)}>{p.annule ? "Annulée dans Odoo" : ST_LABEL[p.statut] || "—"}</td>
              <td style={c({ fontFamily: T.fontMono }, T.ink700)}>{p.projet || "—"}</td>
              <td style={c({ fontSize: FZF.xs }, T.ink500)}>{p.source === "odoo" ? "Odoo" : "Saisie"}</td>
              <td style={c({ textAlign: "right", whiteSpace: "nowrap", fontWeight: a ? 700 : 400 }, a && pq != null && a.qte > pq ? T.amber600 : T.ink700)} title={a ? a.lines.map(x => x.machine + " " + x.ref + " × " + x.qte).join(", ") : undefined}>
                {a ? a.qte + " / " + (pq == null ? "—" : pq) : "—"}{plein && <span style={{ marginLeft: 6, fontSize: FZF.xs }}>complète</span>}</td>
            </tr>); })}
            {!list.length && <tr><td colSpan={11} style={empty()}>{poList.length ? "Aucun PO ne correspond à ce numéro." : odooPret ? "Aucune ligne de PO. Lancez une synchronisation Odoo." : "Aucune ligne de PO. Configurez Odoo dans Réglages, ou ajoutez-les avec « ＋ Ligne de PO »."}</td></tr>}</tbody>
        </table></div>
        {list.length > shown.length && <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button type="button" style={btn(false)} onClick={() => setPoLimit(n => n + PAGE)}>Afficher {Math.min(PAGE, list.length - shown.length)} de plus</button>
          {list.length <= 500 && <button type="button" style={btn(false)} onClick={() => setPoLimit(list.length)}>Tout afficher</button>}
        </div>}
      </section>); })()}

    {tab === "fournisseurs" && (() => { const s = low(qFour), list = Object.values(S.fournisseurs).filter(f => !s || low(f.nom).includes(s)).sort((a, b) => cmpNat(a.nom, b.nom));
      const ltInput = (f, k, lab) => canEdit
        ? <input key={f.id + k + String(f[k])} type="number" min={0} defaultValue={f[k] == null ? "" : f[k]} aria-label={lab + " de " + f.nom}
          onBlur={e => { const val = e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0); if (String(val) !== String(f[k] == null ? "" : f[k])) put("fournisseurs", f.id, { ...S.fournisseurs[f.id], [k]: val }); }}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...field(), width: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
        : (num(f[k]) == null ? "—" : f[k] + " j");
      return (<section aria-label="Fournisseurs" style={CARD()}>
        <div style={toolbar}>
          <input type="search" placeholder="Rechercher un fournisseur" aria-label="Rechercher un fournisseur" value={qFour} onChange={e => setQFour(e.target.value)} style={{ ...field(), width: 260 }} />
          <span style={{ fontSize: FZF.sm, color: T.ink500 }}>{Object.keys(S.fournisseurs).length} fournisseur(s)</span>
        </div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr><th style={th()}>Nom du fournisseur</th><th style={th(true)}>LT fournisseur</th><th style={th(true)}>LT transport</th><th style={th(true)}>LT total</th><th style={th(true)}>Lignes en cours</th><th style={th()}><span style={SR}>Actions</span></th></tr></thead>
          <tbody>{list.map(f => { const a = num(f.ltJ), b = num(f.ltTransportJ); return (
            <tr key={f.id} style={{ height: 36 }}>
              <td style={{ ...td(), fontWeight: 700 }}>{f.nom}</td>
              <td style={{ ...td(), textAlign: "right" }}>{ltInput(f, "ltJ", "LT fournisseur")}</td>
              <td style={{ ...td(), textAlign: "right" }}>{ltInput(f, "ltTransportJ", "LT transport")}</td>
              <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{a == null ? "—" : (a + (b || 0)) + " j"}</td>
              <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{allLines.filter(l => l.four && l.four.id === f.id && l.st.k !== "done").length}</td>
              <td style={{ ...td(), textAlign: "right" }}>{canEdit && <button type="button" style={sbtn()} onClick={() => openFour(f)}>Modifier</button>}</td>
            </tr>); })}
            {!list.length && <tr><td colSpan={6} style={empty()}>{Object.keys(S.fournisseurs).length ? "Aucun fournisseur ne correspond." : "Aucun fournisseur. Ajoutez-les avec « ＋ Fournisseur »."}</td></tr>}</tbody>
        </table></div>
      </section>); })()}

    {tab === "articles" && (() => { const s = low(qArt);
      const list = arts.filter(a => (voirInactifs || isActif(a)) && (!s || low(a.ref).includes(s) || low(a.designation).includes(s)))
        .filter(a => typeArt === "tous" || (typeArt === "orc") === isOrc(a))
        .sort((a, b) => (isOrc(b) ? 1 : 0) - (isOrc(a) ? 1 : 0) || scIdx(a.famille) - scIdx(b.famille) || cmpNat(a.famille, b.famille) || cmpNat(a.ref, b.ref));
      const shown = list.slice(0, artLimit), nIn = arts.filter(a => !isActif(a)).length;
      return (<section aria-label="Articles" style={CARD()}>
        <div style={toolbar}>
          <input type="search" placeholder="Référence ou désignation" aria-label="Rechercher un article" value={qArt} onChange={e => { setQArt(e.target.value); setArtLimit(50); }} style={{ ...field(), width: 260 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: FZF.sm, color: T.ink700, minHeight: 28, cursor: "pointer" }}>
            <input type="checkbox" checked={voirInactifs} onChange={e => setVoirInactifs(e.target.checked)} style={{ width: 16, height: 16 }} />Afficher les inactifs ({nIn})</label>
          <select aria-label="Type d'article" value={typeArt} onChange={e => { setTypeArt(e.target.value); setArtLimit(50); }} style={{ ...field(), width: "auto" }}>
            <option value="tous">Tous les types</option><option value="achat">Achat</option><option value="orc">Machine ORC</option></select>
          <span style={{ fontSize: FZF.sm, color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{shown.length} sur {list.length}</span>
          <span style={{ flex: 1 }} />
          {canEdit && <button type="button" style={btn(false)} onClick={() => setImp("articles")}>Importer depuis Excel</button>}
        </div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr><th style={th()}>Réf Enogia</th><th style={th()}>Désignation</th><th style={th()}>Type</th><th style={th()}>Scope</th><th style={th()}>Fournisseur</th><th style={th(true)}>LT article</th><th style={th()}>Actif</th><th style={th(true)}>Nomenclature</th></tr></thead>
          <tbody>{shown.map(c => { const off = !isActif(c), k = kidsOf(c).length; return (
            <tr key={c.id} onClick={canEdit ? () => openComp(c) : undefined} style={{ cursor: canEdit ? "pointer" : "default", height: 36 }}>
              <td style={{ ...td(), fontFamily: T.fontMono, fontWeight: 700, color: off ? T.ink500 : T.ink900 }}>{c.ref || "—"}</td><td style={{ ...td(), color: off ? T.ink500 : T.ink900 }}>{c.designation}</td>
              <td style={{ ...td(), whiteSpace: "nowrap", color: isOrc(c) ? T.ink900 : T.ink700, fontWeight: isOrc(c) ? 700 : 400 }}>{isOrc(c) ? "Machine ORC" : "Achat"}</td>
              <td style={{ ...td(), color: T.ink700 }}>{isOrc(c) ? "—" : c.famille || "—"}</td><td style={{ ...td(), color: T.ink700 }}>{isOrc(c) ? "—" : (S.fournisseurs[c.fournisseurId] || {}).nom || "—"}</td>
              <td style={{ ...td(), textAlign: "right", color: num(c.delaiJ) > 1 ? T.ink900 : T.ink500 }}>{isOrc(c) ? "—" : num(c.delaiJ) > 1 ? c.delaiJ + " j" : "frs"}</td>
              <td style={{ ...td(), color: off ? T.ink500 : T.ink700 }}>{off ? "Non" : "Oui"}</td>
              <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{k ? k + " comp." : "—"}</td>
            </tr>); })}
            {!list.length && <tr><td colSpan={8} style={empty()}>{arts.length ? "Aucun article ne correspond." : "Aucun article. Ajoutez-les avec « ＋ Article » ou importez-les depuis Excel."}</td></tr>}</tbody>
        </table></div>
        {list.length > shown.length && <div style={{ marginTop: 10 }}><button type="button" style={btn(false)} onClick={() => setArtLimit(n => n + 50)}>Afficher {Math.min(50, list.length - shown.length)} de plus</button></div>}
      </section>); })()}

    {tab === "nomenclatures" && (() => { const s = low(qNom);
      const list = arts.filter(a => (kidsOf(a).length || a.id === nomSel) && (!s || low(a.ref).includes(s) || low(a.designation).includes(s)))
        .sort((a, b) => (isOrc(b) ? 1 : 0) - (isOrc(a) ? 1 : 0) || cmpNat(a.ref, b.ref));
      const nc = (nomSel && S.composants[nomSel]) || list[0] || null, K = nc ? kidsOf(nc) : [];
      const majKid = (ref, x) => setKids(nc, K.map(k => (low(k.ref) === low(ref) ? { ...k, ...x } : k))), retirerKid = ref => setKids(nc, K.filter(k => low(k.ref) !== low(ref)));
      const groupes = nc ? groupsOf(nc) : [], nomsOpt = groupes.map(g => g.nom);
      const ajouter = async () => { setNomErr(""); const a = artByRef[low(nomAdd.ref)], q = num(nomAdd.qte);
        if (!a) { setNomErr("Référence introuvable dans les articles."); return; } if (a.id === nc.id) { setNomErr("Un article ne peut pas se contenir lui-même."); return; }
        if (K.some(k => low(k.ref) === low(a.ref))) { setNomErr(a.ref + " est déjà dans la nomenclature : modifiez sa quantité ou son option."); return; }
        if (!(q > 0)) { setNomErr("Quantité invalide."); return; }
        if (await setKids(nc, [...K, { ref: a.ref, qte: q, option: up(nomAdd.option) }])) setNomAdd({ ref: "", qte: 1, option: nomAdd.option || "" }); };
      return (<div style={{ display: "grid", gridTemplateColumns: "minmax(210px,260px) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <nav aria-label="Nomenclatures" style={{ ...CARD(), padding: 6, maxHeight: "75vh", overflow: "auto" }}>
          <input type="search" placeholder="Rechercher" aria-label="Rechercher une nomenclature" value={qNom} onChange={e => setQNom(e.target.value)} style={{ ...field(), marginBottom: 6 }} />
          {list.map(a => { const on = nc && nc.id === a.id; return (
            <button key={a.id} type="button" onClick={() => { setNomSel(a.id); setNomErr(""); setNomDel(false); }} aria-current={on ? "true" : undefined} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, border: "none", borderRadius: 8, padding: "6px 8px", minHeight: 36, background: on ? T.surfaceAlt : "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontFamily: T.fontMono, fontSize: FZF.sm, color: isActif(a) ? T.ink900 : T.ink500 }}>{a.ref}</b>
                <span style={{ display: "block", fontSize: FZF.xs, color: T.ink500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(isOrc(a) ? "Machine ORC · " : "") + (a.designation || "")}</span></span>
              <span style={{ fontSize: FZF.xs, color: T.ink500, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{kidsOf(a).length}{groupsOf(a).length ? <span style={{ display: "block", fontWeight: 400 }}>{groupsOf(a).length} opt.</span> : null}</span>
            </button>); })}
          {!list.length && <div style={{ padding: 10, color: T.ink500, fontSize: FZF.sm }}>{s ? "Aucune nomenclature ne correspond." : "Aucune nomenclature. Créez-en une avec « ＋ Nomenclature » ou importez-les depuis Excel."}</div>}
          {canEdit && <button type="button" style={{ ...btn(false), width: "100%", marginTop: 6 }} onClick={() => setImp("nomenclatures")}>Importer depuis Excel</button>}
        </nav>
        {nc ? <section aria-label={"Nomenclature " + nc.ref} style={{ ...CARD(), minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <b style={{ fontFamily: T.fontMono, fontSize: FZF.md }}>{nc.ref}</b>
            <span style={{ color: T.ink500, fontSize: FZF.sm }}>{[isOrc(nc) && "machine ORC", nc.designation, !isActif(nc) && "inactif"].filter(Boolean).join(" · ")}</span>
            <span style={{ flex: 1 }} />
            {canEdit && K.length > 0 && <button type="button" style={sbtn()} onClick={() => openNomDup(nc)}>Dupliquer vers…</button>}
            {canEdit && K.length > 0 && (nomDel ? <button type="button" style={{ ...sbtn(), color: T.red600, borderColor: T.red600 }} onClick={async () => { if (await setKids(nc, [])) setNomDel(false); }}>Confirmer la suppression</button>
              : <button type="button" style={{ ...sbtn(), color: T.red600 }} onClick={() => setNomDel(true)}>Supprimer la nomenclature</button>)}
          </div>
          <div style={{ fontSize: FZF.sm, color: T.ink500, margin: "2px 0 10px" }}>{isOrc(nc) ? "Copiée dans chaque nouvelle fiche machine de ce modèle : ses composants deviennent les lignes N1." : "Ajoutée en niveau 2 quand l'article est mis en N1 dans une fiche."} Une modification ne change pas les fiches déjà créées.
            {" "}Option : les composants qui portent le même nom d'option sont des alternatives, un seul est retenu à la configuration de la machine ; une option d'un seul composant est facultative.</div>
          <datalist id="dl-nomopt">{nomsOpt.map(o => <option key={o} value={o} />)}</datalist>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
            <thead><tr><th style={th()}>Réf composant</th><th style={th()}>Désignation</th><th style={th()}>Scope</th><th style={th()}>Fournisseur</th><th style={th(true)}>Qté</th><th style={th()}>Option</th><th style={th()}><span style={SR}>Actions</span></th></tr></thead>
            <tbody>{[{ nom: "", items: K.filter(k => !k.option) }, ...groupes].map(g => (<React.Fragment key={"g:" + g.nom}>
              {g.nom && <tr><td colSpan={7} style={{ ...td(), background: T.surfaceAlt, fontWeight: 700, fontSize: FZF.xs, color: T.ink900, padding: "5px 10px" }}>
                Option {g.nom} <span style={{ fontWeight: 400, color: T.ink700 }}>· {g.multi ? "choisir 1 parmi " + g.items.length : "facultative (1 composant)"}</span></td></tr>}
              {g.items.map(k => (<tr key={k.ref} style={{ height: 36 }}>
                <td style={{ ...td(), fontFamily: T.fontMono, fontWeight: 700, color: k.art ? T.ink900 : T.red600, paddingLeft: g.nom ? 22 : 10 }}>{k.ref}</td>
                <td style={{ ...td(), color: k.art ? T.ink900 : T.red600 }}>{k.art ? k.art.designation : "Absent des articles"}</td>
                <td style={{ ...td(), color: T.ink700 }}>{(k.art && k.art.famille) || "—"}</td>
                <td style={{ ...td(), color: T.ink700 }}>{(k.art && (S.fournisseurs[k.art.fournisseurId] || {}).nom) || "—"}</td>
                <td style={{ ...td(), textAlign: "right" }}>{canEdit ? <input key={k.ref + ":" + k.qte} type="number" min={0} step="any" defaultValue={k.qte} aria-label={"Quantité de " + k.ref}
                  onBlur={e => { const q = num(e.target.value); if (q > 0 && q !== k.qte) majKid(k.ref, { qte: q }); else e.target.value = k.qte; }}
                  onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...field(), width: 80, textAlign: "right" }} /> : k.qte}</td>
                <td style={td()}>{canEdit ? <input key={k.ref + ":o:" + k.option} list="dl-nomopt" defaultValue={k.option} placeholder="Standard" aria-label={"Option de " + k.ref}
                  onBlur={e => { const o = up(e.target.value); if (o !== k.option) majKid(k.ref, { option: o }); }}
                  onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ ...field(), width: 160 }} /> : k.option || "Standard"}</td>
                <td style={{ ...td(), textAlign: "right" }}>{canEdit && <button type="button" aria-label={"Retirer " + k.ref} style={{ ...sbtn(), width: 28, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} onClick={() => retirerKid(k.ref)}><NavIcon name="close" size={13} /></button>}</td>
              </tr>))}
            </React.Fragment>))}
              {!K.length && <tr><td colSpan={7} style={empty()}>Nomenclature vide. Ajoutez un composant ci-dessous.</td></tr>}</tbody>
          </table></div>
          {canEdit && <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
            <label style={{ ...LBL, flex: "1 1 220px" }}>Ajouter un composant
              <input list="dl-nomadd" value={nomAdd.ref} onChange={e => setNomAdd(o => ({ ...o, ref: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") ajouter(); }} placeholder="Réf Enogia" style={{ ...field(), fontFamily: T.fontMono }} />
              <datalist id="dl-nomadd">{sugList(actifs.filter(a => a.id !== nc.id && !isOrc(a) && !K.some(k => low(k.ref) === low(a.ref))).map(a => [a.ref, a.designation || ""])).map(([r, l]) => <option key={r} value={r}>{l}</option>)}</datalist></label>
            <label style={{ ...LBL, width: 90 }}>Quantité
              <input type="number" min={0} step="any" value={nomAdd.qte} onChange={e => setNomAdd(o => ({ ...o, qte: e.target.value }))} style={{ ...field(), textAlign: "right" }} /></label>
            <label style={{ ...LBL, width: 180 }}>Option (vide = standard)
              <input list="dl-nomopt" value={nomAdd.option || ""} onChange={e => setNomAdd(o => ({ ...o, option: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") ajouter(); }} style={field()} /></label>
            <button type="button" style={btn(false)} onClick={ajouter}>Ajouter</button>
          </div>}
          {nomErr && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm, marginTop: 6 }}>{nomErr}</div>}
        </section> : <section style={{ ...CARD(), color: T.ink500, fontSize: FZF.sm }}>Sélectionnez ou créez une nomenclature.</section>}
      </div>); })()}

    {tab === "configuration" && (() => {
      const nArt = s => arts.filter(a => !isOrc(a) && up(a.famille) === s).length, nLig = s => allLines.filter(l => up(l.famEff) === s).length, nOrc = s => arts.filter(a => isOrc(a) && cfgOf(a)[s].actif).length;
      const hors = uniq([...arts.filter(a => !isOrc(a)).map(a => up(a.famille)), ...allLines.map(l => up(l.famEff))]).filter(s => !scopeList.includes(s)).sort(cmpNat);
      const ajouter = async () => { const s = up(newScope); setScopeErr("");
        if (!s) { setScopeErr("Saisissez un nom de scope."); return; } if (scopeList.includes(s)) { setScopeErr(s + " existe déjà."); return; }
        if (await setScopes([...scopeList, s], { [s]: newNiv })) setNewScope(""); };
      const bouger = (i, d) => { const l = [...scopeList], j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setScopes(l); };
      return (<section aria-label="Configuration des scopes" style={{ ...CARD(), maxWidth: 900 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: FZF.md, fontWeight: 600, color: T.ink900, marginBottom: 4 }}>Scopes</div>
        <div style={{ fontSize: FZF.sm, color: T.ink500, marginBottom: 10 }}>Un scope est un composant ou un lot de composants de la machine. Chaque article d'achat appartient à un scope. Scope N1 : suivi par les chefs de projet, créé par défaut dans les fiches ; sa création et son arrivée (en jours par rapport à l'arrivée machine) se règlent sur chaque machine ORC, dans l'onglet Articles. Scope N2 : classement des sous-composants, suivi par les achats uniquement, jamais créé par défaut. L'ordre ci-dessous est celui des fiches.</div>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
          <thead><tr><th style={th()}>Ordre</th><th style={th()}>Scope</th><th style={th()}>Niveau</th><th style={th(true)}>Articles</th><th style={th(true)}>Lignes en fiches</th><th style={th(true)}>Actif sur ORC</th><th style={th()}><span style={SR}>Actions</span></th></tr></thead>
          <tbody>{scopeList.map((s, i) => { const na = nArt(s), nl = nLig(s), used = na + nl; return (<tr key={s} style={{ height: 36 }}>
            <td style={{ ...td(), whiteSpace: "nowrap" }}>{canEdit ? <>
              <button type="button" aria-label={"Monter " + s} disabled={!i} style={{ ...sbtn(), width: 28, padding: 0, marginRight: 4 }} onClick={() => bouger(i, -1)}>↑</button>
              <button type="button" aria-label={"Descendre " + s} disabled={i === scopeList.length - 1} style={{ ...sbtn(), width: 28, padding: 0 }} onClick={() => bouger(i, 1)}>↓</button></> : i + 1}</td>
            <td style={{ ...td(), fontWeight: 700 }}>{s}</td>
            <td style={td()}>{canEdit ? <select aria-label={"Niveau du scope " + s} value={niveauOf(s)} onChange={e => setScopes(scopeList, { [s]: e.target.value })} style={{ ...field(), width: 76, minHeight: 28, padding: "2px 6px" }}>
              <option value="N1">N1</option><option value="N2">N2</option></select> : niveauOf(s)}</td>
            <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{na || "—"}</td><td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{nl || "—"}</td>
            <td style={{ ...td(), textAlign: "right", color: T.ink700 }}>{niveauOf(s) === "N2" ? "—" : nOrc(s) + " / " + arts.filter(isOrc).length}</td>
            <td style={{ ...td(), textAlign: "right", whiteSpace: "nowrap" }}>{canEdit && <>
              <button type="button" style={sbtn()} onClick={() => openScope(s)}>Renommer</button>
              {delScope === s ? <button type="button" style={{ ...sbtn(), marginLeft: 4, color: T.red600, borderColor: T.red600 }} onClick={async () => { if (await setScopes(scopeList.filter(x => x !== s))) setDelScope(null); }}>Confirmer</button>
                : <button type="button" disabled={!!used} title={used ? "Utilisé par " + na + " article(s) et " + nl + " ligne(s) : renommez-le ou changez-les d'abord." : undefined} style={{ ...sbtn(), marginLeft: 4, color: used ? T.ink500 : T.red600 }} onClick={() => setDelScope(s)}>Supprimer</button>}</>}</td>
          </tr>); })}</tbody>
        </table></div>
        {canEdit && <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
          <label style={{ ...LBL, flex: "0 1 280px" }}>Nouveau scope<input value={newScope} onChange={e => { setNewScope(e.target.value); setScopeErr(""); }} onKeyDown={e => { if (e.key === "Enter") ajouter(); }} placeholder="Par exemple ÉCHANGEUR" style={field()} /></label>
          <label style={{ ...LBL, width: 90 }}>Niveau<select value={newNiv} onChange={e => setNewNiv(e.target.value)} style={field()}><option value="N1">N1</option><option value="N2">N2</option></select></label>
          <button type="button" style={btn(false)} onClick={ajouter}>Ajouter</button></div>}
        {scopeErr && <div role="alert" style={{ color: T.red600, fontWeight: 600, fontSize: FZF.sm, marginTop: 6 }}>{scopeErr}</div>}
        {hors.length > 0 && <div role="note" style={{ marginTop: 12, background: T.amber100, color: T.amber600, borderRadius: 8, padding: "6px 10px", fontSize: FZF.sm, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          Utilisés mais absents de la liste : {hors.join(", ")}.{canEdit && <button type="button" style={sbtn()} onClick={() => setScopes([...scopeList, ...hors])}>Les ajouter</button>}</div>}
      </section>); })()}

    {tab === "reglages" && owner && <section aria-label="Réglages" style={{ ...CARD(), display: "grid", gap: 14, maxWidth: 720 }}>
      <label style={{ ...LBL, maxWidth: 320 }}>Marge par défaut des nouvelles fiches (jours)
        <input key={"m" + S.params.marge} type="number" min={0} defaultValue={S.params.marge} onBlur={e => { const n = Math.max(0, Number(e.target.value) || 0); if (n !== S.params.marge) api.setParams({ ...S.params, marge: n }).then(ok => notify(ok ? "Marge enregistrée." : "Enregistrement impossible.", !ok)); }} style={field()} />
        <span style={{ fontWeight: 400, color: T.ink500 }}>Chaque fiche machine a sa propre marge ; celle-ci sert de valeur de départ et pour les fiches sans marge.</span></label>
      <div style={{ borderTop: "1px solid " + T.line, paddingTop: 14 }}>
        <OdooReglages key={JSON.stringify(odoo)} odoo={odoo} sync={sync} texte={syncTexte()} demandeEnCours={demandeEnCours} onSync={demanderSync}
          onSave={async cfg => { const ok = await api.setParams({ ...S.params, odoo: cfg }); notify(ok ? "Connexion Odoo enregistrée." : "Enregistrement impossible.", !ok); }} />
      </div>
      <div style={{ borderTop: "1px solid " + T.line, paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink700, marginBottom: 4 }}>Accès à la page (en plus de vous)</div>
        <textarea key={"a" + S.access.join()} rows={3} defaultValue={S.access.join("\n")} aria-label="Adresses ayant accès, une par ligne" onBlur={e => { const list = e.target.value.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /@enogia\.com$/.test(x)); if (list.join() !== S.access.join()) api.setAccess(list).then(ok => notify(ok ? "Accès enregistrés." : "Enregistrement impossible.", !ok)); }} style={{ ...field(), resize: "vertical", fontFamily: T.fontMono }} />
        <div style={{ fontSize: FZF.xs, color: T.ink500, marginTop: 4 }}>Une adresse @enogia.com par ligne. Ces personnes voient la page Achats / Appro et peuvent la modifier.</div>
      </div>
    </section>}

    {form && <FormDialog key={form.vals.id || form.title} {...form} onClose={() => setForm(null)} />}
    {cfg && ficheById[cfg] && (() => { const f = ficheById[cfg], mArt = artByRef[low(f.modele)], br = !f.config || f.config.statut !== "finalisee";
      return <ConfigDialog key={cfg} titre={"Configuration machine · " + f.machine} sousTitre={"Modèle " + (f.modele || "—") + (br ? ", brouillon : nomenclature pas encore créée." : ", nomenclature déjà créée.")}
        plan={c => planOf(mArt, c)} initial={(f.config && f.config.choix) || {}} brouillon={br} onClose={() => setCfg(null)}
        onDraft={async c => { const ok = await write("projets", f.id, { ...S.projets[f.id], config: { statut: "brouillon", choix: c } }); notify(ok ? "Brouillon enregistré." : "Enregistrement impossible, réessayez dans un instant.", !ok); if (ok) setCfg(null); }}
        onApply={async c => { const r = await appliquerConfig(f, c); if (typeof r === "string") return r; if (r) setCfg(null); }} />; })()}
    {imp && <ImportDialog {...IMPORTS[imp]} onClose={() => setImp(null)} />}
    {pick && calc[pick] && <PoPicker line={calc[pick]} po={poList.filter(p => !p.annule)} affects={affects} onUnassign={unassign} canEdit={canEdit} onPick={id => assignPo(pick, id)} onClear={() => assignPo(pick, "")} onClose={() => setPick(null)} />}
    {toast && <div role="status" style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 10020, background: toast.err ? T.red600 : T.ink900, color: T.card, padding: "8px 14px", borderRadius: 8, fontSize: FZF.sm, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}><NavIcon name={toast.err ? "warning" : "check"} size={15} />{toast.msg}</div>}
  </div>);
}
// ===== FIN PAGE =====
