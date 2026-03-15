'use strict';

// ═══════════════════════════════════════════════════════════════
//  MOTEUR SONORE — Web Audio API
//  Toute la synthèse est faite avec des oscillateurs + tampons de bruit.
//  Aucun fichier audio externe requis.
//  Doit appeler SoundEngine.init() lors d'un geste utilisateur avant utilisation.
// ═══════════════════════════════════════════════════════════════

var SoundEngine = (function() {
  var _ctx     = null;
  var _enabled = true;

  // ─── Fonctions privées utilitaires ──────────────────────────

  function _osc(freq, type, t0, dur, vol, freqEnd) {
    if (!_ctx || !_enabled) return;
    var o = _ctx.createOscillator();
    var g = _ctx.createGain();
    o.connect(g); g.connect(_ctx.destination);
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(vol || 0.14, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.01);
  }

  function _noise(dur, t0, vol, filterFreq, filterType) {
    if (!_ctx || !_enabled) return;
    try {
      var sr   = _ctx.sampleRate;
      var buf  = _ctx.createBuffer(1, Math.floor(sr * dur), sr);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      var src  = _ctx.createBufferSource();
      var filt = _ctx.createBiquadFilter();
      var gn   = _ctx.createGain();
      src.buffer      = buf;
      filt.type       = filterType || 'highpass';
      filt.frequency.value = filterFreq || 4000;
      src.connect(filt); filt.connect(gn); gn.connect(_ctx.destination);
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.start(t0);
    } catch(e) {}
  }

  // ─── API publique ────────────────────────────────────────────
  return {

    // Appeler une fois lors de la première interaction utilisateur pour déverrouiller Web Audio
    init: function() {
      if (_ctx) return;
      try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) {}
    },

    toggle: function() { _enabled = !_enabled; return _enabled; },

    // Arpège ascendant 8-bit — manger une pomme rouge
    eat: function() {
      if (!_ctx || !_enabled) return;
      var t = _ctx.currentTime;
      _osc(440, 'square', t,        0.07, 0.11);
      _osc(660, 'square', t + 0.06, 0.07, 0.09);
      _osc(880, 'square', t + 0.12, 0.06, 0.07);
    },

    // Séquence de carillon magique + scintillement — manger une pomme dorée
    goldEat: function() {
      if (!_ctx || !_enabled) return;
      var t = _ctx.currentTime;
      [523, 659, 784, 1047, 1319].forEach(function(f, i) {
        _osc(f, 'sine', t + i * 0.085, 0.38, 0.20);
      });
      _noise(0.12, t + 0.34, 0.28, 5500, 'highpass');
    },

    // Crash distordu avec glitches — mort
    die: function() {
      if (!_ctx || !_enabled) return;
      var t    = _ctx.currentTime;
      var o    = _ctx.createOscillator();
      var g    = _ctx.createGain();
      var dist = _ctx.createWaveShaper();

      var curve = new Float32Array(256);
      for (var i = 0; i < 256; i++) {
        var x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x));
      }
      dist.curve = curve;
      o.connect(dist); dist.connect(g); g.connect(_ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(290, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.55);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
      o.start(t); o.stop(t + 0.65);
      _noise(0.08, t, 0.22, 400, 'lowpass');
    },

    // Tonalité montante à 3 notes — toutes les 5 nourritures mangées
    levelUp: function() {
      if (!_ctx || !_enabled) return;
      var t = _ctx.currentTime;
      _osc(784,  'sine', t,        0.10, 0.14);
      _osc(988,  'sine', t + 0.10, 0.10, 0.14);
      _osc(1175, 'sine', t + 0.20, 0.14, 0.14);
    },

    // Fanfare de victoire — après la fin de l'entraînement
    trainDone: function() {
      if (!_ctx || !_enabled) return;
      var t = _ctx.currentTime;
      [523, 659, 784, 1047].forEach(function(f, i) {
        _osc(f, 'sine', t + i * 0.13, 0.38, 0.19);
      });
      [523, 659, 784].forEach(function(f) {
        _osc(f, 'sine', t + 0.62, 0.75, 0.11);
      });
    }
  };
}());
