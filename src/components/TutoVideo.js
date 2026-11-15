import React, { useEffect, useState } from "react";
import { T, FZ } from "../theme";
import { NavIcon } from "./SharedUI";

// v242 (demandé : « intégrer cette vidéo à l'ouverture des prochaines connexions et la laisser disponible pendant 1 semaine ») :
// vidéo de présentation réglée par le propriétaire (planning/profiles.tutoVideo = { id, url, until, title }).
// Elle s'ouvre une fois par personne et par poste à la connexion (localStorage enogia_tuto_seen_<id>_<adresse>), jusqu'à la date
// « until » incluse ; un bouton « Vidéo » de la barre du haut permet de la revoir pendant ce temps.
// La vidéo n'est pas dans le dépôt (public) : lien Google Drive (partagé avec ENOGIA), YouTube non répertorié ou fichier .mp4.
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const tutoActive = (cfg, today = iso(new Date())) => !!(cfg && cfg.url && cfg.until && today <= cfg.until);
const seenKey = (cfg, email) => "enogia_tuto_seen_" + ((cfg && cfg.id) || "") + "_" + String(email || "").toLowerCase();
export const tutoSeen = (cfg, email) => { try { return !!localStorage.getItem(seenKey(cfg, email)); } catch (e) { return true; } };
export const markTutoSeen = (cfg, email) => { try { localStorage.setItem(seenKey(cfg, email), new Date().toISOString()); } catch (e) { /* stockage indisponible */ } };

// Lien saisi → { kind: "frame" | "video", src }
export function videoEmbed(url) {
  const u = String(url || "").trim(); if (!u) return null;
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  if (drive) return { kind: "frame", src: "https://drive.google.com/file/d/" + drive[1] + "/preview" };
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "frame", src: "https://www.youtube-nocookie.com/embed/" + yt[1] + "?autoplay=1&rel=0" };
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return { kind: "video", src: u };
  return { kind: "frame", src: u };
}
const fmt = s => { const d = new Date(String(s) + "T12:00:00"); return isNaN(d) ? s : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); };

// v244 (demandé : « je n'arrive pas à fermer le lecteur lorsque la vidéo se lance ») : fenêtre dimensionnée sur la hauteur de l'écran
// (le bouton Fermer reste toujours visible) ; clic en dehors ou Échap ferment aussi.
export function TutoVideoModal({ cfg, onClose }) {
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const v = videoEmbed(cfg && cfg.url); if (!v) return null;
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,16,30,.62)", display: "grid", placeItems: "center", padding: 16 }}>
    <div role="dialog" aria-modal="true" aria-labelledby="tuto-title" onClick={e => e.stopPropagation()} className="enogia-modal-pop" style={{ background: T.card, color: T.ink900, borderRadius: 18, border: "1px solid " + T.line, boxShadow: "0 30px 80px rgba(8,16,30,.38)", width: "min(1100px, 100%, calc((100vh - 150px) * 16 / 9))", maxHeight: "calc(100dvh - 32px)", overflow: "hidden", fontFamily: T.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid " + T.line }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="tuto-title" style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.lg }}>{(cfg && cfg.title) || "Le tour du Cockpit en vidéo"}</div>
          <div style={{ fontSize: FZ.xs, color: T.ink500 }}>À revoir jusqu'au {fmt(cfg.until)} depuis la cloche en haut à droite.</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la vidéo" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid " + T.line, background: T.card, color: T.ink900, borderRadius: 8, height: 36, padding: "0 12px", cursor: "pointer", fontSize: FZ.sm, fontWeight: 600, fontFamily: T.font, flexShrink: 0 }}><NavIcon name="close" size={14} />Fermer</button>
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
        {v.kind === "video"
          ? <video src={v.src} controls autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          : <iframe src={v.src} title="Vidéo de présentation du Cockpit" allow="autoplay; fullscreen; encrypted-media" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />}
      </div>
    </div>
  </div>);
}

