'use strict';

// ═══════════════════════════════════════════════════════════════
//  PLATEAU
// ═══════════════════════════════════════════════════════════════
var CELL          = 20;
var COLS          = 30;
var ROWS          = 30;
var SIZE          = CELL * COLS;
var GOLD_DURATION = 7000;

// ═══════════════════════════════════════════════════════════════
//  DIRECTIONS
// ═══════════════════════════════════════════════════════════════
var DIR = {
  UP:    { x:  0, y: -1 },
  RIGHT: { x:  1, y:  0 },
  DOWN:  { x:  0, y:  1 },
  LEFT:  { x: -1, y:  0 }
};

// ═══════════════════════════════════════════════════════════════
//  ARCHITECTURE DU RÉSEAU DE NEURONES
//  Grille locale 8×8 centrée sur la tête du serpent → 64 entrées.
//  Chaque cellule : 0=vide · 0.1=mur/corps · 0.2=nourriture · 0.3=or
//  Incrémenter NET_VERSION à chaque changement du nombre d'entrées/cachées/sorties.
// ═══════════════════════════════════════════════════════════════
var NET_VERSION = 'v7_64x32x4';

var GRID_VIEW = 8;          // longueur du côté de la fenêtre de vision locale
var N_INPUTS  = GRID_VIEW * GRID_VIEW;  // 64
var N_HIDDEN  = 32;
var N_OUTPUTS = 4;

// ═══════════════════════════════════════════════════════════════
//  MÉTADONNÉES DE SORTIE
// ═══════════════════════════════════════════════════════════════
var OUTPUT_DIRS  = [DIR.UP, DIR.RIGHT, DIR.DOWN, DIR.LEFT];
var OUTPUT_NAMES = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
var OUTPUT_ICONS = ['↑', '→', '↓', '←'];

// ═══════════════════════════════════════════════════════════════
//  MÉTADONNÉES D'ENTRÉE  (générées pour la grille 8×8)
// ═══════════════════════════════════════════════════════════════
var INPUT_LABELS      = [];
var INPUT_TYPES       = [];
var INPUT_NODE_LABELS = [];

(function() {
  var half = Math.floor(GRID_VIEW / 2);
  for (var r = 0; r < GRID_VIEW; r++) {
    for (var c = 0; c < GRID_VIEW; c++) {
      var dr = r - half, dc = c - half;
      INPUT_LABELS.push('(' + (dc >= 0 ? '+' : '') + dc + ',' + (dr >= 0 ? '+' : '') + dr + ')');
      INPUT_TYPES.push('grid');
      INPUT_NODE_LABELS.push('');
    }
  }
}());

// Couleurs d'accent par type
var TYPE_COLOR = {
  grid:  '#00c8ff',
  space: '#00c8ff',
  food:  '#00ff88',
  gold:  '#ffd700',
  dir:   '#aa80ff'
};
