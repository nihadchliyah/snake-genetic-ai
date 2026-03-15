'use strict';

// ═══════════════════════════════════════════════════════════════
//  JEU DU SERPENT — logique + rendu
//  Dépend de : config.js
// ═══════════════════════════════════════════════════════════════

function SnakeGame(canvas, opts) {
  opts            = opts || {};
  this.canvas     = canvas || null;
  this.ctx        = canvas ? canvas.getContext('2d') : null;
  this.silent     = opts.silent || false;
  this.onEat      = null;
  this.onGameOver = null;
  this._goldTimer = null;

  if (canvas) { canvas.width = SIZE; canvas.height = SIZE; }
  this.reset();
}

// ─── Réinitialisation de l'état ────────────────────────────────
SnakeGame.prototype.reset = function() {
  var cx = Math.floor(COLS / 2);
  var cy = Math.floor(ROWS / 2);

  this.snake         = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  this.dir           = { x: 1, y: 0 };
  this.nextDir       = { x: 1, y: 0 };
  this.score         = 0;
  this.steps         = 0;
  this.stepsSinceEat = 0;
  this.alive         = true;
  this.food          = null;
  this.goldFood      = null;
  this._goldSpawnTime = null;

  this.particles    = [];
  this.floats       = [];
  this.flashAlpha   = 0;
  this.flashColor   = '#fff';
  this._shakeAmt    = 0;
  this._shakeFrames = 0;

  clearTimeout(this._goldTimer);
  this._spawnFood();
  if (!this.silent) this._scheduleGold();
};

// ─── Gestion de la nourriture ───────────────────────────────────
SnakeGame.prototype._spawnFood = function() {
  this.food = this._freeCell();
};

SnakeGame.prototype._scheduleGold = function() {
  var self = this;
  clearTimeout(this._goldTimer);
  this._goldSpawnTime = null;

  this._goldTimer = setTimeout(function() {
    self.goldFood       = self._freeCell();
    self._goldSpawnTime = Date.now();

    self._goldTimer = setTimeout(function() {
      self.goldFood       = null;
      self._goldSpawnTime = null;
      self._scheduleGold();
    }, GOLD_DURATION);
  }, 14000 + Math.random() * 10000);
};

SnakeGame.prototype._freeCell = function() {
  var blocked = {};
  this.snake.forEach(function(s) { blocked[s.x + ',' + s.y] = true; });
  if (this.food)     blocked[this.food.x     + ',' + this.food.y]     = true;
  if (this.goldFood) blocked[this.goldFood.x + ',' + this.goldFood.y] = true;
  for (var i = 0; i < 400; i++) {
    var x = Math.floor(Math.random() * COLS);
    var y = Math.floor(Math.random() * ROWS);
    if (!blocked[x + ',' + y]) return { x: x, y: y };
  }
  return { x: 0, y: 0 };
};

// ─── Entrée ─────────────────────────────────────────────────────
SnakeGame.prototype.setDir = function(dir) {
  if (dir.x !== 0 && this.dir.x !== 0) return;
  if (dir.y !== 0 && this.dir.y !== 0) return;
  this.nextDir = { x: dir.x, y: dir.y };
};

// ─── Étape ──────────────────────────────────────────────────────
SnakeGame.prototype.step = function() {
  if (!this.alive) return false;

  this.dir = { x: this.nextDir.x, y: this.nextDir.y };
  var head = this.snake[0];
  var next = { x: head.x + this.dir.x, y: head.y + this.dir.y };

  if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS)
    return this._die();

  for (var i = 0; i < this.snake.length; i++) {
    if (this.snake[i].x === next.x && this.snake[i].y === next.y)
      return this._die();
  }

  this.snake.unshift(next);
  this.steps++;
  this.stepsSinceEat++;

  var grew = this._checkEat(next);
  if (!grew) this.snake.pop();

  if (this.stepsSinceEat > COLS * ROWS * 2) return this._die();
  return true;
};

SnakeGame.prototype._checkEat = function(pos) {
  var grew = false;

  if (this.food && pos.x === this.food.x && pos.y === this.food.y) {
    this.score += 10;
    this.stepsSinceEat = 0;
    grew = true;
    if (!this.silent) {
      this.spawnParticles(pos.x, pos.y, '#ff3355', 14);
      this.spawnFloat(pos.x, pos.y, '+10', '#ff3355');
    }
    this._spawnFood();
    if (this.onEat) this.onEat(10);
  }

  if (this.goldFood && pos.x === this.goldFood.x && pos.y === this.goldFood.y) {
    this.score += 50;
    this.stepsSinceEat = 0;
    grew = true;
    if (!this.silent) {
      this.spawnParticles(pos.x, pos.y, '#ffd700', 26);
      this.spawnFloat(pos.x, pos.y, '+50', '#ffd700');
      this.flashAlpha = 0.28;
      this.flashColor = 'rgba(255,215,0,1)';
    }
    this.goldFood       = null;
    this._goldSpawnTime = null;
    if (this.onEat) this.onEat(50);
  }

  return grew;
};

