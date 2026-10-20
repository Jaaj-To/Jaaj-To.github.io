# Portfolio de jeux

Site statique (HTML/CSS/JS, aucun outil à installer). Ouvre `index.html` dans ton navigateur pour le voir.

```
portfolio/
├── index.html          ← le site (pas besoin d'y toucher)
├── admin.html          ← la page Admin pour modifier tes projets
├── css/style.css       ← apparence (styles « sombre » et « carnet »)
├── css/admin.css       ← apparence de la page Admin
├── js/render.js        ← affichage des cartes et des fiches (partagé)
├── js/main.js          ← génère le site
├── js/admin.js         ← logique de la page Admin
├── data/
│   ├── profile.js      ← TES INFOS : nom, bio, compétences, parcours, contact
│   └── games.js        ← TES JEUX
└── assets/
    └── games/          ← tes images et vidéos, un dossier par jeu
```

## Modifier tes projets avec la page Admin

Clique sur **Admin** dans le menu du site (ou ouvre `admin.html`).

### Connexion

Le site est statique (GitHub Pages) : il n'a pas de serveur, donc pas de mot de passe classique.
Tu te connectes avec un **token GitHub** qui donne le droit d'écrire dans le dépôt du site.
Quand tu cliques sur **Publier**, la page envoie tes images et le fichier `data/games.js` directement dans ton dépôt, et GitHub Pages met le site à jour en une à deux minutes.

Créer le token (une seule fois) :
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access** : « Only select repositories » → le dépôt de ton site.
3. **Permissions → Repository permissions → Contents** : « Read and write ».
4. Copie le token et colle-le dans la page de connexion.

Pré-remplis ton compte et ton dépôt dans `data/profile.js` (bloc `admin`) pour ne taper que le token.

**Sécurité** : n'importe qui peut ouvrir `admin.html`, mais sans ton token personne ne peut rien publier. Le token reste dans ton navigateur et n'est envoyé qu'à `api.github.com`. Ne coche « Rester connecté » que sur ton propre ordinateur. Si tu perds le token ou penses qu'il a fuité, supprime-le sur GitHub.

### Ce que tu peux faire

- Créer, dupliquer, supprimer et réordonner les projets.
- Modifier titre, accroche, catégorie, jam, année, durée, équipe, rôle, moteur, couleur, description, contribution, technos et liens.
- Importer la **couverture**, un **aperçu au survol** (court .mp4 ou GIF joué quand on survole la carte) et une **galerie** : images, vidéos .mp4, sons .mp3, liens YouTube. Glisser-déposer accepté.
- Mettre un projet **à la une** ou le **masquer** sans le supprimer.
- Voir un **aperçu en direct** du vrai site (fiche ou liste, style sombre ou carnet) pendant que tu modifies.
- `Ctrl + S` pour publier.

Tes modifications sont gardées en brouillon dans le navigateur tant qu'elles ne sont pas publiées : un rechargement de page ne les perd pas. Les **fichiers importés** non publiés, eux, sont perdus si tu recharges la page.

Limite : 25 Mo par fichier. Pour les vidéos longues, mets-les sur YouTube et colle le lien.

### Mode local (sans GitHub)

Sur la page de connexion, « Continuer en mode local » permet d'éditer sans token.
Clique ensuite sur **Exporter games.js**, remplace `data/games.js` par le fichier téléchargé, et copie tes médias dans `assets/games/` aux chemins indiqués.

Pour que l'aperçu en direct fonctionne en local, lance un petit serveur plutôt que d'ouvrir le fichier directement :

```
python -m http.server 8000
```

puis ouvre http://localhost:8000/admin.html

## Ajouter un jeu à la main

1. Crée un dossier `assets/games/nom-du-jeu/` et mets-y `cover.jpg` (16:9 conseillé, ~1280×720) et tes captures.
2. Ouvre `data/games.js`, copie un bloc `{ ... },` existant et colle-le dans la liste.
3. Remplis les champs. Seul `title` est obligatoire :

```js
{
  title: "Mon Jeu",
  tagline: "Une phrase pour la carte",
  description: "Texte de la fiche.\n\nNouveau paragraphe.",
  category: "jam",                 // personal | school | jam | pro (voir profile.js)
  jam: "GMTK Game Jam 2025",       // badge ⚑
  featured: true,                  // ★ ; le 1er « featured » est mis en grand
  year: 2025,
  duration: "48 h",
  team: "3 personnes",
  role: "Gameplay Programmer",
  engine: "Unity",
  tech: ["C#", "Unity"],           // crée les filtres automatiquement
  highlights: ["Ce que j'ai fait"],
  cover: "assets/games/mon-jeu/cover.jpg",
  hoverPreview: "assets/games/mon-jeu/preview.mp4",   // joué au survol de la carte
  gallery: [
    "assets/games/mon-jeu/1.jpg",
    "assets/games/mon-jeu/gameplay.mp4",
    "assets/games/mon-jeu/theme.mp3",
    "https://www.youtube.com/watch?v=XXXXXXXXXXX"
  ],
  links: { itch: "https://...", github: "https://..." },
  color: "#3b5bdb"                 // couleur de la vignette s'il n'y a pas d'image
},
```

- **Ordre** : les jeux s'affichent dans l'ordre du fichier.
- **Masquer** un jeu sans le supprimer : `hidden: true`.
- **Pas encore d'image ?** Une vignette colorée avec le titre est générée à partir de `color`.
- **Lien direct** vers une fiche : `ton-site/#jeu-mon-jeu` (le titre en minuscules, espaces → tirets).
- Clés de `links` reconnues : `itch`, `github`, `steam`, `play`, `playstore`, `appstore`, `download`, `video`. Pour un libellé libre : `links: [{ label: "Page Steam", url: "https://..." }]`.

## Personnaliser

- **Infos perso, compétences, parcours, contact, catégories** : `data/profile.js`.
- **Style par défaut** : `defaultStyle: "dark"` ou `"sketch"` dans `profile.js`. Les visiteurs peuvent basculer avec le bouton en haut.
- **CV** : dépose `assets/cv.pdf` et mets `cv: "assets/cv.pdf"` dans `profile.js`.
- **Couleurs et polices** : les variables en haut de `css/style.css` (`--accent`, `--bg`…).

## Mettre en ligne sur GitHub Pages

1. Crée un dépôt nommé `Jaaj-To.github.io`.
2. Envoie le contenu du dossier `portfolio/` à la racine du dépôt.
3. Dans *Settings → Pages*, choisis la branche `main` et le dossier `/ (root)`.
4. Le site est en ligne sur `https://Jaaj-To.github.io` après une minute.
