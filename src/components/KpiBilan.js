// v274 (demandé : « la liste des accomplissements du mois dernier et du mois d'avant, et les objectifs du mois en cours et du mois
// suivant ») : KPI › Bilan mensuel — quatre colonnes chronologiques (M-2, M-1 : réalisé ; M : en cours ; M+1 : objectifs).
// Chaque colonne : chiffres (faits, en retard, à venir), jalons du mois par type (départs, fins de production, tests, arrivées) avec
// drapeau, client, date, écart à l'initial ; et une note libre « Faits marquants » / « Objectifs » (planning/profiles.monthNotes[mois],
// propriétaire). Les données viennent du planning publié : rien à saisir pour les listes.
import React, { useMemo, useState } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag } from "../pjMeta";
import { monthReview, monthKey, addMonths, monthLabel } from "../monthReview";

const fd = s => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "—");
const ST = { done: ["fait", "emerald"], late: ["en retard", "red"], todo: ["prévu", "ink"] };
function Note({ value, onSave, placeholder }) {
  const [v, setV] = useState(value || ""), [state, setState] = useState("");
  React.useEffect(() => { setV(value || ""); }, [value]);
  const save = async () => { if ((v || "") === (value || "")) return; setState("…"); const ok = await onSave(v.trim()); setState(ok === false ? "échec" : "✓ Enregistré"); setTimeout(() => setState(""), 1600); };
  return (<div>
    <textarea value={v} onChange={e => setV(e.target.value)} onBlur={save} placeholder={placeholder} rows={3} disabled={!onSave} aria-label={placeholder}
      style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, padding: "7px 9px", fontFamily: T.font, fontSize: 13, lineHeight: 1.45 }} />
    {state && <div role="status" style={{ fontSize: 12, fontWeight: 600, color: state === "échec" ? T.red600 : T.emerald600 }}>{state}</div>}
  </div>);
}
export function KpiBilan({ rows, initialByPJ, profiles, saveProfiles, onOpenPj, today = new Date() }) {
  const cur = monthKey(today);
  const months = [addMonths(cur, -2), addMonths(cur, -1), cur, addMonths(cur, 1)];
  const data = useMemo(() => months.map(k => monthReview(rows, initialByPJ, k, today)), [rows, initialByPJ, cur]); // eslint-disable-line react-hooks/exhaustive-deps
  const notes = (profiles && profiles.monthNotes) || {};
  const saveNote = saveProfiles ? (k, text) => saveProfiles({ ...(profiles || {}), monthNotes: { ...notes, [k]: { text, at: new Date().toISOString() } } }) : null;
  const tone = c => ({ emerald: [T.emerald600, T.emerald100], red: [T.red600, T.red100], ink: [T.ink700, T.surface] }[c]);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ fontSize: 13, color: T.ink500, maxWidth: 900 }}>Jalons du planning publié, mois par mois : ce qui a été fait les deux derniers mois, ce qui est prévu ce mois-ci et le suivant. « En retard » = date passée sans que l'état de la machine ait suivi. La note de chaque mois est libre (faits marquants, objectifs).</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, alignItems: "start" }}>
      {data.map((m, i) => { const past = i < 2, now = i === 2;
        return <section key={m.key} aria-label={monthLabel(m.key)} style={{ background: T.card, border: "1px solid " + (now ? T.ink900 : T.line), borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink500 }}>{past ? "Réalisé" : now ? "Mois en cours" : "Objectifs du mois suivant"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em", color: T.ink900 }}>{monthLabel(m.key)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[[m.done, "faits", "emerald"], [m.late, "en retard", "red"], [m.todo, "à venir", "ink"]].map(([v, l, c]) => <div key={l} style={{ background: T.surface, borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: v ? tone(c)[0] : T.ink300 }}>{v}</div><div style={{ fontSize: 12, color: T.ink500 }}>{l}</div></div>)}
          </div>
          {m.groups.filter(g => g.items.length).map(g => <div key={g.k}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: T.ink500, borderBottom: "1px solid " + T.line, paddingBottom: 3, marginBottom: 3 }}><span>{g.l}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{g.items.length}</span></div>
            {g.items.map(it => { const meta = getPjMeta(it.pj, it.r), [lab, c] = ST[it.st], [ink, bg] = tone(c);
              return <button key={g.k + it.pj} type="button" onClick={() => onOpenPj && onOpenPj(it.pj)} title={"Ouvrir la fiche de " + it.pj}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, minHeight: 30, padding: "2px 0", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: T.font, color: T.ink900 }}>
                <b style={{ fontFamily: T.fontMono, fontSize: 12.5, whiteSpace: "nowrap" }}>{it.pj}</b><CountryFlag pays={meta.pays} size={12} />
                <span style={{ fontSize: 12.5, color: T.ink700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nomProjet && meta.nomProjet !== "—" ? meta.nomProjet : ""}</span>
                <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: T.ink500 }}>{fd(it.date)}</span>
                {it.drift != null && it.drift !== 0 && <span title={"Initial : " + fd(it.ini)} style={{ fontSize: 11.5, fontWeight: 700, color: it.drift > 0 ? T.red600 : T.emerald600, fontVariantNumeric: "tabular-nums" }}>{it.drift > 0 ? "+" : ""}{it.drift} j</span>}
                <span style={{ fontSize: 11.5, fontWeight: 700, color: ink, background: bg, borderRadius: 999, padding: "0 7px", whiteSpace: "nowrap" }}>{lab}</span>
              </button>; })}
          </div>)}
          {!m.groups.some(g => g.items.length) && <div style={{ fontSize: 13, color: T.ink500 }}>Aucun jalon dans le planning ce mois-ci.</div>}
          <div><div style={{ fontSize: 12, fontWeight: 600, color: T.ink500, marginBottom: 4 }}>{past ? "Faits marquants" : "Objectifs"}</div>
            <Note value={(notes[m.key] || {}).text} onSave={saveNote ? t => saveNote(m.key, t) : null} placeholder={past ? "Ce qui a marqué le mois (livraisons, incidents, décisions)…" : "Objectifs du mois (départs à tenir, tests, décisions)…"} /></div>
        </section>; })}
    </div>
  </div>);
}
