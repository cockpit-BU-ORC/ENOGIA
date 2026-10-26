// v146.20 — vrai si l'écran est celui d'un téléphone (≤ 700 px, même seuil que le CSS « .enogia-… »).
import { useEffect, useState } from "react";
export const PHONE_MQ = "(max-width: 700px)";
export const isPhone = () => { try { return !!(window.matchMedia && window.matchMedia(PHONE_MQ).matches); } catch (e) { return false; } };
export function useIsPhone() {
  const [v, setV] = useState(isPhone);
  useEffect(() => {
    let mq; try { mq = window.matchMedia(PHONE_MQ); } catch (e) { return undefined; }
    const f = () => setV(mq.matches); f();
    if (mq.addEventListener) mq.addEventListener("change", f); else if (mq.addListener) mq.addListener(f);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", f); else if (mq.removeListener) mq.removeListener(f); };
  }, []);
  return v;
}