SnakeGame.prototype._die = function() {
  this.alive = false;
  clearTimeout(this._goldTimer);
  this._goldSpawnTime = null;

  if (!this.silent) {
    var self = this;
    this.snake.forEach(function(seg) { self.spawnParticles(seg.x, seg.y, '#00ff88', 3); });
    this.spawnParticles(this.snake[0].x, this.snake[0].y, '#ff3355', 22);
    this._shakeAmt    = 9;
    this._shakeFrames = 16;
    this.flashAlpha   = 0.28;
    this.flashColor   = 'rgba(255,40,40,1)';
  }
  if (this.onGameOver) this.onGameOver(this.score);
  return false;
};

// ─── Minuterie dorée (0–1 restant, null si pas d'or) ───────────
SnakeGame.prototype.getGoldProgress = function() {
  if (!this.goldFood || !this._goldSpawnTime) return null;
  return Math.max(0, 1 - (Date.now() - this._goldSpawnTime) / GOLD_DURATION);
};

// ═══════════════════════════════════════════════════════════════
//  ENTRÉES DU RÉSEAU DE NEURONES  (64 valeurs — grille locale 8×8)
//
//  Une fenêtre GRID_VIEW×GRID_VIEW centrée sur la tête du serpent.
//  Chaque cellule encode ce qui occupe cette position sur le plateau :
//    0.0  = vide
//    0.1  = mur (hors-limites) ou segment du corps du serpent
//    0.2  = pomme rouge
//    0.3  = pomme dorée
//
//  Cela permet au réseau de « voir » directement l'environnement dans le
//  même format matriciel utilisé pour collecter les données d'entraînement,
//  de sorte que les collisions soient visibles dans l'entrée avant qu'elles surviennent.
// ═══════════════════════════════════════════════════════════════
SnakeGame.prototype.getInputs = function() {
  var head = this.snake[0];
  var half = Math.floor(GRID_VIEW / 2);
  var matrix = [];

  // Recherche O(1) dans le corps
  var bodySet = {};
  for (var b = 0; b < this.snake.length; b++)
    bodySet[this.snake[b].x + ',' + this.snake[b].y] = true;

  for (var dy = -half; dy < half; dy++) {
    for (var dx = -half; dx < half; dx++) {
      var cx = head.x + dx;
      var cy = head.y + dy;

      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) {
        matrix.push(0.1);   // mur — même danger que le corps
      } else if (bodySet[cx + ',' + cy]) {
        matrix.push(0.1);   // corps du serpent
      } else if (this.goldFood && cx === this.goldFood.x && cy === this.goldFood.y) {
        matrix.push(0.3);   // pomme dorée
      } else if (this.food && cx === this.food.x && cy === this.food.y) {
        matrix.push(0.2);   // pomme rouge
      } else {
        matrix.push(0);     // vide
      }
    }
  }

  return matrix;   // longueur = GRID_VIEW² = 64
};

// ═══════════════════════════════════════════════════════════════
//  PARTICULES & FLOTTANTS
// ═══════════════════════════════════════════════════════════════
SnakeGame.prototype.spawnParticles = function(cx, cy, color, count) {
  for (var i = 0; i < count; i++) {
    var angle = (i / count) * Math.PI * 2 + Math.random() * 0.8;
    var speed = 1.5 + Math.random() * 3.5;
    this.particles.push({
      x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      color: color, size: 1.5 + Math.random() * 2.5, alpha: 1
    });
  }
};

SnakeGame.prototype.spawnFloat = function(cx, cy, text, color) {
  this.floats.push({
    x: cx * CELL + CELL / 2, y: cy * CELL - 4,
    text: text, color: color, alpha: 1, vy: -1.8
  });
};

// ═══════════════════════════════════════════════════════════════
//  RENDU
// ═══════════════════════════════════════════════════════════════
SnakeGame.prototype.render = function() {
  if (this.silent || !this.ctx) return;
  var ctx = this.ctx;
  var now = Date.now();

  ctx.save();
  if (this._shakeFrames > 0) {
    ctx.translate(
      (Math.random() - 0.5) * this._shakeAmt,
      (Math.random() - 0.5) * this._shakeAmt
    );
    this._shakeAmt    *= 0.80;
    this._shakeFrames -= 1;
  }

  this._drawBackground(ctx);
  this._drawGrid(ctx);
  this._drawFoods(ctx, now);
  this._drawSnake(ctx);
  this._drawEffects(ctx);

  ctx.restore();
};

SnakeGame.prototype._drawBackground = function(ctx) {
  ctx.fillStyle = '#04080a';
  ctx.fillRect(0, 0, SIZE, SIZE);
};

