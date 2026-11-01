// Accès aux données : la même interface en mode démo (tout sur l'appareil) et avec Firebase (Firestore + Auth).
// L'appli n'appelle jamais Firestore directement : tout passe par ici. Chemins : voir ARCHITECTURE.md.
(function () {
  const P = window.PLATEFORME;
  const D = window.Droits;
  const json = (f) => fetch("modele/" + f, { cache: "no-cache" }).then((r) => r.json());
  const copie = (o) => JSON.parse(JSON.stringify(o));
  const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ajd = () => new Date().toISOString().slice(0, 10);
  // « @J+3T18:00 » dans le club d'exemple = dans 3 jours à 18h (les dates de démo restent actuelles)
  const dateDemo = (v) => {
    if (typeof v !== "string" || !v.startsWith("@J")) return v;
    const m = v.match(/^@J([+-]\d+)?(T\d\d:\d\d)?$/); const d = new Date();
    d.setDate(d.getDate() + Number(m[1] || 0));
    return d.toISOString().slice(0, 10) + (m[2] || "");
  };
  const datesDemo = (o) => (Array.isArray(o) ? o.map(datesDemo) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, datesDemo(v)])) : dateDemo(o));

  // démo : 3 semaines de réponses de forme et d'efforts, un joueur fatigué, un qui n'a pas encore répondu ce matin
  function formeDemo(ps) {
    const j = (n) => { const d = new Date(Date.now() - n * 864e5); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
    Object.entries(ps).filter(([, p]) => p.type === "joueur").forEach(([id, p], k) => {
      p.forme = {}; p.charges = {};
      for (let n = 21; n >= 0; n--) {
        if (n === 0 && k === 0) continue;
        const bas = k === 2 && n < 2, v = (b) => Math.max(1, Math.min(5, b + ((n + k) % 3) - 1));
        p.forme[j(n)] = { sommeil: bas ? 2 : v(4), energie: bas ? 2 : v(4), muscles: bas ? 2 : v(3), moral: v(4), envie: bas ? 3 : v(5), h: "07:4" + (n % 10), ...(bas && n === 0 ? { douleur: "ischio droit" } : {}) };
        if (n % 2 === 1 || (k === 3 && n < 7)) p.charges["demo-" + n] = { d: j(n), rpe: k === 3 && n < 7 ? 8 : 4 + ((n + k) % 4), min: 90 };
      }
    });
  }

  /* ================= Mode démo ================= */
  const CLE = "club-demo-v2";
  const Demo = {
    mode: "demo", s: null, uid: "demo-president",
    sauver() { localStorage.setItem(CLE, JSON.stringify(Demo.s)); },
    async init() {
      const [mods, roles, sports, ex] = await Promise.all([json("modules.json"), json("roles.json"), json("sports.json"), json("exemple-club.json")]);
      Demo.sports_ = Object.fromEntries(Object.entries(sports).filter(([k]) => !k.startsWith("_")));
      const enregistre = JSON.parse(localStorage.getItem(CLE) || "null");
      if (enregistre && enregistre.version === 2) Demo.s = enregistre;
      else {
        const e = datesDemo(ex);
        Demo.s = { version: 2, modele: Modele.compiler(mods, roles).doc, clubs: {} };
        Demo.s.clubs[e.id] = { club: e.club, membres: e.membres, reglages: {}, compteurs: { recu: 0 }, codes: {}, pointages: {}, paiements: {}, collections: e.collections };
        formeDemo(e.collections.personnes || {});
        Demo.sauver();
      }
      Demo.uid = localStorage.getItem(CLE + "-profil") || "demo-president";
    },
    reinitialiser() { localStorage.removeItem(CLE); localStorage.removeItem(CLE + "-profil"); location.reload(); },
    get compte() { return JSON.parse(localStorage.getItem(CLE + "-compte-" + Demo.uid) || "null") || { tel: "", complet: false }; },
    async majCompte(data) { localStorage.setItem(CLE + "-compte-" + Demo.uid, JSON.stringify({ ...Demo.compte, ...data })); },
    profil(uid) { Demo.uid = uid; localStorage.setItem(CLE + "-profil", uid); },
    estAdmin() { return Demo.uid === "demo-admin"; },
    async modele() { return Demo.s.modele; },
    async sports() { return Demo.sports_; },
    async clubs() { return Object.entries(Demo.s.clubs).map(([id, c]) => ({ id, ...c.club })); },
    async club(c) { return Demo.s.clubs[c] ? { id: c, ...Demo.s.clubs[c].club } : null; },
    async monMembre(c) { const m = Demo.s.clubs[c] && Demo.s.clubs[c].membres[Demo.uid]; return m ? copie(m) : null; },
    async roles(c) { const r = Demo.s.clubs[c].reglages.roles; return r ? r.roles : Demo.s.modele.roles; },
    async liste(c, col, Pol) {
      const cl = Demo.s.clubs[c]; if (!cl || !Pol) return [];
      if (cl.club.active === false || (Pol.m !== "base" && !(cl.club.modules || []).includes(Pol.m))) return [];
      return Object.entries(cl.collections[col] || {}).map(([id, d]) => ({ id, ...d })).filter((d) => D.lecture(Pol, d, d.id));
    },
    async lire(c, col, id) { const d = (Demo.s.clubs[c].collections[col] || {})[id]; return d ? { id, ...d } : null; },
    async ecrire(c, col, id, data) {
      const cl = Demo.s.clubs[c]; cl.collections[col] = cl.collections[col] || {};
      id = id || nouvelId();
      cl.collections[col][id] = { ...(cl.collections[col][id] || {}), ...data, maj: new Date().toISOString(), par: Demo.uid };
      Demo.sauver(); return id;
    },
    async supprimer(c, col, id) { delete Demo.s.clubs[c].collections[col][id]; Demo.sauver(); },
    async membres(c) { return Object.entries(Demo.s.clubs[c].membres).map(([uid, m]) => ({ uid, ...m })); },
    async ecrireMembre(c, uid, data) { const ms = Demo.s.clubs[c].membres; ms[uid] = { ...(ms[uid] || {}), ...data }; Demo.sauver(); },
    async ecrireRoles(c, roles) { Demo.s.clubs[c].reglages.roles = { roles }; Demo.sauver(); },
    async reglage(c, id) { const r = Demo.s.clubs[c] && Demo.s.clubs[c].reglages[id]; return r ? copie(r) : null; },
    async ecrireReglage(c, id, data) { const rg = Demo.s.clubs[c].reglages; rg[id] = { ...(rg[id] || {}), ...data, maj: new Date().toISOString(), par: Demo.uid }; Demo.sauver(); },
    async majClub(c, data) { Object.assign(Demo.s.clubs[c].club, data); Demo.sauver(); },
    async encaisser(c, data) {
      const cl = Demo.s.clubs[c]; const n = (cl.compteurs.recu || 0) + 1; cl.compteurs.recu = n;
      cl.paiements[n] = { ...data, numero: n, date: new Date().toISOString(), par: Demo.uid }; Demo.sauver(); return n;
    },
    async paiements(c) { return Object.values(Demo.s.clubs[c].paiements).filter((p) => D.can("finances") ? D.dansPerimetre(p) : D.concerne(p)).sort((a, b) => b.numero - a.numero); },
    async creerCode(c, evenementId, data) { Demo.s.clubs[c].codes[evenementId] = data; Demo.sauver(); },
    async lireCode(c, evenementId) { return Demo.s.clubs[c].codes[evenementId] || null; },
    async pointer(c, evenementId, personneId, code, extra = {}) {
      const cl = Demo.s.clubs[c]; const k = cl.codes[evenementId];
      if (!extra.manuel && (!k || k.code !== code || new Date(k.expire) < new Date())) throw new Error("Code faux ou expiré");
      cl.pointages[evenementId + "_" + personneId] = { evenementId, personneId, code: code || "", at: new Date().toISOString(), uid: Demo.uid, sectionId: (k || extra).sectionId || "", categorieId: (k || extra).categorieId || "", manuel: !!extra.manuel };
      Demo.sauver();
    },
    async pointages(c, evenementId) { return Object.values(Demo.s.clubs[c].pointages).filter((p) => p.evenementId === evenementId); },
    // ----- admin de la plateforme -----
    async publierModele(doc) { Demo.s.modele = doc; Demo.sauver(); },
    async creerClub(c, club) { Demo.s.clubs[c] = { club, membres: {}, reglages: {}, compteurs: { recu: 0 }, codes: {}, pointages: {}, paiements: {}, collections: {} }; Demo.sauver(); },
    async majLicence(c, data) { Object.assign(Demo.s.clubs[c].club, data); Demo.sauver(); },
    async compteParTel(tel) { return { uid: "demo-" + tel.replace(/\D/g, ""), prenom: "", nom: tel }; },
    async nommerPresident(c, uid, nom) { Demo.s.clubs[c].membres[uid] = { nom, tel: "", role: "president", perimetre: ["*"], personneId: "", enfants: [], actif: true }; Demo.sauver(); },
    async publierSports(map) { Demo.sports_ = map; },
    async reglagesPlateforme() { return JSON.parse(localStorage.getItem(CLE + "-plateforme") || "{}"); },
    async majReglagesPlateforme(data) { localStorage.setItem(CLE + "-plateforme", JSON.stringify({ ...(await Demo.reglagesPlateforme()), ...data })); },
    async demanderAdhesion() { throw new Error("En démo, changez de profil avec la barre du haut."); },
    async inscriptionSimple() { throw new Error("En démo, changez de profil avec la barre du haut."); },
  };

  /* ================= Mode Firebase ================= */
  const SDK = P.FIREBASE_SDK || "https://www.gstatic.com/firebasejs/10.12.2/";
  const charger = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  let db, auth;
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const trace = () => ({ maj: ts(), par: auth.currentUser.uid });
  const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const parPaquets = (liste, n = 30) => { const out = []; for (let i = 0; i < liste.length; i += n) out.push(liste.slice(i, i + n)); return out; };
  const Fire = {
    mode: "firebase", uid: null, modele_: null,
    async init() {
      for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) await charger(SDK + f);
      firebase.initializeApp(P.FIREBASE_CONFIG);
      auth = firebase.auth(); db = firebase.firestore(); auth.languageCode = "fr";
      // EMULATEUR: true dans config.js = tests en local sur les émulateurs Firebase
      if (P.EMULATEUR) { auth.useEmulator("http://127.0.0.1:9099"); db.useEmulator("127.0.0.1", 8080); }
      await new Promise((ok) => auth.onAuthStateChanged((u) => { Fire.uid = u ? u.uid : null; ok(); }));
      if (Fire.uid) await Fire.ficheCompte();
    },
    // users/{uid} : créée à la première connexion (téléphone vérifié par SMS), puis la fiche est complétée par le compte
    async ficheCompte() {
      const u = auth.currentUser; const ref = db.doc("users/" + u.uid);
      try {
        const s = await ref.get();
        const telCode = /^\d+@tel\.llk\.app$/.test(u.email || "") ? "+" + u.email.split("@")[0] : "";
        if (!s.exists) await ref.set({ tel: u.phoneNumber || telCode, created: ts(), lastSeen: ts(), active: true, clubs: [], complet: false });
        else if (s.data().active) await ref.update({ lastSeen: ts() });
        Fire.compte = (await ref.get()).data();
      } catch (e) { console.warn("fiche du compte", e); Fire.compte = null; } // modèle pas encore publié : l'admin le publie d'abord
    },
    async majCompte(data) { await db.doc("users/" + Fire.uid).update({ ...data, lastSeen: ts() }); Fire.compte = { ...Fire.compte, ...data }; },
    // Connexion par SMS : un reCAPTCHA invisible, puis le code reçu
    async envoyerCode(tel, boutonId) {
      if (!Fire.recaptcha) Fire.recaptcha = new firebase.auth.RecaptchaVerifier(boutonId, { size: "invisible" });
      Fire.confirmation = await auth.signInWithPhoneNumber(tel, Fire.recaptcha);
    },
    async confirmerCode(code) { await Fire.confirmation.confirm(code); location.reload(); },
    // Téléphone + code secret (gratuit, sans SMS) : compte Firebase e-mail/mot de passe sur une adresse technique
    async connexionCode(tel, code, creer) {
      const email = tel.replace(/\D/g, "") + "@tel.llk.app";
      await (creer ? auth.createUserWithEmailAndPassword(email, code) : auth.signInWithEmailAndPassword(email, code));
      location.reload();
    },
    // Inscription simple (option du club) : compte propre à ce téléphone, sans code ; nom et numéro déclarés, le club valide
    async inscriptionSimple(tel, prenom, nom, profil) {
      try { if (!auth.currentUser) await auth.signInAnonymously(); }
      catch (e) { throw new Error(/operation-not-allowed|admin-restricted/.test(e.code || "") ? "inscription simple pas encore activée dans Firebase (Authentication > Anonyme)" : e.message); }
      await db.doc("users/" + auth.currentUser.uid).set({ tel, created: ts(), lastSeen: ts(), active: true, clubs: [], complet: true, prenom, nom, profil });
      location.reload();
    },
    async reglagesPlateforme() { try { const s = await db.doc("plateforme/reglages").get(); return s.exists ? s.data() : {}; } catch { return {}; } },
    async majReglagesPlateforme(data) { await db.doc("plateforme/reglages").set(data, { merge: true }); },
    async connecterGoogle() { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); location.reload(); },
    async deconnecter() { await auth.signOut(); location.reload(); },
    estAdmin() { return !!Fire.uid && (P.admins || []).includes(Fire.uid); },
    async modele() {
      if (Fire.modele_) return Fire.modele_;
      // règles pas encore collées (base fermée) : on lit les fichiers, l'appli s'ouvre quand même
      const s = await db.doc("plateforme/modele").get().catch(() => null);
      if (s && s.exists) return (Fire.modele_ = s.data());
      // premier lancement : pas encore publié, l'appli lit les fichiers (l'admin publie depuis #admin > Modèle)
      const [mods, roles] = await Promise.all([json("modules.json"), json("roles.json")]);
      return (Fire.modele_ = { ...Modele.compiler(mods, roles).doc, nonPublie: true });
    },
    async sports() {
      const s = await db.collection("sports").get().catch(() => null);
      if (s && !s.empty) return Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
      const f = await json("sports.json"); return Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith("_")));
    },
    async clubs() { try { return docs(await db.collection("clubs").get()); } catch { return []; } },
    async club(c) { const s = await db.doc("clubs/" + c).get().catch(() => ({ exists: false })); return s.exists ? { id: c, ...s.data() } : null; },
    async monMembre(c) { if (!Fire.uid) return null; try { const s = await db.doc(`clubs/${c}/membres/${Fire.uid}`).get(); return s.exists ? s.data() : null; } catch { return null; } },
    async roles(c) { const s = await db.doc(`clubs/${c}/reglages/roles`).get(); return s.exists ? s.data().roles : (await Fire.modele()).roles; },
    // Une requête par façon d'avoir le droit de lire (les règles refusent une requête trop large), puis fusion.
    async liste(c, col, Pol) {
      const ref = db.collection(`clubs/${c}/${col}`);
      const res = new Map(); const ajoute = (arr) => arr.forEach((d) => res.set(d.id, d));
      const essai = async (q) => { try { ajoute(docs(await q.get())); } catch (e) { /* refusé : ce profil n'a pas cette voie */ } };
      const gere = D.can(Pol.e) || (!["public", "public?", "membre"].includes(Pol.l) && D.can(Pol.l));
      const p = D.perimetre();
      if (Pol.l === "public" || ((Pol.l === "membre" || Pol.l === "public?") && D.membre()) || (gere && (D.president() || p.includes("*")))) await essai(ref);
      else {
        if (Pol.l === "public?") await essai(ref.where("public", "==", true));
        if (gere) for (const champ of ["sectionId", "categorieId"]) for (const paquet of parPaquets(p)) await essai(ref.where(champ, "in", paquet));
        const mes = D.mesPersonnes();
        if (Pol.perso && mes.length) for (const paquet of parPaquets(mes)) await essai(ref.where("personneId", "in", paquet));
        if (Pol.soi) for (const id of mes) { try { const s = await ref.doc(id).get(); if (s.exists) ajoute([{ id, ...s.data() }]); } catch {} }
      }
      return [...res.values()];
    },
    async lire(c, col, id) { const s = await db.doc(`clubs/${c}/${col}/${id}`).get(); return s.exists ? { id, ...s.data() } : null; },
    async ecrire(c, col, id, data) {
      const ref = id ? db.doc(`clubs/${c}/${col}/${id}`) : db.collection(`clubs/${c}/${col}`).doc();
      await ref.set({ ...data, ...trace() }, { merge: true }); return ref.id;
    },
    async supprimer(c, col, id) { await db.doc(`clubs/${c}/${col}/${id}`).delete(); },
    async membres(c) { return (await db.collection(`clubs/${c}/membres`).get()).docs.map((d) => ({ uid: d.id, ...d.data() })); },
    async ecrireMembre(c, uid, data) { await db.doc(`clubs/${c}/membres/${uid}`).update({ ...data, ...trace() }); },
    async demanderAdhesion(c, nom, tel, message, profil = {}) {
      await db.doc(`clubs/${c}/membres/${Fire.uid}`).set({ nom, tel, role: "membre", perimetre: [], personneId: "", enfants: [], actif: false, depuis: ts(), message, profil, ...trace() });
    },
    async ecrireRoles(c, roles) { await db.doc(`clubs/${c}/reglages/roles`).set({ roles, ...trace() }); },
    async reglage(c, id) { try { const s = await db.doc(`clubs/${c}/reglages/${id}`).get(); return s.exists ? s.data() : null; } catch { return null; } },
    async ecrireReglage(c, id, data) { await db.doc(`clubs/${c}/reglages/${id}`).set({ ...data, ...trace() }, { merge: true }); },
    async majClub(c, data) { await db.doc("clubs/" + c).update({ ...data, ...trace() }); },
    async encaisser(c, data) {
      return db.runTransaction(async (tx) => {
        const cref = db.doc(`clubs/${c}/meta/compteurs`); const s = await tx.get(cref);
        const n = (s.exists ? s.data().recu : 0) + 1;
        tx.set(cref, { recu: n });
        tx.set(db.doc(`clubs/${c}/paiements/${n}`), { ...data, numero: n, date: ts(), par: Fire.uid });
        return n;
      });
    },
    async paiements(c) {
      const ref = db.collection(`clubs/${c}/paiements`);
      if (D.can("finances")) { const p = D.perimetre(); if (D.president() || p.includes("*")) return docs(await ref.orderBy("numero", "desc").limit(200).get()); }
      const mes = D.mesPersonnes(); if (!mes.length) return [];
      return docs(await ref.where("personneId", "in", mes.slice(0, 30)).get()).sort((a, b) => b.numero - a.numero);
    },
    async creerCode(c, evenementId, data) { await db.doc(`clubs/${c}/codes/${evenementId}`).set({ ...data, expire: firebase.firestore.Timestamp.fromDate(new Date(data.expire)), ...trace() }); },
    async lireCode(c, evenementId) { const s = await db.doc(`clubs/${c}/codes/${evenementId}`).get(); return s.exists ? { ...s.data(), expire: s.data().expire.toDate().toISOString() } : null; },
    async pointer(c, evenementId, personneId, code, extra = {}) {
      await db.doc(`clubs/${c}/pointages/${evenementId}_${personneId}`).set({ evenementId, personneId, code: code || "", at: ts(), uid: Fire.uid, sectionId: extra.sectionId || "", categorieId: extra.categorieId || "", manuel: !!extra.manuel });
    },
    async pointages(c, evenementId) { return docs(await db.collection(`clubs/${c}/pointages`).where("evenementId", "==", evenementId).get()); },
    // ----- admin de la plateforme -----
    async publierModele(doc) { await db.doc("plateforme/modele").set(JSON.parse(JSON.stringify(doc))); Fire.modele_ = null; },
    async creerClub(c, club) { await db.doc("clubs/" + c).set({ ...club, ...trace() }); },
    async majLicence(c, data) { await db.doc("clubs/" + c).update({ ...data, ...trace() }); },
    async publierSports(map) { const b = db.batch(); for (const [id, sp] of Object.entries(map)) b.set(db.doc("sports/" + id), sp); await b.commit(); },
    async compteParTel(tel) { const q = await db.collection("users").where("tel", "==", tel).limit(1).get(); return q.empty ? null : { uid: q.docs[0].id, ...q.docs[0].data() }; },
    async nommerPresident(c, uid, nom) { await db.doc(`clubs/${c}/membres/${uid}`).set({ nom, tel: "", role: "president", perimetre: ["*"], personneId: "", enfants: [], actif: true, depuis: ts(), ...trace() }); },
  };

  const demo = !P.FIREBASE_CONFIG || /[?&]demo/.test(location.search);
  window.Donnees = demo ? Demo : Fire;
  window.Donnees.outils = { nouvelId, ajd };
})();
