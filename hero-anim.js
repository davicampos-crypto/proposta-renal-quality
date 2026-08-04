/* Animação de background do hero — canvas 2D, sem dependências.
   Respeita prefers-reduced-motion, pausa fora da viewport e em aba oculta. */
(function () {
  'use strict';

  /* Em apps React/Next, inserir o canvas antes da hidratação causa mismatch e o
     React descarta o nó. Espera a hidratação terminar antes de montar. */
  function ready(cb) {
    var done = false;
    function go() { if (done) return; done = true; cb(); }
    var isReactApp = !!(self.__next_f || document.querySelector('script[src*="/_next/"]'));
    if (!isReactApp) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else go();
      return;
    }
    var tries = 0;
    (function poll() {
      var host = document.querySelector('main') || document.body;
      var hydrated = host && Object.keys(host).some(function (k) { return k.indexOf('__react') === 0; });
      if (hydrated) { setTimeout(go, 60); return; }
      if (++tries > 120) return go();
      setTimeout(poll, 50);
    })();
  }

  function boot() {
  var HERO = document.querySelector('.hero');
  if (!HERO || HERO.querySelector('canvas[data-hero-anim]')) return;
  var ctxTest = document.createElement('canvas').getContext && true;
  if (!ctxTest) return;

  var kids = Array.prototype.slice.call(HERO.children);
  if (getComputedStyle(HERO).position === 'static') HERO.style.position = 'relative';
  kids.forEach(function (el) {
    var p = getComputedStyle(el).position;
    if (p === 'absolute' || p === 'fixed') return;
    if (p === 'static') el.style.position = 'relative';
    if (getComputedStyle(el).zIndex === 'auto') el.style.zIndex = '2';
  });

  var cv = document.createElement('canvas');
  cv.setAttribute('data-hero-anim', '');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none';
  HERO.insertBefore(cv, HERO.firstChild);

  var ctx = cv.getContext('2d');
  if (!ctx) { cv.parentNode.removeChild(cv); return; }

  var w = 1, h = 1, dpr = 1, T = 0, raf = 0, visible = true;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = HERO.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setup();
  }

  /* ---- animação ---- */

  var TEAL = '0,172,169', GOLD = '212,160,71', LIGHT = '255,255,255';
  var chans = [], parts = [];

  function chanY(c, t) {
    var env = Math.sin(t * Math.PI);
    return h * (c.y + Math.sin(t * 6.2831853 * c.k + c.ph) * c.amp * env);
  }

  function setup() {
    chans = []; parts = [];
    var n = Math.min(7, Math.max(3, Math.round(h / 130)));
    for (var i = 0; i < n; i++) {
      chans.push({ y: (i + .5) / n, amp: rnd(.045, .1), k: rnd(.7, 1.5), ph: rnd(0, 6.28), dir: i % 2 ? 1 : -1 });
    }
    for (var j = 0; j < n * 7; j++) {
      parts.push({ c: j % n, t: Math.random(), sp: rnd(.05, .12), r: rnd(1.4, 3.4), gold: Math.random() < .25 });
    }
  }

  function frame(dt) {
    var i, j;
    ctx.lineCap = 'round';
    for (i = 0; i < chans.length; i++) {
      var c = chans[i];
      ctx.beginPath();
      for (j = 0; j <= 56; j++) {
        var t = j / 56;
        ctx[j ? 'lineTo' : 'moveTo'](t * w, chanY(c, t));
      }
      var g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(' + TEAL + ',0)');
      g.addColorStop(.5, 'rgba(' + TEAL + ',.30)');
      g.addColorStop(1, 'rgba(' + TEAL + ',0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.stroke();
    }
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], ch = chans[p.c];
      p.t += p.sp * dt * ch.dir;
      if (p.t > 1) p.t -= 1; else if (p.t < 0) p.t += 1;
      var env = Math.sin(p.t * Math.PI);
      var x = p.t * w, y = chanY(ch, p.t);
      var a = env * .8;
      ctx.fillStyle = 'rgba(' + (p.gold ? GOLD : LIGHT) + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.2832); ctx.fill();
      var gg = ctx.createRadialGradient(x, y, 0, x, y, p.r * 6);
      gg.addColorStop(0, 'rgba(' + (p.gold ? GOLD : TEAL) + ',' + (a * .3).toFixed(3) + ')');
      gg.addColorStop(1, 'rgba(' + (p.gold ? GOLD : TEAL) + ',0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(x, y, p.r * 6, 0, 6.2832); ctx.fill();
    }
  }

  /* ---- /animação ---- */

  var last = 0;
  function loop(ts) {
    /* se o React re-renderizou o hero e descartou este canvas, encerra o laço */
    if (!cv.isConnected) { stop(); return; }
    raf = requestAnimationFrame(loop);
    var dt = ts - last;
    if (!last || dt > 100) dt = 16;
    last = ts;
    T += dt / 1000;
    ctx.clearRect(0, 0, w, h);
    frame(dt / 1000);
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  try { resize(); } catch (e) { cv.parentNode.removeChild(cv); return; }

  if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(HERO); }
  else { window.addEventListener('resize', resize); }

  if (reduce) {
    ctx.clearRect(0, 0, w, h);
    try { frame(0); } catch (e) {}
    return;
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(HERO);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible) start();
  });
  start();
  }

  /* Remonta se o canvas for descartado por um re-render do React. */
  ready(function () {
    boot();
    var checks = 0;
    var iv = setInterval(function () {
      if (++checks > 30) { clearInterval(iv); return; }
      if (!document.querySelector('.hero canvas[data-hero-anim]')) boot();
    }, 500);
  });
})();
