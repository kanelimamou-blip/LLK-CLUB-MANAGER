// Tests des règles communes sur l'émulateur Firestore : npm run test:regles
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, serverTimestamp, runTransaction, Timestamp } from "firebase/firestore";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8").replace(/request\.auth\.uid in \[[^\]]*\]/, "request.auth.uid in ['ADMIN1']");
// le modèle publié par l'admin (plateforme/modele), compilé comme dans l'appli
import vm from "vm";
const sandbox = {}; vm.runInNewContext(readFileSync(new URL("../docs/core/modele.js", import.meta.url), "utf8"), sandbox);
const json = (f) => JSON.parse(readFileSync(new URL("../docs/modele/" + f, import.meta.url), "utf8"));
const { erreurs, doc: modele } = sandbox.Modele.compiler(json("modules.json"), json("roles.json"));
if (erreurs.length) { console.error(erreurs); process.exit(1); }
const env = await initializeTestEnvironment({ projectId: "demo-regles", firestore: { rules, host: "127.0.0.1", port: 8080 } });
await env.clearFirestore();
let n = 0, bad = 0;
const t = async (label, p) => { n++; try { await p; console.log("ok  ", label); } catch (e) { bad++; console.log("FAIL", label, "-", e.message.split("\n")[0]); } };
const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const A = (uid) => ({ maj: serverTimestamp(), par: uid });
const C = "clubs/asd";

// Données de départ (sans règles)
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  await setDoc(doc(f, "plateforme/modele"), JSON.parse(JSON.stringify(modele)));
  for (const u of ["pres", "treso", "coach", "joueur", "parent", "medecin", "intrus", "secr", "sus"])
    await setDoc(doc(f, "users/" + u), { nom: u, email: "", tel: "", created: new Date(), lastSeen: new Date(), active: u !== "sus" });
  await setDoc(doc(f, C), { nom: "AS Dakar", active: true, modules: ["effectif", "sportif", "finances", "communication"] });
  await setDoc(doc(f, "clubs/eteint"), { nom: "Club suspendu", active: false, modules: ["effectif"] });
  const mb = (role, perimetre, extra = {}) => ({ nom: "x", tel: "", role, perimetre, personneId: "", enfants: [], actif: true, depuis: new Date(), ...extra });
  await setDoc(doc(f, C + "/membres/pres"), mb("president", ["*"]));
  await setDoc(doc(f, C + "/membres/treso"), mb("tresorier", ["*"]));
  await setDoc(doc(f, C + "/membres/secr"), mb("secretaire", ["foot"]));
  await setDoc(doc(f, C + "/membres/coach"), mb("entraineur", ["foot-u13"]));
  await setDoc(doc(f, C + "/membres/medecin"), mb("medecin", ["*"]));
  await setDoc(doc(f, C + "/membres/joueur"), mb("membre", [], { personneId: "p1" }));
  await setDoc(doc(f, C + "/membres/parent"), mb("membre", [], { enfants: ["p1"] }));
  await setDoc(doc(f, C + "/membres/sus"), mb("entraineur", ["*"]));
  await setDoc(doc(f, C + "/personnes/p1"), { prenom: "Moussa", nom: "Diop", type: "joueur", sectionId: "foot", categorieId: "foot-u13" });
  await setDoc(doc(f, C + "/personnes/p2"), { prenom: "Awa", nom: "Ndiaye", type: "joueur", sectionId: "basket", categorieId: "basket-u17" });
  await setDoc(doc(f, C + "/convocations/k1"), { evenementId: "e1", personneId: "p1", reponse: "en attente", sectionId: "foot", categorieId: "foot-u13" });
  await setDoc(doc(f, C + "/blessures/b1"), { personneId: "p2", type: "entorse", sectionId: "basket", categorieId: "basket-u17" });
  await setDoc(doc(f, C + "/actualites/a1"), { titre: "Victoire", public: true });
  await setDoc(doc(f, C + "/actualites/a2"), { titre: "Interne", public: false });
  await setDoc(doc(f, "clubs/eteint/equipes/x"), { nom: "Y" });
});

