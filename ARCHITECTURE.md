# Architecture : plateforme de gestion de clubs multisport

Une seule appli (web installable, ordinateur et téléphone), un seul projet Firebase, des centaines de clubs.
On modélise une fois ; on ne recopie ni le code ni les règles pour un nouveau club, un nouveau sport ou un nouveau module.

## 1. Les quatre idées qui font la modularité

| Idée | Où ça vit | Ce qu'on change pour l'adapter |
|---|---|---|
| **Multi-club** : chaque club a son espace `clubs/{clubId}/…` | Firestore | Rien : l'admin crée le club dans `#admin` |
| **Multi-sport** : catalogue commun des sports (postes, formats, stats, catégories) | `sports/{id}` (départ : `docs/modele/sports.json`) | Ajouter une entrée au catalogue |
| **Le modèle** : modules → collections → champs, droits, rôles de départ | `plateforme/modele` (départ : `docs/modele/modules.json` + `roles.json`) | L'admin ajoute un champ, une collection, un module, un droit depuis `#admin > Modèle` |
| **Rôle + périmètre** : *ce qu'on peut faire* × *sur quelles sections/catégories* | `clubs/{id}/reglages/roles` + `clubs/{id}/membres/{uid}` | Le président crée ses rôles, le secrétaire donne les accès |

Les **règles Firestore** (`firestore.rules`) ne contiennent aucun club, aucun sport, aucune collection métier.
Elles lisent le modèle publié (`plateforme/modele`) : **on les colle une seule fois** dans la console Firebase,
on change juste l'identifiant de l'admin dans `admin()`. Ajouter un champ ou une collection n'y touche pas.

## 2. Les profils

| Profil | Qui le donne | Ce qu'il voit et fait |
|---|---|---|
| **Admin plateforme** (toi) | `admins` dans `config.js` + `admin()` dans les règles | Tous les clubs ; crée un club, active/suspend sa licence, choisit ses modules, nomme son président ; publie le modèle et le catalogue des sports ; lit tout pour le support |
| **Président** (niveau 100) | l'admin | Tout son club ; crée les rôles du club ; donne tous les accès |
| **Rôles du club** (niveau 1 à 99) | le président les crée, un membre avec le droit *Membres* les donne sous son propre niveau | Les droits du rôle, limités à son **périmètre** |
| **Membre** (joueur, parent, supporter, niveau 0) | il demande à rejoindre, le club accepte | Les annonces, le planning, les stats ; **ses** fiches, convocations, échéances, reçus. Un parent est un membre lié aux fiches de ses enfants |
| **Visiteur** | — | La vitrine : club, sections, équipes, matchs et actualités marqués « vitrine », terrains |

Rôles de départ (`roles.json`, modifiables par chaque club) : Vice-président 90, Secrétaire général 70, Trésorier 70,
Directeur sportif 70, Entraîneur 40, Staff médical 40, Adjoint/préparateur 30, Intendant 30, Communication 30.

**Droits** : `structure`, `membres`, `effectif`, `sportif`, `medical`, `finances`, `communication`, `installations`, `reglages`.

**Périmètre** : liste d'ids de sections ou de catégories donnée à chaque membre (`*` = tout le club).
Un entraîneur U13 et un entraîneur U17 ont le même rôle, avec un périmètre différent : chacun ne voit et ne modifie que ses joueurs.
Un responsable de la section foot ne peut pas donner un accès au basket.

### Inscription et connexion

- **Connexion par numéro de téléphone.** Gratuit : téléphone + code secret à 6 chiffres choisi à la première connexion. Payant (Firebase Blaze) : code reçu par SMS. Google en option. L'admin choisit dans `#admin > Connexion`.
- **Fiche demandée à la première connexion**, définie dans `modules.json > compte` : « Je suis » joueur, parent, staff technique, staff médical, dirigeant… Les champs s'adaptent (`pour`, `requisPour`) : âge, poste, taille… pour un joueur ; e-mail et fonction obligatoires pour le staff.
- **Demande d'adhésion** au club avec la catégorie souhaitée ; le profil est joint. Le club valide dans Membres : « Créer sa fiche depuis ce profil » crée la fiche joueur ou staff, la lie au compte et l'active.
- **Suivi de performance** : le joueur (et ses parents) voient sur l'accueil matchs, minutes, stats cumulées du sport, taux de présence, note moyenne, dernière évaluation.

