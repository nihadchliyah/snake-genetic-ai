'use strict';

// ═══════════════════════════════════════════════════════════════
//  ENTRAÎNEUR ÉVOLUTIONNAIRE
//  Utilise un algorithme génétique (croisement + tournoi + élitisme)
//  pour faire évoluer une population de réseaux de neurones.
//  Toute l'évaluation est faite silencieusement (sans canvas) pour une vitesse maximale.
//  Dépend de : config.js, game.js, network.js
// ═══════════════════════════════════════════════════════════════

function Trainer(opts) {
  var o        = opts || {};
  this.popSize = o.popSize || 60;
  this.gens    = o.gens    || 40;
  this.mutRate = o.mutRate || 0.18;
  this.mutStr  = o.mutStr  || 0.45;
  this.eliteN  = o.eliteN  || 5;

  this.best       = null;
  this.bestFit    = -Infinity;
  this.fitHistory = [];   // meilleure aptitude par génération (pour le graphe)
  this.onProgress = null; // fn(gen, bestFit, avgFit, pct)
  this.onDone     = null; // fn(bestNet)
}

// ─── Évaluation de l'aptitude ──────────────────────────────────
//
//  CORRECTION CLÉ pour les boucles :
//  • PAS de bonus de survie pure — l'ancien terme `Math.min(steps, 600)`
//    récompensait le serpent juste pour rester en vie, ce qui l'incitait
//    directement à tourner en rond.
//  • L'aptitude est désormais pilotée presque entièrement par la nourriture mangée (quadratique),
//    avec un petit bonus d'efficacité pour manger rapidement.
//  • Les nouvelles entrées de pré-vision (voir game.js) aident également le réseau
//    à apprendre à éviter les impasses avant d'y entrer.
//
Trainer.prototype._eval = function(net) {
  var g = new SnakeGame(null, { silent: true });

  // Le cycle de vie de la nourriture dorée est simulé pas à pas (setTimeout ne se déclenche jamais en
  // évaluation sans interface, donc on le pilote manuellement avec une arithmétique modulaire des étapes).
  var GOLD_PERIOD = 150;   // étapes entre les cycles dorés
  var GOLD_LIFE   = 60;    // nombre d'étapes pendant lesquelles l'or reste sur le plateau

  while (g.alive) {
    var phase = g.steps % GOLD_PERIOD;
    if (phase === 40 && !g.goldFood) g.goldFood = g._freeCell();
    if (phase === 40 + GOLD_LIFE)    g.goldFood = null;

    var act = net.forward(g.getInputs());
    var idx = pickDir(act.output, g.dir);
    if (idx !== -1) g.setDir(OUTPUT_DIRS[idx]);
    g.step();
  }

  // Compter le total des pommes mangées (chaque pomme fait grandir le serpent de 1 quel que soit le type)
  var food = g.snake.length - 3;

  // Aucune nourriture du tout → petit signal pour que le réseau ne meure pas instantanément
  if (food === 0) return g.steps * 0.3;

  // Étapes moyennes par item de nourriture (moins = plus efficace, moins de boucles)
  var stepsPerFood    = g.steps / food;
  var efficiencyBonus = Math.max(0, 300 - stepsPerFood);

  // La récompense quadratique de nourriture domine — favorise fortement le fait de manger plus
  return food * food * 200 + food * 100 + efficiencyBonus;
};

// ─── Reproduction ──────────────────────────────────────────────
// Produire la génération suivante : garder l'élite inchangée, remplir le reste avec
// le croisement entre parents sélectionnés par tournoi + mutation.
Trainer.prototype._breed = function(scored, mutRate, mutStr) {
  var next = [];

  // Élitisme : copier les N meilleurs sans modification
  for (var e = 0; e < this.eliteN && e < scored.length; e++) {
    next.push(scored[e].net.clone());
  }

  // Croisement + mutation pour remplir le reste
  while (next.length < this.popSize) {
    var p1    = tournament(scored, 5);
    var p2    = tournament(scored, 5);
    var child = NeuralNet.crossover(p1, p2);
    child.mutate(mutRate, mutStr);
    next.push(child);
  }
  return next;
};

// ─── Boucle d'entraînement principale ─────────────────────────
// Asynchrone pour que l'interface du navigateur reste active entre les générations.
Trainer.prototype.train = async function() {
  var self = this;

  // Démarrer à partir d'une population entièrement aléatoire à chaque fois
  var pop = [];
  for (var i = 0; i < this.popSize; i++) pop.push(new NeuralNet());

  for (var gen = 0; gen < this.gens; gen++) {
    // Évaluer chaque individu
    var scored = pop.map(function(net) { return { net: net, fit: self._eval(net) }; });
    scored.sort(function(a, b) { return b.fit - a.fit; });

    var bestFit = scored[0].fit;
    var avgFit  = scored.reduce(function(s, x) { return s + x.fit; }, 0) / scored.length;

    if (bestFit > self.bestFit) { self.bestFit = bestFit; self.best = scored[0].net.clone(); }
    self.fitHistory.push(bestFit);

    if (self.onProgress) self.onProgress(gen + 1, bestFit, avgFit, (gen + 1) / self.gens);

    // Mutation adaptative : agressive au début, affinement ensuite
    var progress = (gen + 1) / self.gens;
    pop = self._breed(scored,
      self.mutRate * (1.6 - progress),
      self.mutStr  * (1.5 - progress * 0.9)
    );

    // Céder au navigateur entre les générations pour que l'interface puisse se mettre à jour
    await new Promise(function(r) { setTimeout(r, 0); });
  }

  if (self.onDone) self.onDone(self.best);
  return self.best;
};