const pres = db("pres"), treso = db("treso"), coach = db("coach"), joueur = db("joueur"), parent = db("parent"),
  medecin = db("medecin"), intrus = db("intrus"), secr = db("secr"), sus = db("sus"), anon = db(null), adm = db("ADMIN1");

/* ----- Vitrine publique ----- */
await t("visiteur lit la fiche du club", assertSucceeds(getDoc(doc(anon, C))));
await t("visiteur lit une actualité publique", assertSucceeds(getDoc(doc(anon, C + "/actualites/a1"))));
await t("visiteur ne lit pas une actualité interne", assertFails(getDoc(doc(anon, C + "/actualites/a2"))));
await t("visiteur liste les actualités publiques (requête filtrée)", assertSucceeds(getDocs(query(collection(anon, C + "/actualites"), where("public", "==", true)))));
await t("membre lit une actualité interne", assertSucceeds(getDoc(doc(joueur, C + "/actualites/a2"))));
await t("visiteur ne lit pas les fiches joueurs", assertFails(getDoc(doc(anon, C + "/personnes/p1"))));
await t("club suspendu : vitrine fermée", assertFails(getDoc(doc(anon, "clubs/eteint/equipes/x"))));
await t("collection inconnue refusée", assertFails(setDoc(doc(pres, C + "/nimportequoi/x"), { a: 1, ...A("pres") })));

/* ----- Périmètre : un entraîneur U13 ne voit que les U13 ----- */
await t("entraîneur U13 lit un joueur U13", assertSucceeds(getDoc(doc(coach, C + "/personnes/p1"))));
await t("entraîneur U13 ne lit pas un joueur basket", assertFails(getDoc(doc(coach, C + "/personnes/p2"))));
await t("entraîneur U13 liste ses joueurs (filtre catégorie)", assertSucceeds(getDocs(query(collection(coach, C + "/personnes"), where("categorieId", "==", "foot-u13")))));
await t("entraîneur U13 ne liste pas tout l'effectif", assertFails(getDocs(collection(coach, C + "/personnes"))));
await t("entraîneur crée une séance U13", assertSucceeds(setDoc(doc(coach, C + "/evenements/e1"), { type: "entraînement", debut: "2026-11-03T18:00", sectionId: "foot", categorieId: "foot-u13", ...A("coach") })));
await t("entraîneur ne crée pas une séance basket", assertFails(setDoc(doc(coach, C + "/evenements/e2"), { type: "entraînement", debut: "x", sectionId: "basket", categorieId: "basket-u17", ...A("coach") })));
await t("entraîneur ne déplace pas un joueur hors de son périmètre", assertFails(updateDoc(doc(coach, C + "/personnes/p1"), { categorieId: "basket-u17", ...A("coach") })));
await t("champ hors modèle refusé", assertFails(setDoc(doc(coach, C + "/evenements/e3"), { type: "match", debut: "x", pirate: 1, sectionId: "foot", categorieId: "foot-u13", ...A("coach") })));
await t("écriture sans traçabilité refusée", assertFails(setDoc(doc(coach, C + "/evenements/e4"), { type: "match", debut: "x", sectionId: "foot", categorieId: "foot-u13" })));
await t("secrétaire section foot lit un joueur U13 (périmètre section)", assertSucceeds(getDoc(doc(secr, C + "/personnes/p1"))));
await t("président lit tout", assertSucceeds(getDocs(collection(pres, C + "/personnes"))));