## 3. Modèle de données (Firestore)

```
plateforme/modele            le modèle publié : politique des collections, rôles de départ, modules (pour l'appli)
sports/{sportId}             catalogue commun : nom, formats, postes, stats, catégories de départ
users/{uid}                  compte : téléphone (vient de la connexion), champs de la fiche (modèle > compte), actif, dates du serveur
plateforme/reglages          mode de connexion (code secret ou SMS, Google)
erreurs/{id}                 plantages et refus remontés par les appareils (lus par l'admin)

clubs/{clubId}               fiche publique : nom, logo, couleurs, contacts ; licence : active, modules, offre (admin)
  membres/{uid}              rôle, périmètre, personneId (sa fiche), enfants (fiches de ses enfants), actif
  reglages/roles             rôles du club { id: { nom, niveau, droits } }
  reglages/{autre}           autres réglages du club
  ── module base ──
  sections/{id}              une par sport pratiqué (sportId)
  categories/{id}            U13 garçons, Seniors F… (sectionId)
  saisons/{id}
  ── module effectif ──
  personnes/{id}             joueurs ET staff (type, poste selon le sport, numéro, parents, contact d'urgence…)
  licences/{id}              personne × saison : numéro, statut, certificat médical
  equipes/{id}               U15 A… (catégorie, staff, effectif affiché sur la vitrine)
  documents/{id}             dossier : pièces, autorisations, contrats
  ── module sportif ──
  evenements/{id}            entraînement, match, tournoi, stage, réunion (public = sur la vitrine)
  convocations/{id}          le joueur ou son parent répond présent/absent
  presences/{id}             saisies par le staff (retard, note de séance)
  codes/{evenementId}        code de pointage du jour (lu par le staff seulement)
  pointages/{evt_personne}   le joueur pointe avec le code ; le staff peut pointer à la main
  stats/{id}                 stats de match, clés selon le sport (buts, rebonds, arrêts…)
  evaluations/{id}           évaluations et tests physiques
  blessures/{id}             suivi médical : lu par le staff médical et le joueur concerné
  ── module finances ──
  cotisations/{id}           tarifs par catégorie et saison
  echeances/{id}             ce que chaque joueur doit, et a payé
  paiements/{n}              reçus numérotés 1, 2, 3… jamais modifiés ni effacés
  meta/compteurs             numéro du dernier reçu
  depenses/{id}              jamais effacées
  sponsors/{id}
  ── module communication ──
  actualites/{id}, galerie/{id}   (public = sur la vitrine)
  annonces/{id}              aux membres
  ── module installations ──
  terrains/{id}, reservations/{id}
```

