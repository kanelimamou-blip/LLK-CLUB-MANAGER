// Lien d'invitation : un nouveau venu crée son compte, complète son profil et demande à rejoindre, sans quitter le guide.
// Prérequis : comme e2e-firebase.cjs (émulateurs lancés), et ce dernier déjà passé (club test-fc).
const { chromium } = require("playwright");
const fs = require("fs");
const NM = require("path").join(__dirname, "../node_modules/firebase/");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route("**/config.js", (r) => r.fulfill({ contentType: "application/javascript", body: `window.PLATEFORME = { nom: "LLK Club Manager", clubParDefaut: "", supportTel: "0", indicatif: "+221", CONNEXION: { mode: "code", google: false }, EMULATEUR: true, FIREBASE_SDK: "/sdk/",
    FIREBASE_CONFIG: { apiKey: "demo-key", authDomain: "demo-club.firebaseapp.com", projectId: "demo-club" }, admins: ["ADMIN1"] };` }));
  await ctx.route("**/sdk/*", (r) => r.fulfill({ contentType: "application/javascript", body: fs.readFileSync(NM + r.request().url().split("/sdk/")[1]) }));
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const toast = async () => { const t = await p.waitForSelector(".toast", { timeout: 6000 }).then((e) => e.textContent()).catch(() => "-"); await p.waitForTimeout(2700); return t; };
  const U = "http://localhost:8777/";
  await p.goto(U + "#/c/test-fc/rejoindre"); await p.waitForSelector(".rejoindre");
  console.log("étapes:", await p.$$eval(".etape-r", (l) => l.map((e) => e.className.replace("etape-r", "").trim() || "à venir").join(" | ")));
  const tel = "70 " + String(Date.now()).slice(-7, -4) + " " + String(Date.now()).slice(-4, -2) + " " + String(Date.now()).slice(-2);
  await p.fill("#cx-tel", tel); await p.fill("#cx-pin", "246810"); await p.click("#cx-up"); await p.waitForTimeout(3000);
  await p.waitForSelector("#profil"); console.log("après compte → profil:", p.url());
  await p.selectOption("[name=profil]", "supporter").catch(async () => console.log("options profil:", await p.$$eval("[name=profil] option", (o) => o.map((x) => x.value))));
  await p.fill("[name=prenom]", "Awa"); await p.fill("[name=nom]", "Fall");
  await p.click("#profil button"); await p.waitForTimeout(2000);
  console.log("retour:", p.url());
  await p.waitForSelector("#rj-go"); await p.selectOption("#rj-type", "supporter"); await p.click("#rj-go"); console.log("demande:", await toast());
  await p.waitForSelector(".rejoindre"); console.log("étape 4:", await p.$eval(".etape-r:nth-child(4) h3", (e) => e.textContent));
  // inscription simple (option du club) : le président l'active, un nouveau venu entre juste nom + numéro
  await p.evaluate(() => firebase.auth().signOut()); await p.waitForTimeout(800);
  await p.evaluate(() => firebase.auth().signInWithEmailAndPassword("221781112233@tel.llk.app", "424242")); await p.reload(); await p.waitForTimeout(2500);
  await p.goto(U + "#/c/test-fc/reglages"); await p.waitForSelector("#rg-club"); await p.check("#rg-club [name=simple]"); await p.click("#rg-club > button.btn"); console.log("option simple:", await toast());
  await p.evaluate(() => firebase.auth().signOut()); await p.waitForTimeout(800);
  await p.goto(U + "#/c/test-fc/rejoindre"); await p.reload(); await p.waitForSelector("#rs-go");
  await p.fill("#rs-prenom", "Modou"); await p.fill("#rs-nom", "Sène"); await p.fill("#rs-tel", "76 222 33 44"); await p.selectOption("#rs-type", "supporter");
  await p.click("#rs-go"); await p.waitForTimeout(3500); await p.waitForSelector(".rejoindre");
  console.log("après inscription simple:", p.url(), "|", await p.$$eval(".etape-r", (l) => l.map((e) => e.className.replace("etape-r", "").trim() || "à venir").join(" | ")));
  await p.click("#rj-go"); console.log("demande simple:", await toast());
  console.log("étape 4:", await p.$eval(".etape-r:nth-child(4) h3", (e) => e.textContent));
  console.log("ERREURS:", errs.length ? errs : "aucune"); await b.close();
})();