/* ----- Droits par rôle ----- */
await t("trésorier ne touche pas au planning", assertFails(setDoc(doc(treso, C + "/evenements/e5"), { type: "match", debut: "x", ...A("treso") })));
await t("entraîneur ne touche pas aux finances", assertFails(setDoc(doc(coach, C + "/depenses/d1"), { date: "2026-11-01", libelle: "Bus", montant: 20000, sectionId: "foot", categorieId: "foot-u13", ...A("coach") })));
await t("trésorier enregistre une dépense", assertSucceeds(setDoc(doc(treso, C + "/depenses/d1"), { date: "2026-11-01", libelle: "Bus", montant: 20000, ...A("treso") })));
await t("dépense jamais effacée (même par le président)", assertFails(deleteDoc(doc(pres, C + "/depenses/d1"))));
await t("staff médical lit une blessure", assertSucceeds(getDoc(doc(medecin, C + "/blessures/b1"))));
await t("entraîneur ne lit pas le suivi médical", assertFails(getDoc(doc(coach, C + "/blessures/b1"))));
await t("module non souscrit fermé (installations)", assertFails(setDoc(doc(pres, C + "/terrains/t1"), { nom: "Stade", ...A("pres") })));
await t("compte suspendu par l'admin : plus aucun droit", assertFails(getDoc(doc(sus, C + "/personnes/p1"))));

/* ----- Joueur et parent : ce qui les concerne ----- */
await t("joueur lit sa fiche", assertSucceeds(getDoc(doc(joueur, C + "/personnes/p1"))));
await t("joueur ne lit pas la fiche d'un autre", assertFails(getDoc(doc(joueur, C + "/personnes/p2"))));
await t("parent lit la fiche de son enfant", assertSucceeds(getDoc(doc(parent, C + "/personnes/p1"))));
await t("joueur change son téléphone", assertSucceeds(updateDoc(doc(joueur, C + "/personnes/p1"), { tel: "77 1", ...A("joueur") })));
await t("joueur ne change pas son poste", assertFails(updateDoc(doc(joueur, C + "/personnes/p1"), { poste: "Attaquant", ...A("joueur") })));
await t("joueur lit sa convocation", assertSucceeds(getDoc(doc(joueur, C + "/convocations/k1"))));
await t("joueur répond à sa convocation", assertSucceeds(updateDoc(doc(joueur, C + "/convocations/k1"), { reponse: "présent", ...A("joueur") })));
await t("joueur ne se met pas titulaire", assertFails(updateDoc(doc(joueur, C + "/convocations/k1"), { role: "titulaire", ...A("joueur") })));
await t("parent répond pour son enfant", assertSucceeds(updateDoc(doc(parent, C + "/convocations/k1"), { reponse: "absent", commentaire: "malade", ...A("parent") })));
await t("intrus (pas membre) ne lit rien d'interne", assertFails(getDoc(doc(intrus, C + "/convocations/k1"))));

/* ----- Pointage par code ----- */
const dans1h = Timestamp.fromMillis(Date.now() + 3600e3);
await t("joueur ne lit pas le code du jour", assertFails(getDoc(doc(joueur, C + "/codes/e1"))));
await t("entraîneur crée le code de la séance", assertSucceeds(setDoc(doc(coach, C + "/codes/e1"), { code: "4821", expire: dans1h, sectionId: "foot", categorieId: "foot-u13", ...A("coach") })));
const pt = (code, extra = {}) => ({ evenementId: "e1", personneId: "p1", code, at: serverTimestamp(), uid: "joueur", sectionId: "foot", categorieId: "foot-u13", ...extra });
await t("joueur pointe avec un mauvais code : refusé", assertFails(setDoc(doc(joueur, C + "/pointages/e1_p1"), pt("0000"))));
await t("joueur ne pointe pas pour un autre", assertFails(setDoc(doc(joueur, C + "/pointages/e1_p2"), pt("4821", { personneId: "p2" }))));
await t("joueur pointe avec le bon code", assertSucceeds(setDoc(doc(joueur, C + "/pointages/e1_p1"), pt("4821"))));
await t("pointage jamais modifié", assertFails(updateDoc(doc(joueur, C + "/pointages/e1_p1"), { code: "4821" })));
await t("entraîneur voit le pointage", assertSucceeds(getDoc(doc(coach, C + "/pointages/e1_p1"))));
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), C + "/codes/e9"), { code: "1111", expire: Timestamp.fromMillis(Date.now() - 1000), sectionId: "foot", categorieId: "foot-u13" }));
await t("code expiré : refusé", assertFails(setDoc(doc(joueur, C + "/pointages/e9_p1"), pt("1111", { evenementId: "e9" }))));
await t("entraîneur pointe à la main", assertSucceeds(setDoc(doc(coach, C + "/pointages/e9_p1"), { evenementId: "e9", personneId: "p1", at: serverTimestamp(), uid: "coach", sectionId: "foot", categorieId: "foot-u13", manuel: true })));

