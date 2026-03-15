'use strict';

// ═══════════════════════════════════════════════════════════════
//  VISUALISEUR — panneau IA en direct
//  Layout 3 colonnes :
//    Gauche  → card-network (réseau vertical) + card-fitness
//    Droite  → card-inputs (grille 8×8) + card-outputs + card-weights
// ═══════════════════════════════════════════════════════════════

function Visualizer() {
  this.netCvs = document.getElementById('net-canvas');
  this.netCtx = this.netCvs.getContext('2d');

  // Canvas VERTICAL : largeur du panel (affiché à 100% CSS), ratio ≈ 1:2.6
  this.netCvs.width  = 520;
  this.netCvs.height = 860;

  this._tab     = 'ih';
  this._lastNet = null;

  // Fitness : ratio 3:1 pour le panel gauche
  var fc = document.getElementById('fit-canvas');
  if (fc) { fc.width = 520; fc.height = 160; }

  this._buildInputGrid();
  this._buildOutputRows();
  this._setupTabs();
}

// ─── DOM ───────────────────────────────────────────────────────

Visualizer.prototype._buildInputGrid = function() {
  var container = document.getElementById('inputs-list');
  container.innerHTML = '';

  var canvas = document.createElement('canvas');
  canvas.id = 'grid-canvas';
  canvas.width  = 200;
  canvas.height = 200;
  canvas.style.cssText =
    'display:block;margin:0 auto 10px;' +
    'image-rendering:pixelated;image-rendering:crisp-edges;' +
    'border:1px solid rgba(0,200,255,0.25);border-radius:4px;' +
    'box-shadow:0 0 14px rgba(0,200,255,0.07);width:100%;height:auto;';
  container.appendChild(canvas);

  container.insertAdjacentHTML('beforeend',
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;' +
               'font-size:5.5px;color:rgba(255,255,255,0.32);letter-spacing:.05em;margin-top:4px">' +
      '<span style="color:#1a4030">■ VIDE</span>' +
      '<span style="color:#00c864">■ CORPS/MUR</span>' +
      '<span style="color:#ff3355">■ POMME</span>' +
      '<span style="color:#ffd700">■ OR</span>' +
    '</div>');
};

Visualizer.prototype._buildOutputRows = function() {
  var container = document.getElementById('outputs-list');
  container.innerHTML = '';
  OUTPUT_NAMES.forEach(function(name, i) {
    container.insertAdjacentHTML('beforeend',
      '<div class="out-row" id="orow' + i + '">' +
        '<span class="out-icon">' + OUTPUT_ICONS[i] + '</span>' +
        '<span class="out-label">' + name + '</span>' +
        '<div class="out-track"><div class="out-fill" id="ofill' + i + '"></div></div>' +
        '<span class="out-val" id="oval' + i + '">0.25</span>' +
      '</div>');
  });
};

Visualizer.prototype._setupTabs = function() {
  var self = this;
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      self._tab = btn.dataset.tab;
      if (self._lastNet) self.updateWeights(self._lastNet);
    });
  });
};

// ─── Tick principal ────────────────────────────────────────────
Visualizer.prototype.update = function(net, act) {
  this._updateGridCanvas(act.inputs);
  this._updateOutputBars(act.output, act.chosen);
  this._drawNetwork(net, act);
  this._lastNet = net;
};

// ─── Grille 8×8 (panel droit) ──────────────────────────────────
Visualizer.prototype._updateGridCanvas = function(inputs) {
  var canvas = document.getElementById('grid-canvas');
  if (!canvas) return;
  var ctx  = canvas.getContext('2d');
  var N    = GRID_VIEW;
  var cW   = canvas.width  / N;
  var cH   = canvas.height / N;
  var half = Math.floor(N / 2);

  ctx.fillStyle = '#020806';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < inputs.length; i++) {
    var row = Math.floor(i / N);
    var col = i % N;
    var val = inputs[i];
    var x   = col * cW;
    var y   = row * cH;

    if      (val >= 0.25) ctx.fillStyle = 'rgba(255,215,0,0.92)';
    else if (val >= 0.15) ctx.fillStyle = 'rgba(255,50,80,0.92)';
    else if (val >= 0.05) ctx.fillStyle = 'rgba(0,180,80,0.85)';
    else                  ctx.fillStyle = 'rgba(0,40,25,0.7)';
    ctx.fillRect(x + 1, y + 1, cW - 2, cH - 2);

    if (row === half && col === half) {
      ctx.strokeStyle = 'rgba(0,255,136,0.9)';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x + 1.5, y + 1.5, cW - 3, cH - 3);
    }
  }

  ctx.strokeStyle = 'rgba(0,255,136,0.07)';
  ctx.lineWidth   = 0.5;
  for (var r = 0; r <= N; r++) {
    ctx.beginPath(); ctx.moveTo(r * cW, 0); ctx.lineTo(r * cW, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * cH); ctx.lineTo(canvas.width, r * cH);  ctx.stroke();
  }
};

