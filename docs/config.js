// Réglages de la PLATEFORME (communs à tous les clubs). Ce qui change d'un club à l'autre (nom, logo, couleurs,
// sections, catégories, tarifs, rôles) est dans Firestore, sous clubs/{clubId}, et se gère dans l'appli.
window.PLATEFORME = {
  nom: "LLK Club Manager",            // nom de la plateforme
  slogan: "La gestion de club, du terrain à la caisse.",
  urlAppli: "https://kanelimamou-blip.github.io/LLK-CLUB-MANAGER/",
  clubParDefaut: "",                  // club ouvert à l'arrivée ("" = liste des clubs ; une appli dédiée à un club = son id ici)
  supportTel: "78 272 19 20",
  // Connexion par numéro de téléphone : « code » = code secret choisi par la personne (gratuit), « sms » = code reçu par SMS
  // (forfait Firebase Blaze). Réglage de départ : l'admin le change ensuite dans #admin > Connexion, sans toucher au code.
  CONNEXION: { mode: "code", google: false },
  indicatif: "+221",
  // null = mode démo : tout reste sur l'appareil, avec le club d'exemple et une barre pour changer de profil.
  // Ajoutez ?demo à l'adresse pour retrouver le club d'exemple (présentation à un club), sans toucher aux vraies données.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCSBGFKmrOp1K-DUrfIrHQaRbJunN8uths",
    authDomain: "llk-club.firebaseapp.com",
    projectId: "llk-club",
    storageBucket: "llk-club.firebasestorage.app",
    messagingSenderId: "915353399077",
    appId: "1:915353399077:web:b2947ba8dede32d0ec34cc",
  },
  // Identifiants Firebase des admins de la plateforme (les mêmes que dans admin() de firestore.rules). Jamais d'e-mail ici.
  admins: [],
};
