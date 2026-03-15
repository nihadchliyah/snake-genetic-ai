'use strict';

// ═══════════════════════════════════════════════════════════════
//  CONTRÔLEUR DE JEU — relie tous les modules ensemble
//  Point d'entrée : DOMContentLoaded → new GameController()
//  Dépend de : config.js, game.js, sound.js, network.js,
//              trainer.js, visualizer.js
// ═══════════════════════════════════════════════════════════════

function GameController() {
  this.canvas     = document.getElementById('game-canvas');
  this.game       = new SnakeGame(this.canvas);
  this.viz        = new Visualizer();
  this.net        = loadNet() || new NeuralNet();
  this.mode       = 'idle';
  this.loopId     = null;
  this.speed      = 8;
  this.hiScore    = parseInt(localStorage.getItem('snakeai_hi') || '0', 10);
  this._foodCount = 0;

  this._bindButtons();
  this._bindSlider();
  this._bindKeyboard();
  this._bindGameCallbacks();
  this._updateHiScore();

  document.getElementById('mode-indicator').textContent =
    localStorage.getItem('snakeai_best') ? 'NET LOADED' : 'READY';

  this._showSplash();
}

// ═══════════════════════════════════════════════════════════════
//  ÉCRAN DE DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
GameController.prototype._showSplash = function() {
  var self   = this;
  var splash = document.getElementById('splash');
  var done   = false;

  // ── Animation du canvas de particules ─────────────────────────
  var pc  = document.getElementById('splash-canvas');
  var pct = pc.getContext('2d');
  var pts = [];
  var raf = null;

  function resizePc() { pc.width = window.innerWidth; pc.height = window.innerHeight; }
  resizePc();
  window.addEventListener('resize', resizePc);

  // Faire apparaître des particules flottantes
  for (var pi = 0; pi < 55; pi++) {
    pts.push({
      x:  Math.random() * pc.width,
      y:  Math.random() * pc.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.18 - Math.random() * 0.5,
      r:  0.8 + Math.random() * 1.8,
      a:  Math.random() * 0.5 + 0.15,
      c:  Math.random() < 0.12 ? '#ffd700' : '#00ff88'
    });
  }

  function animPc() {
    raf = requestAnimationFrame(animPc);
    pct.clearRect(0, 0, pc.width, pc.height);
    pts.forEach(function(p) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -4) { p.y = pc.height + 4; p.x = Math.random() * pc.width; }
      pct.save();
      pct.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(Date.now() / 1400 + p.x));
      pct.shadowColor = p.c; pct.shadowBlur = 7;
      pct.fillStyle   = p.c;
      pct.beginPath(); pct.arc(p.x, p.y, p.r, 0, Math.PI * 2); pct.fill();
      pct.restore();
    });
  }
  animPc();

  function dismiss(mode) {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    SoundEngine.init();
    splash.classList.add('fade-out');
    setTimeout(function() {
      splash.style.display = 'none';
      if (mode === 'human') self.startHuman();
      else self.startAI();
    }, 580);
  }

  document.getElementById('splash-ai-btn').addEventListener('click', function() {
    dismiss('ai');
  });
  document.getElementById('splash-human-btn').addEventListener('click', function() {
    dismiss('human');
  });

  document.addEventListener('keydown', function onKey(e) {
    var mods = ['Shift','Control','Alt','Meta','Tab','CapsLock'];
    if (mods.indexOf(e.key) !== -1) return;
    document.removeEventListener('keydown', onKey);
    dismiss('ai');
  });
};

// ═══════════════════════════════════════════════════════════════
//  LIAISON DES ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════
GameController.prototype._bindButtons = function() {
  var self = this;

  this._on('btn-ai',    function() { SoundEngine.init(); self.startAI(); });
  this._on('btn-train', function() { SoundEngine.init(); self.startTraining(); });
  this._on('btn-human', function() { SoundEngine.init(); self.startHuman(); });

  this._on('btn-reset', function() {
    SoundEngine.init();
    if (confirm('Reset trained AI? This will erase saved weights.')) {
      localStorage.removeItem('snakeai_best');
      self.net = new NeuralNet();
      self.startTraining();
    }
  });

  this._on('btn-restart', function() {
    document.getElementById('overlay').classList.add('hidden');
    self.mode === 'human' ? self.startHuman() : self.startAI();
  });

  this._on('btn-sound', function() {
    SoundEngine.init();
    var on  = SoundEngine.toggle();
    var btn = document.getElementById('btn-sound');
    btn.textContent = on ? '🔊' : '🔇';
    btn.classList.toggle('muted', !on);
  });
};

GameController.prototype._bindSlider = function() {
  var self   = this;
  var slider = document.getElementById('speed-slider');
  slider.addEventListener('input', function() {
    self.speed = parseInt(slider.value, 10);
    document.getElementById('speed-val').textContent = self.speed;
    if (self.mode === 'ai' || self.mode === 'human') {
      self._stopLoop(); self._startLoop();
    }
  });
};

GameController.prototype._bindKeyboard = function() {
  var self = this;
  var keyMap = {
    ArrowUp: DIR.UP, ArrowDown: DIR.DOWN, ArrowLeft: DIR.LEFT, ArrowRight: DIR.RIGHT,
    w: DIR.UP, s: DIR.DOWN, a: DIR.LEFT, d: DIR.RIGHT
  };
  document.addEventListener('keydown', function(e) {
    if (self.mode !== 'human') return;
    if (keyMap[e.key]) { self.game.setDir(keyMap[e.key]); e.preventDefault(); }
  });
};