/* ----- Encaissements numérotés ----- */
const encaisser = (f, uid, extra = {}) => runTransaction(f, async (tx) => {
  const ref = doc(f, C + "/meta/compteurs"); const s = await tx.get(ref); const n = (s.exists() ? s.data().recu : 0) + 1;
  tx.set(ref, { recu: n });
  tx.set(doc(f, C + "/paiements/" + n), { numero: n, personneId: "p1", montant: 15000, mode: "wave", motif: "Cotisation", sectionId: "foot", categorieId: "foot-u13", date: serverTimestamp(), par: uid, ...extra });
});
await t("trésorier encaisse (reçu n°1)", assertSucceeds(encaisser(treso, "treso")));
await t("trésorier encaisse (reçu n°2)", assertSucceeds(encaisser(treso, "treso")));
await t("reçu jamais modifié", assertFails(updateDoc(doc(treso, C + "/paiements/1"), { montant: 1 })));
await t("reçu jamais effacé", assertFails(deleteDoc(doc(pres, C + "/paiements/1"))));
await t("numéro de reçu sauté : refusé", assertFails(setDoc(doc(treso, C + "/paiements/9"), { numero: 9, montant: 1, mode: "wave", date: serverTimestamp(), par: "treso" })));
await t("entraîneur n'encaisse pas", assertFails(encaisser(coach, "coach")));
await t("parent voit les reçus de son enfant", assertSucceeds(getDocs(query(collection(parent, C + "/paiements"), where("personneId", "==", "p1")))));
await t("joueur ne voit pas tous les reçus", assertFails(getDocs(collection(joueur, C + "/paiements"))));

