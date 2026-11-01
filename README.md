# LLK Club Manager : base commune de gestion de clubs multisport

Une seule appli (ordinateur et téléphone) pour gérer des centaines de clubs : football d'abord, puis basket, handball,
volley, lutte, athlétisme… Par club : sections, catégories, joueurs et staff, licences, planning, convocations,
pointage par code, stats, suivi médical, cotisations et reçus, dépenses, sponsors, actualités, vitrine publique.

**À lire d'abord : [ARCHITECTURE.md](ARCHITECTURE.md)** (profils, modèle de données, comment ajouter un module sans toucher au code ni aux règles).

## Arborescence

```
docs/                       l'appli, publiée telle quelle sur GitHub Pages
  index.html, app.css, sw.js, manifest.webmanifest, icons/
  config.js                 réglages de la PLATEFORME seulement (Firebase, admins, club par défaut)
  core/app.js               écrans : construits depuis le modèle + accueil, pointage, caisse, membres, réglages, admin
  core/donnees.js           accès aux données (mode démo ou Firebase, même interface)
  core/droits.js            miroir des règles : n'affiche que ce que le profil peut faire
  core/modele.js            compile et vérifie le modèle avant publication
  modele/modules.json       LE modèle : modules, collections, champs, droits
  modele/roles.json         rôles de départ des clubs
  modele/sports.json        catalogue des sports (postes, formats, stats, catégories)
  modele/exemple-club.json  club d'exemple (mode démo)
firestore.rules             règles communes, à coller UNE fois (seul l'identifiant admin change)
tests/regles.test.mjs       78 vérifications des règles sur l'émulateur
tests/e2e-demo.cjs          parcours de démo téléphone + ordinateur
.github/workflows/pages.yml publication automatique de docs/
```

## Essayer tout de suite (mode démo)

Sans Firebase (`FIREBASE_CONFIG: null`), l'appli s'ouvre sur le club d'exemple et une barre jaune permet de la voir comme
président, trésorière, directeur sportif foot, coach U13, kiné, joueur, parent, visiteur, ou **admin plateforme**.
Tout reste sur l'appareil ; « Remettre à zéro » recharge l'exemple.

## Démarrer un nouveau dépôt

1. Créer un dépôt GitHub vide, y copier ce dossier, pousser sur `main`.
2. Settings > Pages > Source : **GitHub Actions**. L'appli est en ligne en mode démo.
3. Firebase : créer un projet, activer Authentication (Google + e-mail) et Firestore.
4. `docs/config.js` : coller la configuration web dans `FIREBASE_CONFIG`.
5. Se connecter une fois, ouvrir `#admin` : l'appli affiche ton identifiant. Le mettre dans `admins` (config.js)
   et dans `admin()` de `firestore.rules`, puis coller les règles dans la console (Firestore > Règles). **C'est la seule fois.**
6. `#admin > Modèle` : « Republier depuis les fichiers ». `#admin > Sports` : « Publier le catalogue ».
7. `#admin > Clubs` : créer le premier club, cocher ses modules, nommer son président (son identifiant s'affiche sur `#admin` quand il s'y connecte).

## Tests

```
npm install
npm run test:regles                      # 78 cas : périmètres, joueur/parent, pointage, reçus, rôles, modèle publié
python3 -m http.server 8777 -d docs &    # puis
npm run test:e2e                         # parcours démo : création de fiche, pointage, convocation, caisse, admin
```