Chaque document d'un club porte `sectionId` et `categorieId` quand il dépend d'une catégorie (c'est ce qui applique le périmètre),
`personneId` quand il concerne une personne (c'est ce qui le rend visible au joueur et à ses parents),
et `maj` (heure du serveur) + `par` (auteur) pour la traçabilité, imposés par les règles.

## 4. Le fichier modèle (`docs/modele/modules.json`)

```json
{ "id": "convocations", "nom": "Convocations",
  "lire": "sportif",          // public | public? | membre | <droit>
  "ecrire": "sportif",        // droit nécessaire, toujours limité au périmètre
  "perso": true,              // le joueur concerné et ses parents la lisent
  "reponse": ["reponse", "commentaire"],   // champs qu'ils peuvent modifier eux-mêmes
  "categorie": true,          // porte sectionId / categorieId
  "garder": false,            // true = jamais supprimé
  "champs": [ { "id": "reponse", "type": "choix", "options": ["présent", "absent"], "label": "Réponse" } ] }
```

Types de champ : `texte, texteLong, nombre, montant, date, dateheure, heure, booleen, choix, ref, refs, tel, email, image, lien, liste, map`.
`"selonSport": "postes"` ou `"stats"` adapte le champ au sport de la section (liste de postes, cases de stats).

L'appli construit **toute seule** les menus, les listes (tableau sur ordinateur, cartes sur téléphone), les filtres
par section/catégorie et les formulaires depuis ce modèle. Un écran n'est écrit à la main que s'il a une logique propre :
accueil (vitrine + espace joueur/parent + tableau de bord du staff), pointage, caisse, membres, réglages, admin.

## 5. Ajouter quelque chose : qui fait quoi

| Besoin | Comment | Recoller les règles ? |
|---|---|---|
| Nouveau club | `#admin > Clubs > Nouveau club`, puis « Nommer le président » | Non |
| Vendre un module à un club | `#admin > Clubs` : cocher le module | Non |
| Suspendre un club qui ne paie pas | `#admin > Clubs` : décocher « Licence active » | Non |
| Nouveau sport (volley, lutte…) | `#admin > Sports` (JSON) ou `sports.json`, puis le club crée sa section | Non |
| Nouveau champ (groupe sanguin, taille de maillot…) | `#admin > Modèle > Ajouter un champ` | Non |
| Nouvelle collection ou nouveau module (boutique, transport…) | `#admin > Modèle > Ajouter une collection` (+ nouveau module) | Non |
| Nouveau droit | `#admin > Modèle > Ajouter un droit`, puis l'ajouter aux rôles | Non |
| Couleurs et logo d'un club | le président, dans Réglages : il charge son logo depuis son téléphone, l'appli propose ses couleurs | Non |
| Nouveau rôle dans un club | le président, dans Réglages | Non |
| Accès d'un entraîneur à une catégorie | le secrétaire, dans Membres (périmètre) | Non |
| Logique spéciale (ex. reçus numérotés, pointage par code) | écrire un bloc dédié dans `firestore.rules` + un écran | **Oui**, une fois |

Garde-fous : les noms `membres, reglages, codes, pointages, meta, paiements` sont réservés (règles dédiées) et refusés par le modèle ;
un champ hors modèle est refusé ; un module non souscrit est fermé ; un club suspendu est fermé, vitrine comprise.

## 6. Web et mobile

- **Une seule appli** HTML/JS sans build (même recette que Momo Foot), publiée sur GitHub Pages depuis `docs/`.
  Installable sur téléphone (« Ajouter à l'écran d'accueil »), marche hors connexion pour ce qui est déjà chargé.
- Téléphone : barre d'onglets en bas. Ordinateur (≥ 900 px) : menu à gauche, listes en tableau.
- Plus tard, pour être dans le Play Store / l'App Store : emballer le même `docs/` avec Capacitor, sans réécrire.

## 7. Montée en charge (500 clubs et plus)

- Toutes les données d'un club sont sous son chemin : aucune requête ne lit les autres clubs.
- Les règles font au plus 5 lectures (compte, club, membre, rôles, modèle) par requête, sous la limite de 10, et restent sous 1000 expressions (testé).
- Un membre avec un périmètre limité lit par requêtes filtrées (`sectionId in`, `categorieId in`, `personneId in`) que les règles acceptent ;
  l'appli fait ces requêtes et fusionne.
- Coût Firestore : surtout des lectures ; une liste par écran, pas d'écoute permanente sur tout le club.
- À prévoir au-delà de quelques centaines de clubs : Firebase Storage pour les photos (aujourd'hui des liens), index composites
  au fil des besoins, et un club = un sous-domaine ou un lien `…/#/c/<club>` (déjà en place).

## 8. Ce qui reste à faire après ce squelette

1. Créer le projet Firebase, coller `firestore.rules` (avec ton identifiant dans `admin()`), mettre `FIREBASE_CONFIG` et `admins` dans `config.js`.
2. Ouvrir `#admin > Modèle` et publier (sinon les règles refusent tout), puis `#admin > Sports` et publier.
3. Créer le premier club et nommer son président.
4. Fonctions suivantes : messages WhatsApp en un clic (convocations, relances de cotisation), photos dans Firebase Storage,
   QR code du pointage, feuille de match imprimable, export CSV, statistiques de saison par joueur, paiement Wave en ligne.
