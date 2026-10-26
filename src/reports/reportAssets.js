// Images du gabarit ENOGIA (public/report/*), converties en data-URI pour être incorporées au PowerPoint.
// Une image introuvable est simplement omise : le rapport reste lisible (fond uni).
const FILES = { coverBg: "cover-bg.jpg", banner: "banner.jpg", wave: "wave.png", logo: "logo.png", feather: "feather.png", aleno: "badge-aleno.png", bpi: "badge-bpi.png", coq: "badge-coq.png" };
const base = () => (process.env.PUBLIC_URL || "") + "/report/";

const toDataUri = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

export async function loadReportAssets() {
  const out = {};
  await Promise.all(Object.entries(FILES).map(async ([k, f]) => {
    try { const r = await fetch(base() + f); if (r.ok) out[k] = await toDataUri(await r.blob()); } catch (e) { /* image omise */ }
  }));
  return out;
}