SnakeGame.prototype._drawGrid = function(ctx) {
  var s = CELL;
  ctx.strokeStyle = 'rgba(0,255,136,0.04)';
  ctx.lineWidth   = 0.5;
  for (var i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * s, 0);    ctx.lineTo(i * s, SIZE); ctx.stroke();
  }
  for (var j = 0; j <= ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * s); ctx.lineTo(SIZE, j * s); ctx.stroke();
  }
};

SnakeGame.prototype._drawFoods = function(ctx, now) {
  if (this.food)     this._drawOneFood(ctx, this.food,     '#ff3355', 10, now);
  if (this.goldFood) this._drawOneFood(ctx, this.goldFood, '#ffd700', 18, now);
};

SnakeGame.prototype._drawOneFood = function(ctx, pos, color, blur, now) {
  var s         = CELL;
  var pulse     = 0.5 + 0.5 * Math.sin(now / 280);
  var ringPhase = (now % 1600) / 1600;

  ctx.save();

  // Anneau émanant
  ctx.globalAlpha = (1 - ringPhase) * 0.55;
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.shadowColor = color; ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(pos.x * s + s / 2, pos.y * s + s / 2, s / 2 + ringPhase * 11, 0, Math.PI * 2);
  ctx.stroke();

  // Sphère principale
  ctx.globalAlpha = 1;
  ctx.shadowColor = color; ctx.shadowBlur = blur + pulse * 12;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(pos.x * s + s / 2, pos.y * s + s / 2, s / 2 - 3 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();

  // Reflet
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(pos.x * s + s / 2 - 2, pos.y * s + s / 2 - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

SnakeGame.prototype._drawSnake = function(ctx) {
  for (var k = this.snake.length - 1; k >= 0; k--)
    this._drawSegment(ctx, this.snake[k], k);
};

SnakeGame.prototype._drawSegment = function(ctx, seg, idx) {
  var s   = CELL;
  var t   = 1 - (idx / Math.max(this.snake.length, 1)) * 0.72;
  var g   = Math.floor(t * 200 + 55);
  var b   = Math.floor(t * 80);
  var pad = idx === 0 ? 1 : 2;

  ctx.save();
  if (idx === 0) {
    ctx.shadowColor = 'rgba(0,255,136,0.95)'; ctx.shadowBlur = 16;
  } else if (idx < 5) {
    ctx.shadowColor = 'rgba(0,255,136,' + (0.45 - idx * 0.07) + ')';
    ctx.shadowBlur  = 10 - idx * 1.5;
  }

  ctx.fillStyle = 'rgb(0,' + g + ',' + b + ')';
  this._roundRect(ctx, seg.x * s + pad, seg.y * s + pad, s - pad * 2, s - pad * 2, idx === 0 ? 5 : 3);
  ctx.fill();

  if (idx < 7) {
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(255,255,255,' + (0.06 + (1 - idx / 7) * 0.1) + ')';
    this._roundRect(ctx, seg.x * s + pad + 1, seg.y * s + pad + 1, s - pad * 2 - 2, Math.floor((s - pad * 2) / 2.8), 2);
    ctx.fill();
  }
  if (idx === 0) { ctx.shadowBlur = 0; this._drawEyes(ctx, seg.x * s, seg.y * s, s); }
  ctx.restore();
};

SnakeGame.prototype._drawEyes = function(ctx, ox, oy, s) {
  var d = this.dir;
  var e;
  if      (d.x ===  1) e = [{ x:.70,y:.25 },{ x:.70,y:.75 }];
  else if (d.x === -1) e = [{ x:.30,y:.25 },{ x:.30,y:.75 }];
  else if (d.y === -1) e = [{ x:.25,y:.30 },{ x:.75,y:.30 }];
  else                 e = [{ x:.25,y:.70 },{ x:.75,y:.70 }];
  ctx.fillStyle = '#fff';
  e.forEach(function(p) { ctx.beginPath(); ctx.arc(ox+p.x*s, oy+p.y*s, 2.5, 0, Math.PI*2); ctx.fill(); });
  ctx.fillStyle = '#111';
  e.forEach(function(p) { ctx.beginPath(); ctx.arc(ox+p.x*s+.7, oy+p.y*s+.7, 1.2, 0, Math.PI*2); ctx.fill(); });
};

SnakeGame.prototype._drawEffects = function(ctx) {
  this.particles = this.particles.filter(function(p) { return p.alpha > 0; });
  this.particles.forEach(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.10; p.alpha -= 0.034;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  this.floats = this.floats.filter(function(f) { return f.alpha > 0; });
  this.floats.forEach(function(f) {
    f.y += f.vy; f.vy *= 0.94; f.alpha -= 0.02;
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.alpha);
    ctx.shadowColor = f.color; ctx.shadowBlur = 10; ctx.fillStyle = f.color;
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  });

  if (this.flashAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = this.flashAlpha;
    ctx.fillStyle   = this.flashColor;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();
    this.flashAlpha -= 0.05;
  }
};

SnakeGame.prototype._roundRect = function(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);     ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);     ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);         ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
};
