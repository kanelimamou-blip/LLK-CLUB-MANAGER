// Parcours complet sur les émulateurs Firebase (vraies règles) : admin publie le modèle, crée un club, nomme le président ;
// le président crée section, catégorie, joueur, séance ; un joueur demande à rejoindre, est accepté, pointe avec le code.
// Prérequis : émulateurs firestore+auth lancés, règles chargées avec ADMIN1 dans admin(), comptes ADMIN1/PRES1/JOUEUR1 créés,
// appli servie sur http://localhost:8777 (python3 -m http.server 8777 -d docs).
const { chromium } = require("playwright");
const fs = require("fs");
const NM = require("path").join(__dirname, "../node_modules/firebase/");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route("**/config.js", (r) => r.fulfill({ contentType: "application/javascript", body: `window.PLATEFORME = { nom: "Club Manager", clubParDefaut: "", supportTel: "0", EMULATEUR: true, FIREBASE_SDK: "/sdk/",
    FIREBASE_CONFIG: { apiKey: "demo-key", authDomain: "demo-club.firebaseapp.com", projectId: "demo-club" }, admins: ["ADMIN1"] };` }));
  await ctx.route("**/sdk/*", (r) => r.fulfill({ contentType: "application/javascript", body: fs.readFileSync(NM + r.request().url().split("/sdk/")[1]) }));
  const errs = [];
  const U = "http://localhost:8777/";
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push("pageerror " + e.message));
  page.on("console", (m) => m.type() === "error" && !/PERMISSION_DENIED|permission/.test(m.text()) && errs.push("console " + m.text().slice(0, 200)));
  const toast = async () => { const t = await page.waitForSelector(".toast", { timeout: 4000 }).then((e) => e.textContent()).catch(() => "-"); await page.waitForTimeout(2700); return t; };
  const login = async (email) => {
    await page.goto(U + "#/connexion"); await page.waitForSelector("#cx-e");
    await page.fill("#cx-e", email); await page.fill("#cx-m", "secret12"); await page.click("#cx-in");
    await page.waitForTimeout(2500);
  };
  await login("admin@test.sn");
  await page.goto(U + "#/admin/modele"); await page.waitForSelector("#md-fichiers");
  console.log("non publié:", (await page.textContent(".carte p")).slice(0, 40));
  await page.click("#md-fichiers"); console.log("publier modèle:", await toast());
  await page.goto(U + "#/admin/sports"); await page.waitForSelector("#sp-pub", { state: "attached" }); await page.click("details summary"); await page.click("#sp-pub"); console.log("sports:", await toast());
  await page.goto(U + "#/admin/clubs"); await page.waitForSelector("#nv-club");
  await page.fill("#nv-club [name=id]", "test-fc"); await page.fill("#nv-club [name=nom]", "Test FC"); await page.click("#nv-club button"); console.log("club:", await toast());
  await page.waitForSelector(".club-adm");
  await page.click(".club-adm details summary"); await page.fill(".club-adm [name=puid]", "PRES1"); await page.fill(".club-adm [name=pnom]", "Pdt Test");
  await page.click(".club-adm [data-pres]"); console.log("président:", await toast());
  await page.click("[data-a=deco]"); await page.waitForTimeout(1500);

  await login("pres@test.sn");
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector(".hero");
  console.log("badge:", await page.textContent(".top .badge"));
  await page.goto(U + "#/c/test-fc/f/sections/nouveau"); await page.waitForSelector("#fiche");
  await page.fill("[name=nom]", "Football"); await page.selectOption("[name=sportId]", "football"); await page.click("button[type=submit]"); console.log("section:", await toast());
  const secId = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/categories/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.fill("[name=nom]", "U13"); await page.click("button[type=submit]"); console.log("catégorie:", await toast());
  const catId = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/personnes/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.selectOption("[name=categorieId]", catId);
  await page.selectOption("[name=type]", "joueur"); await page.fill("[name=prenom]", "Moussa"); await page.fill("[name=nom]", "Diop"); await page.fill("[name=poste]", "Milieu");
  await page.click("button[type=submit]"); console.log("joueur:", await toast());
  const pid = page.url().split("/").pop();
  await page.goto(U + "#/c/test-fc/f/evenements/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", secId); await page.selectOption("[name=categorieId]", catId);
  await page.selectOption("[name=type]", "entraînement"); await page.fill("[name=titre]", "Séance"); await page.fill("[name=debut]", new Date(Date.now() + 3600e3).toISOString().slice(0, 16));
  await page.click("button[type=submit]"); console.log("séance:", await toast());
  await page.click("[data-a=deco]"); await page.waitForTimeout(1500);

  await login("joueur@test.sn");
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector("#adh-go");
  await page.fill("#adh-nom", "Moussa Diop"); await page.fill("#adh-msg", "joueur U13"); await page.click("#adh-go"); console.log("adhésion:", await toast());
  await page.waitForSelector(".carte.info"); console.log("attente:", await page.textContent(".carte.info"));
  await page.click("[data-a=deco]"); await page.waitForTimeout(1500);

  await login("pres@test.sn");
  await page.goto(U + "#/c/test-fc/membres"); await page.waitForSelector("form.membre[data-uid=JOUEUR1]");
  const f = "form.membre[data-uid=JOUEUR1] ";
  await page.check(f + "[name=actif]"); await page.selectOption(f + "[name=personneId]", pid); await page.click(f + "button"); console.log("accepté:", await toast());
  await page.goto(U + "#/c/test-fc/pointage"); await page.waitForSelector("#pt-gen"); await page.click("#pt-gen"); await page.waitForSelector(".code");
  const code = (await page.textContent(".code")).trim(); console.log("code:", code);
  await page.click("[data-a=deco]"); await page.waitForTimeout(1500);

  await login("joueur@test.sn");
  await page.goto(U + "#/c/test-fc"); await page.waitForSelector(".hero"); await page.waitForTimeout(800);
  console.log("joueur voit sa fiche:", (await page.$$eval(".carte h3", (h) => h.map((x) => x.textContent))).join(" | "));
  await page.goto(U + "#/c/test-fc/pointage"); await page.waitForSelector("#pt-code");
  await page.fill("#pt-code", code); await page.click("#pt-go"); console.log("pointage:", await toast());
  await page.goto(U + "#/c/test-fc/f/personnes/" + pid); await page.waitForSelector("#fiche");
  await page.fill("[name=tel]", "77 123 45 67"); await page.click("button[type=submit]"); console.log("joueur modifie son tel:", await toast());
  await page.screenshot({ path: "/tmp/fire-joueur.png", fullPage: true });
  console.log("ERREURS:", errs.length ? errs : "aucune");
  await b.close();
})();
