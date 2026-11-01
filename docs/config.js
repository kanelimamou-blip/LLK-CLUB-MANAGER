// Réglages de la PLATEFORME (communs à tous les clubs). Ce qui change d'un club à l'autre (nom, logo, couleurs,
// sections, catégories, tarifs, rôles) est dans Firestore, sous clubs/{clubId}, et se gère dans l'appli.
window.PLATEFORME = {
  nom: "LLK Club Manager",            // nom de la plateforme
  slogan: "La gestion de club, du terrain à la caisse.",
  urlAppli: "https://kanelimamou-blip.github.io/LLK-CLUB-MANAGER/",
  clubParDefaut: "as-exemple",        // club ouvert à l'arrivée (une appli dédiée à un club = son id ici)
  supportTel: "78 272 19 20",
  // null = mode démo : tout reste sur l'appareil, avec le club d'exemple et une barre pour changer de profil.
  FIREBASE_CONFIG: null,
  // Identifiants Firebase des admins de la plateforme (les mêmes que dans admin() de firestore.rules). Jamais d'e-mail ici.
  admins: [],
};
