import { ETAT_META, ALL_ETATS, ASSIGNABLE_ETATS, registerCustomEtats, etatColors, contrastRatio, isCustomEtat } from "./pjMeta";

describe("états personnalisés (v146.18)", () => {
  afterEach(() => registerCustomEtats([]));
  test("un état créé est ajouté partout, puis retiré quand on le supprime", () => {
    const n = ALL_ETATS.length;
    registerCustomEtats([{ id: "CUSTOM_ATTENTE", label: "En attente client", color: "#c79a2e" }]);
    expect(ETAT_META.CUSTOM_ATTENTE.label).toBe("En attente client");
    expect(ALL_ETATS).toContain("CUSTOM_ATTENTE"); expect(ASSIGNABLE_ETATS).toContain("CUSTOM_ATTENTE");
    expect(isCustomEtat("CUSTOM_ATTENTE")).toBe(true);
    registerCustomEtats([]);
    expect(ETAT_META.CUSTOM_ATTENTE).toBeUndefined(); expect(ALL_ETATS.length).toBe(n);
  });
  test("un état ne peut pas écraser un état existant", () => {
    registerCustomEtats([{ id: "SHIPPED", label: "Faux", color: "#ff0000" }]);
    expect(ETAT_META.SHIPPED.label).toBe("Expédiée");
  });
  test("le texte reste lisible (≥ 4,5:1) sur le fond, en clair comme en sombre, quelle que soit la couleur", () => {
    ["#ffff00", "#000000", "#ff0000", "#00ff88", "#2233ff", "#c79a2e", "#ffffff", "#808080"].forEach(c => {
      const k = etatColors(c);
      expect(contrastRatio(k.light.text, k.light.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(k.dark.text, k.dark.bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
  test("couleur invalide : gris par défaut, sans erreur", () => { expect(etatColors("rouge").light.bar).toBe("#6b7f99"); });
});
