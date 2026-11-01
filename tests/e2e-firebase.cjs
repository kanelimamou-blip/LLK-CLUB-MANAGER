// Parcours complet sur les émulateurs Firebase (vraies règles), connexion par téléphone + code secret, puis par SMS :
// l'admin publie le modèle, crée un club, nomme le président ; le président complète son profil, crée section,
// catégorie, joueur, séance ; un joueur se connecte par SMS, complète son profil, demande à rejoindre, est accepté, pointe.
// Prérequis : émulateurs firestore+auth lancés (firebase emulators:start --only firestore,auth --project demo-club),
// règles chargées avec ADMIN1 dans admin(), compte admin créé (voir README), appli servie sur http://localhost:8777.
const { chromium } = require("playwright");
const fs = require("fs");
const NM = require("path").join(__dirname, "../node_modules/firebase/");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route("**/config.js", (r) => r.fulfill({ contentType: "application/javascript", body: `window.PLATEFORME = { nom: "LLK Club Manager", clubParDefaut: "", supportTel: "0", indicatif: "+221", CONNEXION: { mode: "code", google: false }, EMULATEUR: true, FIREBASE_SDK: "/sdk/",
    FIREBASE_CONFIG: { apiKey: "demo-key", authDomain: "demo-club.firebaseapp.com", projectId: "demo-club" }, admins: ["ADMIN1"] };` }));
  await ctx.route("**/sdk/*", (r) => r.fulfill({ contentType: "application/javascript", body: fs.readFileSync(NM + r.request().url().split("/sdk/")[1]) }));
  const errs = [];
  const U = "http://localhost:8777/";
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push("pageerror " + e.message));
  page.on("console", (m) => m.type() === "error" && !/PERMISSION_DENIED|permission|recaptcha/i.test(m.text()) && errs.push("console " + m.text().slice(0, 200)));
  const toast = async () => { const t = await page.waitForSelector(".toast", { timeout: 5000 }).then((e) => e.textContent()).catch(() => "-"); await page.waitForTimeout(2700); return t; };
  const deco = async () => { await page.goto(U + "#/profil"); await page.click("[data-a=deco]"); await page.waitForTimeout(1500); };
  const codeLogin = async (tel, pin, premiere) => {
    await page.goto(U + "#/connexion"); await page.waitForSelector("#cx-tel");
    await page.fill("#cx-tel", tel); await page.fill("#cx-pin", pin); await page.click(premiere ? "#cx-up" : "#cx-in"); await page.waitForTimeout(2500);
  };
  const profil = async (prenom, nom, profil, extra = {}) => {
    await page.goto(U + "#/"); await page.waitForSelector("#profil");
    const uid = await page.evaluate(() => firebase.auth().currentUser.uid);
    await page.selectOption("[name=profil]", profil);
    await page.fill("[name=prenom]", prenom); await page.fill("[name=nom]", nom);
    for (const [k, v] of Object.entries(extra)) { const el = await page.$(`[name=${k}]`); if ((await el.evaluate((e) => e.tagName)) === "SELECT") await el.selectOption(v); else await el.fill(v); }
    await page.click("#profil button"); console.log("profil " + prenom + ":", await toast()); return uid;
  };
  // Admin
  await codeLogin("77 000 00 01", "111111", false);
  console.log("admin connecté, mauvais code ?", await page.$("#cx-tel") ? "encore sur connexion" : "ok");
  await page.goto(U + "#/admin/modele"); await page.waitForSelector("#md-fichiers");
  await page.click("#md-fichiers"); console.log("publier modèle:", await toast());
  await page.goto(U + "#/admin/sports"); await page.waitForSelector("#sp-pub", { state: "attached" }); await page.click("details summary"); await page.click("#sp-pub"); console.log("sports:", await toast());
  await page.goto(U + "#/admin/connexion"); await page.waitForSelector("#cx-reg"); await page.check("#cx-reg [name=google]"); await page.click("#cx-reg button"); console.log("réglage connexion:", await toast());
  await page.goto(U + "#/admin/clubs"); await page.waitForSelector("#nv-club");
  await page.fill("#nv-club [name=nom]", "Test FC"); await page.fill("#nv-club [name=ptel]", "78 111 22 33"); await page.click("#nv-club button"); console.log("club (président pas encore connecté):", await toast()); await page.waitForTimeout(1500);
  await deco();
  // Président : première connexion par téléphone + code secret, profil, puis nommé par l'admin
  await codeLogin("78 111 22 33", "424242", true);
  await page.goto(U + "#/"); await page.waitForSelector("#profil"); await page.selectOption("[name=profil]", "dirigeant");
  await page.fill("[name=prenom]", "Ousmane"); await page.fill("[name=nom]", "Ba"); await page.click("#profil button");
  console.log("staff sans e-mail refusé:", await toast());
  const presUid = await profil("Ousmane", "Ba", "dirigeant", { email: "ousmane@club.sn", fonction: "Président" });
  console.log("mauvais code refusé:", await (async () => { await deco(); await codeLogin("78 111 22 33", "000000", false); return await page.$("#cx-tel") ? "oui" : "NON"; })());
  await page.goto(U + "#/"); await page.waitForTimeout(500); console.log("toast mauvais code:", await page.$eval(".toast", (e) => e.textContent).catch(() => "-"));
  await codeLogin("78 111 22 33", "000000", false);
  await codeLogin("77 000 00 01", "111111", false);
  await page.goto(U + "#/admin/clubs"); await page.waitForSelector(".club-adm");
  await page.click(".club-adm details summary"); await page.fill(".club-adm [name=ptel]", "78 111 22 33");
  await page.click(".club-adm [data-pres]"); console.log("président nommé:", await toast());
  await deco();
  await codeLogin("78 111 22 33", "424242", false);
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector(".hero"); console.log("rôle:", await page.textContent(".top .qui small"));
  await page.goto(U + "#/c/test-fc/f/sections/nouveau"); await page.waitForSelector("#fiche");
  await page.fill("[name=nom]", "Football"); await page.selectOption("[name=sportId]", "football"); await page.click("button[type=submit]"); console.log("section:", await toast());
  const secId = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/categories/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.fill("[name=nom]", "U13"); await page.click("button[type=submit]"); console.log("catégorie:", await toast());
  const catId = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/personnes/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.selectOption("[name=categorieId]", catId);
  await page.selectOption("[name=type]", "joueur"); await page.fill("[name=prenom]", "Moussa"); await page.fill("[name=nom]", "Diop");
  await page.click("button[type=submit]"); console.log("joueur:", await toast());
  const pid = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/evenements/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.selectOption("[name=categorieId]", catId);
  await page.selectOption("[name=type]", "entraînement"); await page.fill("[name=titre]", "Séance"); await page.fill("[name=debut]", new Date(Date.now() + 3600e3).toISOString().slice(0, 16));
  await page.click("button[type=submit]"); console.log("séance:", await toast());
  await deco();
  // Joueur : connexion par code secret aussi (le SMS est testé à part ci-dessous)
  await codeLogin("76 555 44 33", "135790", true);
  await page.goto(U + "#/"); await page.waitForSelector("#profil"); await page.selectOption("[name=profil]", "joueur");
  console.log("champs joueur visibles:", await page.$eval("[data-champ=poste]", (l) => !l.hidden), "fonction cachée:", await page.$eval("[data-champ=fonction]", (l) => l.hidden));
  await profil("Moussa", "Diop", "joueur", { naissance: "2013-04-02", sexe: "M", poste: "Milieu", taille: "150" });
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector("#adh-go");
  await page.selectOption("#adh-cat", catId);
  console.log("adhésion pré-remplie:", await page.$eval("#adh-nom", (e) => e.value), await page.$eval("#adh-tel", (e) => e.value));
  await page.click("#adh-go"); console.log("adhésion:", await toast());
  await deco();
  await codeLogin("78 111 22 33", "424242", false);
  await page.goto(U + "#/c/test-fc/membres"); await page.waitForSelector("form.membre");
  const f = "form.membre:has(.badge.alerte) ";
  console.log("profil vu par le club:", (await page.$eval(f + ".profil-det", (e) => e.innerText)).replace(/\n/g, " | "));
  await page.click(f + "[data-fiche]"); console.log("fiche créée depuis le profil:", await toast());
  const pid2 = await page.$eval("form.membre:has([name=personneId] option[selected]:not([value='']))", (fm) => fm.querySelector("[name=personneId]").value).catch(() => "?");
  console.log("fiche liée:", pid2 !== "?");
  await page.goto(U + "#/c/test-fc/pointage"); await page.waitForSelector("#pt-gen"); await page.click("#pt-gen"); await page.waitForSelector(".code");
  const code = (await page.textContent(".code")).trim();
  await deco();
  await codeLogin("76 555 44 33", "135790", false);
  await page.goto(U + "#/c/test-fc/pointage"); await page.waitForSelector("#pt-code");
  await page.fill("#pt-code", code); await page.click("#pt-go"); console.log("pointage joueur:", await toast());
  // forme du matin : le joueur l'écrit dans sa propre fiche (champs réponse du modèle, sans règle dédiée)
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector(".forme-q");
  for (const q of ["sommeil", "energie", "muscles", "moral", "envie"]) await page.click(`[data-q=${q}] [data-v="2"]`);
  await page.fill(".forme-q [name=douleur]", "genou"); await page.click(".forme-q button.btn"); console.log("forme du matin:", await toast());
  console.log("forme relue:", await page.$eval(".forme-bloc", (e) => e.innerText.replace(/\s+/g, " ").slice(0, 80)));
  // caisse ouverte : le joueur déclare un versement avec sa capture (rangé dans sa fiche, champ réponse du modèle)
  const CAP = require("path").join(__dirname, "capture-test.jpg");
  await page.goto(U + "#/c/test-fc/cotiser"); await page.waitForSelector("#decl");
  await page.fill("#decl [name=montant]", "2500"); await page.setInputFiles("#decl input[data-photo]", CAP); await page.waitForTimeout(800);
  await page.click("#decl button.btn"); console.log("versement déclaré:", await toast());
  await deco();
  // le président (droit effectif) voit le joueur en orange sur le tableau du matin
  await codeLogin("78 111 22 33", "424242", false);
  await page.goto(U + "#/c/test-fc/forme"); await page.waitForSelector(".resume-forme");
  console.log("tableau du matin:", await page.$eval(".forme-ligne", (e) => e.className + " | " + e.innerText.replace(/\s+/g, " ")));
  // le président active la caisse (reglages/caisse), vérifie la capture et répond par sa contre-capture
  await page.goto(U + "#/c/test-fc/cotiser"); await page.waitForSelector("form.verif");
  await page.click("details.carte summary"); await page.check("#cfg-caisse [name=actif]"); await page.fill("#cfg-caisse [name=numero]", "77 000 00 00"); await page.fill("#cfg-caisse [name=objectif]", "100000");
  await page.click("#cfg-caisse button"); console.log("caisse activée:", await toast());
  await page.waitForSelector("form.verif"); await page.setInputFiles("form.verif input[data-photo]", CAP); await page.waitForTimeout(800);
  await page.click("form.verif button[name=ok]"); console.log("versement vérifié:", await toast());
  console.log("balance:", await page.$eval(".caisse-total", (e) => e.textContent), "| à vérifier:", await page.$$eval("form.verif", (l) => l.length));
  await deco();
  await codeLogin("76 555 44 33", "135790", false);
  await page.goto(U + "#/c/test-fc/cotiser"); await page.waitForSelector(".registre");
  console.log("joueur voit:", await page.$eval("#decl .badge", (e) => e.textContent), "|", await page.$eval(".registre", (e) => e.innerText.replace(/\s+/g, " ").slice(0, 90)));
  await page.click("[data-preuve]"); await page.waitForTimeout(1200); console.log("preuves visibles:", await page.$$eval(".registre .preuves img", (l) => l.length));
  await deco();
  await page.goto(U + "#/c/test-fc"); await page.waitForTimeout(1500); console.log("visiteur voit la caisse:", await page.$eval(".caisse-tete", (e) => e.innerText.replace(/\s+/g, " ").slice(0, 80)).catch(() => "NON"));
  await codeLogin("78 111 22 33", "424242", false);
  await deco();
  // Connexion par SMS (l'émulateur donne le code)
  await codeLogin("77 000 00 01", "111111", false);
  await page.goto(U + "#/admin/connexion"); await page.waitForSelector("#cx-reg"); await page.check("#cx-reg [value=sms]"); await page.click("#cx-reg button"); console.log("passage au SMS:", await toast());
  await deco();
  await page.goto(U + "#/connexion"); await page.waitForSelector("#cx-sms");
  await page.fill("#cx-tel", "70 123 45 67"); await page.click("#cx-sms"); console.log("envoi SMS:", await toast());
  const codes = await (await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-club/verificationCodes")).json();
  const sms = codes.verificationCodes.filter((c) => c.phoneNumber === "+221701234567").pop();
  await page.fill("#cx-code", sms.code); await page.click("#cx-ok"); await page.waitForTimeout(2500);
  await page.goto(U + "#/"); await page.waitForSelector("#profil"); console.log("SMS → profil à compléter, tel:", await page.$eval("#profil .fiche-tete b", (e) => e.textContent));
  await page.screenshot({ path: "/tmp/club-profil.png", fullPage: true });
  console.log("ERREURS:", errs.length ? errs : "aucune");
  await b.close();
})();
