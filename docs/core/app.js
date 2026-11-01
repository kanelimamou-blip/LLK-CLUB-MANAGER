// L'appli : un seul code pour tous les clubs et tous les sports. Les écrans (listes, fiches, formulaires) sont
// construits depuis le modèle publié (plateforme/modele = docs/modele/modules.json compilé) : ajouter une collection
// ou un champ dans le modèle l'ajoute ici, sans toucher à ce fichier. Seuls l'accueil, le pointage, la caisse,
// les membres, les réglages et l'espace admin ont un écran écrit à la main.
(function () {
  const P = window.PLATEFORME, D = window.Droits, B = window.Donnees;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const S = { modele: null, sports: {}, clubId: null, club: null, membre: null, R: {}, cache: {} };
  const app = $("#app");

  /* ---------- Modèle ---------- */
  const modules = () => S.modele.modules.modules;
  const colDef = (id) => { for (const m of modules()) for (const c of m.collections) if (c.id === id) return { ...c, module: m.id }; return null; };
  const pol = (id) => S.modele.politique[id] || null;
  const moduleOn = (m) => m === "base" || (S.club && (S.club.modules || []).includes(m));
  const lisible = (P) => P && moduleOn(P.m) && (P.l === "public" || P.l === "public?" || (P.l === "membre" && D.membre())
    || D.can(P.l) || D.can(P.e) || ((P.perso || P.soi) && D.mesPersonnes().length > 0));
  const nomDoc = (d) => !d ? "" : d.prenom ? `${d.prenom} ${d.nom || ""}` : d.titre || d.nom || d.libelle || d.id;
  const devise = () => (S.club && S.club.devise) || "F CFA";
  const argent = (n) => `${Number(n || 0).toLocaleString("fr-FR")} ${devise()}`;
  const dateFr = (v) => {
    if (!v) return "";
    const [d, h] = String(v).split("T"); const dt = new Date(d + "T00:00");
    if (isNaN(dt)) return esc(v);
    return dt.toLocaleDateString("fr-FR", { weekday: h ? "short" : undefined, day: "numeric", month: "short" }) + (h ? " " + h.slice(0, 5) : "");
  };
  const sportDeSection = (sectionId) => { const s = (S.cache.sections || []).find((x) => x.id === sectionId); return s ? S.sports[s.sportId] : null; };

  async function charger(col) {
    if (col.startsWith("/")) return Object.entries(S.sports).map(([id, s]) => ({ id, ...s }));
    if (!S.cache[col]) { const P = pol(col); S.cache[col] = P && lisible(P) ? await B.liste(S.clubId, col, P) : []; }
    return S.cache[col];
  }
  const vider = (col) => { delete S.cache[col]; };
  function valeur(ch, v) {
    if (v === undefined || v === null || v === "") return "";
    switch (ch.type) {
      case "date": case "dateheure": return dateFr(v);
      case "montant": return argent(v);
      case "booleen": return v ? "Oui" : "Non";
      case "ref": { const l = ch.ref.startsWith("/") ? S.sports[v] : (S.cache[ch.ref] || []).find((d) => d.id === v); return esc(l ? nomDoc(l) : v); }
      case "refs": return esc((v || []).map((x) => nomDoc((S.cache[ch.ref] || []).find((d) => d.id === x) || S.sports[x] || { id: x })).join(", "));
      case "liste": return esc((v || []).join(", "));
      case "map": return esc(Object.entries(v || {}).map(([k, x]) => `${k} : ${x}`).join(" · "));
      case "image": case "lien": return `<a href="${esc(v)}" target="_blank" rel="noopener">ouvrir</a>`;
      default: return esc(v);
    }
  }
  const nomCat = (d) => { const c = (S.cache.categories || []).find((x) => x.id === d.categorieId); const s = (S.cache.sections || []).find((x) => x.id === d.sectionId); return [s && s.nom, c && c.nom].filter(Boolean).join(" · "); };

  /* ---------- Icônes au trait (même style partout, plus sobre que les émojis) ---------- */
  const ICO = {
    accueil: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
    base: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    effectif: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.6-3.4 2.8-5.3 5.5-5.3s4.9 1.9 5.5 5.3"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.3.2 3.7 1.9 4.2 4.6"/>',
    sportif: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    finances: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/>',
    communication: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    installations: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M3 9.5h3v5H3M21 9.5h-3v5h3"/>',
    pointage: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.8-5"/>',
    caisse: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    membres: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.5-1.6 1.7-2.5 3.2-2.5s2.7.9 3.2 2.5M14.5 10h4M14.5 13.5h3"/>',
    reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    admin: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/><path d="M12 8v5M12 16h.01"/>',
    clubs: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-5h6v5"/>',
    forme: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    plus: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    profil: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1-4 3.9-6 7.5-6s6.5 2 7.5 6"/>',
  };
  const ico = (k, repli) => (ICO[k] ? `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>` : `<i class="ico-txt">${esc(repli || "•")}</i>`);

  /* ---------- Coquille : en-tête, barre démo, navigation (en bas sur téléphone, à gauche sur ordinateur) ---------- */
  function menu() {
    if (!S.club) return [];
    const c = `#/c/${S.clubId}`;
    const items = [{ h: c, t: "Accueil", k: "accueil" }];
    for (const m of modules()) {
      if (!moduleOn(m.id) || !m.collections.some((x) => lisible(pol(x.id)))) continue;
      items.push({ h: `${c}/m/${m.id}`, t: m.nom, k: m.id, i: m.icone });
    }
    if (moduleOn("sportif") && D.can("effectif")) items.push({ h: `${c}/forme`, t: "Forme", k: "forme" });
    if (moduleOn("sportif") && (D.can("sportif") || D.mesPersonnes().length)) items.push({ h: `${c}/pointage`, t: "Pointage", k: "pointage" });
    if (moduleOn("finances") && (D.can("finances") || D.mesPersonnes().length)) items.push({ h: `${c}/caisse`, t: "Caisse", k: "caisse" });
    if (D.can("membres")) items.push({ h: `${c}/membres`, t: "Membres", k: "membres" });
    if (D.can("reglages") || D.president()) items.push({ h: `${c}/reglages`, t: "Réglages", k: "reglages" });
    if (B.estAdmin()) items.push({ h: "#/admin", t: "Admin", k: "admin" });
    return items;
  }
  // Bouton « + » présent sur tous les écrans du club : on ajoute sans revenir à l'accueil.
  // Les fiches les plus utiles d'abord ; le filtre section/catégorie en cours est repris.
  function menuAjout() {
    if (!S.club || !D.membre()) return [];
    const f = JSON.parse(sessionStorage.getItem("filtre") || "{}");
    const prio = ["evenements", "personnes", "convocations", "stats", "evaluations", "blessures", "annonces", "actualites", "echeances", "depenses"];
    const out = [];
    for (const m of modules()) for (const c of m.collections) {
      const P2 = pol(c.id); if (!P2 || !moduleOn(P2.m) || !D.can(P2.e)) continue;
      const pre = c.categorie && (f.sec || f.cat) ? { sectionId: f.sec || "", categorieId: f.cat || "" } : null;
      out.push({ h: `#/c/${S.clubId}/f/${c.id}/nouveau`, t: c.nom, k: m.id, i: m.icone, pre, o: prio.includes(c.id) ? prio.indexOf(c.id) : 50 });
    }
    if (moduleOn("sportif") && D.can("sportif")) out.push({ h: `#/c/${S.clubId}/pointage`, t: "Pointage du jour", k: "pointage", o: 1.5 });
    if (moduleOn("finances") && D.can("finances")) out.push({ h: `#/c/${S.clubId}/caisse`, t: "Encaisser", k: "caisse", o: 2.5 });
    return out.sort((a, b) => a.o - b.o).slice(0, 12);
  }
  const majModeleDispo = () => B.estAdmin() && S.versionFichier && S.modele && (S.modele.nonPublie || ((S.modele.modules || {}).version || 1) < S.versionFichier);
  function coquille(contenu, titre) {
    const club = S.club;
    const h = location.hash || "#/";
    const ajouts = menuAjout();
    const actif = (n) => h === n.h || (n.h !== "#/c/" + S.clubId && h.startsWith(n.h + "/"));
    const nav = (B.estAdmin() && !club ? [{ h: "#/admin", t: "Admin", k: "admin" }, { h: "#/clubs", t: "Clubs", k: "clubs" }] : menu());
    app.innerHTML = `
      ${B.mode === "demo" ? barreDemo() : ""}
      <header class="top">
        <a class="marque" href="${club ? "#/c/" + S.clubId : "#/"}">
          ${club && club.logo ? `<img src="${esc(club.logo)}" alt="">` : `<img src="icons/logo.svg" alt="">`}
          <span><b>${esc(club ? club.nomCourt || club.nom : P.nom)}</b><small>${esc(titre || (club ? club.slogan || "" : P.slogan))}</small></span>
        </a>
        <div class="compte">${B.estAdmin() ? `<a class="badge" href="#/admin">${esc(libelleRole())}</a>` : `<span class="badge">${esc(libelleRole())}</span>`}
          ${B.mode === "firebase" && !B.uid ? `<a class="btn petit accent" href="#/connexion">Connexion</a>` : `<a class="profil-btn" href="#/profil" title="Mon profil">${ico("profil")}</a>`}</div>
      </header>
      <div class="cadre">
        <nav class="nav">${nav.map((n, i) => `<a href="${n.h}" class="${actif(n) ? "actif" : ""} ${nav.length > 5 && i >= 4 ? "en-plus" : ""}">${ico(n.k, n.i)}<span>${esc(n.t)}</span></a>`).join("")}
          ${nav.length > 5 ? `<button type="button" class="nav-plus ${nav.slice(4).some(actif) ? "actif" : ""}" id="nav-plus">${ico("plus")}<span>Plus</span></button>` : ""}</nav>
        ${nav.length <= 5 ? "" : `<div class="feuille" id="feuille" hidden><div class="feuille-fond" data-ferme></div><div class="feuille-corps"><div class="poignee"></div>
          ${nav.slice(4).map((n) => `<a href="${n.h}" class="${actif(n) ? "actif" : ""}">${ico(n.k, n.i)}<span>${esc(n.t)}</span></a>`).join("")}</div></div>`}
        <main class="main">${majModeleDispo() ? `<div class="carte info maj-modele"><div><b>Nouveautés disponibles</b><br><small>Une nouvelle version du modèle est prête (ex. suivi de forme des joueurs). Un appui suffit, sans toucher à Firebase.</small></div><button class="btn petit" id="maj-modele">Mettre à jour</button></div>` : ""}${contenu}<p class="pied">${esc(P.nom)}</p></main>
        ${ajouts.length ? `<button type="button" class="fab" id="fab" aria-label="Ajouter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        <div class="feuille" id="feuille-ajout" hidden><div class="feuille-fond" data-ferme></div><div class="feuille-corps liste-ajout"><div class="poignee"></div><h3>Ajouter</h3>
          ${ajouts.map((a) => `<a href="${a.h}" ${a.pre ? `data-pre='${esc(JSON.stringify(a.pre))}'` : ""}>${ico(a.k, a.i)}<span>${esc(a.t)}</span></a>`).join("")}</div></div>` : ""}
      </div>`;
    const mm = $("#maj-modele"); if (mm) mm.onclick = () => action(async () => {
      const [m, r] = await Promise.all(["modules.json", "roles.json"].map((f) => fetch("modele/" + f, { cache: "no-cache" }).then((x) => x.json())));
      const { erreurs, doc } = Modele.compiler(m, r); if (erreurs.length) throw new Error(erreurs[0]);
      await B.publierModele(doc); S.modele = await B.modele(); route();
    }, "Modèle mis à jour pour tous les clubs");
    const fa = $("#feuille-ajout"); if (fa) { $("#fab").onclick = () => { fa.hidden = false; }; fa.onclick = (e) => { if (e.target.closest("a") || e.target.dataset.ferme !== undefined) fa.hidden = true; }; }
    const fe = $("#feuille"); if (fe) { $("#nav-plus").onclick = () => { fe.hidden = false; }; fe.onclick = (e) => { if (e.target.closest("a") || e.target.dataset.ferme !== undefined) fe.hidden = true; }; }
    const deco = $("[data-a=deco]"); if (deco) deco.onclick = () => B.deconnecter();
    const sel = $("#profil-demo"); if (sel) sel.onchange = () => { B.profil(sel.value); S.clubId = null; route(); };
    const reset = $("#reset-demo"); if (reset) reset.onclick = () => B.reinitialiser();
  }
  function libelleRole() {
    if (B.estAdmin() && !D.membre()) return "Admin plateforme";
    if (!D.membre()) return S.membre ? "Demande en attente" : "Visiteur";
    const r = S.membre.role; return r === "president" ? "Président" : r === "membre" ? (S.membre.enfants && S.membre.enfants.length ? "Parent" : "Membre") : (S.R[r] && S.R[r].nom) || r;
  }
  function barreDemo() {
    const ms = S.clubId && B.s.clubs[S.clubId] ? B.s.clubs[S.clubId].membres : B.s.clubs[P.clubParDefaut || "as-exemple"]?.membres || {};
    const opts = [["visiteur", "Visiteur (vitrine)"], ...Object.entries(ms).map(([u, m]) => [u, m.nom]), ["demo-admin", "Admin plateforme (toi)"]];
    return `<div class="demo">Démo — voir l'appli comme :
      <select id="profil-demo">${opts.map(([u, n]) => `<option value="${u}" ${u === B.uid ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
      <button class="lien" id="reset-demo">Remettre à zéro</button></div>`;
  }

  /* ---------- Routeur ---------- */
  async function chargerClub(id) {
    if (S.clubId === id && S.club) return;
    S.clubId = id; S.cache = {};
    S.club = await B.club(id);
    if (!S.club) return;
    S.membre = await B.monMembre(id);
    S.R = await B.roles(id);
    D.regler({ uid: B.uid === "visiteur" ? null : B.uid, admin: B.estAdmin(), membre: S.membre, R: S.R });
    const coul = S.club.couleurs || {};
    appliquerCouleurs(coul.principale || "#0B5D3B", coul.accent || "#F2B705");
    iconeClub(S.club);
    document.title = S.club.nom;
  }
  async function route() {
    const parts = (location.hash || "#/").slice(2).split("/").filter(Boolean);
    try {
      if (parts[0] === "admin") { S.club = null; S.clubId = null; D.regler({ membre: null }); return B.estAdmin() ? vueAdmin(parts[1]) : coquille(`<div class="carte">Espace réservé à l'admin de la plateforme.${B.uid ? "" : `<p><a class="btn" href="#/connexion">Se connecter</a></p>`}</div>`); }
      if (parts[0] === "connexion") return vueConnexion();
      if (parts[0] === "profil") return vueProfil(false);
      // première connexion : la fiche du compte d'abord (sauf l'admin, qui doit pouvoir publier le modèle avant)
      if (B.mode === "firebase" && B.uid && B.compte && !B.compte.complet && parts[0] !== "admin") return vueProfil(true);
      const defaut = P.clubParDefaut || (B.mode === "demo" ? "as-exemple" : "");
      if (parts[0] === "clubs" || (!parts[0] && !defaut)) return vueClubs();
      if (!parts[0]) { location.hash = "#/c/" + defaut; return; }
      if (parts[0] !== "c") return vueClubs();
      await chargerClub(parts[1]);
      if (!S.club) return coquille(`<div class="carte">Club introuvable.</div>`);
      await Promise.all(["sections", "categories", "saisons"].map(charger)); // rechargées si on vient d'en ajouter
      if (S.club.active === false && !B.estAdmin()) return coquille(`<div class="carte">Ce club est momentanément suspendu. Contact : ${esc(P.supportTel)}</div>`);
      const v = parts[2];
      if (!v) return vueAccueil();
      if (v === "m") return vueModule(parts[3], parts[4]);
      if (v === "f") return vueFiche(parts[3], parts[4]);
      if (v === "pointage") return vuePointage();
      if (v === "forme") return vueForme();
      if (v === "caisse") return vueCaisse();
      if (v === "membres") return vueMembres();
      if (v === "reglages") return vueReglages();
      coquille(`<div class="carte">Page inconnue.</div>`);
    } catch (e) { console.error(e); coquille(`<div class="carte erreur">Erreur : ${esc(e.message)}</div>`); }
  }
  window.addEventListener("hashchange", route);
  // « + Ajouter » depuis une fiche : la nouvelle fiche arrive pré-remplie (joueur, séance, catégorie…)
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-pre]"); if (a) sessionStorage.setItem("prefill", a.dataset.pre); });
  document.addEventListener("click", (e) => { if (e.target.id === "copier-uid") navigator.clipboard.writeText(B.uid).then(() => toast("Identifiant copié")); });
  const toast = (t) => { document.querySelectorAll(".toast").forEach((x) => x.remove()); const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };
  async function action(fn, ok) { try { await fn(); if (ok) toast(ok); } catch (e) { console.error(e); toast("Refusé : " + (e.message || e)); } }

  /* ---------- Profil du compte joint à une demande d'adhésion, puis fiche créée par le club ---------- */
  const champsCompte = () => ((S.modele.modules.compte || {}).champs) || [];
  function profilPourClub(categorieId) {
    const p = {}; for (const ch of champsCompte()) { const v = (B.compte || {})[ch.id]; if (v !== undefined && v !== "" && v !== null) p[ch.id] = v; }
    const cat = (S.cache.categories || []).find((c) => c.id === categorieId);
    if (cat) { p.categorieSouhaitee = cat.id; p.sectionSouhaitee = cat.sectionId; }
    return p;
  }
  const TYPE_FICHE = { "joueur": "joueur", "staff technique": "staff technique", "staff médical": "staff médical", "dirigeant": "dirigeant" };
  async function creerFicheDepuisProfil(m) {
    const p = m.profil || {};
    const fiche = { type: TYPE_FICHE[p.profil] || "bénévole", prenom: p.prenom || m.nom || "", nom: p.nom || "", naissance: p.naissance || "", sexe: p.sexe || "",
      tel: m.tel || "", email: p.email || "", quartier: p.quartier || "", poste: p.poste || p.fonction || "", lateralite: p.lateralite || "",
      taille: p.taille ?? null, poids: p.poids ?? null, contactUrgence: p.contactUrgence || "", statut: "actif", uid: m.uid,
      sectionId: p.sectionSouhaitee || "", categorieId: p.categorieSouhaitee || "" };
    if (!D.perimetreOk(fiche.sectionId, fiche.categorieId)) throw new Error("catégorie souhaitée hors de votre périmètre : choisissez-la dans Effectif");
    const id = await B.ecrire(S.clubId, "personnes", null, fiche); vider("personnes"); return id;
  }

  // Suivi de performance d'un joueur : matchs, minutes, stats cumulées selon le sport, présences, dernière évaluation
  async function perfHtml(pid) {
    const [stats, pres, evals, evts] = await Promise.all(["stats", "presences", "evaluations", "evenements"].map((x) => (moduleOn(pol(x)?.m) ? charger(x) : [])));
    const st = stats.filter((x) => x.personneId === pid), pr = pres.filter((x) => x.personneId === pid), ev = evals.filter((x) => x.personneId === pid).sort((a, b) => (a.date < b.date ? 1 : -1));
    const cumul = {}; st.forEach((x) => Object.entries(x.valeurs || {}).forEach(([k, v]) => (cumul[k] = (cumul[k] || 0) + (Number(v) || 0))));
    const presents = pr.filter((x) => x.statut === "présent" || x.statut === "retard").length;
    const notes = st.map((x) => x.note).filter((n) => n != null);
    const tuiles = [["Matchs", st.length], ["Minutes", st.reduce((s, x) => s + (x.minutes || 0), 0)], ...Object.entries(cumul).filter(([, v]) => v).slice(0, 6).map(([k, v]) => [k, v]),
      ["Présence", pr.length ? Math.round((presents / pr.length) * 100) + " %" : "—"], ["Note moyenne", notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : "—"]];
    const derniers = st.map((x) => ({ ...x, e: evts.find((e) => e.id === x.evenementId) })).filter((x) => x.e).sort((a, b) => (a.e.debut < b.e.debut ? 1 : -1)).slice(0, 5);
    return `<h4>Mes performances</h4><div class="tuiles mini-tuiles">${tuiles.map(([t, v]) => `<div class="tuile"><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>
      ${derniers.map((x) => `<div class="ligne"><span>${esc(nomDoc(x.e))}<br><small>${dateFr(x.e.debut)} · ${x.minutes || 0} min</small></span><small>${esc(Object.entries(x.valeurs || {}).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", "))}</small></div>`).join("")}
      ${ev[0] ? `<div class="ligne"><span>Dernière évaluation (${dateFr(ev[0].date)})<br><small>${esc(Object.entries(ev[0].criteres || {}).map(([k, v]) => `${k} ${v}`).join(" · "))}</small></span></div>${ev[0].commentaire ? `<p class="muted">« ${esc(ev[0].commentaire)} »</p>` : ""}` : ""}`;
  }

  /* ---------- Accueil : vitrine + espace personnel selon le profil ---------- */
  async function vueAccueil() {
    const c = S.club;
    const [evts, actus, annonces] = await Promise.all(["evenements", "actualites", "annonces"].map((x) => (moduleOn(pol(x)?.m) ? charger(x) : [])));
    const today = new Date().toISOString().slice(0, 10);
    const avenir = evts.filter((e) => (e.debut || "") >= today && e.statut !== "annulé").sort((a, b) => (a.debut > b.debut ? 1 : -1));
    const joues = evts.filter((e) => e.type === "match" && e.statut === "joué").sort((a, b) => (a.debut < b.debut ? 1 : -1));
    let html = `<section class="hero">${c.logo ? `<img class="hero-logo" src="${esc(c.logo)}" alt="">` : ""}<h1>${esc(c.nom)}</h1>${c.slogan ? `<p>${esc(c.slogan)}</p>` : ""}
      <div class="puces">${(S.cache.sections || []).map((s) => `<span class="puce">${esc((S.sports[s.sportId] || {}).icone || "")} ${esc(s.nom)}</span>`).join("")}</div>
      ${installee() ? "" : `<button class="btn installer" id="installer" ${invite || estIOS ? "" : "hidden"}>Installer l'appli</button>`}</section>`;

    if (!D.membre()) {
      if (S.membre && !S.membre.actif) html += `<div class="carte info">Votre demande d'adhésion est en attente de validation par le club.</div>`;
      else if (B.mode === "firebase" && B.uid) html += `<div class="carte"><h3>Rejoindre le club</h3><p class="muted">Joueur, parent ou staff : envoyez votre demande, le club vous donne ensuite votre accès.</p>
        <div class="grille2"><input id="adh-nom" placeholder="Nom complet" value="${esc([B.compte?.prenom, B.compte?.nom].filter(Boolean).join(" "))}"><input id="adh-tel" placeholder="Téléphone" value="${esc(B.compte?.tel || "")}"></div>
        <label>Section / catégorie souhaitée<select id="adh-cat"><option value="">(je ne sais pas)</option>${(S.cache.categories || []).map((c) => `<option value="${c.id}">${esc(nomCat(c))}</option>`).join("")}</select></label>
        <input id="adh-msg" placeholder="Un mot pour le club (facultatif)"><button class="btn" id="adh-go">Envoyer ma demande</button>
        <p class="muted">Votre profil (${esc(B.compte?.profil || "à compléter")}) est joint à la demande : le club le valide puis vous donne votre accès.</p></div>`;
      else if (B.mode === "firebase") html += `<div class="carte"><a class="btn" href="#/connexion">Se connecter pour accéder à mon espace</a></div>`;
    }

    // Espace joueur / parent : ce qui concerne ses fiches
    const mes = D.mesPersonnes();
    if (mes.length) {
      const [pers, convs, echs] = await Promise.all(["personnes", "convocations", "echeances"].map((x) => (moduleOn(pol(x)?.m) ? charger(x) : [])));
      for (const pid of mes) {
        const p = pers.find((x) => x.id === pid);
        const cv = convs.filter((x) => x.personneId === pid).map((x) => ({ ...x, e: evts.find((e) => e.id === x.evenementId) })).filter((x) => x.e && x.e.debut >= today);
        const ec = echs.filter((x) => x.personneId === pid && x.statut !== "payé" && x.statut !== "exonéré");
        html += `<div class="carte"><h3>${esc(p ? nomDoc(p) : "Ma fiche")} <small class="muted">${esc(p ? nomCat(p) : "")}</small></h3>
          ${p && p.type === "joueur" && moduleOn("sportif") ? formeJoueurHtml(p, evts) : ""}
          ${cv.length ? `<h4>Convocations</h4>` + cv.map((x) => `<div class="ligne"><div><b>${esc(nomDoc(x.e))}</b><br><small>${dateFr(x.e.debut)} · ${esc(x.e.lieu || "")}</small></div>
            <div class="rep">${["présent", "absent", "incertain"].map((r) => `<button class="mini ${x.reponse === r ? "on" : ""}" data-conv="${x.id}" data-rep="${r}">${r}</button>`).join("")}</div></div>`).join("") : `<p class="muted">Pas de convocation à venir.</p>`}
          ${ec.length ? `<h4>À payer</h4>` + ec.map((x) => `<div class="ligne"><span>${esc(x.libelle || "Cotisation")} · avant le ${dateFr(x.du)}</span><b>${argent((x.montant || 0) - (x.paye || 0))}</b></div>`).join("") : ""}
          ${p && p.type === "joueur" ? await perfHtml(pid) : ""}
          <div class="actions"><a class="btn petit" href="#/c/${S.clubId}/f/personnes/${pid}">Voir la fiche</a>${moduleOn("sportif") ? `<a class="btn petit clair" href="#/c/${S.clubId}/pointage">Pointer à l'arrivée</a>` : ""}</div></div>`;
      }
    }

    // Tableau de bord du staff : chiffres de son périmètre
    if (D.membre() && S.membre.role !== "membre") {
      const tuiles = [];
      if (D.can("effectif")) { const ps = await charger("personnes"); tuiles.push(["Joueurs", ps.filter((p) => p.type === "joueur" && p.statut !== "parti").length]); }
      if (D.can("medical")) { const bl = await charger("blessures"); tuiles.push(["Indisponibles", bl.filter((b) => b.apte === "inapte").length]); }
      if (D.can("finances") && moduleOn("finances")) { const ec = await charger("echeances"); tuiles.push(["Impayés", argent(ec.filter((e) => e.statut !== "payé" && e.statut !== "exonéré").reduce((s, e) => s + (e.montant || 0) - (e.paye || 0), 0))]); }
      tuiles.push(["Événements à venir", avenir.filter((e) => D.dansPerimetre(e)).length]);
      html += `<div class="tuiles stats">${tuiles.map(([t, v]) => `<div class="tuile"><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>`;
      if (D.can("effectif") && moduleOn("sportif")) {
        const lignes = lignesForme(await charger("personnes"), await blessuresLisibles());
        if (lignes.length) html += `<div class="carte"><div class="lien-tete"><h3>Tableau du matin</h3><a class="lien" href="#/c/${S.clubId}/forme">Tout voir</a></div>${resumeForme(lignes)}${lignes.slice(0, 6).map(ligneForme).join("")}</div>`;
      }
    }

    if (annonces.length) html += `<div class="carte"><h3>Annonces</h3>${annonces.map((a) => `<div class="ligne"><div><b>${esc(a.titre)}</b><br><small>${esc(a.texte || "")}</small></div></div>`).join("")}</div>`;
    html += `<div class="carte"><h3>À venir</h3>${avenir.slice(0, 6).map((e) => { const d = new Date(e.debut); return `<a class="ligne evt" href="#/c/${S.clubId}/f/evenements/${e.id}"><span class="date-puce"><b>${d.getDate()}</b>${d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span><div class="evt-txt"><b>${esc(nomDoc(e))}</b><small>${esc([nomCat(e), String(e.debut || "").slice(11, 16)].filter(Boolean).join(" · "))}</small></div><span class="type-puce t-${esc(e.type || "")}">${esc(e.type || "")}</span></a>`; }).join("") || `<p class="muted">Rien de prévu.</p>`}</div>`;
    if (joues.length) html += `<div class="carte"><h3>Derniers résultats</h3>${joues.slice(0, 5).map((e) => `<div class="ligne"><span>${esc(nomDoc(e))}</span><b>${e.scoreNous ?? "-"} - ${e.scoreEux ?? "-"}</b></div>`).join("")}</div>`;
    if (actus.length) html += `<div class="carte"><h3>Actualités</h3>${actus.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((a) => `<div class="ligne"><div><b>${esc(a.titre)}</b><br><small>${dateFr(a.date)} · ${esc(a.texte || "")}</small></div></div>`).join("")}</div>`;
    coquille(html);

    app.querySelectorAll("[data-conv]").forEach((b) => (b.onclick = () => action(async () => {
      await B.ecrire(S.clubId, "convocations", b.dataset.conv, { reponse: b.dataset.rep }); vider("convocations"); vueAccueil();
    }, "Réponse envoyée")));
    const inst = $("#installer"); if (inst) inst.onclick = async () => {
      if (invite) { invite.prompt(); await invite.userChoice; invite = null; inst.hidden = true; }
      else toast("Sur iPhone : bouton Partager, puis « Sur l'écran d'accueil »");
    };
    brancherForme();
    const adh = $("#adh-go"); if (adh) adh.onclick = () => action(async () => { await B.demanderAdhesion(S.clubId, $("#adh-nom").value.slice(0, 80), $("#adh-tel").value.slice(0, 30), $("#adh-msg").value.slice(0, 300), profilPourClub($("#adh-cat").value)); S.clubId = null; route(); }, "Demande envoyée");
  }


  /* ---------- Forme des joueurs (comme les clubs pros) ----------
     Le joueur répond chaque matin à 5 questions (1 à 5) et note l'effort de chaque séance (RPE 1 à 10).
     Tout est rangé dans SA fiche (personnes.forme et personnes.charges, champs « réponse » du modèle) : aucune règle à recoller.
     Statut : rouge = blessé ou indisponible ; orange = à surveiller (douleur, forme basse, charge en forte hausse) ; vert sinon. */
  const QUESTIONS = [["sommeil", "Sommeil"], ["energie", "Énergie"], ["muscles", "Muscles (courbatures)"], ["moral", "Moral, stress"], ["envie", "Envie de jouer"]];
  const VISAGES = ["😫", "😕", "😐", "🙂", "😄"];
  const local = (dt = new Date()) => new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
  const jour = (dt) => local(dt).slice(0, 10);
  const scoreForme = (f) => (f ? Math.round((QUESTIONS.reduce((s, [k]) => s + (+f[k] || 0), 0) / QUESTIONS.length) * 10) / 10 : null);
  const chargeJours = (p, n) => { const lim = jour(new Date(Date.now() - n * 864e5)); return Object.values(p.charges || {}).filter((c) => c && c.d > lim).reduce((s, c) => s + (c.rpe || 0) * (c.min || 0), 0); };
  const ORDRE = { rouge: 0, orange: 1, vert: 2 };
  function statutJoueur(p, bl) {
    const r = [], o = [];
    const b = (bl || []).filter((x) => x.personneId === p.id).sort((x, y) => ((x.date || "") < (y.date || "") ? 1 : -1))[0];
    if (p.dispo === "indisponible") r.push("indisponible");
    if (b && b.apte === "inapte") r.push("blessé" + (b.type ? " : " + b.type : ""));
    if (p.dispo === "à surveiller") o.push("à surveiller");
    if (b && b.apte === "reprise adaptée") o.push("reprise adaptée");
    const f = (p.forme || {})[jour()], sc = scoreForme(f);
    if (f && f.douleur) o.push("douleur : " + f.douleur);
    if (sc != null && sc <= 2.5) o.push(`forme basse (${sc}/5)`);
    const a7 = chargeJours(p, 7), moy = chargeJours(p, 28) / 4;
    if (moy > 0 && a7 > 1.5 * moy) o.push("charge en forte hausse");
    return { c: r.length ? "rouge" : o.length ? "orange" : "vert", raisons: [...r, ...o], score: sc, repondu: !!f, a7, moy };
  }
  const blessuresLisibles = async () => (lisible(pol("blessures")) ? charger("blessures") : []);
  // ce que le joueur (ou son parent) remplit sur l'accueil
  function formeJoueurHtml(p, evts) {
    const f = (p.forme || {})[jour()];
    let h = `<div class="forme-bloc"><h4>Ma forme ce matin</h4>`;
    h += f ? `<p class="ok">Merci ! Forme du jour : ${scoreForme(f)}/5${f.douleur ? " · douleur signalée" : ""}</p>`
      : `<form class="forme-q" data-pid="${p.id}">${QUESTIONS.map(([k, t]) => `<div class="echelle" data-q="${k}"><span>${t}</span><div>${VISAGES.map((v, i) => `<button type="button" class="vis" data-v="${i + 1}" aria-label="${i + 1}">${v}</button>`).join("")}</div></div>`).join("")}
        <input name="douleur" placeholder="Une douleur ? Où (facultatif)" maxlength="80"><button class="btn petit">Envoyer</button></form>`;
    const lim = jour(new Date(Date.now() - 3 * 864e5)), now = local().slice(0, 16);
    const anoter = evts.filter((e) => ["entraînement", "match"].includes(e.type) && e.statut !== "annulé" && (e.debut || "") <= now && (e.debut || "") >= lim
      && (!e.categorieId || e.categorieId === p.categorieId) && !(p.charges || {})[e.id]).slice(0, 3);
    h += anoter.map((e) => `<div class="rpe" data-pid="${p.id}" data-evt="${e.id}"><span>Effort ressenti · <b>${esc(nomDoc(e))}</b> <small class="muted">${dateFr(e.debut)}</small></span>
      <div class="rpe-btns">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" class="r${i + 1}">${i + 1}</button>`).join("")}</div><small class="muted">1 = très facile · 10 = effort maximal</small></div>`).join("");
    return h + `</div>`;
  }
  async function ecrireSoi(pid, champ, cle, val) {
    const p = (S.cache.personnes || []).find((x) => x.id === pid) || (await B.lire(S.clubId, "personnes", pid));
    await B.ecrire(S.clubId, "personnes", pid, { [champ]: { ...((p && p[champ]) || {}), [cle]: val } }); vider("personnes");
  }
  function brancherForme() {
    app.querySelectorAll(".echelle .vis").forEach((b) => (b.onclick = () => { b.parentNode.querySelectorAll(".vis").forEach((x) => x.classList.toggle("on", x === b)); }));
    app.querySelectorAll(".forme-q").forEach((f) => (f.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const v = { h: local().slice(11, 16) };
      for (const [k, t] of QUESTIONS) { const on = f.querySelector(`[data-q="${k}"] .vis.on`); if (!on) throw new Error(`répondez à « ${t} »`); v[k] = +on.dataset.v; }
      if (f.douleur.value.trim()) v.douleur = f.douleur.value.trim().slice(0, 80);
      await ecrireSoi(f.dataset.pid, "forme", jour(), v); route();
    }, "Merci, forme envoyée"); }));
    app.querySelectorAll(".rpe [data-rpe]").forEach((b) => (b.onclick = () => action(async () => {
      const r = b.closest(".rpe"), e = (S.cache.evenements || []).find((x) => x.id === r.dataset.evt) || {};
      const min = e.debut && e.fin ? Math.max(15, Math.min(240, Math.round((new Date(e.fin) - new Date(e.debut)) / 60000))) : 90;
      await ecrireSoi(r.dataset.pid, "charges", r.dataset.evt, { d: (e.debut || jour()).slice(0, 10), rpe: +b.dataset.rpe, min }); route();
    }, "Effort enregistré")));
  }
  const ligneForme = ({ p, s }) => `<a class="ligne forme-ligne" href="#/c/${S.clubId}/f/personnes/${p.id}"><span class="dot ${s.c}"></span>
    <div class="evt-txt"><b>${esc(nomDoc(p))}</b><small>${esc(s.raisons.join(" · ") || (s.repondu ? "en forme" : "pas encore répondu ce matin"))}</small></div>
    <span class="score ${s.repondu ? "" : "vide"}">${s.score ?? "–"}</span></a>`;
  function resumeForme(lignes) {
    const n = (c) => lignes.filter((l) => l.s.c === c).length;
    return `<div class="resume-forme"><span><b>${lignes.filter((l) => l.s.repondu).length}/${lignes.length}</b> ont répondu</span><span><i class="dot rouge"></i>${n("rouge")}</span><span><i class="dot orange"></i>${n("orange")}</span><span><i class="dot vert"></i>${n("vert")}</span></div>`;
  }
  const lignesForme = (ps, bl) => ps.filter((p) => p.type === "joueur" && p.statut !== "parti").map((p) => ({ p, s: statutJoueur(p, bl) }))
    .sort((a, b) => ORDRE[a.s.c] - ORDRE[b.s.c] || (a.s.score ?? 9) - (b.s.score ?? 9) || nomDoc(a.p).localeCompare(nomDoc(b.p)));
  // page complète : tous les joueurs du périmètre, filtrables par catégorie
  async function vueForme() {
    const [ps, bl] = await Promise.all([charger("personnes"), blessuresLisibles()]);
    const f = JSON.parse(sessionStorage.getItem("filtre") || "{}");
    const lignes = lignesForme(ps.filter((p) => !f.cat || p.categorieId === f.cat), bl);
    coquille(`<h2>Forme des joueurs</h2><p class="muted">Ce matin, ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}. Rouge : ne joue pas. Orange : à voir avant la séance.</p>
      <div class="barre"><select id="fo-cat"><option value="">Toutes catégories</option>${(S.cache.categories || []).map((c) => `<option value="${c.id}" ${f.cat === c.id ? "selected" : ""}>${esc(nomCat(c) || c.nom)}</option>`).join("")}</select></div>
      <div class="carte">${resumeForme(lignes)}${lignes.map(ligneForme).join("") || `<p class="muted">Aucun joueur dans votre périmètre.</p>`}</div>
      <p class="muted">Le chiffre à droite est la forme du jour sur 5 (moyenne de sommeil, énergie, muscles, moral, envie).</p>`, "Forme");
    $("#fo-cat").onchange = (e) => { sessionStorage.setItem("filtre", JSON.stringify({ ...f, cat: e.target.value })); vueForme(); };
  }
  // sur la fiche du joueur : statut, 7 derniers matins, charge
  async function ficheFormeHtml(p) {
    const s = statutJoueur(p, await blessuresLisibles());
    const jours = Array.from({ length: 7 }, (_, i) => jour(new Date(Date.now() - (6 - i) * 864e5)));
    return `<div class="carte"><div class="lien-tete"><h3>Forme</h3><span class="statut ${s.c}">${{ rouge: "Indisponible", orange: "À surveiller", vert: "Disponible" }[s.c]}</span></div>
      ${s.raisons.length ? `<p>${esc(s.raisons.join(" · "))}</p>` : ""}
      <div class="barres">${jours.map((j) => { const sc = scoreForme((p.forme || {})[j]); return `<div><i style="height:${sc ? sc * 20 : 4}%" class="${sc == null ? "vide" : sc <= 2.5 ? "bas" : ""}"></i><small>${new Date(j).toLocaleDateString("fr-FR", { weekday: "narrow" })}</small></div>`; }).join("")}</div>
      <p class="muted">Charge 7 jours : <b>${s.a7}</b>${s.moy ? ` · moyenne des 4 dernières semaines : ${Math.round(s.moy)}` : ""} (effort × minutes)</p></div>`;
  }

  /* ---------- Module : onglets des collections lisibles, puis liste filtrable ---------- */
  async function vueModule(modId, colId) {
    const mod = modules().find((m) => m.id === modId);
    if (!mod || !moduleOn(modId)) return coquille(`<div class="carte">Module non disponible pour ce club.</div>`);
    const cols = mod.collections.filter((c) => lisible(pol(c.id)));
    const col = cols.find((c) => c.id === colId) || cols[0];
    if (!col) return coquille(`<div class="carte">Rien à afficher pour votre profil.</div>`);
    const P = pol(col.id);
    const refs = col.champs.filter((c) => c.type === "ref" || c.type === "refs").map((c) => c.ref).filter((r) => !r.startsWith("/"));
    await Promise.all(refs.map(charger));
    const docs = await charger(col.id);
    const f = JSON.parse(sessionStorage.getItem("filtre") || "{}");
    const cats = (S.cache.categories || []).filter((c) => !f.sec || c.sectionId === f.sec);
    let lst = docs.filter((d) => (!f.sec || d.sectionId === f.sec || !col.categorie) && (!f.cat || d.categorieId === f.cat || !col.categorie));
    if (f.q) lst = lst.filter((d) => JSON.stringify(d).toLowerCase().includes(f.q.toLowerCase()));
    const tri = col.champs.find((c) => ["debut", "date", "du"].includes(c.id));
    if (tri) lst.sort((a, b) => ((a[tri.id] || "") < (b[tri.id] || "") ? 1 : -1)); else lst.sort((a, b) => nomDoc(a).localeCompare(nomDoc(b)));
    const colonnes = (col.colonnes || col.champs.slice(0, 3).map((c) => c.id)).map((id) => col.champs.find((c) => c.id === id) || { id, type: id === "sectionId" ? "ref" : "texte", ref: "sections", label: id });
    const peutCreer = D.can(P.e);
    coquille(`
      <div class="onglets">${cols.map((c) => `<a href="#/c/${S.clubId}/m/${modId}/${c.id}" class="${c.id === col.id ? "actif" : ""}">${esc(c.nom)}</a>`).join("")}</div>
      <div class="barre">
        ${col.categorie ? `<select id="f-sec"><option value="">Toutes sections</option>${(S.cache.sections || []).map((s) => `<option value="${s.id}" ${f.sec === s.id ? "selected" : ""}>${esc(s.nom)}</option>`).join("")}</select>
        <select id="f-cat"><option value="">Toutes catégories</option>${cats.map((s) => `<option value="${s.id}" ${f.cat === s.id ? "selected" : ""}>${esc(s.nom)}</option>`).join("")}</select>` : ""}
        <input id="f-q" placeholder="Rechercher" value="${esc(f.q || "")}">
        ${peutCreer ? `<a class="btn" href="#/c/${S.clubId}/f/${col.id}/nouveau">+ Ajouter</a>` : ""}
      </div>
      <div class="table">
        <div class="tr th">${colonnes.map((c) => `<span>${esc(c.label)}</span>`).join("")}${col.categorie ? "<span>Catégorie</span>" : ""}</div>
        ${lst.map((d) => `<a class="tr" href="#/c/${S.clubId}/f/${col.id}/${d.id}">${colonnes.map((c) => `<span data-l="${esc(c.label)}">${valeur(c, d[c.id])}</span>`).join("")}${col.categorie ? `<span data-l="Catégorie">${esc(nomCat(d))}</span>` : ""}</a>`).join("") || `<p class="muted vide">Aucun élément.</p>`}
      </div>
      <p class="muted">${lst.length} élément(s) · ${esc(pol(col.id).l === "public" ? "visible par tous" : pol(col.id).l === "public?" ? "public si coché « vitrine »" : "accès réservé")}</p>`, mod.nom);
    const maj = () => { sessionStorage.setItem("filtre", JSON.stringify({ sec: $("#f-sec")?.value || "", cat: $("#f-cat")?.value || "", q: $("#f-q").value })); vueModule(modId, col.id); };
    ["#f-sec", "#f-cat"].forEach((s) => { const e = $(s); if (e) e.onchange = () => { if (s === "#f-sec") $("#f-cat").value = ""; maj(); }; });
    $("#f-q").onchange = maj;
  }

  /* ---------- Fiche : formulaire construit depuis les champs du modèle ---------- */
  function champHtml(ch, v, actif, d) {
    const n = `name="${ch.id}"`, dis = actif ? "" : "disabled";
    const sp = ch.selonSport ? sportDeSection(d.sectionId) : null;
    switch (ch.type) {
      case "texteLong": return `<textarea ${n} ${dis} rows="3">${esc(v)}</textarea>`;
      case "nombre": case "montant": return `<input type="number" inputmode="numeric" ${n} value="${esc(v)}" ${dis}>`;
      case "date": return `<input type="date" ${n} value="${esc(v)}" ${dis}>`;
      case "dateheure": return `<input type="datetime-local" ${n} value="${esc(v)}" ${dis}>`;
      case "heure": return `<input type="time" ${n} value="${esc(v)}" ${dis}>`;
      case "booleen": return `<label class="case"><input type="checkbox" ${n} ${v ? "checked" : ""} ${dis}> Oui</label>`;
      case "choix": return `<select ${n} ${dis}><option value=""></option>${ch.options.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      case "ref": { const l = ch.ref.startsWith("/") ? Object.entries(S.sports).map(([id, s]) => ({ id, ...s })) : S.cache[ch.ref] || [];
        return `<select ${n} ${dis}><option value=""></option>${l.map((x) => `<option value="${esc(x.id)}" ${x.id === v ? "selected" : ""}>${esc(nomDoc(x))}</option>`).join("")}${v && !l.some((x) => x.id === v) ? `<option value="${esc(v)}" selected>${esc(v)}</option>` : ""}</select>`; }
      case "refs": { const l = ch.ref.startsWith("/") ? Object.entries(S.sports).map(([id, s]) => ({ id, ...s })) : S.cache[ch.ref] || [];
        return `<div class="cases" data-refs="${ch.id}">${l.map((x) => `<label class="case"><input type="checkbox" value="${esc(x.id)}" ${(v || []).includes(x.id) ? "checked" : ""} ${dis}> ${esc(nomDoc(x))}</label>`).join("") || `<small class="muted">Rien à choisir</small>`}</div>`; }
      case "liste": return `<textarea ${n} ${dis} rows="3" placeholder="Un élément par ligne">${esc((v || []).join("\n"))}</textarea>`;
      case "map": {
        const cles = sp && sp[ch.selonSport] ? sp[ch.selonSport] : Object.keys(v || {});
        if (sp && sp[ch.selonSport]) return `<div class="grille2" data-map="${ch.id}">${cles.map((k) => `<label class="mini-champ">${esc(k)}<input type="number" data-k="${esc(k)}" value="${esc((v || {})[k] ?? "")}" ${dis}></label>`).join("")}</div>`;
        return `<textarea ${n} data-maptxt="1" ${dis} rows="3" placeholder="clé : valeur (une par ligne)">${esc(Object.entries(v || {}).map(([k, x]) => `${k} : ${x}`).join("\n"))}</textarea>`; }
      default: {
        const liste = sp && sp[ch.selonSport] ? `<datalist id="dl-${ch.id}">${sp[ch.selonSport].map((o) => `<option value="${esc(o)}">`).join("")}</datalist>` : "";
        return `<input type="${ch.type === "tel" ? "tel" : ch.type === "email" ? "email" : "text"}" ${n} value="${esc(v)}" ${dis} ${liste ? `list="dl-${ch.id}"` : ""}>${liste}`; }
    }
  }
  function lireChamp(form, ch) {
    if (ch.type === "refs") return [...form.querySelectorAll(`[data-refs="${ch.id}"] input:checked`)].map((i) => i.value);
    if (ch.type === "map") {
      const g = form.querySelector(`[data-map="${ch.id}"]`);
      if (g) return Object.fromEntries([...g.querySelectorAll("input")].filter((i) => i.value !== "").map((i) => [i.dataset.k, Number(i.value)]));
      const t = form.elements[ch.id]; return Object.fromEntries(t.value.split("\n").map((l) => l.split(":")).filter((p) => p[0].trim()).map(([k, ...r]) => [k.trim(), isNaN(r.join(":").trim()) ? r.join(":").trim() : Number(r.join(":").trim())]));
    }
    const e = form.elements[ch.id]; if (!e) return undefined;
    if (ch.type === "booleen") return e.checked;
    if (ch.type === "nombre" || ch.type === "montant") return e.value === "" ? null : Math.round(Number(e.value));
    if (ch.type === "liste") return e.value.split("\n").map((x) => x.trim()).filter(Boolean);
    return e.value.trim();
  }
  async function vueFiche(colId, id) {
    const col = colDef(colId), P = pol(colId);
    if (!col || !P || !moduleOn(P.m)) return coquille(`<div class="carte">Fiche inconnue.</div>`);
    const refs = col.champs.filter((c) => c.type === "ref" || c.type === "refs").map((c) => c.ref).filter((r) => !r.startsWith("/"));
    await Promise.all(refs.map(charger));
    const nouveau = id === "nouveau";
    const pre = nouveau ? JSON.parse(sessionStorage.getItem("prefill") || "{}") : {}; sessionStorage.removeItem("prefill");
    const d = nouveau ? pre : (S.cache[colId] || []).find((x) => x.id === id) || (await B.lire(S.clubId, colId, id).catch(() => null));
    if (!d || (!nouveau && !D.lecture(P, d, id))) return coquille(`<div class="carte">Fiche introuvable ou réservée.</div>`);
    const total = nouveau ? D.can(P.e) : D.ecriture(P, d);
    const rep = nouveau ? [] : D.champsReponse(P, d, id);
    const secs = (S.cache.sections || []).filter((s) => total && (D.president() || D.perimetre().includes("*") || D.perimetre().includes(s.id) || (S.cache.categories || []).some((c) => c.sectionId === s.id && D.perimetre().includes(c.id))));
    const cats = (S.cache.categories || []);
    const liens = nouveau ? "" : await liensHtml(colId, d, id);
    const forme = !nouveau && colId === "personnes" && d.type === "joueur" && moduleOn("sportif") ? await ficheFormeHtml({ ...d, id }) : "";
    coquille(`${forme}<form class="carte fiche" id="fiche">
      <div class="fiche-tete"><a href="javascript:history.back()" class="lien">← Retour</a><h2>${esc(nouveau ? "Nouveau : " + col.nom : nomDoc(d))}</h2></div>
      ${col.categorie ? `<div class="grille2">
        <label>Section<select name="sectionId" ${total ? "" : "disabled"}><option value="">(tout le club)</option>${(total ? secs : S.cache.sections || []).map((s) => `<option value="${s.id}" ${s.id === d.sectionId ? "selected" : ""}>${esc(s.nom)}</option>`).join("")}</select></label>
        <label>Catégorie<select name="categorieId" ${total ? "" : "disabled"}><option value="">(toute la section)</option>${cats.map((c) => `<option value="${c.id}" data-sec="${c.sectionId}" ${c.id === d.categorieId ? "selected" : ""}>${esc(c.nom)}</option>`).join("")}</select></label></div>` : ""}
      ${col.champs.filter((ch) => !ch.systeme && (!ch.cache || total)).map((ch) => `<label class="${ch.type === "texteLong" || ch.type === "refs" || ch.type === "map" ? "large" : ""}">${esc(ch.label)}${ch.requis ? " *" : ""}${rep.includes(ch.id) ? ` <small class="ok">modifiable par vous</small>` : ""}
        ${champHtml(ch, d[ch.id], total || rep.includes(ch.id), d)}</label>`).join("")}
      <div class="actions">
        ${total || rep.length ? `<button class="btn" type="submit">Enregistrer</button>` : `<span class="muted">Lecture seule pour votre profil.</span>`}
        ${!nouveau && total && !P.garder ? `<button class="btn danger" type="button" id="suppr">Supprimer</button>` : ""}
        ${!nouveau && d.maj ? `<small class="muted">Modifié ${esc(typeof d.maj === "string" ? d.maj.slice(0, 16).replace("T", " ") : "")}</small>` : ""}
      </div></form>${liens}`, col.nom);
    const form = $("#fiche");
    const secSel = form.elements.sectionId, catSel = form.elements.categorieId;
    if (secSel && total) { const filtre = () => [...catSel.options].forEach((o) => (o.hidden = !!o.value && !!secSel.value && o.dataset.sec !== secSel.value)); secSel.onchange = () => { catSel.value = ""; filtre(); }; filtre(); }
    form.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const data = {};
      const editables = (total ? col.champs : col.champs.filter((c) => rep.includes(c.id))).filter((c) => !c.systeme);
      for (const ch of editables) { const v = lireChamp(form, ch); if (v !== undefined) data[ch.id] = v; if (ch.requis && (v === "" || v === null || v === undefined)) throw new Error(`« ${ch.label} » est obligatoire`); }
      if (total && col.categorie) {
        data.sectionId = secSel.value; data.categorieId = catSel.value;
        if (data.categorieId && !data.sectionId) data.sectionId = (cats.find((c) => c.id === data.categorieId) || {}).sectionId || "";
        if (!D.perimetreOk(data.sectionId, data.categorieId)) throw new Error("hors de votre périmètre");
      }
      const nid = await B.ecrire(S.clubId, colId, nouveau ? null : id, data);
      vider(colId); location.hash = `#/c/${S.clubId}/f/${colId}/${nid}`; if (!nouveau) vueFiche(colId, nid);
    }, "Enregistré"); };
    const sup = $("#suppr"); if (sup) sup.onclick = () => action(async () => { await B.supprimer(S.clubId, colId, id); vider(colId); history.back(); }, "Supprimé");
  }

  // Tout ce qui pointe vers cette fiche, lu dans le modèle : pour un joueur ses convocations, présences, stats, blessures,
  // échéances… ; pour une séance ses convocations et présences. Chaque bloc a son « + Ajouter » pré-rempli.
  // nom lisible d'une fiche liée : son titre, sinon ce qu'elle référence d'autre (la séance d'une convocation), sinon sa date
  function titreLie(c, ch, x) {
    if (nomDoc(x) !== x.id) return nomDoc(x);
    const autre = c.champs.find((k) => k.type === "ref" && k.id !== ch.id && x[k.id] && !k.ref.startsWith("/"));
    const cible = autre && (S.cache[autre.ref] || []).find((y) => y.id === x[autre.id]);
    const date = x.date || x.debut || x.du || (cible && cible.debut) || "";
    return [cible ? nomDoc(cible) : c.nom, date ? dateFr(date) : ""].filter(Boolean).join(" · ");
  }
  async function liensHtml(colId, d, id) {
    const liens = [];
    for (const m of modules()) for (const c of m.collections) {
      const P2 = pol(c.id); if (!lisible(P2)) continue;
      for (const ch of c.champs) if ((ch.type === "ref" || ch.type === "refs") && ch.ref === colId) liens.push({ c, ch, P2 });
    }
    if (!liens.length) return "";
    await Promise.all([...new Set(liens.flatMap((l) => [l.c.id, ...l.c.champs.filter((k) => k.type === "ref" && !k.ref.startsWith("/")).map((k) => k.ref)]))].map(charger));
    const blocs = liens.map(({ c, ch, P2 }) => {
      const lst = (S.cache[c.id] || []).filter((x) => (ch.type === "refs" ? (x[ch.id] || []).includes(id) : x[ch.id] === id));
      const tri = c.champs.find((z) => ["debut", "date", "du"].includes(z.id)); if (tri) lst.sort((a, b) => ((a[tri.id] || "") < (b[tri.id] || "") ? 1 : -1));
      const pre = { [ch.id]: ch.type === "refs" ? [id] : id }; if (c.categorie && d.sectionId) { pre.sectionId = d.sectionId; pre.categorieId = d.categorieId || ""; }
      const ajout = D.can(P2.e) ? `<a class="btn petit clair" href="#/c/${S.clubId}/f/${c.id}/nouveau" data-pre='${esc(JSON.stringify(pre))}'>+ Ajouter</a>` : "";
      if (!lst.length && !ajout) return "";
      const det = (x) => { const z = c.champs.find((k) => k.id !== ch.id && ["choix", "date", "dateheure", "nombre", "montant"].includes(k.type) && x[k.id] != null && x[k.id] !== ""); return z ? valeur(z, x[z.id]) : ""; };
      return `<div class="lien-bloc"><div class="lien-tete"><b>${esc(c.nom)}</b><span class="compte-puce">${lst.length}</span>${ajout}</div>
        ${lst.slice(0, 4).map((x) => `<a class="ligne" href="#/c/${S.clubId}/f/${c.id}/${x.id}"><span>${esc(titreLie(c, ch, x))}</span><small class="muted">${det(x)}</small></a>`).join("")}
        ${lst.length > 4 ? `<a class="lien" href="#/c/${S.clubId}/m/${pol(c.id).m}/${c.id}">Voir les ${lst.length}</a>` : ""}</div>`;
    }).filter(Boolean);
    return blocs.length ? `<div class="carte"><h3>Lié à cette fiche</h3>${blocs.join("")}</div>` : "";
  }

  /* ---------- Pointage : le staff affiche un code, le joueur le saisit en arrivant ---------- */
  async function vuePointage() {
    const evts = await charger("evenements");
    const auj = new Date().toISOString().slice(0, 10);
    const proches = evts.filter((e) => (e.debut || "").slice(0, 10) >= new Date(Date.now() - 864e5).toISOString().slice(0, 10)).sort((a, b) => (a.debut > b.debut ? 1 : -1)).slice(0, 20);
    const staff = D.can("sportif");
    const choisi = sessionStorage.getItem("pt-evt") || (proches.find((e) => D.dansPerimetre(e) || D.mesPersonnes().length) || {}).id || "";
    let html = `<div class="carte"><h3>Séance ou match</h3><select id="pt-evt">${proches.map((e) => `<option value="${e.id}" ${e.id === choisi ? "selected" : ""}>${dateFr(e.debut)} · ${esc(nomDoc(e))} (${esc(nomCat(e))})</option>`).join("")}</select></div>`;
    const evt = proches.find((e) => e.id === choisi);
    if (evt && staff && D.dansPerimetre(evt)) {
      const code = await B.lireCode(S.clubId, evt.id).catch(() => null);
      const valide = code && new Date(code.expire) > new Date();
      const pts = await B.pointages(S.clubId, evt.id).catch(() => []);
      const ps = (await charger("personnes")).filter((p) => p.type === "joueur" && (evt.categorieId ? p.categorieId === evt.categorieId : p.sectionId === evt.sectionId));
      html += `<div class="carte centre"><h3>Code du jour</h3>${valide ? `<div class="code">${esc(code.code)}</div><p class="muted">Valable jusqu'à ${new Date(code.expire).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Les joueurs le saisissent dans l'appli en arrivant.</p>` : `<p class="muted">Pas de code actif.</p>`}
        <button class="btn" id="pt-gen">${valide ? "Nouveau code" : "Générer le code (3 h)"}</button></div>
        <div class="carte"><h3>Présents : ${pts.length} / ${ps.length}</h3>${ps.map((p) => { const ok = pts.find((x) => x.personneId === p.id);
          return `<div class="ligne"><span>${esc(nomDoc(p))}</span>${ok ? `<span class="ok">✓ ${ok.manuel ? "pointé par le staff" : "a pointé"}</span>` : `<button class="mini" data-man="${p.id}">Pointer</button>`}</div>`; }).join("") || `<p class="muted">Aucun joueur dans cette catégorie.</p>`}</div>`;
    }
    if (evt && D.mesPersonnes().length && S.membre.personneId) {
      html += `<div class="carte centre"><h3>Je suis arrivé</h3><input id="pt-code" inputmode="numeric" maxlength="8" placeholder="Code donné par le coach" class="gros"><button class="btn" id="pt-go">Pointer</button></div>`;
    }
    if (!evt) html += `<p class="muted">Aucun événement proche.</p>`;
    coquille(html, "Pointage");
    $("#pt-evt") && ($("#pt-evt").onchange = (e) => { sessionStorage.setItem("pt-evt", e.target.value); vuePointage(); });
    const gen = $("#pt-gen"); if (gen) gen.onclick = () => action(async () => {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      await B.creerCode(S.clubId, evt.id, { code, expire: new Date(Date.now() + 3 * 3600e3).toISOString(), sectionId: evt.sectionId || "", categorieId: evt.categorieId || "" }); vuePointage();
    }, "Code créé");
    app.querySelectorAll("[data-man]").forEach((b) => (b.onclick = () => action(async () => { await B.pointer(S.clubId, evt.id, b.dataset.man, "", { manuel: true, sectionId: evt.sectionId || "", categorieId: evt.categorieId || "" }); vuePointage(); }, "Pointé")));
    const go = $("#pt-go"); if (go) go.onclick = () => action(async () => { await B.pointer(S.clubId, evt.id, S.membre.personneId, $("#pt-code").value.trim(), { sectionId: evt.sectionId || "", categorieId: evt.categorieId || "" }); }, "Présence enregistrée ✓");
  }

  /* ---------- Caisse : reçus numérotés, jamais effacés ---------- */
  async function vueCaisse() {
    const fin = D.can("finances");
    const [ps, echs] = await Promise.all([charger("personnes"), charger("echeances")]);
    const recus = await B.paiements(S.clubId).catch(() => []);
    let html = "";
    if (fin) html += `<form class="carte" id="enc"><h3>Encaisser</h3><div class="grille2">
      <label>Personne<select name="personneId"><option value="">(autre payeur)</option>${ps.map((p) => `<option value="${p.id}">${esc(nomDoc(p))}</option>`).join("")}</select></label>
      <label>Échéance<select name="echeanceId"><option value="">(aucune)</option>${echs.filter((e) => e.statut !== "payé").map((e) => `<option value="${e.id}" data-p="${e.personneId}">${esc(nomDoc(ps.find((p) => p.id === e.personneId)) + " · " + (e.libelle || "") + " · reste " + argent((e.montant || 0) - (e.paye || 0)))}</option>`).join("")}</select></label>
      <label>Montant<input name="montant" type="number" inputmode="numeric" required></label>
      <label>Mode<select name="mode">${["espèces", "wave", "orange money", "virement", "chèque"].map((m) => `<option>${m}</option>`).join("")}</select></label>
      <label class="large">Motif<input name="motif" placeholder="Cotisation, tournoi, maillot…"></label></div>
      <button class="btn">Encaisser et numéroter le reçu</button></form>`;
    html += `<div class="carte"><h3>${fin ? "Reçus" : "Mes reçus"}</h3>${recus.map((r) => `<div class="ligne"><div><b>Reçu n° ${r.numero}</b> · ${esc(nomDoc(ps.find((p) => p.id === r.personneId)) || r.payeur || "")}<br><small>${esc(r.motif || "")} · ${esc(r.mode)} · ${esc(String(r.date || "").slice(0, 10))}</small></div><b>${argent(r.montant)}</b></div>`).join("") || `<p class="muted">Aucun reçu.</p>`}</div>`;
    coquille(html, "Caisse");
    const f = $("#enc"); if (f) f.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const montant = Math.round(Number(f.montant.value)); if (!montant) throw new Error("montant manquant");
      const ech = echs.find((x) => x.id === f.echeanceId.value);
      const pers = ps.find((p) => p.id === (f.personneId.value || (ech && ech.personneId)));
      const n = await B.encaisser(S.clubId, { personneId: pers ? pers.id : "", echeanceId: ech ? ech.id : "", montant, mode: f.mode.value, motif: f.motif.value.slice(0, 120), sectionId: (pers || {}).sectionId || "", categorieId: (pers || {}).categorieId || "" });
      if (ech) { const paye = (ech.paye || 0) + montant; await B.ecrire(S.clubId, "echeances", ech.id, { paye, statut: paye >= ech.montant ? "payé" : "partiel" }); vider("echeances"); }
      toast(`Reçu n° ${n} enregistré`); vueCaisse();
    }); };
  }

  /* ---------- Membres : demandes, rôles, périmètres, liens joueur/parent ---------- */
  async function vueMembres() {
    const ms = (await B.membres(S.clubId)).sort((a, b) => (a.actif === b.actif ? 0 : a.actif ? 1 : -1));
    const ps = await charger("personnes");
    const monNiv = D.niveau(S.membre.role);
    const roles = [["membre", "Membre (joueur, parent, supporter)"], ...Object.entries(S.R).filter(([, r]) => r.niveau < monNiv).sort((a, b) => b[1].niveau - a[1].niveau).map(([id, r]) => [id, `${r.nom} (${r.niveau})`])];
    const zones = [["*", "Tout le club"], ...(S.cache.sections || []).map((s) => [s.id, s.nom]), ...(S.cache.categories || []).map((c) => [c.id, "· " + c.nom + " (" + ((S.cache.sections || []).find((s) => s.id === c.sectionId) || {}).nom + ")"])]
      .filter(([z]) => D.president() || D.perimetre().includes("*") || D.perimetre().includes(z));
    coquille(`<p class="muted">Le rôle dit ce qu'un compte peut faire, le périmètre dit sur quelles sections ou catégories. Un parent est un membre lié aux fiches de ses enfants.</p>
      ${ms.map((m) => { const modif = m.uid !== B.uid && D.niveau(m.role) < monNiv;
        return `<form class="carte membre" data-uid="${esc(m.uid)}"><div class="ligne"><div><b>${esc(m.nom || m.uid)}</b> ${m.actif ? "" : `<span class="badge alerte">demande</span>`}<br><small class="muted">${esc([m.tel, m.message].filter(Boolean).join(" · "))}</small></div>
          ${modif ? `<label class="case"><input type="checkbox" name="actif" ${m.actif ? "checked" : ""}> Actif</label>` : `<span class="badge">${esc(m.role === "president" ? "Président" : (S.R[m.role] || {}).nom || m.role)}</span>`}</div>
          ${m.profil && Object.keys(m.profil).length ? `<details ${m.actif ? "" : "open"}><summary>Profil : ${esc(m.profil.profil || "")}${m.profil.categorieSouhaitee ? " · souhaite " + esc(nomCat({ categorieId: m.profil.categorieSouhaitee, sectionId: m.profil.sectionSouhaitee })) : ""}</summary>
            <div class="profil-det">${champsCompte().filter((ch) => m.profil[ch.id] !== undefined && m.profil[ch.id] !== "" && ch.id !== "profil").map((ch) => `<span><small>${esc(ch.label)}</small>${valeur(ch, m.profil[ch.id])}</span>`).join("")}</div>
            ${modif && !m.personneId && D.can("effectif") ? `<button type="button" class="btn petit clair" data-fiche>Créer sa fiche ${esc(TYPE_FICHE[m.profil.profil] || "membre")} depuis ce profil</button>` : ""}</details>` : ""}
          ${modif ? `<div class="grille2"><label>Rôle<select name="role">${roles.map(([id, n]) => `<option value="${id}" ${id === m.role ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
            <label>Sa fiche (joueur ou staff)<select name="personneId"><option value="">(aucune)</option>${ps.map((p) => `<option value="${p.id}" ${p.id === m.personneId ? "selected" : ""}>${esc(nomDoc(p))}</option>`).join("")}</select></label></div>
            <details><summary>Périmètre (${(m.perimetre || []).length || "aucun"}) et enfants (${(m.enfants || []).length})</summary>
              <div class="cases" data-k="perimetre">${zones.map(([z, n]) => `<label class="case"><input type="checkbox" value="${esc(z)}" ${(m.perimetre || []).includes(z) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div>
              <h4>Enfants (pour un parent)</h4><div class="cases" data-k="enfants">${ps.filter((p) => p.type === "joueur").map((p) => `<label class="case"><input type="checkbox" value="${p.id}" ${(m.enfants || []).includes(p.id) ? "checked" : ""}> ${esc(nomDoc(p))}</label>`).join("")}</div></details>
            <button class="btn petit">Enregistrer</button>` : ""}</form>`; }).join("")}`, "Membres");
    app.querySelectorAll("[data-fiche]").forEach((b) => (b.onclick = () => action(async () => {
      const f = b.closest("form"); const m = ms.find((x) => x.uid === f.dataset.uid);
      const pid = await creerFicheDepuisProfil(m);
      await B.ecrireMembre(S.clubId, m.uid, { personneId: pid, actif: true }); vueMembres();
    }, "Fiche créée, liée et compte activé")));
    app.querySelectorAll("form.membre").forEach((f) => (f.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const coche = (k) => [...f.querySelectorAll(`[data-k=${k}] input:checked`)].map((i) => i.value);
      await B.ecrireMembre(S.clubId, f.dataset.uid, { actif: f.actif.checked, role: f.role.value, personneId: f.personneId.value, perimetre: coche("perimetre"), enfants: coche("enfants") });
    }, "Membre mis à jour"); }));
  }

  /* ---------- Couleurs du club : appliquées à toute l'appli, texte clair ou foncé selon la couleur ---------- */
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const luminance = (h) => { const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  function appliquerCouleurs(principale = "#0B5D3B", accent = "#F2B705") {
    const st = document.documentElement.style;
    st.setProperty("--club", principale); st.setProperty("--accent", accent);
    st.setProperty("--on-club", luminance(principale) > 0.45 ? "#111" : "#fff");
    st.setProperty("--on-accent", luminance(accent) > 0.45 ? "#111" : "#fff");
    let m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = principale;
  }
  // Logo du club dans l'onglet et pour l'icône iPhone (« Sur l'écran d'accueil »). Sur Android, Chrome fabrique l'appli
  // installée depuis le fichier manifest.webmanifest, qui doit être un vrai fichier en ligne : l'icône Android reste donc
  // celle de la plateforme (docs/icons/), ou celle du club si l'appli lui est dédiée (remplacer docs/icons/logo.svg).
  function iconeClub(club) {
    const logo = club && club.logo; if (!logo) return;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 180;
      const k = Math.min(180 / img.width, 180 / img.height) * 0.92, w = img.width * k, h = img.height * k;
      cv.getContext("2d").drawImage(img, (180 - w) / 2, (180 - h) / 2, w, h);
      const url = cv.toDataURL("image/png");
      const lien = (rel) => { let l = document.querySelector(`link[rel="${rel}"]`); if (!l) { l = document.createElement("link"); l.rel = rel; document.head.appendChild(l); } return l; };
      lien("icon").href = url; lien("apple-touch-icon").href = url;
    };
    img.src = logo;
    let t = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (!t) { t = document.createElement("meta"); t.name = "apple-mobile-web-app-title"; document.head.appendChild(t); }
    t.content = (club.nomCourt || club.nom).slice(0, 15);
  }

  // Logo chargé depuis le téléphone : réduit à 512 px (léger, stocké dans la fiche du club) et couleurs dominantes extraites
  function lireLogo(fichier) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const t = 512, k = Math.min(1, t / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, cv.width, cv.height);
        // PNG pour garder la forme (fond transparent) ; plus compact si l'image est lourde
        let url = cv.toDataURL("image/png");
        if (url.length > 350000) url = cv.toDataURL("image/webp", 0.85);
        // couleurs : petite image, regroupement par teinte proche, on écarte transparent, blanc et gris très clairs
        const p = document.createElement("canvas"); p.width = p.height = 64;
        const px = p.getContext("2d"); px.drawImage(img, 0, 0, 64, 64);
        const data = px.getImageData(0, 0, 64, 64).data, seaux = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 128 || Math.min(r, g, b) > 225) continue;
          const cle = (r >> 5) + "," + (g >> 5) + "," + (b >> 5);
          const s = seaux.get(cle) || { n: 0, r: 0, g: 0, b: 0 }; s.n++; s.r += r; s.g += g; s.b += b; seaux.set(cle, s);
        }
        const tri = [...seaux.values()].sort((a, b) => b.n - a.n).map((s) => [s.r / s.n, s.g / s.n, s.b / s.n]);
        const choisies = [];
        for (const c of tri) { if (choisies.every((d) => Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) > 70)) choisies.push(c); if (choisies.length === 6) break; }
        URL.revokeObjectURL(img.src);
        ok({ url, couleurs: choisies.map(rgbHex) });
      };
      img.onerror = () => ko(new Error("image illisible"));
      img.src = URL.createObjectURL(fichier);
    });
  }

  /* ---------- Réglages du club : fiche, couleurs, rôles (président) ---------- */
  async function vueReglages() {
    const c = S.club, droits = S.modele.modules.droits;
    let html = "";
    if (D.can("reglages")) html += `<form class="carte" id="rg-club"><h3>Fiche du club</h3>
      <div class="logo-zone"><img id="rg-apercu" src="${esc(c.logo || "icons/logo.svg")}" alt="Logo">
        <div><label class="btn clair petit">📷 Charger le logo<input type="file" accept="image/*" id="rg-fichier" hidden></label>
        <p class="muted">L'appli lit les couleurs du logo et les propose ci-dessous.</p></div></div>
      <input type="hidden" name="logo" value="${esc(c.logo || "")}">
      <div id="rg-palette-zone" hidden><p class="muted">Couleurs du logo. Touchez une couleur pour la mettre en
        <label class="case"><input type="radio" name="cible" value="principale" checked> principale</label><label class="case"><input type="radio" name="cible" value="accent"> accent</label></p>
        <div id="rg-palette" class="palette"></div></div>
      <div class="grille2">
      ${[["nom", "Nom"], ["nomCourt", "Nom court"], ["slogan", "Slogan"], ["ville", "Ville"], ["tel", "Téléphone"], ["whatsapp", "WhatsApp (221…)"], ["devise", "Devise"]].map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(c[k] || "")}"></label>`).join("")}
      <label>Couleur principale<input type="color" name="principale" value="${esc((c.couleurs || {}).principale || "#0B5D3B")}"></label>
      <label>Couleur d'accent<input type="color" name="accent" value="${esc((c.couleurs || {}).accent || "#F2B705")}"></label></div>
      <p class="muted">Modules souscrits : ${esc((c.modules || []).join(", ") || "aucun")} (gérés par l'admin de la plateforme).</p><button class="btn">Enregistrer</button></form>`;
    if (D.president()) html += `<form class="carte" id="rg-roles"><h3>Rôles du club</h3><p class="muted">Créez vos propres rôles (niveau 1 à 99). Un membre ne donne que des rôles sous son niveau.</p>
      ${Object.entries(S.R).sort((a, b) => b[1].niveau - a[1].niveau).map(([id, r]) => roleHtml(id, r, droits)).join("")}
      <div id="rg-nouveaux"></div><div class="actions"><button type="button" class="btn clair" id="rg-add">+ Nouveau rôle</button><button class="btn">Enregistrer les rôles</button></div></form>`;
    coquille(html || `<div class="carte">Rien à régler pour votre profil.</div>`, "Réglages");
    const fc = $("#rg-club");
    if (fc) {
      const apercu = () => appliquerCouleurs(fc.principale.value, fc.accent.value);
      fc.principale.oninput = apercu; fc.accent.oninput = apercu;
      $("#rg-fichier").onchange = (e) => action(async () => {
        const f = e.target.files[0]; if (!f) return;
        const { url, couleurs } = await lireLogo(f);
        fc.logo.value = url; $("#rg-apercu").src = url;
        if (couleurs[0]) fc.principale.value = couleurs[0];
        if (couleurs[1]) fc.accent.value = couleurs[1];
        apercu();
        $("#rg-palette-zone").hidden = false;
        $("#rg-palette").innerHTML = couleurs.map((h) => `<button type="button" class="pastille" style="background:${h}" data-h="${h}" title="${h}"></button>`).join("");
        app.querySelectorAll(".pastille").forEach((b) => (b.onclick = () => { fc[fc.querySelector("[name=cible]:checked").value].value = b.dataset.h; apercu(); }));
      }, "Logo chargé : vérifiez les couleurs puis Enregistrer");
    }
    if (fc) fc.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const data = Object.fromEntries(["nom", "nomCourt", "slogan", "ville", "tel", "whatsapp", "logo", "devise"].map((k) => [k, fc[k].value.trim()]));
      data.couleurs = { principale: fc.principale.value, accent: fc.accent.value };
      await B.majClub(S.clubId, data); S.clubId = null; route();
    }, "Club mis à jour"); };
    const fr = $("#rg-roles"); if (fr) {
      $("#rg-add").onclick = () => { const id = "role_" + Date.now().toString(36); $("#rg-nouveaux").insertAdjacentHTML("beforeend", roleHtml(id, { nom: "", niveau: 20, droits: [] }, droits)); };
      fr.onsubmit = (e) => { e.preventDefault(); action(async () => {
        const roles = {};
        fr.querySelectorAll(".role").forEach((r) => { const nom = r.querySelector("[name=nom]").value.trim(); if (!nom) return;
          roles[r.dataset.id] = { nom, niveau: Math.max(1, Math.min(99, Number(r.querySelector("[name=niveau]").value) || 1)), droits: [...r.querySelectorAll("input[type=checkbox]:checked")].map((i) => i.value) }; });
        await B.ecrireRoles(S.clubId, roles); S.clubId = null; route();
      }, "Rôles enregistrés"); };
    }
  }
  const roleHtml = (id, r, droits) => `<div class="role" data-id="${esc(id)}"><div class="grille2"><input name="nom" value="${esc(r.nom)}" placeholder="Nom du rôle (vide = supprimé)"><input name="niveau" type="number" min="1" max="99" value="${r.niveau}"></div>
    <div class="cases">${Object.entries(droits).map(([d, t]) => `<label class="case" title="${esc(t)}"><input type="checkbox" value="${d}" ${r.droits.includes(d) ? "checked" : ""}> ${esc(d)}</label>`).join("")}</div></div>`;

  /* ---------- Espace admin de la plateforme : clubs, licences, modèle, sports ---------- */
  async function vueAdmin(onglet = "clubs") {
    S.modele = await B.modele();
    const ong = `<div class="onglets">${[["clubs", "Clubs"], ["modele", "Modèle"], ["sports", "Sports"], ["connexion", "Connexion"]].map(([k, t]) => `<a href="#/admin/${k}" class="${k === onglet ? "actif" : ""}">${t}</a>`).join("")}</div>`;
    const optionnels = modules().filter((m) => !m.obligatoire);
    if (onglet === "clubs") {
      const clubs = await B.clubs();
      const lien = (c) => location.origin + location.pathname + "#/c/" + c.id;
      coquille(ong + `<form class="carte" id="nv-club"><h3>Nouveau club</h3>
          <label>Nom du club<input name="nom" placeholder="ex. Lerrgui FC" required></label>
          <label>Ville<input name="ville" placeholder="ex. Dakar"></label>
          <label>Téléphone du président<input name="ptel" type="tel" inputmode="tel" placeholder="Laisser vide si c'est vous"></label>
          <details><summary>Modules inclus : tous</summary><div class="cases">${optionnels.map((m) => `<label class="case"><input type="checkbox" value="${m.id}" checked> ${esc(m.nom)}</label>`).join("")}</div></details>
          <button class="btn large-btn">Créer le club</button></form>
        <h3 class="titre-sec">Clubs <span class="muted">${clubs.length}</span></h3>
        ${clubs.map((c) => `<form class="carte club-adm" data-id="${esc(c.id)}"><div class="ligne"><div class="club-id">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : `<i>${esc((c.nom || "?").slice(0, 2).toUpperCase())}</i>`}<div><b>${esc(c.nom)}</b><br><small class="muted">${esc(c.ville || "")}</small></div></div>
            <span class="pill ${c.active ? "on" : "off"}">${c.active ? "Actif" : "Suspendu"}</span></div>
          <div class="actions"><a class="btn petit" href="#/c/${esc(c.id)}">Ouvrir</a><a class="btn petit clair" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(c.nom + " sur " + P.nom + " : " + lien(c))}">Partager le lien</a></div>
          <details><summary>Président</summary><label>Téléphone du président<input name="ptel" type="tel" inputmode="tel" placeholder="Laisser vide si c'est vous"></label><button type="button" class="btn petit" data-pres>Nommer président</button></details>
          <details><summary>Licence et modules</summary><label class="case"><input type="checkbox" name="active" ${c.active ? "checked" : ""}> Licence active</label>
            <div class="cases">${optionnels.map((m) => `<label class="case"><input type="checkbox" value="${m.id}" ${(c.modules || []).includes(m.id) ? "checked" : ""}> ${esc(m.nom)}</label>`).join("")}</div>
            <label>Offre<input name="offre" placeholder="ex. essentielle, complète" value="${esc(c.offre || "")}"></label><button class="btn petit">Enregistrer</button></details></form>`).join("")}`, "Admin plateforme");
      // le président se choisit par son numéro (il doit s'être connecté une fois) ; vide = soi-même
      const nommer = async (clubId, saisie) => {
        if (!saisie.trim()) { const c = B.compte || {}; await B.nommerPresident(clubId, B.uid, [c.prenom, c.nom].filter(Boolean).join(" ") || "Président"); return "vous"; }
        const tel = telComplet(saisie); if (tel.replace(/\D/g, "").length < 9) throw new Error("numéro incomplet");
        const u = await B.compteParTel(tel);
        if (!u) throw new Error(`${tel} ne s'est pas encore connecté à l'appli. Envoyez-lui le lien ; dès sa première connexion, revenez appuyer sur « Nommer président ».`);
        await B.nommerPresident(clubId, u.uid, [u.prenom, u.nom].filter(Boolean).join(" ") || tel); return [u.prenom, u.nom].filter(Boolean).join(" ") || tel;
      };
      app.querySelectorAll(".club-adm").forEach((f) => {
        f.onsubmit = (e) => { e.preventDefault(); action(() => B.majLicence(f.dataset.id, { active: f.active.checked, offre: f.offre.value.trim(), modules: [...f.querySelectorAll(".cases input:checked")].map((i) => i.value) }).then(() => vueAdmin("clubs")), "Licence enregistrée"); };
        f.querySelector("[data-pres]").onclick = () => action(async () => { const qui = await nommer(f.dataset.id, f.ptel.value); toast("Président nommé : " + qui); });
      });
      $("#nv-club").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => {
        const nom = f.nom.value.trim();
        const base = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "club";
        let id = base, n = 2; while (clubs.some((c) => c.id === id)) id = `${base}-${n++}`;
        await B.creerClub(id, { nom, ville: f.ville.value.trim(), pays: "Sénégal", devise: "F CFA", active: true, modules: [...f.querySelectorAll(".cases input:checked")].map((i) => i.value), offre: "" });
        let qui = ""; try { qui = await nommer(id, f.ptel.value); } catch (er) { toast(er.message); }
        location.hash = qui === "vous" ? "#/c/" + id : "#/admin/clubs"; if (qui !== "vous") vueAdmin("clubs");
      }, "Club créé"); };
    }
    if (onglet === "modele") {
      const mods = S.modele.modules, droits = mods.droits;
      const cols = modules().flatMap((m) => m.collections.map((c) => [m.id + "/" + c.id, `${m.nom} › ${c.nom}`]));
      coquille(ong + `<div class="carte"><h3>Modèle publié</h3><p>${S.modele.nonPublie ? `<b class="alerte">Pas encore publié</b> : les règles refusent tout tant que le modèle n'est pas dans Firestore.` : `Version du ${new Date(S.modele.version).toLocaleString("fr-FR")}`} · ${modules().length} modules · ${Object.keys(S.modele.politique).length} collections · ${Object.keys(S.modele.roles).length} rôles de départ.</p>
          <p class="muted">Tout ce qui est ici s'applique tout de suite à tous les clubs, sans recoller les règles Firestore.</p>
          <button class="btn clair" id="md-fichiers">Republier depuis les fichiers du dépôt (docs/modele)</button></div>
        <form class="carte" id="md-champ"><h3>Ajouter un champ</h3><div class="grille2">
          <select name="col">${cols.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}</select>
          <input name="id" placeholder="id (ex. groupeSanguin)" required pattern="[a-zA-Z][a-zA-Z0-9_]*"><input name="label" placeholder="Libellé (ex. Groupe sanguin)" required>
          <select name="type">${["texte", "texteLong", "nombre", "montant", "date", "dateheure", "heure", "booleen", "choix", "tel", "email", "image", "lien", "liste", "map"].map((t) => `<option>${t}</option>`).join("")}</select>
          <input name="options" placeholder="Options si « choix » (séparées par des virgules)"></div><button class="btn">Ajouter et publier</button></form>
        <form class="carte" id="md-col"><h3>Ajouter une collection</h3><div class="grille2">
          <select name="mod">${modules().map((m) => `<option value="${m.id}">${esc(m.nom)}</option>`).join("")}<option value="__nouveau">+ nouveau module…</option></select>
          <input name="nmod" placeholder="Nouveau module : id|Nom|icône (ex. boutique|Boutique|🛍️)">
          <input name="id" placeholder="id (ex. equipements)" required pattern="[a-z][a-z0-9_]*"><input name="nom" placeholder="Nom affiché" required>
          <label>Lecture<select name="lire">${["public", "public?", "membre", ...Object.keys(droits)].map((x) => `<option>${x}</option>`).join("")}</select></label>
          <label>Écriture (droit)<select name="ecrire">${Object.keys(droits).map((x) => `<option>${x}</option>`).join("")}</select></label></div>
          <div class="cases"><label class="case"><input type="checkbox" name="categorie" checked> Par section / catégorie</label><label class="case"><input type="checkbox" name="perso"> Le joueur concerné la voit (champ personneId)</label><label class="case"><input type="checkbox" name="garder"> Jamais supprimée</label></div>
          <button class="btn">Ajouter et publier</button></form>
        <form class="carte" id="md-droit"><h3>Ajouter un droit</h3><div class="grille2"><input name="id" placeholder="id (ex. boutique)" required pattern="[a-z][a-z0-9_]*"><input name="t" placeholder="Description"></div><button class="btn">Ajouter et publier</button></form>
        <details class="carte"><summary><b>Éditer tout le modèle (JSON)</b></summary><p class="muted">Pour les changements avancés (renommer, supprimer, rôles de départ). Vérifié avant publication.</p>
          <label>modules.json<textarea id="md-json" rows="16" class="mono">${esc(JSON.stringify(mods, null, 2))}</textarea></label>
          <label>Rôles de départ<textarea id="md-roles" rows="8" class="mono">${esc(JSON.stringify({ roles: S.modele.roles }, null, 2))}</textarea></label>
          <button class="btn" id="md-pub">Vérifier et publier</button><pre id="md-err" class="erreur"></pre></details>`, "Modèle de la plateforme");
      const publier = async (m, r) => {
        const { erreurs, doc } = Modele.compiler(m, r);
        if (erreurs.length) { $("#md-err") && ($("#md-err").textContent = erreurs.join("\n")); throw new Error(erreurs[0]); }
        await B.publierModele(doc); S.modele = await B.modele(); vueAdmin("modele");
      };
      const copieMods = () => JSON.parse(JSON.stringify(S.modele.modules));
      const rolesAct = () => ({ roles: S.modele.roles });
      $("#md-fichiers").onclick = () => action(async () => { const [m, r] = await Promise.all(["modules.json", "roles.json"].map((f) => fetch("modele/" + f, { cache: "no-cache" }).then((x) => x.json()))); await publier(m, r); }, "Modèle publié");
      $("#md-champ").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => {
        const m = copieMods(); const [mid, cid] = f.col.value.split("/");
        const col = m.modules.find((x) => x.id === mid).collections.find((x) => x.id === cid);
        if (col.champs.some((c) => c.id === f.id.value)) throw new Error("ce champ existe déjà");
        const ch = { id: f.id.value.trim(), type: f.type.value, label: f.label.value.trim() };
        if (ch.type === "choix") ch.options = f.options.value.split(",").map((x) => x.trim()).filter(Boolean);
        col.champs.push(ch); await publier(m, rolesAct());
      }, "Champ ajouté pour tous les clubs"); };
      $("#md-col").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => {
        const m = copieMods(); let mod = m.modules.find((x) => x.id === f.mod.value);
        if (f.mod.value === "__nouveau") { const [id, nom, icone] = f.nmod.value.split("|").map((x) => (x || "").trim()); if (!id) throw new Error("module : id|Nom|icône"); mod = { id, nom: nom || id, icone: icone || "▫️", collections: [] }; m.modules.push(mod); }
        const col = { id: f.id.value.trim(), nom: f.nom.value.trim(), lire: f.lire.value, ecrire: f.ecrire.value, categorie: f.categorie.checked, perso: f.perso.checked, garder: f.garder.checked, champs: [{ id: "nom", type: "texte", label: "Nom", requis: true }] };
        if (col.perso) col.champs.push({ id: "personneId", type: "ref", ref: "personnes", label: "Personne" });
        mod.collections.push(col); await publier(m, rolesAct());
      }, "Collection ajoutée : ajoutez-lui des champs"); };
      $("#md-droit").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => { const m = copieMods(); m.droits[f.id.value.trim()] = f.t.value.trim() || f.id.value.trim(); await publier(m, rolesAct()); }, "Droit ajouté"); };
      $("#md-pub").onclick = () => action(async () => { await publier(JSON.parse($("#md-json").value), JSON.parse($("#md-roles").value)); }, "Modèle publié");
    }
    if (onglet === "connexion") {
      const cx = S.connexion;
      coquille(ong + `<form class="carte" id="cx-reg"><h3>Connexion des comptes</h3>
        <label class="case"><input type="radio" name="mode" value="code" ${cx.mode !== "sms" ? "checked" : ""}> Téléphone + code secret (gratuit, numéro non vérifié)</label><br>
        <label class="case"><input type="radio" name="mode" value="sms" ${cx.mode === "sms" ? "checked" : ""}> Téléphone + code SMS (numéro vérifié ; forfait Firebase Blaze, SMS payants)</label><br>
        <label class="case"><input type="checkbox" name="google" ${cx.google ? "checked" : ""}> Proposer aussi « Continuer avec Google »</label>
        <p class="muted">Dans la console Firebase > Authentication, activez le fournisseur correspondant : « Adresse e-mail/Mot de passe » pour le code secret, « Téléphone » pour le SMS, « Google » pour Google.</p>
        <button class="btn">Enregistrer</button></form>`, "Connexion");
      $("#cx-reg").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => { const data = { mode: f.mode.value, google: f.google.checked }; await B.majReglagesPlateforme(data); S.connexion = { ...S.connexion, ...data }; }, "Réglage enregistré"); };
    }
    if (onglet === "sports") {
      S.sports = await B.sports();
      coquille(ong + `<p class="muted">Catalogue commun : postes, formats, statistiques et catégories de départ de chaque sport. Les clubs choisissent leurs sections dans cette liste.</p>
        ${Object.entries(S.sports).map(([id, s]) => `<div class="carte"><h3>${esc(s.icone || "")} ${esc(s.nom)} <small class="muted">${esc(id)}</small></h3><p><b>Postes :</b> ${esc((s.postes || []).join(", "))}</p><p><b>Stats :</b> ${esc((s.stats || []).join(", "))}</p><p><b>Catégories :</b> ${esc((s.categories || []).join(", "))}</p></div>`).join("")}
        <details class="carte"><summary><b>Éditer le catalogue (JSON)</b></summary><textarea id="sp-json" rows="16" class="mono">${esc(JSON.stringify(S.sports, null, 2))}</textarea><button class="btn" id="sp-pub">Publier le catalogue</button></details>`, "Sports");
      $("#sp-pub").onclick = () => action(async () => { await B.publierSports(JSON.parse($("#sp-json").value)); vueAdmin("sports"); }, "Catalogue publié");
    }
  }

  /* ---------- Clubs et connexion ---------- */
  async function vueClubs() {
    const clubs = await B.clubs();
    coquille(`<h2>Clubs</h2>${clubs.filter((c) => c.active || B.estAdmin()).map((c) => `<a class="carte ligne" href="#/c/${esc(c.id)}"><b>${esc(c.nom)}</b><span class="muted">${esc(c.ville || "")}</span></a>`).join("") || `<div class="carte"><p>Aucun club pour l'instant.</p>${B.uid ? (B.estAdmin() ? `<a class="btn" href="#/admin">Espace admin</a>` : "") : `<a class="btn" href="#/connexion">Connexion</a>`} <a class="btn clair" href="?demo#/">Voir la démo</a></div>`}`);
  }
  // Connexion par téléphone : code secret (gratuit) ou code SMS, selon le réglage de la plateforme (#admin > Connexion)
  const telComplet = (v) => { const n = String(v || "").replace(/[^\d+]/g, ""); return n.startsWith("+") ? n : n.startsWith("00") ? "+" + n.slice(2) : (P.indicatif || "+221") + n; };
  function vueConnexion() {
    const cx = S.connexion || {};
    const sms = cx.mode === "sms";
    coquille(`<div class="carte centre connexion"><h3>Connexion</h3>
      ${B.mode === "demo" ? `<p class="alerte">Mode démo : la connexion marche une fois Firebase branché. Ici, changez de profil avec la barre jaune.</p>` : ""}
      <label>Votre numéro de téléphone<input id="cx-tel" type="tel" inputmode="tel" placeholder="77 123 45 67" autocomplete="tel"></label>
      ${sms ? `<button class="btn" id="cx-sms">Recevoir le code par SMS</button>
        <div id="cx-etape2" hidden><label>Code reçu par SMS<input id="cx-code" inputmode="numeric" maxlength="6" class="gros" placeholder="······"></label><button class="btn" id="cx-ok">Valider</button></div>`
      : `<label>Code secret (6 chiffres)<input id="cx-pin" type="password" inputmode="numeric" maxlength="6" class="gros" placeholder="······"></label>
        <div class="actions centre"><button class="btn" id="cx-in">Se connecter</button><button class="btn clair" id="cx-up">Première connexion</button></div>
        <p class="muted">Première fois : choisissez vos 6 chiffres et appuyez sur « Première connexion ». Code oublié : contactez votre club ou le ${esc(P.supportTel)}.</p>`}
      ${cx.google ? `<p class="muted">ou</p><button class="btn clair" id="cx-g">Continuer avec Google</button>` : ""}</div>`, "Connexion");
    const tel = () => { const t = telComplet($("#cx-tel").value); if (t.replace(/\D/g, "").length < 9) throw new Error("numéro incomplet"); return t; };
    const pin = () => { const p = $("#cx-pin").value.trim(); if (!/^\d{6}$/.test(p)) throw new Error("le code secret fait 6 chiffres"); return p; };
    const msg = (e) => ({ "auth/invalid-credential": "numéro ou code secret faux", "auth/wrong-password": "code secret faux", "auth/user-not-found": "numéro inconnu : appuyez sur « Première connexion »",
      "auth/email-already-in-use": "ce numéro a déjà un compte : appuyez sur « Se connecter »", "auth/invalid-verification-code": "code SMS faux", "auth/too-many-requests": "trop d'essais, réessayez plus tard" })[e.code] || e.message;
    const essai = (fn, ok) => action(async () => { try { await fn(); } catch (e) { throw new Error(msg(e)); } }, ok);
    if ($("#cx-in")) { $("#cx-in").onclick = () => essai(() => B.connexionCode(tel(), pin(), false)); $("#cx-up").onclick = () => essai(() => B.connexionCode(tel(), pin(), true)); }
    if ($("#cx-sms")) {
      $("#cx-sms").onclick = () => essai(async () => { await B.envoyerCode(tel(), "cx-sms"); $("#cx-etape2").hidden = false; $("#cx-code").focus(); }, "Code envoyé par SMS");
      $("#cx-ok").onclick = () => essai(() => B.confirmerCode($("#cx-code").value.trim()));
    }
    if ($("#cx-g")) $("#cx-g").onclick = () => essai(() => B.connecterGoogle());
  }

  // Fiche du compte, demandée après la première connexion ; ses champs viennent du modèle (modules.json > compte)
  function vueProfil(premiere) {
    const champs = champsCompte();
    const c = B.compte || {};
    coquille(`<form class="carte fiche" id="profil"><div class="fiche-tete"><h2>${premiere ? "Bienvenue ! Complétez votre profil" : "Mon profil"}</h2>
        <p class="muted">Téléphone : <b>${esc(c.tel || "—")}</b></p></div>
      ${champs.map((ch) => `<label class="${ch.type === "texteLong" ? "large" : ""}" data-champ="${ch.id}">${esc(ch.label)}<span class="req"></span>${champHtml(ch, c[ch.id], true, {})}</label>`).join("")}
      <div class="actions"><button class="btn">${premiere ? "Continuer" : "Enregistrer"}</button>${B.mode === "firebase" ? `<button type="button" class="btn clair" data-a="deco">Déconnexion</button>` : ""}</div></form>`, "Mon profil");
    const f = $("#profil");
    const qui = () => (f.elements.profil ? f.elements.profil.value : "");
    const visible = (ch) => !ch.pour || ch.pour.includes(qui());
    const requis = (ch) => ch.requis || (ch.requisPour || []).includes(qui());
    const maj = () => champs.forEach((ch) => { const l = f.querySelector(`[data-champ="${ch.id}"]`); l.hidden = !visible(ch); l.querySelector(".req").textContent = requis(ch) ? " *" : ""; });
    if (f.elements.profil) f.elements.profil.onchange = maj; maj();
    f.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const data = { complet: true };
      for (const ch of champs) {
        if (!visible(ch)) continue;
        const v = lireChamp(f, ch); if (requis(ch) && (v === "" || v == null)) throw new Error(`« ${ch.label} » est obligatoire`);
        data[ch.id] = v ?? "";
      }
      await B.majCompte(data);
      if (premiere) { location.hash = "#/"; route(); }
    }, "Profil enregistré"); };
  }

  /* ---------- Installer l'appli du club sur l'écran d'accueil ---------- */
  let invite = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); invite = e; const b = $("#installer"); if (b) b.hidden = false; });
  const estIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const installee = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;

  /* ---------- Démarrage ---------- */
  (async () => {
    try {
      await B.init();
      [S.modele, S.sports] = await Promise.all([B.modele(), B.sports()]);
      S.connexion = { ...(P.CONNEXION || {}), ...(await B.reglagesPlateforme()) };
      if (B.estAdmin()) S.versionFichier = await fetch("modele/modules.json", { cache: "no-cache" }).then((x) => x.json()).then((m) => m.version || 1).catch(() => 0);
      await route();
    } catch (e) { console.error(e); app.innerHTML = `<div class="carte erreur">Impossible de démarrer : ${esc(e.message)}</div>`; }
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
  })();
})();
