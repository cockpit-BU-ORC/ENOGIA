// v395 (maquette v393-rai-photos.html, « Oui, Storage ») : photos aux étapes clés d'une machine. Les fichiers vont dans Firebase Storage
// (machines/<préfixe><PJ>/<id>.jpg + vignette <id>_t.jpg) ; la liste est dans planning/machines.photos[PJ] (ajout / retrait atomiques).
// photos[PJ] = [{ id, step, shot, note, url, turl, path, tpath, w, h, at, by }]

export const PHOTO_STEPS = [
  { id: "recep", label: "Réception du skid", shots: ["Skid à l'arrivée", "Plaque du skid", "Points de levage"] },
  { id: "meca", label: "Montage mécanique", shots: ["Vue d'ensemble", "Turbine montée", "Flexible de lub", "Traits de serrage"] },
  { id: "elec", label: "Montage électrique", shots: ["Armoire ouverte", "Câbles de puissance", "Verrine et antenne 4G", "Plaque fluidique", "Schéma électrique rangé"] },
  { id: "tests", label: "Tests", shots: ["Machine au banc", "Écran de supervision", "Mesures"] },
  { id: "rai", label: "RAI", shots: ["Plaque CE", "Anneaux de levage", "Propreté du skid", "Vue d'ensemble finale"] },
  { id: "pack", label: "Packaging et chargement", shots: ["Machine emballée", "Chargement", "Calage"] },
  { id: "mes", label: "MES", shots: ["Machine installée sur site", "Raccordements"] },
  { id: "sav", label: "SAV", shots: [] },
];
export const STEP_LABEL = Object.fromEntries(PHOTO_STEPS.map(s => [s.id, s.label]));

// avancement d'une étape : photos attendues prises (une photo « libre » ne compte pas dans l'attendu)
export function photoProgress(list, step) {
  const s = PHOTO_STEPS.find(x => x.id === step) || { shots: [] }, L = (list || []).filter(p => p.step === step);
  const done = s.shots.filter(sh => L.some(p => p.shot === sh)).length;
  return { expected: s.shots.length, done, total: L.length };
}
export const photosOfShot = (list, step, shot) => (list || []).filter(p => p.step === step && (p.shot || "") === (shot || ""));
export const freePhotos = (list, step) => { const s = PHOTO_STEPS.find(x => x.id === step) || { shots: [] }; return (list || []).filter(p => p.step === step && !s.shots.includes(p.shot)); };
// adresse d'image sûre pour un document HTML (PDF du RAI) : Firebase Storage, ou adresse locale de la galerie
export const safeImgUrl = u => (/^https:\/\/firebasestorage\.googleapis\.com\//.test(String(u || "")) || /^blob:/.test(String(u || "")) ? String(u) : "");
export const newPhotoId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Compression dans le navigateur : JPEG, plus grand côté ≤ max px (photo 1 600, vignette 360)
export async function shrinkImage(file, max = 1600, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error("image illisible")); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", q));
    if (!blob) throw new Error("compression impossible");
    return { blob, w, h };
  } finally { URL.revokeObjectURL(url); }
}