GameController.prototype._bindGameCallbacks = function() {
  var self = this;

  this.game.onEat = function(pts) {
    document.getElementById('score-val').textContent = self.game.score;
    self._foodCount++;

    if (pts === 50) {
      SoundEngine.goldEat();
    } else {
      SoundEngine.eat();
      if (self._foodCount % 5 === 0) SoundEngine.levelUp();
    }
    if (self.game.score > self.hiScore) {
      self.hiScore = self.game.score;
      localStorage.setItem('snakeai_hi', self.hiScore);
      self._updateHiScore();
    }
  };

  this.game.onGameOver = function(score) {
    document.getElementById('score-val').textContent = score;
    SoundEngine.die();
    self._setGoldTimer(null);

    if (self.mode === 'human') {
      document.getElementById('overlay-score').textContent = 'SCORE : ' + score;
      document.getElementById('overlay').classList.remove('hidden');
      self._stopLoop();
    } else if (self.mode === 'ai') {
      setTimeout(function() { self.startAI(); }, 500);
    }
  };
};

// ═══════════════════════════════════════════════════════════════
//  BOUCLE DE JEU
// ═══════════════════════════════════════════════════════════════
GameController.prototype._startLoop = function() {
  var self = this;
  this.loopId = setInterval(function() { self._tick(); }, Math.round(1000 / this.speed));
};

GameController.prototype._stopLoop = function() {
  if (this.loopId) { clearInterval(this.loopId); this.loopId = null; }
};

GameController.prototype._tick = function() {
  if (this.mode === 'ai') {
    var inputs = this.game.getInputs();
    var act    = this.net.forward(inputs);
    act.chosen = pickDir(act.output, this.game.dir);
    if (act.chosen !== -1) this.game.setDir(OUTPUT_DIRS[act.chosen]);
    this.game.step();
    this.game.render();
    this.viz.update(this.net, act);
    this.viz.updateWeights(this.net);
    this._setGoldTimer(this.game.getGoldProgress());

  } else if (this.mode === 'human') {
    this.game.step();
    this.game.render();
    document.getElementById('score-val').textContent = this.game.score;
    this._setGoldTimer(this.game.getGoldProgress());
  }
};

// ═══════════════════════════════════════════════════════════════
//  TRANSITIONS DE MODE
// ═══════════════════════════════════════════════════════════════
GameController.prototype.startAI = function() {
  this._stopLoop();
  this.mode = 'ai'; this._foodCount = 0;
  this.game.reset();
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('score-val').textContent      = '0';
  document.getElementById('mode-indicator').textContent = 'AI MODE';
  this._setGoldTimer(null);
  this._startLoop();
};

GameController.prototype.startHuman = function() {
  this._stopLoop();
  this.mode = 'human'; this._foodCount = 0;
  this.game.reset();
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('score-val').textContent      = '0';
  document.getElementById('mode-indicator').textContent = 'HUMAN';
  this._setGoldTimer(null);
  this._startLoop();
};

GameController.prototype.startTraining = async function() {
  if (this.mode === 'training') return;
  this._stopLoop();
  this.mode = 'training';
  this._setGoldTimer(null);

  var panel  = document.getElementById('train-panel');
  var bar    = document.getElementById('train-bar');
  var status = document.getElementById('train-status');
  panel.classList.remove('hidden');
  document.getElementById('mode-indicator').textContent = 'TRAINING…';

  var self    = this;
  var trainer = new Trainer({ popSize: 60, gens: 40, mutRate: 0.18, mutStr: 0.45, eliteN: 5 });

  trainer.onProgress = function(gen, best, avg, pct) {
    bar.style.width = (pct * 100) + '%';
    var food    = Math.round(Math.sqrt(best / 200));
    var foodAvg = Math.sqrt(avg / 200).toFixed(1);
    status.textContent = 'Gen ' + gen + '/40  ·  Best ≈ ' + food + ' food  ·  Avg ≈ ' + foodAvg;
    document.getElementById('gen-val').textContent  = gen;
    document.getElementById('best-val').textContent = food;
    document.getElementById('avg-val').textContent  = foodAvg;
    self.viz.drawFitHistory(trainer.fitHistory);
  };

  trainer.onDone = function(bestNet) {
    self.net = bestNet;
    saveNet(bestNet);
    panel.classList.add('hidden');
    self.mode = 'idle';
    SoundEngine.trainDone();
    setTimeout(function() { self.startAI(); }, 900);
  };

  await trainer.train();
};

// ═══════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════
GameController.prototype._on = function(id, fn) {
  var el = document.getElementById(id); if (el) el.addEventListener('click', fn);
};

GameController.prototype._setGoldTimer = function(progress) {
  var el = document.getElementById('gold-timer'); if (!el) return;
  if (progress === null || progress === undefined) {
    el.classList.add('hidden');
  } else {
    el.classList.remove('hidden');
    document.getElementById('gold-fill').style.width = (progress * 100) + '%';
    document.getElementById('gold-time').textContent = (progress * (GOLD_DURATION / 1000)).toFixed(1) + 's';
  }
};

GameController.prototype._updateHiScore = function() {
  var el = document.getElementById('hi-val');
  if (el) el.textContent = this.hiScore || '—';
};

// ═══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ═══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', function() {
  window.gc = new GameController();
});
