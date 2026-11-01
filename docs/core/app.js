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

  /* ---------- Coquille : en-tête, barre démo, navigation (en bas sur téléphone, à gauche sur ordinateur) ---------- */
  function menu() {
    if (!S.club) return [];
    const c = `#/c/${S.clubId}`;
    const items = [{ h: c, t: "Accueil", i: "🏠" }];
    for (const m of modules()) {
      if (!moduleOn(m.id) || !m.collections.some((x) => lisible(pol(x.id)))) continue;
      items.push({ h: `${c}/m/${m.id}`, t: m.nom, i: m.icone || "▫️" });
    }
    if (moduleOn("sportif") && (D.can("sportif") || D.mesPersonnes().length)) items.push({ h: `${c}/pointage`, t: "Pointage", i: "✅" });
    if (moduleOn("finances") && (D.can("finances") || D.mesPersonnes().length)) items.push({ h: `${c}/caisse`, t: "Caisse", i: "🧾" });
    if (D.can("membres")) items.push({ h: `${c}/membres`, t: "Membres", i: "🪪" });
    if (D.can("reglages") || D.president()) items.push({ h: `${c}/reglages`, t: "Réglages", i: "⚙️" });
    if (B.estAdmin()) items.push({ h: "#/admin", t: "Admin", i: "🛡️" });
    return items;
  }
  function coquille(contenu, titre) {
    const club = S.club;
    const h = location.hash || "#/";
    const nav = (B.estAdmin() && !club ? [{ h: "#/admin", t: "Admin", i: "🛡️" }, { h: "#/clubs", t: "Clubs", i: "🏟️" }] : menu());
    app.innerHTML = `
      ${B.mode === "demo" ? barreDemo() : ""}
      <header class="top">
        <a class="marque" href="${club ? "#/c/" + S.clubId : "#/"}">
          ${club && club.logo ? `<img src="${esc(club.logo)}" alt="">` : `<img src="icons/logo.svg" alt="">`}
          <span><b>${esc(club ? club.nomCourt || club.nom : P.nom)}</b><small>${esc(titre || (club ? club.slogan || "" : P.slogan))}</small></span>
        </a>
        <div class="compte">${B.mode === "firebase" ? (B.uid ? `<button class="lien" data-a="deco">Déconnexion</button>` : `<a class="btn petit" href="#/connexion">Connexion</a>`) : ""}
          <span class="badge">${esc(libelleRole())}</span></div>
      </header>
      <div class="cadre">
        <nav class="nav">${nav.map((n) => `<a href="${n.h}" class="${h === n.h || (n.h !== "#/c/" + S.clubId && h.startsWith(n.h + "/")) ? "actif" : ""}"><span>${n.i}</span>${esc(n.t)}</a>`).join("")}</nav>
        <main class="main">${contenu}</main>
      </div>`;
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
    const ms = S.clubId && B.s.clubs[S.clubId] ? B.s.clubs[S.clubId].membres : B.s.clubs[P.clubParDefaut]?.membres || {};
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
    document.documentElement.style.setProperty("--club", coul.principale || "#0B5D3B");
    document.documentElement.style.setProperty("--accent", coul.accent || "#F2B705");
    document.title = S.club.nom;
  }
  async function route() {
    const parts = (location.hash || "#/").slice(2).split("/").filter(Boolean);
    try {
      if (parts[0] === "admin") { S.club = null; S.clubId = null; D.regler({ membre: null }); return B.estAdmin() ? vueAdmin(parts[1]) : coquille(`<div class="carte">Espace réservé à l'admin de la plateforme.${B.uid ? `<p class="muted">Votre identifiant : <code>${esc(B.uid)}</code> (à mettre dans <code>admins</code> de config.js et dans <code>admin()</code> des règles).</p>` : ""}</div>`); }
      if (parts[0] === "connexion") return vueConnexion();
      if (parts[0] === "clubs" || (!parts[0] && !P.clubParDefaut)) return vueClubs();
      if (!parts[0]) { location.hash = "#/c/" + P.clubParDefaut; return; }
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
      if (v === "caisse") return vueCaisse();
      if (v === "membres") return vueMembres();
      if (v === "reglages") return vueReglages();
      coquille(`<div class="carte">Page inconnue.</div>`);
    } catch (e) { console.error(e); coquille(`<div class="carte erreur">Erreur : ${esc(e.message)}</div>`); }
  }
  window.addEventListener("hashchange", route);
  const toast = (t) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };
  async function action(fn, ok) { try { await fn(); if (ok) toast(ok); } catch (e) { console.error(e); toast("Refusé : " + (e.message || e)); } }

  /* ---------- Accueil : vitrine + espace personnel selon le profil ---------- */
  async function vueAccueil() {
    const c = S.club;
    const [evts, actus, annonces] = await Promise.all(["evenements", "actualites", "annonces"].map((x) => (moduleOn(pol(x)?.m) ? charger(x) : [])));
    const today = new Date().toISOString().slice(0, 10);
    const avenir = evts.filter((e) => (e.debut || "") >= today && e.statut !== "annulé").sort((a, b) => (a.debut > b.debut ? 1 : -1));
    const joues = evts.filter((e) => e.type === "match" && e.statut === "joué").sort((a, b) => (a.debut < b.debut ? 1 : -1));
    let html = `<section class="hero"><h1>${esc(c.nom)}</h1><p>${esc(c.slogan || "")}</p>
      <div class="puces">${(S.cache.sections || []).map((s) => `<span class="puce">${esc((S.sports[s.sportId] || {}).icone || "")} ${esc(s.nom)}</span>`).join("")}</div></section>`;

    if (!D.membre()) {
      if (S.membre && !S.membre.actif) html += `<div class="carte info">Votre demande d'adhésion est en attente de validation par le club.</div>`;
      else if (B.mode === "firebase" && B.uid) html += `<div class="carte"><h3>Rejoindre le club</h3><p class="muted">Joueur, parent ou staff : envoyez votre demande, le club vous donne ensuite votre accès.</p>
        <div class="grille2"><input id="adh-nom" placeholder="Nom complet"><input id="adh-tel" placeholder="Téléphone"></div>
        <input id="adh-msg" placeholder="Ex. parent de Moussa Diop (U13)"><button class="btn" id="adh-go">Envoyer ma demande</button></div>`;
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
          ${cv.length ? `<h4>Convocations</h4>` + cv.map((x) => `<div class="ligne"><div><b>${esc(nomDoc(x.e))}</b><br><small>${dateFr(x.e.debut)} · ${esc(x.e.lieu || "")}</small></div>
            <div class="rep">${["présent", "absent", "incertain"].map((r) => `<button class="mini ${x.reponse === r ? "on" : ""}" data-conv="${x.id}" data-rep="${r}">${r}</button>`).join("")}</div></div>`).join("") : `<p class="muted">Pas de convocation à venir.</p>`}
          ${ec.length ? `<h4>À payer</h4>` + ec.map((x) => `<div class="ligne"><span>${esc(x.libelle || "Cotisation")} · avant le ${dateFr(x.du)}</span><b>${argent((x.montant || 0) - (x.paye || 0))}</b></div>`).join("") : ""}
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
      html += `<div class="tuiles">${tuiles.map(([t, v]) => `<div class="tuile"><b>${esc(v)}</b><span>${esc(t)}</span></div>`).join("")}</div>`;
    }

    if (annonces.length) html += `<div class="carte"><h3>Annonces</h3>${annonces.map((a) => `<div class="ligne"><div><b>${esc(a.titre)}</b><br><small>${esc(a.texte || "")}</small></div></div>`).join("")}</div>`;
    html += `<div class="carte"><h3>À venir</h3>${avenir.slice(0, 6).map((e) => `<a class="ligne" href="#/c/${S.clubId}/f/evenements/${e.id}"><div><b>${esc(nomDoc(e))}</b><br><small>${esc(e.type)} · ${esc(nomCat(e))}</small></div><span>${dateFr(e.debut)}</span></a>`).join("") || `<p class="muted">Rien de prévu.</p>`}</div>`;
    if (joues.length) html += `<div class="carte"><h3>Derniers résultats</h3>${joues.slice(0, 5).map((e) => `<div class="ligne"><span>${esc(nomDoc(e))}</span><b>${e.scoreNous ?? "-"} - ${e.scoreEux ?? "-"}</b></div>`).join("")}</div>`;
    if (actus.length) html += `<div class="carte"><h3>Actualités</h3>${actus.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((a) => `<div class="ligne"><div><b>${esc(a.titre)}</b><br><small>${dateFr(a.date)} · ${esc(a.texte || "")}</small></div></div>`).join("")}</div>`;
    coquille(html);

    app.querySelectorAll("[data-conv]").forEach((b) => (b.onclick = () => action(async () => {
      await B.ecrire(S.clubId, "convocations", b.dataset.conv, { reponse: b.dataset.rep }); vider("convocations"); vueAccueil();
    }, "Réponse envoyée")));
    const adh = $("#adh-go"); if (adh) adh.onclick = () => action(async () => { await B.demanderAdhesion(S.clubId, $("#adh-nom").value.slice(0, 80), $("#adh-tel").value.slice(0, 30), $("#adh-msg").value.slice(0, 300)); S.clubId = null; route(); }, "Demande envoyée");
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
    const d = nouveau ? {} : (S.cache[colId] || []).find((x) => x.id === id) || (await B.lire(S.clubId, colId, id).catch(() => null));
    if (!d || (!nouveau && !D.lecture(P, d, id))) return coquille(`<div class="carte">Fiche introuvable ou réservée.</div>`);
    const total = nouveau ? D.can(P.e) : D.ecriture(P, d);
    const rep = nouveau ? [] : D.champsReponse(P, d, id);
    const secs = (S.cache.sections || []).filter((s) => total && (D.president() || D.perimetre().includes("*") || D.perimetre().includes(s.id) || (S.cache.categories || []).some((c) => c.sectionId === s.id && D.perimetre().includes(c.id))));
    const cats = (S.cache.categories || []);
    coquille(`<form class="carte fiche" id="fiche">
      <div class="fiche-tete"><a href="javascript:history.back()" class="lien">← Retour</a><h2>${esc(nouveau ? "Nouveau : " + col.nom : nomDoc(d))}</h2></div>
      ${col.categorie ? `<div class="grille2">
        <label>Section<select name="sectionId" ${total ? "" : "disabled"}><option value="">(tout le club)</option>${(total ? secs : S.cache.sections || []).map((s) => `<option value="${s.id}" ${s.id === d.sectionId ? "selected" : ""}>${esc(s.nom)}</option>`).join("")}</select></label>
        <label>Catégorie<select name="categorieId" ${total ? "" : "disabled"}><option value="">(toute la section)</option>${cats.map((c) => `<option value="${c.id}" data-sec="${c.sectionId}" ${c.id === d.categorieId ? "selected" : ""}>${esc(c.nom)}</option>`).join("")}</select></label></div>` : ""}
      ${col.champs.filter((ch) => !ch.cache || total).map((ch) => `<label class="${ch.type === "texteLong" || ch.type === "refs" || ch.type === "map" ? "large" : ""}">${esc(ch.label)}${ch.requis ? " *" : ""}${rep.includes(ch.id) ? ` <small class="ok">modifiable par vous</small>` : ""}
        ${champHtml(ch, d[ch.id], total || rep.includes(ch.id), d)}</label>`).join("")}
      <div class="actions">
        ${total || rep.length ? `<button class="btn" type="submit">Enregistrer</button>` : `<span class="muted">Lecture seule pour votre profil.</span>`}
        ${!nouveau && total && !P.garder ? `<button class="btn danger" type="button" id="suppr">Supprimer</button>` : ""}
        ${!nouveau && d.maj ? `<small class="muted">Modifié ${esc(typeof d.maj === "string" ? d.maj.slice(0, 16).replace("T", " ") : "")}</small>` : ""}
      </div></form>`, col.nom);
    const form = $("#fiche");
    const secSel = form.elements.sectionId, catSel = form.elements.categorieId;
    if (secSel && total) { const filtre = () => [...catSel.options].forEach((o) => (o.hidden = !!o.value && !!secSel.value && o.dataset.sec !== secSel.value)); secSel.onchange = () => { catSel.value = ""; filtre(); }; filtre(); }
    form.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const data = {};
      const editables = total ? col.champs : col.champs.filter((c) => rep.includes(c.id));
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
        return `<form class="carte membre" data-uid="${esc(m.uid)}"><div class="ligne"><div><b>${esc(m.nom || m.uid)}</b> ${m.actif ? "" : `<span class="badge alerte">demande</span>`}<br><small class="muted">${esc(m.message || m.tel || "")}</small></div>
          ${modif ? `<label class="case"><input type="checkbox" name="actif" ${m.actif ? "checked" : ""}> Actif</label>` : `<span class="badge">${esc(m.role === "president" ? "Président" : (S.R[m.role] || {}).nom || m.role)}</span>`}</div>
          ${modif ? `<div class="grille2"><label>Rôle<select name="role">${roles.map(([id, n]) => `<option value="${id}" ${id === m.role ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
            <label>Sa fiche (joueur ou staff)<select name="personneId"><option value="">(aucune)</option>${ps.map((p) => `<option value="${p.id}" ${p.id === m.personneId ? "selected" : ""}>${esc(nomDoc(p))}</option>`).join("")}</select></label></div>
            <details><summary>Périmètre (${(m.perimetre || []).length || "aucun"}) et enfants (${(m.enfants || []).length})</summary>
              <div class="cases" data-k="perimetre">${zones.map(([z, n]) => `<label class="case"><input type="checkbox" value="${esc(z)}" ${(m.perimetre || []).includes(z) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div>
              <h4>Enfants (pour un parent)</h4><div class="cases" data-k="enfants">${ps.filter((p) => p.type === "joueur").map((p) => `<label class="case"><input type="checkbox" value="${p.id}" ${(m.enfants || []).includes(p.id) ? "checked" : ""}> ${esc(nomDoc(p))}</label>`).join("")}</div></details>
            <button class="btn petit">Enregistrer</button>` : ""}</form>`; }).join("")}`, "Membres");
    app.querySelectorAll("form.membre").forEach((f) => (f.onsubmit = (e) => { e.preventDefault(); action(async () => {
      const coche = (k) => [...f.querySelectorAll(`[data-k=${k}] input:checked`)].map((i) => i.value);
      await B.ecrireMembre(S.clubId, f.dataset.uid, { actif: f.actif.checked, role: f.role.value, personneId: f.personneId.value, perimetre: coche("perimetre"), enfants: coche("enfants") });
    }, "Membre mis à jour"); }));
  }

  /* ---------- Réglages du club : fiche, couleurs, rôles (président) ---------- */
  async function vueReglages() {
    const c = S.club, droits = S.modele.modules.droits;
    let html = "";
    if (D.can("reglages")) html += `<form class="carte" id="rg-club"><h3>Fiche du club</h3><div class="grille2">
      ${[["nom", "Nom"], ["nomCourt", "Nom court"], ["slogan", "Slogan"], ["ville", "Ville"], ["tel", "Téléphone"], ["whatsapp", "WhatsApp (221…)"], ["logo", "Logo (lien image)"], ["devise", "Devise"]].map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(c[k] || "")}"></label>`).join("")}
      <label>Couleur principale<input type="color" name="principale" value="${esc((c.couleurs || {}).principale || "#0B5D3B")}"></label>
      <label>Couleur d'accent<input type="color" name="accent" value="${esc((c.couleurs || {}).accent || "#F2B705")}"></label></div>
      <p class="muted">Modules souscrits : ${esc((c.modules || []).join(", ") || "aucun")} (gérés par l'admin de la plateforme).</p><button class="btn">Enregistrer</button></form>`;
    if (D.president()) html += `<form class="carte" id="rg-roles"><h3>Rôles du club</h3><p class="muted">Créez vos propres rôles (niveau 1 à 99). Un membre ne donne que des rôles sous son niveau.</p>
      ${Object.entries(S.R).sort((a, b) => b[1].niveau - a[1].niveau).map(([id, r]) => roleHtml(id, r, droits)).join("")}
      <div id="rg-nouveaux"></div><div class="actions"><button type="button" class="btn clair" id="rg-add">+ Nouveau rôle</button><button class="btn">Enregistrer les rôles</button></div></form>`;
    coquille(html || `<div class="carte">Rien à régler pour votre profil.</div>`, "Réglages");
    const fc = $("#rg-club"); if (fc) fc.onsubmit = (e) => { e.preventDefault(); action(async () => {
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
    const ong = `<div class="onglets">${[["clubs", "Clubs"], ["modele", "Modèle"], ["sports", "Sports"]].map(([k, t]) => `<a href="#/admin/${k}" class="${k === onglet ? "actif" : ""}">${t}</a>`).join("")}</div>`;
    const optionnels = modules().filter((m) => !m.obligatoire);
    if (onglet === "clubs") {
      const clubs = await B.clubs();
      coquille(ong + `<p class="muted">Chaque club a sa licence : actif ou suspendu, et les modules qu'il a souscrits. Vous nommez son président ; lui gère ensuite tout le reste.</p>
        ${clubs.map((c) => `<form class="carte club-adm" data-id="${esc(c.id)}"><div class="ligne"><div><b>${esc(c.nom)}</b><br><small class="muted">${esc(c.id)} · ${esc(c.ville || "")}</small></div><a class="btn petit clair" href="#/c/${esc(c.id)}">Ouvrir</a></div>
          <label class="case"><input type="checkbox" name="active" ${c.active ? "checked" : ""}> Licence active</label>
          <div class="cases">${optionnels.map((m) => `<label class="case"><input type="checkbox" value="${m.id}" ${(c.modules || []).includes(m.id) ? "checked" : ""}> ${esc(m.icone || "")} ${esc(m.nom)}</label>`).join("")}</div>
          <div class="grille2"><input name="offre" placeholder="Offre (ex. essentielle, complète)" value="${esc(c.offre || "")}"><button class="btn petit">Enregistrer la licence</button></div>
          <details><summary>Nommer le président</summary><div class="grille2"><input name="puid" placeholder="Identifiant du compte"><input name="pnom" placeholder="Nom"></div><button type="button" class="btn petit" data-pres>Nommer</button></details></form>`).join("")}
        <form class="carte" id="nv-club"><h3>Nouveau club</h3><div class="grille2"><input name="id" placeholder="identifiant (ex. jaraaf-u17)" required pattern="[a-z0-9]+(-[a-z0-9]+)*"><input name="nom" placeholder="Nom du club" required><input name="ville" placeholder="Ville"></div>
          <div class="cases">${optionnels.map((m) => `<label class="case"><input type="checkbox" value="${m.id}" checked> ${esc(m.nom)}</label>`).join("")}</div><button class="btn">Créer le club</button></form>`, "Admin plateforme");
      app.querySelectorAll(".club-adm").forEach((f) => {
        f.onsubmit = (e) => { e.preventDefault(); action(() => B.majLicence(f.dataset.id, { active: f.active.checked, offre: f.offre.value.trim(), modules: [...f.querySelectorAll(".cases input:checked")].map((i) => i.value) }), "Licence enregistrée"); };
        f.querySelector("[data-pres]").onclick = () => action(async () => { if (!f.puid.value.trim()) throw new Error("identifiant manquant"); await B.nommerPresident(f.dataset.id, f.puid.value.trim(), f.pnom.value.trim() || "Président"); }, "Président nommé");
      });
      $("#nv-club").onsubmit = (e) => { e.preventDefault(); const f = e.target; action(async () => {
        await B.creerClub(f.id.value.trim(), { nom: f.nom.value.trim(), ville: f.ville.value.trim(), pays: "Sénégal", devise: "F CFA", active: true, modules: [...f.querySelectorAll(".cases input:checked")].map((i) => i.value), offre: "" });
        vueAdmin("clubs"); }, "Club créé"); };
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
    coquille(`<h2>Clubs</h2>${clubs.filter((c) => c.active || B.estAdmin()).map((c) => `<a class="carte ligne" href="#/c/${esc(c.id)}"><b>${esc(c.nom)}</b><span class="muted">${esc(c.ville || "")}</span></a>`).join("") || `<p class="muted">Aucun club.</p>`}`);
  }
  function vueConnexion() {
    coquille(`<div class="carte centre"><h3>Connexion</h3><button class="btn" id="cx-g">Continuer avec Google</button>
      <p class="muted">ou par e-mail</p><input id="cx-e" type="email" placeholder="E-mail"><input id="cx-m" type="password" placeholder="Mot de passe (6 caractères min.)">
      <div class="actions"><button class="btn clair" id="cx-in">Se connecter</button><button class="btn clair" id="cx-up">Créer un compte</button></div></div>`);
    $("#cx-g").onclick = () => action(() => B.connecterGoogle());
    $("#cx-in").onclick = () => action(() => B.connecterEmail($("#cx-e").value, $("#cx-m").value, false));
    $("#cx-up").onclick = () => action(() => B.connecterEmail($("#cx-e").value, $("#cx-m").value, true));
  }

  /* ---------- Démarrage ---------- */
  (async () => {
    try {
      await B.init();
      [S.modele, S.sports] = await Promise.all([B.modele(), B.sports()]);
      await route();
    } catch (e) { console.error(e); app.innerHTML = `<div class="carte erreur">Impossible de démarrer : ${esc(e.message)}</div>`; }
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
  })();
})();
