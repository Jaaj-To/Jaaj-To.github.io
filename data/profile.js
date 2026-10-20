/* =====================================================================
   PROFIL — tes infos personnelles.
   Remplace les textes entre guillemets. Tu peux supprimer une ligne
   optionnelle : la section correspondante se masquera toute seule.
   ===================================================================== */

window.PROFILE = {
  name: "Prénom Nom",
  logo: "PRÉNOM // NOM",                       // texte affiché en haut à gauche
  role: "Game Designer & Gameplay Programmer",
  intro: "Étudiant·e en game design et programmation. J'aime construire des contrôles qui répondent bien et des systèmes qui donnent envie de rejouer.",
  status: "Recherche un stage — été 2027",     // optionnel : petite pastille dans l'en-tête
  location: "Paris, France",                   // optionnel

  // Style par défaut : "dark" (sombre) ou "sketch" (carnet).
  // Le visiteur peut changer avec le bouton en haut à droite.
  defaultStyle: "dark",

  // ----- À propos -----
  about: [
    "Je suis en 3e année de Game Design & Programming. Je travaille surtout sur Unity et Godot, en C#, et je touche à Blender quand une équipe a besoin d'un coup de main sur les assets.",
    "Ce qui m'intéresse le plus : le game feel, les outils pour les designers et les petites équipes qui sortent des jeux finis."
  ],
  avatar: "",   // optionnel : "assets/avatar.jpg". Vide = initiales.

  skills: [
    { group: "Moteurs",   items: ["Unity", "Godot", "Unreal Engine"] },
    { group: "Langages",  items: ["C#", "C++", "GDScript", "Python"] },
    { group: "Outils",    items: ["Git", "Blender", "Aseprite", "FMOD", "Photoshop"] },
    { group: "Langues",   items: ["Français (natif)", "Anglais (courant)"] }
  ],

  // ----- Parcours (du plus récent au plus ancien) -----
  // type : "edu" (formation) ou "work" (expérience)
  timeline: [
    { type: "work", date: "06/2025 – 08/2025", title: "Stage Game Designer", place: "Nom du studio", text: "Ce que tu as fait pendant ce stage, en une ou deux phrases." },
    { type: "edu",  date: "2023 – 2028",       title: "Game Design & Programming", place: "Nom de l'école", text: "" },
    { type: "edu",  date: "2023",              title: "Baccalauréat", place: "Lycée", text: "" }
  ],

  // ----- Contact -----
  contact: {
    pitch: "Ouvert aux stages et aux game jams. Écris-moi, je réponds vite.",
    email: "ton.email@exemple.com",
    cv: "",                  // optionnel : dépose ton CV dans assets/ puis mets "assets/cv.pdf"
    links: [
      { label: "itch.io",  url: "https://ton-pseudo.itch.io" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/ton-profil" },
      { label: "GitHub",   url: "https://github.com/ton-pseudo" }
    ]
  },

  // ----- Administration (page admin.html) -----
  // Le dépôt GitHub où le site est hébergé. Ces valeurs pré-remplissent
  // le formulaire de connexion de la page Admin.
  admin: {
    owner: "Jaaj-To",                    // ton nom d'utilisateur GitHub
    repo: "Jaaj-To.github.io",           // le nom du dépôt du site
    branch: "main",
    showLink: true                       // false = cache le lien "Admin" du menu
  },

  // ----- Catégories de projets -----
  // L'"id" est ce que tu mets dans le champ "category" de chaque jeu.
  // Tu peux en ajouter, en renommer ou en supprimer.
  categories: [
    { id: "personal", label: "Perso" },
    { id: "school",   label: "École" },
    { id: "jam",      label: "Game Jam" },
    { id: "pro",      label: "Pro" }
  ]
};
