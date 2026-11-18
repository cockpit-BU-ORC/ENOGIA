// v395 (« Oui, Storage ») : photos d'une machine aux étapes clés, dans son passeport. Étapes à gauche (photos attendues prises),
// à droite les photos attendues de l'étape (case « ＋ Prendre la photo » : appareil photo de la tablette ou fichier) et les photos libres.
// Une photo s'agrandit ; son auteur ou un admin la supprime (confirmation). Compression dans le navigateur avant l'envoi.
import React, { useRef, useState } from "react";
import { T, FZ, btn } from "../theme";
import { askConfirm } from "../confirm";
import { AF } from "../autoFocusOk";
import { PHOTO_STEPS, photoProgress, photosOfShot, freePhotos, newPhotoId, shrinkImage } from "../photos";

export function PhotosView({ pj, list, api, who, canEdit }) {
  const [step, setStep] = useState(() => (PHOTO_STEPS.find(s => photoProgress(list, s.id).done < photoProgress(list, s.id).expected) || PHOTO_STEPS[0]).id);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState(""), [big, setBig] = useState(null);
  const fileRef = useRef(null), target = useRef(null);
  const S = PHOTO_STEPS.find(s => s.id === step);
  const pick = shot => { target.current = shot; if (fileRef.current) fileRef.current.click(); };
  const onFile = async e => {
    const files = [...(e.target.files || [])]; e.target.value = ""; if (!files.length) return;
    setMsg("");
    for (const f of files) {
      setBusy(target.current || "libre");
      try {
        const full = await shrinkImage(f, 1600, 0.82), thumb = await shrinkImage(f, 360, 0.7);
        const ok = await api.uploadPhoto(pj, full, thumb, { id: newPhotoId(), step, shot: target.current || "", note: "" });
        if (!ok) { setMsg("La photo n'a pas été enregistrée"); break; }
      } catch (x) { setMsg("Photo impossible : " + (x && x.message)); break; }
    }
    setBusy("");
  };
  const del = async p => { if (!(await askConfirm({ title: "Supprimer cette photo ?", message: (p.shot || "Photo") + " · " + (p.by || "") + ". Elle est retirée du passeport et du RAI.", confirmLabel: "Supprimer", danger: true }))) return; setBig(null); await api.deletePhoto(pj, p); };
  const tile = p => <button key={p.id} type="button" onClick={() => setBig(p)} aria-label={"Agrandir : " + (p.shot || "photo") + ", " + (p.by || "")} style={{ all: "unset", cursor: "zoom-in", display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid " + T.line, background: T.surfaceAlt }}>
    <img src={p.turl || p.url} alt={p.shot || "Photo"} loading="lazy" style={{ display: "block", width: "100%", height: 120, objectFit: "cover" }} />
    <span style={{ display: "block", padding: "4px 8px", fontSize: 11, color: T.ink500 }}>{(p.at || "").slice(8, 10) + "/" + (p.at || "").slice(5, 7)} · {p.by}</span></button>;
  const empty = shot => <button type="button" onClick={() => pick(shot)} disabled={!!busy} style={{ all: "unset", cursor: busy ? "wait" : "pointer", boxSizing: "border-box", height: 146, borderRadius: 8, border: "1.5px dashed " + T.fieldLine, display: "grid", placeItems: "center", textAlign: "center", color: T.ink700, fontSize: 13, padding: 8 }}>
    {busy === shot ? "Envoi…" : <span><span aria-hidden="true" style={{ fontSize: 20, display: "block" }}>＋</span>Prendre la photo</span>}</button>;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 220px) minmax(0, 1fr)", gap: 14 }} className="enogia-photos">
    <nav aria-label="Étapes photo" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {PHOTO_STEPS.map(s => { const pr = photoProgress(list, s.id), on = s.id === step, full = pr.expected && pr.done >= pr.expected;
        return <button key={s.id} type="button" onClick={() => setStep(s.id)} aria-current={on ? "step" : undefined} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, minHeight: 40, background: on ? T.surfaceAlt : "transparent", fontSize: 13, fontWeight: on ? 600 : 500, color: T.ink900 }}>
          <span>{s.label}</span><span style={{ fontSize: 12, fontWeight: 500, color: full ? T.emerald600 : T.ink500, fontVariantNumeric: "tabular-nums" }}>{pr.expected ? (full ? "✓ " : "") + pr.done + " / " + pr.expected : pr.total}</span></button>; })}
    </nav>
    <div style={{ minWidth: 0 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple aria-label="Photo à envoyer" style={{ display: "none" }} onChange={onFile} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 600, color: T.ink900 }}>{S.label}</h3>
        <span style={{ fontSize: 12, color: T.ink500 }}>{S.shots.length ? "photos attendues à cette étape" : "photos libres"}</span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => pick("")} disabled={!!busy} style={btn("sec", "sm")}>{busy === "libre" ? "Envoi…" : "＋ Autre photo"}</button>
      </div>
      {msg && <div role="status" style={{ color: T.red600, fontSize: 13, marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        {S.shots.map(sh => { const L = photosOfShot(list, step, sh);
          return <figure key={sh} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {L.length ? <>{tile(L[0])}{L.length > 1 && <span style={{ fontSize: 11, color: T.ink500 }}>+ {L.length - 1} autre{L.length > 2 ? "s" : ""}</span>}</> : empty(sh)}
            <figcaption style={{ fontSize: 13, fontWeight: 500, color: T.ink900 }}>{sh}{L.length > 0 && <button type="button" onClick={() => pick(sh)} disabled={!!busy} style={{ ...btn("ghost", "sm"), minHeight: 24, marginLeft: 6 }}>＋</button>}</figcaption>
          </figure>; })}
        {freePhotos(list, step).map(p => <figure key={p.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>{tile(p)}<figcaption style={{ fontSize: 13, color: T.ink700 }}>{p.shot || "Photo libre"}</figcaption></figure>)}
      </div>
      {!S.shots.length && !freePhotos(list, step).length && <p style={{ color: T.ink500, fontSize: FZ.sm }}>Aucune photo pour l'instant.</p>}
    </div>
    {big && <div role="dialog" aria-modal="true" aria-label={"Photo : " + (big.shot || "photo")} onMouseDown={e => { if (e.target === e.currentTarget) setBig(null); }} onKeyDown={e => { if (e.key === "Escape") setBig(null); }}
      style={{ position: "fixed", inset: 0, zIndex: 10030, background: "rgba(10,14,22,.78)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ background: T.card, borderRadius: 12, padding: 10, maxWidth: "min(96vw, 1200px)", maxHeight: "94dvh", display: "flex", flexDirection: "column", gap: 8 }}>
        <img src={big.url} alt={big.shot || "Photo"} style={{ maxWidth: "100%", maxHeight: "80dvh", objectFit: "contain", borderRadius: 8 }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: T.ink700, flexWrap: "wrap" }}>
          <b style={{ color: T.ink900 }}>{big.shot || "Photo"}</b><span>{(big.at || "").slice(0, 10).split("-").reverse().join("/")} · {big.by}</span><span style={{ flex: 1 }} />
          <a href={big.url} target="_blank" rel="noopener noreferrer" style={{ ...btn("ghost", "sm"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Ouvrir l'original</a>
          {(canEdit || big.by === who) && <button type="button" onClick={() => del(big)} style={btn("dan", "sm")}>Supprimer</button>}
          <button type="button" autoFocus={AF} onClick={() => setBig(null)} style={btn("sec", "sm")}>Fermer</button>
        </div>
      </div>
    </div>}
  </div>;
}
