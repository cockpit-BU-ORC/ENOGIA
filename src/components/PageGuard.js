// v228 (demandé : « faire attention que son dossier ne casse pas tous les autres onglets ») : une erreur dans une page
// (ex. Production turbines, modifiée par le Claude de Jérémie) s'affiche dans cette page seulement ; le reste du site continue.
import React from "react";
import { T, FZF } from "../theme";

export class PageGuard extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Erreur dans la page " + (this.props.name || "") + " :", err, info && info.componentStack); }
  render() {
    if (!this.state.err) return this.props.children;
    return (<div role="alert" style={{ border: "1px solid " + T.line, borderLeft: "4px solid " + T.red500, borderRadius: 10, background: T.card, padding: "14px 16px", fontFamily: T.font, color: T.ink900, maxWidth: 720 }}>
      <div style={{ fontWeight: 700, fontSize: FZF.md, marginBottom: 4 }}>La page « {this.props.name} » a rencontré une erreur</div>
      <div style={{ fontSize: FZF.sm, color: T.ink700, marginBottom: 10 }}>Les autres pages du site ne sont pas touchées. Signalez-le à Gabriel avec le message ci-dessous.</div>
      <code style={{ display: "block", fontSize: 12, color: T.ink500, whiteSpace: "pre-wrap", marginBottom: 10 }}>{String((this.state.err && this.state.err.message) || this.state.err)}</code>
      <button type="button" onClick={() => this.setState({ err: null })} style={{ border: "1px solid " + T.line, background: T.card, color: T.ink700, borderRadius: 6, padding: "4px 12px", minHeight: 28, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Réessayer</button>
    </div>);
  }
}
