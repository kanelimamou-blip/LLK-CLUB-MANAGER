// Parcours de démo sur téléphone et ordinateur (Playwright) : python3 -m http.server 8777 -d docs, puis node tests/e2e-demo.cjs
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errs.push("pageerror " + e.message));
  page.on("console", (m) => m.type() === "error" && errs.push("console " + m.text()));
  const U = process.argv[2] || "http://localhost:8777/";
  await page.goto(U); await page.waitForSelector(".hero");
  await page.screenshot({ path: "/tmp/club-s1-accueil-pres.png", fullPage: true });
  const nav = await page.$$eval(".nav a", (as) => as.map((a) => a.textContent.trim()));
  console.log("nav président:", nav.join(" | "));
  // Module effectif
  await page.goto(U + "#/c/as-exemple/m/effectif"); await page.waitForSelector(".table");
  console.log("effectif rows:", await page.$$eval(".tr:not(.th)", (r) => r.length));
  await page.screenshot({ path: "/tmp/club-s2-effectif.png", fullPage: true });
  // nouvelle fiche
  await page.goto(U + "#/c/as-exemple/f/personnes/nouveau"); await page.waitForSelector("#fiche");
  await page.selectOption("[name=sectionId]", "foot"); await page.selectOption("[name=categorieId]", "foot-u13");
  await page.selectOption("[name=type]", "joueur"); await page.fill("[name=prenom]", "Lamine"); await page.fill("[name=nom]", "Camara");
  await page.click("button[type=submit]"); await page.waitForTimeout(400);
  console.log("après création:", page.url());
  // profil coach
  for (const [uid, label] of [["demo-coach-u13", "coach"], ["demo-joueur", "joueur"], ["demo-parent", "parent"], ["demo-tresorier", "treso"], ["visiteur", "visiteur"], ["demo-medecin", "medecin"]]) {
    await page.goto(U + "#/c/as-exemple"); await page.waitForSelector("#profil-demo");
    await page.selectOption("#profil-demo", uid); await page.waitForTimeout(400);
    const n = await page.$$eval(".nav a", (as) => as.map((a) => a.textContent.trim()));
    console.log(`nav ${label}:`, n.join(" | "));
    await page.screenshot({ path: `/tmp/s-${label}.png`, fullPage: true });
  }
  // coach: effectif ne voit que U13
  await page.selectOption("#profil-demo", "demo-coach-u13"); await page.waitForTimeout(300);
  await page.goto(U + "#/c/as-exemple/m/effectif/personnes"); await page.waitForSelector(".table");
  console.log("coach voit:", await page.$$eval(".tr:not(.th) span:first-child", (r) => r.map((x) => x.textContent).join(",")));
  // coach pointage: générer code
  await page.goto(U + "#/c/as-exemple/pointage"); await page.waitForSelector("#pt-evt");
  await page.click("#pt-gen"); await page.waitForSelector(".code");
  const code = await page.textContent(".code"); console.log("code:", code);
  await page.screenshot({ path: "/tmp/club-s-pointage-coach.png", fullPage: true });
  // joueur pointe
  await page.selectOption("#profil-demo", "demo-joueur"); await page.waitForTimeout(300);
  await page.goto(U + "#/c/as-exemple/pointage"); await page.waitForSelector("#pt-code");
  await page.fill("#pt-code", "0000"); await page.click("#pt-go"); await page.waitForTimeout(300);
  console.log("toast mauvais code:", await page.textContent(".toast").catch(() => "-"));
  await page.waitForTimeout(2700);
  await page.fill("#pt-code", code); await page.click("#pt-go"); await page.waitForTimeout(300);
  console.log("toast bon code:", await page.textContent(".toast").catch(() => "-"));
  // joueur répond convocation
  await page.goto(U + "#/c/as-exemple"); await page.waitForSelector("[data-conv]");
  await page.click("[data-conv][data-rep='présent']"); await page.waitForTimeout(400);
  console.log("conv on:", await page.$eval(".mini.on", (e) => e.textContent).catch(() => "-"));
  await page.screenshot({ path: "/tmp/club-s-joueur-accueil.png", fullPage: true });
  // coach voit pointage
  await page.selectOption("#profil-demo", "demo-coach-u13"); await page.waitForTimeout(300);
  await page.goto(U + "#/c/as-exemple/pointage"); await page.waitForSelector(".code");
  console.log("présents:", await page.$$eval(".carte h3", (h) => h.map((x) => x.textContent).join(" / ")));
  // trésorier encaisse
  await page.selectOption("#profil-demo", "demo-tresorier"); await page.waitForTimeout(300);
  await page.goto(U + "#/c/as-exemple/caisse"); await page.waitForSelector("#enc");
  await page.selectOption("[name=echeanceId]", "ech1"); await page.fill("[name=montant]", "15000"); await page.click("#enc button");
  await page.waitForTimeout(500);
  console.log("reçus:", await page.$$eval(".ligne b", (r) => r.map((x) => x.textContent).join(",")));
  // admin
  await page.selectOption("#profil-demo", "demo-admin"); await page.waitForTimeout(300);
  await page.goto(U + "#/admin/modele"); await page.waitForSelector("#md-champ");
  await page.selectOption("#md-champ [name=col]", "effectif/personnes");
  await page.fill("#md-champ [name=id]", "groupeSanguin"); await page.fill("#md-champ [name=label]", "Groupe sanguin");
  await page.selectOption("#md-champ [name=type]", "choix"); await page.fill("#md-champ [name=options]", "A+, A-, B+, O+, O-");
  await page.click("#md-champ button"); await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/club-s-admin-modele.png", fullPage: true });
  await page.goto(U + "#/admin/clubs"); await page.waitForSelector("#nv-club");
  await page.fill("#nv-club [name=id]", "jaraaf-test"); await page.fill("#nv-club [name=nom]", "Jaraaf Test"); await page.click("#nv-club button"); await page.waitForTimeout(400);
  console.log("clubs admin:", await page.$$eval(".club-adm b", (r) => r.map((x) => x.textContent).join(",")));
  await page.screenshot({ path: "/tmp/club-s-admin-clubs.png", fullPage: true });
  // le président voit le nouveau champ
  await page.selectOption("#profil-demo", "demo-president"); await page.waitForTimeout(300);
  await page.goto(U + "#/c/as-exemple/f/personnes/p1"); await page.waitForSelector("#fiche");
  console.log("champ groupe sanguin:", !!(await page.$("[name=groupeSanguin]")));
  // desktop
  const d = await b.newPage({ viewport: { width: 1366, height: 860 } });
  d.on("pageerror", (e) => errs.push("pageerror " + e.message));
  await d.goto(U + "#/c/as-exemple/m/sportif"); await d.waitForSelector(".table"); await d.waitForTimeout(300);
  await d.screenshot({ path: "/tmp/club-s-desktop-sportif.png" });
  await d.goto(U + "#/c/as-exemple/membres"); await d.waitForSelector("form.membre"); await d.screenshot({ path: "/tmp/club-s-desktop-membres.png" });
  await d.goto(U + "#/c/as-exemple/f/stats/nouveau"); await d.waitForSelector("#fiche");
  await d.selectOption("[name=sectionId]", "basket"); 
  await d.screenshot({ path: "/tmp/club-s-desktop-stats.png", fullPage: true });
  console.log("ERREURS:", errs.length ? errs : "aucune");
  await b.close();
})();
