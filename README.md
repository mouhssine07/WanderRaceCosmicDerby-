# WANDER RACE – COSMIC DERBY

Voici le lien : https://mouhssinejb.itch.io/wanderracecosmicderby
Voici le lien 2 : https://wanderracecosmicderby.netlify.app/

## 👨‍💻 DÉVELOPPEURS
*   **Mouhssine Jaiba**
*   **Hamza Ech-choukairi**

---

## 🚀 À PROPOS DU PROJET

**Wander Race – Cosmic Derby** est un jeu de survie et de compétition spatiale où le joueur incarne un véhicule cosmique cherchant à devenir l'entité la plus grande et la plus puissante de l'univers. Le jeu repose sur un équilibre délicat entre **taille**, **vitesse** et **stratégie**.

L'objectif est simple : survivre, grandir et éliminer la concurrence.

### ❓ QUOY ? (Le Concept)
Un "Battle Royale" spatial en vue de dessus. Le joueur commence petit et rapide. En collectant des **Étoiles** (Points) et des **Orbes de Puissance** (Bonus), le véhicule grandit en masse.

### 👤 QUI ? (Les Acteurs)
1.  **Le Joueur** : Vous.
2.  **L'IA (Intelligence Artificielle)** : 20 autres véhicules contrôlés par l'ordinateur. Ils ont des comportements complexes (fuite, chasse, collecte).
3.  **L'Environnement** : Un monde vaste limité, rempli de pièges (Mines) et de ressources.

### 📅 QUAND ? (Le Déroulement)
Le jeu est une boucle infinie de montée en puissance. Il se termine lorsque le joueur meurt (collision ou destruction).

### ⚙️ COMMENT ? (Mécaniques Clés)
*   **Physique d'Inertie** : Le déplacement n'est pas instantané. Il faut gérer l'accélération et le freinage, surtout quand on est lourd.
*   **Croissance Dynamique** : Plus vous mangez d'étoiles, plus vous grandissez.
*   **Équilibrage Taille / Vitesse** :
    *   *Petit* = Rapide, Agile, Fragile.
    *   *Géant* = Lent, Puissant, Résistant, Difficile à arrêter.
*   **Système de Menace** : Les mines (obstacles) sont "endormies" mais se réveillent et vous pourchassent si vous passez trop près.

### 💡 POURQUOI ? (L'Intérêt)
Le jeu explore la tension entre **devenir puissant** et **rester mobile**. Être gros permet d'écraser les autres, mais vous rend lent et facile à toucher. C'est un exercice de gestion de risque.


---

## ✨ DERNIÈRES MODIFICATIONS (V1.1)

Nous avons enrichi l'expérience de jeu avec des mises à jour majeures :

### 1. 🎧 Système Audio Immersif (`SoundManager.js`)
Intégration d'un moteur audio synthétisé (p5.sound) sans fichiers externes :
*   **Sons Distincts** : Chaque bonus (Soin, Bouclier, Vitesse, Puissance) a sa propre identité sonore.
*   **Alerte de Danger** : Un signal d'alarme retentit lorsqu'une mine vous détecte.
*   **Feedback Physique** : Bruits d'impacts lourds ("Crash") lors des collisions entre vaisseaux.
*   **Stabilité** : Gestion intelligente de l'AudioContext pour éviter les erreurs navigateur.

### 2. 🛡️ Physique de Combat Améliorée
*   **Impact de Bouclier** : Les obstacles sont maintenant **repoussés violemment** lorsqu'ils frappent votre bouclier, vous empêchant de rester "collé".
*   **Dash Offensif** : Utiliser le Dash contre une mine ou un adversaire provoque un **Knockback (Recul)** massif.

### 3. 👁️ Indicateurs Visuels
*   **Zones de Danger** : Les mines affichent désormais un cercle rouge pâle indiquant leur porte de détection. Restez en dehors pour ne pas être pris en chasse !

---

## 🛠️ DÉFIS RENCONTRÉS

Au cours du développement, nous avons dû surmonter plusieurs obstacles techniques et de conception :

