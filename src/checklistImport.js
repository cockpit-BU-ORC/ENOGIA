// v280 (demandé : « une page où je peux importer une checklist et ajouter ou modifier des lignes ; impossible sur les PJ ») :
// lecture d'une checklist pour le modèle de debug (Tests › Checklists).
//  · Word (.docx) au format du modèle « PI105-047-XX0003 » : chaque tableau ; une ligne dont les colonnes 2 et 3 sont « OK » / « NOK »
//    ouvre une section (titre = 1re cellule) ; les lignes suivantes sont les contrôles (1re cellule = contrôle, dernière = consigne).
//  · Texte collé depuis Excel / CSV : une ligne par contrôle « Section ; Contrôle ; Consigne ; Option » (tabulation, ; ou ,) ;
//    une ligne d'une seule cellule ouvre une section.
// Le résultat : [{ id, title, items: [{ id, label, hint, opt }] }]. Rien n'est enregistré ici.
const nid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = s => String(s || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
const isOpt = label => /\(option\)/i.test(label);

// XML de word/document.xml → sections
export function parseDocxXml(xml) {
  const sections = []; let cur = null;
  // sauts de ligne et tabulations Word gardés dans les consignes
  const rows = String(xml || "").replace(/<w:(?:br|cr)\s*\/>/g, "<w:t>\n</w:t>").replace(/<w:tab\s*\/>/g, "<w:t> </w:t>").match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
  rows.forEach(tr => {
    const cells = (tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).map(tc => clean((tc.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(p => (p.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, "")).join("")).join("\n")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")));
    if (cells.length < 2) return;
    const up = cells.map(c => c.toUpperCase());
    if (up[1] === "OK" && up[2] === "NOK") { cur = { id: nid("s"), title: cells[0] || "Section", items: [] }; sections.push(cur); return; }
    if (/^validation/i.test(cells[0]) || /^(fonction|signature)$/i.test(cells[1] || "")) { cur = null; return; } // bloc de signature en fin de document
    if (!cur || !cells[0]) return;
    const label = cells[0].split("\n")[0];
    cur.items.push({ id: nid("x"), label, hint: cells.length > 3 ? cells[cells.length - 1] : "", opt: isOpt(label) });
  });
  return sections.filter(s => s.items.length);
}
// Texte (Excel, CSV) → sections
export function parseChecklistText(text) {
  const sections = []; let cur = null;
  const sec = t => { let s = sections.find(x => x.title.toLowerCase() === t.toLowerCase()); if (!s) { s = { id: nid("s"), title: t, items: [] }; sections.push(s); } return s; };
  String(text || "").split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const c = line.split(sep).map(x => clean(x.replace(/^"|"$/g, "")));
    const filled = c.filter(Boolean);
    if (filled.length === 1 && c[0]) { cur = sec(c[0]); return; }
    if (/^section$/i.test(c[0]) && /contr/i.test(c[1] || "")) return; // ligne d'en-têtes
    if (c[0] && c[1]) { cur = sec(c[0]); cur.items.push({ id: nid("x"), label: c[1], hint: c[2] || "", opt: /^(o|oui|x|1|yes|option)$/i.test(c[3] || "") || isOpt(c[1]) }); return; }
    if (!c[0] && c[1] && cur) cur.items.push({ id: nid("x"), label: c[1], hint: c[2] || "", opt: /^(o|oui|x|1|yes|option)$/i.test(c[3] || "") || isOpt(c[1]) });
  });
  return sections.filter(s => s.items.length);
}
// Fichier .docx (ZIP) → texte de word/document.xml (décompression par le navigateur, sans bibliothèque)
export async function docxDocumentXml(buffer) {
  const u = new Uint8Array(buffer), dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let eocd = -1; for (let i = u.length - 22; i >= Math.max(0, u.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("ce fichier n'est pas un document Word (.docx)");
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    if (name === "word/document.xml") {
      const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), data = u.subarray(off + 30 + lnl + lel, off + 30 + lnl + lel + csize);
      if (method === 0) return new TextDecoder().decode(data);
      if (method !== 8 || typeof DecompressionStream === "undefined") throw new Error("décompression impossible dans ce navigateur");
      const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
      return new TextDecoder().decode(out);
    }
    p += 46 + nl + el + cl;
  }
  throw new Error("pas de contenu Word dans ce fichier");
}
