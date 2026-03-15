'use strict';

// ═══════════════════════════════════════════════════════════════
//  RÉSEAU DE NEURONES
//  Architecture : N_INPUTS → N_HIDDEN (sigmoïde) → N_OUTPUTS (sigmoïde)
//  Tous les poids sont stockés sous forme de tableaux 2D simples pour une inspection facile.
//  Dépend de : config.js
// ═══════════════════════════════════════════════════════════════

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

// ─── NeuralNet ─────────────────────────────────────────────────
function NeuralNet() {
  this.W1 = NeuralNet._rand2d(N_HIDDEN,  N_INPUTS);
  this.b1 = NeuralNet._randVec(N_HIDDEN);
  this.W2 = NeuralNet._rand2d(N_OUTPUTS, N_HIDDEN);
  this.b2 = NeuralNet._randVec(N_OUTPUTS);
}

NeuralNet._rand    = function() { return (Math.random() - 0.5) * 2; };
NeuralNet._randVec = function(n) {
  var v = []; for (var i = 0; i < n; i++) v.push(NeuralNet._rand()); return v;
};
NeuralNet._rand2d = function(rows, cols) {
  var m = [];
  for (var r = 0; r < rows; r++) {
    var row = []; for (var c = 0; c < cols; c++) row.push(NeuralNet._rand()); m.push(row);
  }
  return m;
};

// Passe avant — retourne { inputs, hidden, output }
NeuralNet.prototype.forward = function(inputs) {
  var hidden = [];
  for (var j = 0; j < N_HIDDEN; j++) {
    var sum = this.b1[j];
    for (var i = 0; i < N_INPUTS; i++) sum += this.W1[j][i] * inputs[i];
    hidden.push(sigmoid(sum));
  }
  var output = [];
  for (var k = 0; k < N_OUTPUTS; k++) {
    var s = this.b2[k];
    for (var jj = 0; jj < N_HIDDEN; jj++) s += this.W2[k][jj] * hidden[jj];
    output.push(sigmoid(s));
  }
  return { inputs: inputs, hidden: hidden, output: output };
};

// Clonage profond
NeuralNet.prototype.clone = function() {
  var c = new NeuralNet();
  c.W1 = this.W1.map(function(row) { return row.slice(); });
  c.b1 = this.b1.slice();
  c.W2 = this.W2.map(function(row) { return row.slice(); });
  c.b2 = this.b2.slice();
  return c;
};

// Mutation gaussienne avec sauts larges occasionnels pour la diversité
NeuralNet.prototype.mutate = function(rate, strength) {
  function noise(w) {
    if (Math.random() > rate) return w;
    var delta = (Math.random() - 0.5) * strength;
    if (Math.random() < 0.05) delta *= 4; // saut large rare
    return w + delta;
  }
  this.W1 = this.W1.map(function(row) { return row.map(noise); });
  this.b1 = this.b1.map(noise);
  this.W2 = this.W2.map(function(row) { return row.map(noise); });
  this.b2 = this.b2.map(noise);
};

// Croisement uniforme : chaque poids est pris indépendamment de l'un ou l'autre parent
NeuralNet.crossover = function(a, b) {
  var child = new NeuralNet();
  child.W1 = a.W1.map(function(row, r) {
    return row.map(function(w, c) { return Math.random() < 0.5 ? w : b.W1[r][c]; });
  });
  child.b1 = a.b1.map(function(v, i) { return Math.random() < 0.5 ? v : b.b1[i]; });
  child.W2 = a.W2.map(function(row, r) {
    return row.map(function(w, c) { return Math.random() < 0.5 ? w : b.W2[r][c]; });
  });
  child.b2 = a.b2.map(function(v, i) { return Math.random() < 0.5 ? v : b.b2[i]; });
  return child;
};

// ─── Persistance ───────────────────────────────────────────────
function saveNet(net) {
  try {
    localStorage.setItem('snakeai_best', JSON.stringify({
      version: NET_VERSION, W1: net.W1, b1: net.b1, W2: net.W2, b2: net.b2
    }));
  } catch(e) {}
}

function loadNet() {
  try {
    var raw = localStorage.getItem('snakeai_best');
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (d.version !== NET_VERSION) return null; // architecture incompatible
    var net = new NeuralNet();
    net.W1 = d.W1; net.b1 = d.b1; net.W2 = d.W2; net.b2 = d.b2;
    return net;
  } catch(e) { return null; }
}

// ─── Utilitaires de direction ───────────────────────────────────

// Retourne l'index de sortie avec le score le plus élevé, en ignorant un demi-tour à 180°
function pickDir(output, curDir) {
  var best = -1, bestVal = -Infinity;
  for (var i = 0; i < OUTPUT_DIRS.length; i++) {
    var d = OUTPUT_DIRS[i];
    if (d.x === -curDir.x && d.y === -curDir.y) continue;
    if (output[i] > bestVal) { bestVal = output[i]; best = i; }
  }
  return best;
}

// Sélection par tournoi : choisir le meilleur parmi k candidats aléatoires
function tournament(scored, k) {
  var best = null;
  for (var i = 0; i < k; i++) {
    var c = scored[Math.floor(Math.random() * scored.length)];
    if (!best || c.fit > best.fit) best = c;
  }
  return best.net;
}