/* ----- Membres, rôles, périmètres ----- */
const demande = { nom: "Intrus", tel: "", role: "membre", perimetre: [], personneId: "", enfants: [], actif: false, depuis: serverTimestamp(), ...A("intrus") };
await t("un compte demande à rejoindre le club", assertSucceeds(setDoc(doc(intrus, C + "/membres/intrus"), demande)));
await t("il ne s'active pas lui-même", assertFails(updateDoc(doc(intrus, C + "/membres/intrus"), { actif: true, ...A("intrus") })));
await t("on ne demande pas à entrer comme entraîneur", assertFails(setDoc(doc(db("x2"), C + "/membres/x2"), { ...demande, role: "entraineur", par: "x2" })));
await t("secrétaire (foot) accepte et nomme entraîneur U15 foot", assertSucceeds(updateDoc(doc(secr, C + "/membres/intrus"), { actif: true, role: "entraineur", perimetre: ["foot"], ...A("secr") })));
await t("secrétaire (foot) ne donne pas le basket", assertFails(updateDoc(doc(secr, C + "/membres/intrus"), { perimetre: ["basket"], ...A("secr") })));
await t("secrétaire ne nomme pas un rôle au-dessus d'elle", assertFails(updateDoc(doc(secr, C + "/membres/intrus"), { role: "vice_president", ...A("secr") })));
await t("secrétaire ne touche pas au président", assertFails(updateDoc(doc(secr, C + "/membres/pres"), { actif: false, ...A("secr") })));
await t("président crée ses propres rôles", assertSucceeds(setDoc(doc(pres, C + "/reglages/roles"), { roles: { entraineur: { nom: "Coach", niveau: 40, droits: ["sportif"] }, secretaire: { nom: "Secrétaire", niveau: 70, droits: ["membres", "effectif"] } }, ...A("pres") })));
await t("après changement de rôle, l'entraîneur perd l'effectif", assertFails(updateDoc(doc(coach, C + "/personnes/p1"), { poste: "Gardien", ...A("coach") })));
await t("secrétaire ne crée pas de rôles", assertFails(setDoc(doc(secr, C + "/reglages/roles"), { roles: {}, ...A("secr") })));
await t("personne ne se crée « president » dans les rôles", assertFails(setDoc(doc(pres, C + "/reglages/roles"), { roles: { president: { nom: "x", niveau: 1, droits: [] } }, ...A("pres") })));
await t("admin nomme le président d'un nouveau club", assertSucceeds(setDoc(doc(adm, "clubs/neuf/membres/u9"), { nom: "Pdt", tel: "", role: "president", perimetre: ["*"], personneId: "", enfants: [], actif: true, depuis: serverTimestamp(), ...A("ADMIN1") })));
await t("admin crée un club", assertSucceeds(setDoc(doc(adm, "clubs/neuf"), { nom: "Neuf FC", active: true, modules: ["effectif"], ...A("ADMIN1") })));
await t("président ne s'offre pas un module", assertFails(updateDoc(doc(pres, C), { modules: ["effectif", "installations"], ...A("pres") })));
await t("président change le logo du club", assertSucceeds(updateDoc(doc(pres, C), { logo: "logo.png", ...A("pres") })));
await t("visiteur lit le modèle publié", assertSucceeds(getDoc(doc(anon, "plateforme/modele"))));
await t("président ne publie pas le modèle", assertFails(setDoc(doc(pres, "plateforme/modele"), { politique: {}, roles: {} })));
await t("admin publie le modèle", assertSucceeds(setDoc(doc(adm, "plateforme/modele"), JSON.parse(JSON.stringify(modele)))));
await t("admin souscrit un module", assertSucceeds(updateDoc(doc(adm, C), { modules: ["effectif", "sportif", "finances", "communication", "installations"], ...A("ADMIN1") })));

/* ----- Modularité : une collection ajoutée au modèle marche sans toucher aux règles ----- */
const mods2 = json("modules.json");
mods2.modules.find((m) => m.id === "effectif").collections.push({ id: "equipements", nom: "Équipements", lire: "effectif", ecrire: "effectif", perso: true, categorie: true, champs: [{ id: "personneId", type: "ref", ref: "personnes" }, { id: "article", type: "texte" }, { id: "taille", type: "texte" }] });
const m2 = sandbox.Modele.compiler(mods2, json("roles.json")).doc;
await t("avant publication : collection « equipements » inconnue", assertFails(setDoc(doc(coach, C + "/equipements/q1"), { personneId: "p1", article: "Maillot", sectionId: "foot", categorieId: "foot-u13", ...A("coach") })));
await t("admin publie le modèle avec une nouvelle collection", assertSucceeds(setDoc(doc(adm, "plateforme/modele"), JSON.parse(JSON.stringify(m2)))));
await t("le président la remplit tout de suite", assertSucceeds(setDoc(doc(pres, C + "/equipements/q1"), { personneId: "p1", article: "Maillot", taille: "S", sectionId: "foot", categorieId: "foot-u13", ...A("pres") })));
await t("le joueur concerné la lit", assertSucceeds(getDoc(doc(joueur, C + "/equipements/q1"))));
await t("un nom réservé dans le modèle ne donne aucun droit", assertFails(getDoc(doc(joueur, C + "/meta/compteurs"))));

console.log(`\n${n - bad}/${n} règles vérifiées`);
await env.cleanup();
process.exit(bad ? 1 : 0);
