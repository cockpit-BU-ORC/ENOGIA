// V145 — test de la sauvegarde / restauration du planning (Firestore simulé en mémoire).
const mockStore = {};
jest.mock("firebase/firestore", () => ({
  doc: (db, col, id) => ({ path: col + "/" + id }),
  getDoc: async ref => ({ exists: () => ref.path in mockStore, data: () => JSON.parse(JSON.stringify(mockStore[ref.path])) }),
  setDoc: async (ref, data) => { mockStore[ref.path] = JSON.parse(JSON.stringify(data)); },
  deleteDoc: async ref => { delete mockStore[ref.path]; },
}));
jest.mock("./firebase", () => ({ db: {} }));
const mockAppendChangeLog = jest.fn(async () => {});
jest.mock("./changeLog", () => ({ buildEntry: (a, b, m) => ({ ...m, n: b.length }), appendChangeLog: (...a) => mockAppendChangeLog(...a) }));

const { saveBackup, restoreBackup, loadBackupIndex, BACKUPS_KEPT } = require("./importBackups");
const rows = n => Array.from({ length: n }, (_, i) => ({ pj: "PJ" + i }));
const wait = () => new Promise(r => setTimeout(r, 3)); // identifiants d'horodatage distincts

beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; mockAppendChangeLog.mockClear(); });

test("rien à copier si le planning est vide", async () => {
  expect(await saveBackup(null)).toBeNull();
  expect(await saveBackup({ rows: [] })).toBeNull();
  expect(await loadBackupIndex()).toEqual([]);
});

test("copie + index, du plus récent au plus ancien", async () => {
  await saveBackup({ rows: rows(3), lastImport: "01/10/2026", indice: "A" }, { by: "Gab", reason: "import" }); await wait();
  await saveBackup({ rows: rows(4), lastImport: "02/10/2026", indice: "B" }, { by: "Gab", reason: "import" });
  const idx = await loadBackupIndex();
  expect(idx.map(e => e.count)).toEqual([4, 3]);
  expect(idx[0]).toMatchObject({ lastImport: "02/10/2026", indice: "B", by: "Gab", reason: "import" });
  expect(mockStore["planning/backup_" + idx[1].id].rows).toHaveLength(3);
});

test("seules les 14 dernières copies sont gardées (les plus anciennes sont supprimées)", async () => {
  for (let i = 1; i <= BACKUPS_KEPT + 3; i++) { await saveBackup({ rows: rows(i), lastImport: "j" + i }); await wait(); }
  const idx = await loadBackupIndex();
  expect(idx).toHaveLength(BACKUPS_KEPT);
  expect(idx[0].count).toBe(BACKUPS_KEPT + 3);
  expect(Object.keys(mockStore).filter(k => k.startsWith("planning/backup_"))).toHaveLength(BACKUPS_KEPT);
});

test("restaurer remet l'ancien planning, copie l'actuel avant, et reste réversible", async () => {
  mockStore["planning/current"] = { rows: rows(5), lastImport: "05/10/2026", indice: "C" };
  await saveBackup({ rows: rows(3), lastImport: "01/10/2026", indice: "A" }, { reason: "import" });
  const [target] = await loadBackupIndex();
  await wait();
  const r = await restoreBackup(target.id, { by: "Gab" });
  expect(r).toEqual({ count: 3, lastImport: "01/10/2026", indice: "A" });
  expect(mockStore["planning/current"]).toEqual({ rows: rows(3), lastImport: "01/10/2026", indice: "A" });
  const idx = await loadBackupIndex();
  expect(idx[0]).toMatchObject({ count: 5, reason: "avant restauration" });   // l'état d'avant la restauration est gardé
  expect(mockAppendChangeLog).toHaveBeenCalledTimes(1);
  await wait();
  await restoreBackup(idx[0].id, { by: "Gab" });                               // on peut revenir en arrière
  expect(mockStore["planning/current"].rows).toHaveLength(5);
});

test("copie inexistante ou vide : erreur claire, rien n'est écrasé", async () => {
  mockStore["planning/current"] = { rows: rows(2), lastImport: "x", indice: "" };
  await expect(restoreBackup("nope")).rejects.toThrow(/n'existe plus/);
  mockStore["planning/backup_vide"] = { rows: [] };
  await expect(restoreBackup("vide")).rejects.toThrow(/vide/);
  expect(mockStore["planning/current"].rows).toHaveLength(2);
});