1.  **Gestion de la Physique et de la Vitesse** :
    *   *Problème* : Au début, les gros vaisseaux gardaient leur vitesse maximale, devenant invincibles.
    *   *Solution* : Implémentation d'une formule de physique inverse (`Vitesse = Base / Masse`) et d'un système de freinage actif. Si vous grandissez, le vaisseau freine automatiquement pour respecter sa nouvelle limite.

2.  **Intelligence Artificielle (IA)** :
    *   *Problème* : L'IA ne "voyait" pas les dangers ou fonçait dans les murs. Parfois, les véhicules disparaissaient sans réapparaître.
    *   *Solution* : Création d'une "Machine à États" (Wander, Seek, Flee) et un système de "Respawn" immédiat pour garder la carte peuplée.

3.  **Performance et Affichage** :
    *   *Problème* : Afficher et calculer les collisions pour 20+ entités et des centaines de particules.

4.  **Le Bug du "Bouclier Collant"** :
    *   *Problème* : Un bug frustrant survenait lorsque le joueur, équipé d'un bouclier, percutait un obstacle. Au lieu de rebondir, le vaisseau restait "collé" à la mine comme un aimant, rendant la fuite impossible.
    *   *Solution* : Nous avons dû revoir la physique de collision. Au lieu d'annuler simplement les dégâts, nous avons ajouté une **Force de Répulsion (Knockback)** massive. Si vous avez un bouclier ou utilisez le Dash, l'obstacle est désormais violemment projeté en arrière, libérant le passage.

---

## 🏆 FIERTÉS DU PROJET (Ce dont nous sommes fiers)

1.  **Les Mines Agressives (IA Réactive)** :
    *   Nous sommes particulièrement fiers du comportement des mines. Elles ne sont pas statiques ; elles ont une "zone de détection". Si le joueur entre dans le cercle rouge, la mine "s'énerve" (devient rouge et tourne vite) et le pourchasse. C'est une mécanique qui ajoute une tension réelle.

2.  **Le Ressenti "Feedback"** :
    *   Le jeu "répond" bien. Quand on grandit, on *sent* la lourdeur. Le tableau de bord affiche la chute de la vitesse maximale en temps réel. Les explosions de particules et les barres de vie rendent l'action lisible.

3.  **L'Esthétique Procédurale** :
    *   Les vaisseaux ne sont pas de simples images, mais sont dessinés par le code (p5.js), avec des couleurs et des ailes générées dynamiquement.

---

## 🧠 OUTILS IA & SPÉCIFICATIONS

Pour réaliser ce projet, nous avons collaboré avec une **Intelligence Artificielle Assistante** (Agent de Code Avancé).

### Outil Utilisé
*   **Agent IA (Modèle LLM spécialisé en code)**

### Rôle de l'IA
L'IA a agi comme un **Binôme de Programmation (Pair Programmer)**.
*   **Génération de Code** : Écriture des classes de base (`Vehicle.js`, `Obstacle.js`).
*   **Débogage** : Identification d'erreurs subtiles (comme la duplication de variables dans les boucles).
*   **Mathématiques** : Calcul des formules d'interpolation pour la physique (Lerp, Vecteurs).

### Exemple Concret
Pour la mécanique de freinage des gros vaisseaux :
> *Nous avons demandé :* "Je veux que la vitesse diminue quand la taille augmente."
> *L'IA a proposé :* Une formule logarithmique ou inverse proportionnelle `maxSpeed = base / (1 + mass/100)`, puis a ajusté le code pour forcer le ralentissement (`lerp`) au lieu d'attendre la friction naturelle.

---

## 🎮 COMMENT JOUER

1.  **Déplacement** : La souris dirige le vaisseau. Le vaisseau accélère vers le curseur.
2.  **Dash (Accélération)** : Barre d'Espace ou Clic Souris (Cooldown visible sous le vaisseau).
3.  **Objectif** :
    *   Ramassez les **Étoiles** ⭐ pour grandir et marquer des points.
    *   Ramassez les **Orbes** 🔵 pour vous soigner ou obtenir des boucliers.
    *   Évitez les **Mines Rouges** 🛑 (ou fuyez-les si elles vous chassent !).
    *   Détruisez les autres vaisseaux en leur tirant dessus ou en les percutant si vous êtes plus gros.

**Bonne chance dans l'arène cosmique !**
