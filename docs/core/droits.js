// Miroir des règles Firestore côté appli : sert à n'afficher que ce que le profil peut voir et faire.
// La vraie sécurité reste dans firestore.rules ; ici on évite seulement de montrer des boutons refusés.
(function () {
  const D = {
    ctx: { uid: null, admin: false, membre: null, R: {} }, // R = rôles du club (reglages/roles ou rôles de départ du modèle)
    regler(ctx) { D.ctx = { ...D.ctx, ...ctx }; },
    membre() { const m = D.ctx.membre; return !!(m && m.actif); },
    role() { return D.membre() ? D.ctx.membre.role : D.ctx.uid ? "visiteur connecté" : "visiteur"; },
    president() { return D.membre() && D.ctx.membre.role === "president"; },
    can(droit) {
      if (!D.membre()) return false;
      const r = D.ctx.membre.role;
      return r === "president" || !!(D.ctx.R[r] && (D.ctx.R[r].droits || []).includes(droit));
    },
    niveau(r) { return r === "president" ? 100 : D.ctx.R[r] ? Math.min(D.ctx.R[r].niveau, 99) : 0; },
    perimetre() { return D.membre() ? D.ctx.membre.perimetre || [] : []; },
    dansPerimetre(data) {
      if (!D.membre()) return false;
      const p = D.perimetre();
      return D.president() || p.includes("*") || p.includes(data.sectionId) || p.includes(data.categorieId);
    },
    mesPersonnes() {
      if (!D.membre()) return [];
      const m = D.ctx.membre;
      return [m.personneId, ...(m.enfants || [])].filter(Boolean);
    },
    concerne(data, id, P) {
      const mes = D.mesPersonnes();
      return mes.includes(data.personneId) || (!!P && P.soi && mes.includes(id));
    },
    // P = entrée de la politique (plateforme/modele.politique[col])
    lecture(P, data, id) {
      if (!P) return false;
      return P.l === "public" || (P.l === "public?" && data.public === true)
        || ((P.l === "membre" || P.l === "public?") && D.membre())
        || (!["public", "public?", "membre"].includes(P.l) && D.can(P.l) && D.dansPerimetre(data))
        || (D.can(P.e) && D.dansPerimetre(data))
        || ((P.perso || P.soi) && D.concerne(data, id, P));
    },
    ecriture(P, data) { return !!P && D.can(P.e) && D.dansPerimetre(data); },
    champsReponse(P, data, id) { return P && P.rep.length && D.concerne(data, id, P) ? P.rep : []; },
    // sections et catégories que le profil peut utiliser dans un formulaire
    perimetreOk(sectionId, categorieId) { return D.dansPerimetre({ sectionId, categorieId }); },
  };
  window.Droits = D;
})();