// Bouton « Vidéo » (plus affiché dans la barre depuis la v243 : la vidéo est dans la cloche)
export function TutoVideoButton({ onOpen }) {
  return <button type="button" onClick={onOpen} title="Revoir la vidéo de présentation" aria-label="Revoir la vidéo de présentation" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: "1px solid " + T.line, borderRadius: 8, background: T.card, color: T.ink900, fontSize: FZ.xs, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}><NavIcon name="play" size={14} />Vidéo</button>;
}

// Manager › Réglages › Nouveautés (propriétaire) : lien, date de fin, titre ; « Publier » change l'identifiant → elle se rouvre pour tous
export function TutoVideoSettings({ profiles, saveProfiles }) {
  const cur = (profiles && profiles.tutoVideo) || {};
  const week = iso(new Date(Date.now() + 7 * 864e5));
  const [url, setUrl] = useState(cur.url || ""), [until, setUntil] = useState(cur.until || week), [title, setTitle] = useState(cur.title || "Le tour du Cockpit en vidéo"), [msg, setMsg] = useState("");
  const field = { padding: "6px 10px", borderRadius: 8, border: "1px solid " + T.line, background: T.card, color: T.ink900, fontSize: FZ.sm, fontFamily: T.font, minHeight: 32, boxSizing: "border-box" };
  const save = async fresh => {
    if (!videoEmbed(url)) { setMsg("Collez d'abord le lien de la vidéo."); return; }
    const next = { ...(profiles || {}), tutoVideo: { id: fresh || !cur.id ? "v" + Date.now().toString(36) : cur.id, url: url.trim(), until, title: title.trim() } };
    const ok = await saveProfiles(next); setMsg(ok === false ? "L'enregistrement a échoué." : fresh ? "Publiée : elle s'ouvrira à la prochaine connexion de chacun, jusqu'au " + fmt(until) + "." : "Enregistré.");
  };
  const stop = async () => { const next = { ...(profiles || {}) }; delete next.tutoVideo; const ok = await saveProfiles(next); setMsg(ok === false ? "L'enregistrement a échoué." : "Vidéo retirée."); setUrl(""); };
  const on = tutoActive(cur);
  return (<div style={{ background: T.card, borderRadius: 12, padding: 16, border: "1px solid " + T.line, marginBottom: 12 }}>
    <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: FZ.md, color: T.ink900, marginBottom: 4 }}>Vidéo de présentation</div>
    <div style={{ fontSize: FZ.sm, color: T.ink500, lineHeight: 1.5, marginBottom: 12 }}>Proposée une seule fois à chaque personne à sa prochaine connexion, puis disponible dans la cloche (sans compter comme une notification) jusqu'à la date de fin. Lien Google Drive (partagé avec ENOGIA), YouTube non répertorié ou fichier .mp4 : la vidéo contient de vraies données, elle ne doit pas être publique.{on ? " En ce moment : en ligne jusqu'au " + fmt(cur.until) + "." : ""}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 500, color: T.ink500, flex: "2 1 320px" }}>Lien de la vidéo<input value={url} onChange={e => { setUrl(e.target.value); setMsg(""); }} placeholder="https://drive.google.com/file/d/…/view" style={field} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 500, color: T.ink500, flex: "1 1 200px" }}>Titre<input value={title} onChange={e => setTitle(e.target.value)} style={field} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: FZ.xs, fontWeight: 500, color: T.ink500 }}>Disponible jusqu'au<input type="date" value={until} onChange={e => setUntil(e.target.value)} style={field} /></label>
      <button type="button" onClick={() => save(true)} style={{ ...field, background: T.ink900, color: T.card, border: "none", fontWeight: 600, cursor: "pointer" }}>Publier</button>
      {cur.id && <button type="button" onClick={() => save(false)} style={{ ...field, cursor: "pointer", fontWeight: 600 }}>Enregistrer sans rouvrir</button>}
      {cur.id && <button type="button" onClick={stop} style={{ ...field, cursor: "pointer", fontWeight: 600, color: T.red500 }}>Retirer</button>}
    </div>
    {msg && <div role="status" style={{ marginTop: 8, fontSize: FZ.xs, fontWeight: 500, color: T.ink700 }}>{msg}</div>}
  </div>);
}
