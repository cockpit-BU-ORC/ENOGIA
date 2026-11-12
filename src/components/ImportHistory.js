// V145 — Réglages › Imports (super admin) : les 14 dernières copies automatiques du planning, avec « Restaurer ».
import React, { useState, useEffect, useCallback } from "react";
import { T, FZ } from "../theme";
import { CARD } from "./ManagerParts";
import { EmptyState, tableTh, tableTd } from "./SharedUI";
import { loadBackupIndex, restoreBackup, BACKUPS_KEPT } from "../importBackups";
import { askConfirm } from "../confirm";

const fmtAt = iso => { try { return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso; } };
const thS = () => ({ ...tableTh(), padding: "8px 12px" }); // v313 : tableau commun (plus de majuscules)
const tdS = () => ({ ...tableTd(), padding: "8px 12px", height: 40 });

export function ImportHistory({ authorName }) {
  const [entries, setEntries] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [done, setDone] = useState("");
  const load = useCallback(async () => {
    setErr("");
    try { setEntries(await loadBackupIndex()); } catch (e) { setEntries([]); setErr("Lecture impossible : " + e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const restore = async en => {
    const lbl = (en.lastImport || "planning sans date");
    if (!(await askConfirm({ title: "Remettre le planning du " + lbl + " ?", message: en.count + " unités. Le planning actuel est d'abord copié ici : vous pourrez le restaurer ensuite.\nLes saisies faites sur le site (états, avancement, commentaires…) ne sont pas touchées.", confirmLabel: "Remettre ce planning" }))) return;
    setBusyId(en.id); setErr(""); setDone("");
    try {
      const r = await restoreBackup(en.id, { by: authorName || "" });
      setDone("Planning du " + (r.lastImport || "—") + " rétabli (" + r.count + " unités). L'affichage se met à jour pour tout le monde.");
      await load();
    } catch (e) { setErr("Restauration impossible : " + e.message); }
    setBusyId("");
  };

  return (<div style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
    <div>
      <div style={{ fontSize: FZ.md, fontWeight: 700, color: T.ink900 }}>Historique des imports</div>
      <div style={{ fontSize: FZ.sm, color: T.ink500, marginTop: 2, maxWidth: 760 }}>
        Avant chaque import, l'ancien planning est copié automatiquement (les {BACKUPS_KEPT} dernières copies sont gardées). « Restaurer » remet le planning de la ligne choisie ; le planning actuel est lui aussi copié avant, donc la restauration se défait. Les saisies faites sur le site ne sont jamais touchées.
      </div>
    </div>
    {done && <div role="status" style={{ padding: "8px 12px", borderRadius: 8, background: T.emerald100, color: T.emerald600, fontSize: FZ.sm, fontWeight: 600 }}>{done}</div>}
    {err && <div role="alert" style={{ padding: "8px 12px", borderRadius: 8, background: T.red100, color: T.red600, fontSize: FZ.sm, fontWeight: 600 }}>{err}</div>}
    {entries === null ? <div style={{ fontSize: FZ.sm, color: T.ink500 }}>Chargement…</div>
      : entries.length === 0 ? <EmptyState compact icon="inbox" title="Aucune copie pour l'instant" hint="La première copie sera créée automatiquement au prochain import."/>
      : (<div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr style={{ borderBottom: "1px solid " + T.line }}>
            <th style={thS()}>Planning copié</th><th style={thS()}>Unités</th><th style={thS()}>Copié le</th><th style={thS()}>Cause</th><th style={thS()}>Par</th><th style={thS()}></th>
          </tr></thead>
          <tbody>{entries.map(en => (
            <tr key={en.id} style={{ borderBottom: "1px solid " + T.line }}>
              <td style={{ ...tdS(), fontWeight: 600, color: T.ink900 }}>{en.lastImport || "—"}</td>
              <td style={tdS()}>{en.count}</td>
              <td style={tdS()}>{fmtAt(en.at)}</td>
              <td style={tdS()}>{en.reason === "avant restauration" ? "Avant une restauration" : "Avant un import"}</td>
              <td style={tdS()}>{en.by || "—"}</td>
              <td style={{ ...tdS(), textAlign: "right" }}>
                <button onClick={() => restore(en)} disabled={!!busyId} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontWeight: 600, cursor: busyId ? "default" : "pointer", opacity: busyId && busyId !== en.id ? .5 : 1 }}>
                  {busyId === en.id ? "Restauration…" : "Restaurer"}
                </button>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>)}
  </div>);
}