Visualizer.prototype._updateInputBars = function() {};

// ─── Barres de sortie (panel droit) ────────────────────────────
Visualizer.prototype._updateOutputBars = function(output, chosen) {
  output.forEach(function(val, i) {
    var fill = document.getElementById('ofill' + i);
    var span = document.getElementById('oval'  + i);
    var row  = document.getElementById('orow'  + i);
    if (!fill || !span || !row) return;
    span.textContent = val.toFixed(3);
    fill.style.width = (val * 100) + '%';
    row.classList.toggle('chosen', i === chosen);
  });
};

// ═══════════════════════════════════════════════════════════════
//  RÉSEAU DE NEURONES — disposition VERTICALE
//
//  Haut   : grille 8×8 (entrées)
//  Milieu : couche cachée (32 neurones sur 2 lignes de 16)
//  Bas    : couche de sortie (4 neurones)
// ═══════════════════════════════════════════════════════════════
Visualizer.prototype._drawNetwork = function(net, act) {
  var ctx = this.netCtx;
  var W   = this.netCvs.width;   // 520
  var H   = this.netCvs.height;  // 860

  // Fond
  ctx.fillStyle = '#020806';
  ctx.fillRect(0, 0, W, H);

  // Points de fond
  ctx.fillStyle = 'rgba(0,255,136,0.022)';
  for (var gx = 18; gx < W; gx += 36)
    for (var gy = 18; gy < H; gy += 36) {
      ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
    }

  // ── Positions ────────────────────────────────────────────────
  var GRID_PX  = 200;
  var CELL_SZ  = GRID_PX / GRID_VIEW;               // 25
  var GRID_X   = (W - GRID_PX) / 2;                 // 160
  var GRID_Y   = 28;
  var HALF     = Math.floor(GRID_VIEW / 2);          // 4

  // Couche cachée : 2 rangées de 16 neurones
  var HID_COLS = 16;
  var HID_ROWS = 2;
  var HID_COL_STEP = W / HID_COLS;                  // 32.5
  var HID_ROW1_Y = GRID_Y + GRID_PX + 75;           // ~328
  var HID_ROW2_Y = HID_ROW1_Y + 26;                 // ~354

  function hidPos(idx) {
    var r  = idx < HID_COLS ? 0 : 1;
    var c  = idx % HID_COLS;
    return { x: c * HID_COL_STEP + HID_COL_STEP / 2,
             y: r === 0 ? HID_ROW1_Y : HID_ROW2_Y };
  }

  // Couche de sortie : 4 neurones équidistants
  var OUT_Y     = HID_ROW2_Y + 130;
  var OUT_STEP  = W / N_OUTPUTS;

  function outX(i) { return (i + 0.5) * OUT_STEP; }

  // ── Arêtes : Grille → Cachée ──────────────────────────────────
  // Sous-échantillonnage (1 input sur 4) pour lisibilité
  for (var h = 0; h < N_HIDDEN; h++) {
    for (var ii = 0; ii < N_INPUTS; ii += 4) {
      var w   = net.W1[h][ii];
      var ab  = Math.min(Math.abs(w), 2.5);
      var a   = 0.006 + ab * 0.02;
      var gr  = Math.floor(ii / GRID_VIEW);
      var gc  = ii % GRID_VIEW;
      var ex  = GRID_X + gc * CELL_SZ + CELL_SZ / 2;
      var ey  = GRID_Y + gr * CELL_SZ + CELL_SZ / 2;
      var hp  = hidPos(h);
      ctx.strokeStyle = w > 0
        ? 'rgba(0,210,100,' + a + ')'
        : 'rgba(220,50,50,' + a + ')';
      ctx.lineWidth = 0.3 + ab * 0.18;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hp.x, hp.y); ctx.stroke();
    }
  }

  // ── Arêtes : Cachée → Sortie ──────────────────────────────────
  for (var oo = 0; oo < N_OUTPUTS; oo++) {
    for (var jj = 0; jj < N_HIDDEN; jj++) {
      var ww  = net.W2[oo][jj];
      var ab2 = Math.min(Math.abs(ww), 2.5);
      var a2  = 0.05 + ab2 * 0.14;
      var hp2 = hidPos(jj);
      ctx.strokeStyle = ww > 0
        ? 'rgba(0,210,100,' + a2 + ')'
        : 'rgba(220,50,50,' + a2 + ')';
      ctx.lineWidth = 0.5 + ab2 * 0.5;
      ctx.beginPath(); ctx.moveTo(hp2.x, hp2.y); ctx.lineTo(outX(oo), OUT_Y); ctx.stroke();
    }
  }

  // ── Grille d'entrée ───────────────────────────────────────────
  for (var gi = 0; gi < N_INPUTS; gi++) {
    var grow = Math.floor(gi / GRID_VIEW);
    var gcol = gi % GRID_VIEW;
    var val  = act.inputs[gi];
    var gxp  = GRID_X + gcol * CELL_SZ;
    var gyp  = GRID_Y + grow * CELL_SZ;

    if      (val >= 0.25) ctx.fillStyle = 'rgba(255,215,0,0.9)';
    else if (val >= 0.15) ctx.fillStyle = 'rgba(255,50,80,0.9)';
    else if (val >= 0.05) ctx.fillStyle = 'rgba(0,180,80,0.85)';
    else                  ctx.fillStyle = 'rgba(0,35,20,0.85)';
    ctx.fillRect(gxp + 0.5, gyp + 0.5, CELL_SZ - 1, CELL_SZ - 1);

    if (grow === HALF && gcol === HALF) {
      ctx.strokeStyle = 'rgba(0,255,136,0.9)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(gxp + 1, gyp + 1, CELL_SZ - 2, CELL_SZ - 2);
    }
  }
  // Bordure grille
  ctx.strokeStyle = 'rgba(0,200,255,0.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(GRID_X, GRID_Y, GRID_PX, GRID_PX);

  // ── Neurones cachés ───────────────────────────────────────────
  for (var hid = 0; hid < N_HIDDEN; hid++) {
    var hv  = act.hidden[hid];
    var c   = Math.max(0, Math.min(1, hv));
    var gv  = Math.floor(c * 190 + 25);
    var pos = hidPos(hid);
    ctx.save();
    if (c > 0.3) { ctx.shadowColor = 'rgba(0,' + gv + ',80,.8)'; ctx.shadowBlur = 3 + c * 7; }
    ctx.fillStyle   = 'rgb(0,' + gv + ',40)';
    ctx.strokeStyle = 'rgba(0,255,136,' + (0.1 + c * 0.75) + ')';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ── Neurones de sortie ────────────────────────────────────────
  for (var out = 0; out < N_OUTPUTS; out++) {
    var ov     = act.output[out];
    var co     = Math.max(0, Math.min(1, ov));
    var gvo    = Math.floor(co * 200 + 30);
    var ox     = outX(out);
    var chosen = out === act.chosen;
    var R      = 20;

    ctx.save();
    if (co > 0.4) { ctx.shadowColor = 'rgba(0,' + gvo + ',80,.9)'; ctx.shadowBlur = 12 + co * 8; }
    ctx.fillStyle   = 'rgb(0,' + gvo + ',50)';
    ctx.strokeStyle = 'rgba(0,255,136,' + (0.15 + co * 0.7) + ')';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(ox, OUT_Y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    if (chosen) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 26;
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth  = 2.5;
      ctx.beginPath(); ctx.arc(ox, OUT_Y, R + 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle  = chosen ? '#ffd700' : 'rgba(255,255,255,' + (0.35 + co * 0.6) + ')';
    ctx.font       = '17px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(OUTPUT_ICONS[out], ox, OUT_Y + 6);

    // Nom sous le nœud
    ctx.font      = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = chosen ? '#ffd700' : 'rgba(255,255,255,.28)';
    ctx.fillText(OUTPUT_NAMES[out], ox, OUT_Y + R + 16);
    ctx.restore();
  }

  // ── Labels de couches ─────────────────────────────────────────
  ctx.font = '9px monospace'; ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,200,255,.5)';
  ctx.fillText('INPUT · 8×8', W / 2, GRID_Y + GRID_PX + 14);

  ctx.fillStyle = 'rgba(0,255,136,.3)';
  ctx.fillText('HIDDEN · ' + N_HIDDEN, W / 2, HID_ROW2_Y + 18);

  ctx.fillStyle = 'rgba(0,255,136,.5)';
  ctx.fillText('OUTPUT', W / 2, OUT_Y + R + 30);

  // ── Légende couleurs ──────────────────────────────────────────
  var items = [['VIDE','rgba(0,35,20,1)'],['CORPS','rgba(0,180,80,1)'],
               ['POMME','rgba(255,50,80,1)'],['OR','rgba(255,215,0,1)']];
  var lx = 14; var ly = H - 16;
  items.forEach(function(it) {
    ctx.fillStyle = it[1]; ctx.fillRect(lx, ly - 8, 9, 9);
    ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillText(it[0], lx + 12, ly);
    lx += 70;
  });

  // ── Action choisie (haut droite) ──────────────────────────────
  if (act.chosen !== -1) {
    ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('→ ' + OUTPUT_NAMES[act.chosen], W - 8, 18);
  }
};

// ─── Matrice de poids ──────────────────────────────────────────
Visualizer.prototype.updateWeights = function(net) {
  this._lastNet = net;
  var mat   = this._tab === 'ih' ? net.W1 : net.W2;
  var nCols = mat[0].length;
  var html  = '<div class="wmat" style="grid-template-columns:repeat(' + nCols + ',1fr)">';
  mat.forEach(function(row) {
    row.forEach(function(w) {
      var v  = Math.max(-2, Math.min(2, w)); var a = Math.abs(v) / 2;
      var bg = v > 0
        ? 'rgba(0,' + Math.floor(165 * a + 15) + ',60,' + (0.1 + a * .75) + ')'
        : 'rgba(' + Math.floor(180 * a) + ',20,20,' + (0.1 + a * .75) + ')';
      html += '<div class="wcel" style="background:' + bg + '" title="' + w.toFixed(3) + '">' + w.toFixed(1) + '</div>';
    });
  });
  document.getElementById('weights-display').innerHTML = html + '</div>';
};

// ─── Graphe fitness ────────────────────────────────────────────
Visualizer.prototype.drawFitHistory = function(history) {
  var canvas = document.getElementById('fit-canvas');
  if (!canvas || history.length < 2) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var max = Math.max.apply(null, history) || 1;

  ctx.fillStyle = '#020806'; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(0,255,136,.06)'; ctx.lineWidth = 1;
  for (var g = 1; g <= 4; g++) {
    var gy = H - 8 - (g / 5) * (H - 18);
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(8, gy); ctx.lineTo(W - 8, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  function x(i) { return 8 + (i / (history.length - 1)) * (W - 16); }
  function y(v) { return H - 8 - (v / max) * (H - 18); }

  // Zone remplie
  ctx.beginPath();
  history.forEach(function(v, i) { i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)); });
  ctx.lineTo(x(history.length - 1), H - 8);
  ctx.lineTo(x(0), H - 8); ctx.closePath();
  var grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,255,136,.22)');
  grad.addColorStop(1, 'rgba(0,255,136,.01)');
  ctx.fillStyle = grad; ctx.fill();

  // Ligne principale
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0,255,136,.85)'; ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,255,136,.6)';  ctx.shadowBlur = 6;
  history.forEach(function(v, i) { i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v)); });
  ctx.stroke(); ctx.shadowBlur = 0;

  // Point pic
  var peakIdx = history.indexOf(max);
  ctx.beginPath();
  ctx.arc(x(peakIdx), y(max), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
  ctx.fill(); ctx.shadowBlur = 0;

  var estFood = Math.round(Math.sqrt(Math.max(0, max) / 200));
  ctx.font = '9px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,255,136,.6)';
  ctx.fillText('pic ≈ ' + estFood + ' pommes', W - 8, 16);
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillText('gen ' + history.length, W - 8, H - 10);
};
