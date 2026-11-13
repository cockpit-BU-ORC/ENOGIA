import React, { useState } from "react";
import { T, FZF as FZ } from "../theme";
import { getPjMeta, Avatar, CountryFlag, today } from "../pjMeta";
import { itemsOf } from "../pjProgress";
import { EmptyState, ChipGroup, Chip } from "./SharedUI";
import { fmt } from "../parsers";
import { enteredOn, todayIso } from "./ManagerFiche";
import { showText } from "../confirm";

// ── Point hebdo (v134) ─────────────────────────────────────────────────────────────────────────────────────────
// Toutes les actions de la semaine et tous les plans de mitigation OUVERTS, PJ par PJ, sur un seul écran : on anime la réunion sans
// ouvrir chaque fiche. Les données sont celles des fiches (rien de nouveau côté stockage) ; cocher une ligne la clôture à la date du
// jour, exactement comme dans la fiche. L'ancienneté se calcule à partir de la date de saisie ; les lignes sans date (anciennes notes
// converties) n'ont pas d'ancienneté.
const KINDS = {
  actions: { label: "Action", plural: "Actions", field: "actions", atKey: "semAt", get color() { return T.accentInk; } }, // v290 : T.accent en texte = 3,2:1
  mitigations: { label: "Mitigation", plural: "Mitigations", field: "mitigations", atKey: "mitAt", get color() { return T.red500; } },
};
const ageOf = x => {
  if (!x || !x.createdAt || /^l\d+$/.test(x.id)) return null;
  const d = new Date(x.createdAt); if (isNaN(d)) return null;
  const a = new Date(today); a.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((a - d) / 86400000));
};
const ageTone = a => (a == null ? T.ink500 : a >= 30 ? T.red500 : a >= 14 ? T.amber600 : T.ink500);

const SORTS = [["age", "Plus ancien d'abord"], ["depart", "Départ le plus proche"], ["pj", "Ordre du planning"]];
const BTN = on => ({ border: "1px solid " + (on ? T.teal500 : T.line), background: on ? T.teal100 : T.card, color: on ? T.teal600 : T.ink700, borderRadius: 8, padding: "4px 12px", fontSize: FZ.xs, fontWeight: 600, cursor: "pointer", fontFamily: T.font, minHeight: 28 });

