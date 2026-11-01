// Compile le modèle (modules.json + roles.json) en document plateforme/modele, lu par les règles Firestore.
// Utilisé par l'espace admin (bouton « Publier le modèle ») et par les tests. Aucune dépendance.
(function (g) {
  const RESERVEES = ["membres", "reglages", "codes", "pointages", "meta", "paiements"];
  const LECTURES = ["public", "public?", "membre"];

  function compiler(mods, roles) {
    const erreurs = [];
    const droits = mods.droits || {};
    const politique = {};
    for (const mod of mods.modules || []) {
      if (!/^[a-z][a-z0-9_]*$/.test(mod.id || "")) erreurs.push(`module « ${mod.id} » : id en minuscules sans accent`);
      for (const col of mod.collections || []) {
        const ou = `${mod.id}/${col.id}`;
        if (!/^[a-z][a-z0-9_]*$/.test(col.id || "")) erreurs.push(`${ou} : id de collection en minuscules sans accent`);
        if (RESERVEES.includes(col.id)) erreurs.push(`${ou} : « ${col.id} » est réservé (règles dédiées)`);
        if (politique[col.id]) erreurs.push(`${ou} : collection déclarée deux fois`);
        if (!LECTURES.includes(col.lire) && !(col.lire in droits)) erreurs.push(`${ou} : lire = « ${col.lire} » inconnu`);
        if (!(col.ecrire in droits)) erreurs.push(`${ou} : ecrire = « ${col.ecrire} » n'est pas un droit`);
        const champs = (col.champs || []).map((c) => c.id);
        for (const c of champs) if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(c || "")) erreurs.push(`${ou} : champ « ${c} » (lettres sans accent)`);
        for (const r of col.reponse || []) if (!champs.includes(r)) erreurs.push(`${ou} : réponse « ${r} » n'est pas un champ`);
        if (col.perso && !col.soi && !champs.includes("personneId")) erreurs.push(`${ou} : perso sans champ personneId`);
        politique[col.id] = { m: mod.id, l: col.lire, e: col.ecrire, perso: !!col.perso, soi: !!col.soi, garder: !!col.garder, rep: col.reponse || [], champs };
      }
    }
    const R = {};
    for (const [id, r] of Object.entries((roles && roles.roles) || {})) {
      if (["president", "membre"].includes(id)) erreurs.push(`rôle ${id} : nom réservé`);
      if (!(r.niveau >= 1 && r.niveau <= 99)) erreurs.push(`rôle ${id} : niveau de 1 à 99`);
      for (const dr of r.droits || []) if (!(dr in droits)) erreurs.push(`rôle ${id} : droit « ${dr} » inconnu`);
      R[id] = { nom: r.nom, niveau: r.niveau, droits: r.droits || [] };
    }
    return { erreurs, doc: { politique, roles: R, modules: mods, version: Date.now() } };
  }
  g.Modele = { compiler, RESERVEES };
})(typeof window !== "undefined" ? window : globalThis);
