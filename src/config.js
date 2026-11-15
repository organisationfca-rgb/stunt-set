// =====================================================================
//  STUNT SET ! — fichier de réglages
//  Toutes les valeurs d'équilibrage et tous les liens sont ici.
//  On peut les modifier sans toucher au reste du code.
// =====================================================================

export const CONFIG = {
  version: '0.1.0',

  // ----- Liens du FCA -----
  links: {
    fca: 'https://linktr.ee/FCA_France',
    instagram: 'https://www.instagram.com/fca.france/',
    youtube: 'https://www.youtube.com/@FCA-France',
    game: '', // adresse publique du jeu (remplie à la mise en ligne)
  },

  // ----- Classement en ligne -----
  leaderboard: {
    // Adresse de l'application web Apps Script. Vide = classement de démonstration.
    url: '',
    timeoutMs: 8000, // délai maximum d'attente du serveur
    topSize: 20, // nombre de lignes affichées
  },

  // ----- Pseudo -----
  pseudo: { min: 3, max: 16 },

  // ----- Mini-jeu 1 : La chute -----
  chute: {
    startHeight: 10, // hauteur du premier saut, en mètres
    // Progression : on ajoute "step" mètres tant que la hauteur est inférieure à "until".
    heightSteps: [
      { until: 30, step: 5 },
      { until: 100, step: 10 },
      { until: 300, step: 25 },
      { until: 1000, step: 50 },
      { until: Infinity, step: 100 },
    ],

    // --- Phase 1 : la visée ---
    aim: {
      sweep: 62, // amplitude des jauges à l'écran (en pixels du jeu)
      directionPeriod: 2.0, // secondes pour un aller-retour du curseur de direction au premier saut
      powerPeriod: 1.8, // secondes pour un aller-retour du curseur de puissance
      speedUpPerJump: 0.03, // les jauges accélèrent de 3 % à chaque saut...
      maxSpeedUp: 1.8, // ...jusqu'à 1,8 fois la vitesse de départ (au-delà, ce n'est plus jouable)
      // Taille apparente de la cible vue d'en haut : scale = near / (1 + hauteur / falloff), jamais sous "min"
      // C'est aussi la taille des zones colorées sur les jauges : elles rétrécissent doucement avec la hauteur,
      // puis ne descendent plus sous "viewMin", pour que la visée reste jouable à toutes les hauteurs.
      viewNear: 0.9,
      viewFalloff: 110,
      viewMin: 0.32,
    },

    // --- Le vent ---
    // Le joueur doit viser contre le vent : une flèche montre de combien il sera poussé.
    wind: {
      driftPerLevel: 3.2, // déviation à l'écran de visée, en pixels, par niveau de force (de 1 à 8)
    },

    // --- Les niveaux : c'est le vent qui fait la difficulté ---
    // windMin / windMax : force du vent tirée au hasard à chaque saut. scoreMult : tous les points gagnés sont multipliés.
    levels: [
      { id: 'facile', windMin: 0, windMax: 0, scoreMult: 1 },
      { id: 'moyen', windMin: 1, windMax: 4, scoreMult: 1.5 },
      { id: 'difficile', windMin: 4, windMax: 8, scoreMult: 2 },
    ],

    // --- Les stages (décors) ---
    stages: ['studio', 'falaise', 'feu', 'helico'],

    // --- La cible (rayons en pixels, à taille réelle) ---
    target: { perfect: 12, good: 26, edge: 40 },

    // --- Phase 2 : la chute ---
    fall: {
      // durée de la chute en secondes = base + factor * racine(hauteur), plafonnée à max
      timeBase: 3.6,
      timeFactor: 0.45,
      timeMax: 15,
      moveSpeed: 150, // vitesse de déplacement au clavier (pixels par seconde)
      touchGain: 1.5, // sensibilité du pouce gauche
      swipeMin: 9, // longueur minimale d'un glissé pour faire une figure (pixels du jeu)
      playerRadius: 7, // taille du cascadeur pour les collisions
      recenterTime: 0.7, // à la fin, le cascadeur revient sur sa trajectoire (secondes)
      accel: 1.6, // la chute accélère : 1 = vitesse constante, 2 = très lent au début puis très rapide
      // taille du sol au début de la chute : near / (1 + hauteur / falloff), jamais sous "min" (plus c'est petit, plus on est haut)
      // (on ne cherche pas le réalisme : le plateau doit rester bien visible, même de très haut)
      viewNear: 0.5,
      viewFalloff: 140,
      viewMin: 0.13,
    },

    // --- Position dos : un vrai enjeu de timing ---
    dos: {
      window: 1.7, // l'indicateur apparaît 1,7 seconde avant l'impact
      maxBonus: 1.0, // plus on attend, plus les points d'atterrissage montent : jusqu'à +100 % (× 2)
      perfect: 0.3, // dans les 0,3 dernière seconde : « timing parfait », bonus maximum
    },

    // --- Nuages (pour la beauté et la sensation d'altitude) ---
    clouds: {
      from: 60, // pas de nuage en dessous de 60 m d'altitude
      full: 200, // à partir de 200 m, le ciel en est plein
      count: 7, // nombre de nuages à l'écran
    },

    // --- Figures et combos ---
    tricks: {
      duration: 0.34, // durée d'une figure (secondes)
      points: { saltoAvant: 10, saltoArriere: 10, vrilleGauche: 15, vrilleDroite: 15 },
      comboTimeout: 1.0, // sans figure pendant 1 seconde, le combo est validé
      // multiplicateur selon le nombre de figures du combo
      multipliers: [
        { from: 20, mult: 3 },
        { from: 10, mult: 2 },
        { from: 5, mult: 1.5 },
        { from: 1, mult: 1 },
      ],
    },

    // --- Obstacles ---
    obstacles: {
      minHeight: 20, // pas d'obstacle avant les sauts de 20 m
      intervalStart: 1.15, // secondes entre deux obstacles à 20 m
      intervalMin: 0.5, // intervalle minimum aux grandes hauteurs
      intervalHeightRef: 600, // hauteur à laquelle l'intervalle minimum est atteint
      decorChance: 0.25, // part des éléments qui ne sont que du décor
      easterEggChance: 0.02, // fusée ou soucoupe, très rare, seulement tout en haut
      easterEggAltitude: 700,
      stun: 0.45, // secondes sans figure après un choc
    },

    // --- Cerceaux de feu ---
    hoops: {
      minHeight: 50, // pas de cerceau avant les sauts de 50 m
      interval: 3.4, // secondes entre deux cerceaux
      radius: 20, // rayon du cerceau
      passRadius: 12, // on passe « au centre » si on est à moins de 12 px du centre
      burnRadius: 27, // au-delà de passRadius et jusqu'à 27 px : brûlure
      bonus: 500,
      penalty: 500,
      multBonus: 0.5, // ajouté au multiplicateur du combo en cours
    },

    // --- Atterrissage ---
    landing: {
      // points = base de la zone × (hauteur / 10)
      perfect: 100,
      good: 50,
      edge: 20,
      // bonus des « Parfait » enchaînés : +25 % par Parfait de suite, plafonné à +100 %
      streakBonus: 0.25,
      streakMax: 1.0,
    },
  },

  // ----- Classement de démonstration (tant que le vrai n'est pas branché) -----
  demoBoard: {
    players: 60,
    chute: { top: 42000, bottom: 150 },
  },
};