export function PointHebdo({ data, savePjMetaOverride, onOpenPj }) {
  const [kind, setKind] = useState("all");
  const [old7, setOld7] = useState(false);
  const [sort, setSort] = useState("age");
  const [q, setQ] = useState("");
  const [overlay, setOverlay] = useState({}); // {pj|champ: {items, base}} — affichage immédiat en attendant le retour de la base
  const [copied, setCopied] = useState(false);

  const itemsFor = (r, meta, k) => {
    const cur = itemsOf(meta, KINDS[k].field);
    const o = overlay[r.pj + "|" + k];
    return o && o.base === JSON.stringify(cur) ? o.items : cur;
  };
  const save = (r, meta, k, next) => {
    const cur = itemsOf(meta, KINDS[k].field);
    setOverlay(o => ({ ...o, [r.pj + "|" + k]: { items: next, base: JSON.stringify(cur) } }));
    savePjMetaOverride && savePjMetaOverride(r.pj, { [KINDS[k].field]: next, [KINDS[k].atKey]: new Date().toISOString() });
  };
  const toggle = (r, meta, k, id) => {
    const cur = itemsFor(r, meta, k);
    save(r, meta, k, cur.map(x => x.id === id ? (x.done ? { ...x, done: false, doneAt: null } : { ...x, done: true, doneAt: todayIso() }) : x));
  };

  const needle = q.trim().toLowerCase();
  const all = data.filter(r => r.etat !== "SLOT_LIBRE").map(r => {
    const meta = getPjMeta(r.pj, r);
    const open = [], closedWeek = [];
    Object.keys(KINDS).forEach(k => itemsFor(r, meta, k).forEach(x => {
      const it = { ...x, kind: k, age: ageOf(x) };
      if (!x.done) open.push(it);
      else if (x.doneAt && (new Date(today) - new Date(x.doneAt)) / 86400000 <= 7) closedWeek.push(it);
    }));
    return { r, meta, open, closedWeek };
  });
  const keep = it => (kind === "all" || it.kind === kind) && (!old7 || (it.age != null && it.age > 7));
  const groups = all.map(g => ({ ...g, open: g.open.filter(keep).sort((a, b) => (b.age == null ? -1 : b.age) - (a.age == null ? -1 : a.age)), closedWeek: g.closedWeek.filter(it => kind === "all" || it.kind === kind) }))
    .filter(g => g.open.length)
    .filter(g => !needle || g.r.pj.toLowerCase().includes(needle) || (g.meta.nomProjet || "").toLowerCase().includes(needle) || (g.meta.chefProjet || "").toLowerCase().includes(needle) || g.open.some(it => (it.text || "").toLowerCase().includes(needle)));
  const maxAge = g => g.open.reduce((m, it) => Math.max(m, it.age == null ? -1 : it.age), -1);
  const dep = g => g.r.depart ? new Date(g.r.depart).getTime() : 8.64e15;
  if (sort === "age") groups.sort((a, b) => maxAge(b) - maxAge(a) || dep(a) - dep(b));
  else if (sort === "depart") groups.sort((a, b) => dep(a) - dep(b));

  const flat = groups.flatMap(g => g.open);
  const nA = flat.filter(i => i.kind === "actions").length, nM = flat.length - nA;
  const nOld = flat.filter(i => i.age != null && i.age >= 14).length;
  const nClosed = all.reduce((n, g) => n + g.closedWeek.filter(it => kind === "all" || it.kind === kind).length, 0);

  const copy = async () => {
    const lines = ["Point hebdo — " + fmt(new Date(today)) + " — " + flat.length + " point" + (flat.length > 1 ? "s" : "") + " ouvert" + (flat.length > 1 ? "s" : "")];
    groups.forEach(g => {
      lines.push("", g.r.pj + (g.meta.nomProjet && g.meta.nomProjet !== "—" ? " · " + g.meta.nomProjet : "") + (g.meta.chefProjet && g.meta.chefProjet !== "—" ? " (" + g.meta.chefProjet + ")" : ""));
      g.open.forEach(it => { const e = enteredOn(it); lines.push("- [" + KINDS[it.kind].label + "] " + it.text + (e ? " (saisie le " + e.short + (it.age != null ? ", " + it.age + " j" : "") + ")" : "")); });
    });
    try { await navigator.clipboard.writeText(lines.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { showText({ title: "Copier le point hebdo", text: lines.join("\n") }); }
  };

  const chip = (label, val, tone) => (<div style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "8px 12px", minWidth: 120 }}>
    <div style={{ fontSize: FZ.xs, fontWeight: 600, color: T.ink500 }}>{label}</div>
    <div style={{ fontSize: FZ.lg, fontWeight: 600, letterSpacing: "-.02em", color: tone || T.ink900, lineHeight: "26px" }}>{val}</div>
  </div>);

  return (<div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: T.font }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
      {chip("Actions ouvertes", nA)}
      {chip("Mitigations ouvertes", nM)}
      {chip("Ouverts depuis 14 j ou plus", nOld, nOld > 0 ? T.amber600 : null)}
      {chip("PJ concernés", groups.length)}
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <ChipGroup label="Type" options={[["all", "Tout"], ["actions", "Actions"], ["mitigations", "Mitigations"]]} value={kind} onChange={setKind} />
      <Chip on={old7} onClick={() => setOld7(v => !v)}>{old7 ? "✓ " : ""}Plus de 7 jours seulement</Chip>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: FZ.xs, color: T.ink500 }}>Tri
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier le point hebdo" style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.xs, fontWeight: 600, fontFamily: T.font, minHeight: 28 }}>
          {SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select></label>
      <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un PJ, un projet, un mot…" aria-label="Rechercher dans le point hebdo" style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.xs, fontFamily: T.font, minHeight: 28, width: 240, boxSizing: "border-box" }} />
      <button onClick={copy} disabled={!flat.length} style={{ ...BTN(false), marginLeft: "auto", cursor: flat.length ? "pointer" : "default", opacity: flat.length ? 1 : .5 }} title="Copie la liste affichée en texte, pour un compte rendu ou un e-mail">{copied ? "✓ Copié" : "Copier le point"}</button>
    </div>

    {groups.length === 0 ? <div style={{ background: T.card, boxShadow: T.shadowCard, borderRadius: 12 }}>
      {old7 || kind !== "all" || needle ? <EmptyState icon="search" title="Aucun point ouvert avec ces filtres." /> : <EmptyState icon="check" tone="ok" title="Aucune action ni mitigation ouverte" hint="Tout est clôturé." />}
    </div> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,420px),1fr))", gap: 12, alignItems: "start" }}>
        {groups.map(g => {
          const { r, meta } = g;
          const dl = r.depart ? new Date(r.depart) : null;
          return (<section key={r.pj} aria-label={r.pj} style={{ background: T.surface, border: "1px solid " + T.line, borderRadius: 12, padding: "8px 12px 12px", minWidth: 0 }}>
            <button onClick={() => onOpenPj && onOpenPj(r.pj)} title="Ouvrir la fiche de ce projet" style={{ all: "unset", cursor: onOpenPj ? "pointer" : "default", display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box", marginBottom: 8 }}>
              <span aria-hidden="true" style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: T.accent, flexShrink: 0 }} />
              <span style={{ fontSize: FZ.md, fontWeight: 600, color: T.ink900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.pj}</span>
              {meta.pays && meta.pays !== "—" && <CountryFlag pays={meta.pays} size={13} />}
              <span style={{ fontSize: FZ.xs, color: T.ink500, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
              {meta.chefProjet && meta.chefProjet !== "—" && <span title={meta.chefProjet} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: FZ.xs, color: T.ink500 }}><Avatar name={meta.chefProjet} size={16} /></span>}
              <span style={{ fontSize: FZ.xs, color: T.ink500, whiteSpace: "nowrap" }}>{dl ? "départ " + fmt(dl) : ""}</span>
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {g.open.map(it => {
                const K = KINDS[it.kind], e = enteredOn(it);
                return (<div key={it.kind + it.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: T.card, borderRadius: 8, borderLeft: "3px solid " + K.color, padding: "6px 8px" }}>
                  <input type="checkbox" checked={false} onChange={() => toggle(r, meta, it.kind, it.id)} title="Clôturer (date du jour)" aria-label={"Clôturer : " + it.text} style={{ marginTop: 2, flexShrink: 0, width: 15, height: 15, cursor: "pointer", accentColor: T.teal500 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: FZ.sm, color: T.ink900, fontWeight: 600, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                    <span style={{ fontSize: FZ.xs, fontWeight: 600, color: K.color, marginRight: 6 }}>{K.label}</span>{it.text}
                  </span>
                  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, lineHeight: 1.25 }}>
                    <span style={{ fontSize: FZ.xs, fontWeight: 600, color: ageTone(it.age) }}>{it.age == null ? "—" : it.age === 0 ? "aujourd'hui" : it.age + " j"}</span>
                    {e && <i title={"Saisie le " + e.full} style={{ fontSize: FZ.xs, fontStyle: "italic", fontWeight: 400, color: T.ink500, whiteSpace: "nowrap" }}>{e.short}</i>}
                  </span>
                </div>);
              })}
            </div>
          </section>);
        })}
      </div>}

    {nClosed > 0 && <details style={{ background: T.card, border: "1px solid " + T.line, borderRadius: 12, padding: "8px 12px" }}>
      <summary style={{ cursor: "pointer", fontSize: FZ.sm, fontWeight: 600, color: T.ink700 }}>Clôturés ces 7 derniers jours ({nClosed})</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
        {all.flatMap(g => g.closedWeek.filter(it => kind === "all" || it.kind === kind).map(it => (
          <div key={g.r.pj + it.kind + it.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: FZ.xs, color: T.ink500, padding: "2px 4px" }}>
            <input type="checkbox" checked onChange={() => toggle(g.r, g.meta, it.kind, it.id)} title="Rouvrir" aria-label={"Rouvrir : " + it.text} style={{ width: 14, height: 14, cursor: "pointer", accentColor: T.teal500 }} />
            <b style={{ color: T.ink700, fontVariantNumeric: "tabular-nums" }}>{g.r.pj}</b>
            <span style={{ fontWeight: 600, color: KINDS[it.kind].color }}>{KINDS[it.kind].label}</span>
            <span style={{ flex: 1, minWidth: 0, textDecoration: "line-through", overflowWrap: "anywhere" }}>{it.text}</span>
            <span style={{ whiteSpace: "nowrap" }}>clôturée le {it.doneAt && fmt(new Date(it.doneAt))}</span>
          </div>)))}
      </div>
    </details>}
  </div>);
}
