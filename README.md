# 🐍 Snake Genetic AI

> Jeu Snake joué par une intelligence artificielle entraînée grâce à un **algorithme génétique** et un **réseau de neurones** avec une vision matricielle 8×8.

---

## 📌 À propos

Ce projet est un **fork** du repo de [tomDeprez](https://github.com/tomDeprez/Snake-IT-DFS34A) réalisé dans le cadre du cours **DFS34A**.

J'ai repris la base du jeu Snake et j'ai entièrement **redesigné l'architecture de l'IA**, la **visualisation** et l'**interface**.

---

## ✨ Ce que j'ai ajouté

### 🧠 Intelligence Artificielle
- **Vision matricielle 8×8** — l'IA reçoit une grille de 64 cellules centrée sur sa tête (au lieu de 13 capteurs directionnels)
  - `0.0` = case vide
  - `0.1` = mur ou corps du serpent
  - `0.2` = pomme rouge
  - `0.3` = pomme dorée
- **Architecture du réseau** : `64 entrées → 32 neurones cachés → 4 sorties`
- **Algorithme génétique** : 60 agents évoluent en parallèle sur 40 générations
  - Sélection par tournoi
  - Croisement uniforme entre parents
  - Mutation adaptative (agressive au début, fine à la fin)
  - Élitisme : les 5 meilleurs survivent intacts

### 🎨 Interface & Visualisation
- **Layout 3 colonnes** :
  - Gauche → réseau de neurones en temps réel (disposition verticale)
  - Centre → jeu Snake
  - Droite → vision matricielle + décisions + matrice de poids
- **Réseau de neurones animé** : arêtes colorées selon le poids (vert = positif, rouge = négatif)
- **Grille de vision 8×8** : affichage en direct de ce que voit l'IA
- **Graphe de fitness** : évolution des performances génération par génération
- **Splash screen premium** avec particules animées et coins décoratifs

### 🌐 Code
- Tous les commentaires traduits en **français**
- Code reorganisé en modules : `config.js`, `game.js`, `network.js`, `trainer.js`, `visualizer.js`, `controller.js`, `sound.js`

---

## 🚀 Comment lancer le jeu

Aucune installation nécessaire — c'est du HTML/CSS/JS pur.

1. Clone le repo :
```bash
git clone https://github.com/nihadchliyah/snake-genetic-ai.git
```

2. Ouvre `index.html` dans ton navigateur

C'est tout ! ✅

---

## 🎮 Comment jouer

| Bouton | Action |
|--------|--------|
| `▶ AI PLAY` | L'IA joue automatiquement |
| `⚡ TRAIN` | Lance un entraînement génétique (40 générations) |
| `🎮 HUMAN` | Tu joues avec les flèches du clavier |
| `↺ RESET` | Réinitialise l'IA et relance un entraînement |
| Slider SPEED | Ajuste la vitesse du jeu |

**Touches clavier (mode humain) :** `↑ ↓ ← →` ou `W A S D`

---

## 🧬 Comment fonctionne l'IA

```
Chaque génération :
  1. 60 serpents jouent chacun leur partie (invisible, très rapide)
  2. Chaque serpent reçoit un score (fitness) basé sur la nourriture mangée
  3. Les meilleurs sont sélectionnés pour se reproduire
  4. Leurs poids sont croisés + mutés pour créer la génération suivante
  5. Répéter 40 fois → le meilleur réseau est sauvegardé
```

**Fonction de fitness :**
- Manger de la nourriture = récompense quadratique (manger plus = score qui explose)
- Manger vite = bonus d'efficacité
- Collision mur ou corps = fin immédiate de la partie

---

## 📁 Structure du projet

```
snake-genetic-ai/
├── index.html          # Structure HTML + splash screen
├── style.css           # Design complet (thème cyberpunk vert)
├── src/
│   ├── config.js       # Constantes (plateau, réseau, directions)
│   ├── game.js         # Logique du jeu + rendu canvas
│   ├── network.js      # Réseau de neurones (forward, mutate, crossover)
│   ├── trainer.js      # Algorithme génétique
│   ├── visualizer.js   # Visualisation du réseau en temps réel
│   ├── controller.js   # Contrôleur principal (relie tout)
│   └── sound.js        # Effets sonores (Web Audio API)
```

---

## 🔗 Repo original

Ce projet est basé sur le travail de **tomDeprez** :
👉 [github.com/tomDeprez/Snake-IT-DFS34A](https://github.com/tomDeprez/Snake-IT-DFS34A)

---

## 👤 Auteur

**Nihad Chliyah**
[github.com/nihadchliyah](https://github.com/nihadchliyah)
