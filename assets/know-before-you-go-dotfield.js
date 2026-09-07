(function(){
  'use strict';

  var container = document.getElementById('kby-dotfield');
  if (!container) return;

  // ---------------------------------------------------------------------
  // Two modes.
  //
  //   'live'   — pointer-capable viewport wider than a tablet. Dots bulge
  //              away from the cursor, and the rAF loop parks itself as soon
  //              as everything has settled, waking on the next mousemove.
  //
  //   'static' — everything else (phones, tablets, reduced-motion). The dot
  //              field is drawn ONCE and then left alone: no rAF loop, no
  //              timers, no pointer listeners, nothing per-frame. The whole
  //              effect is cursor-driven and touch has no cursor, so there is
  //              nothing to animate — the old build spent 60fps redrawing a
  //              pixel-identical frame for the entire session.
  //
  // The visual result in 'static' mode is exactly the field's resting state,
  // which is what a desktop visitor already sees whenever their mouse is
  // still. Same dots, same gradient, same spacing.
  //
  // Note the original IntersectionObserver pause could never fire:
  // `.kby-dotfield` is `position:fixed; inset:0`, so it is permanently
  // intersecting. The idle-out logic below is what actually stops the loop.
  // ---------------------------------------------------------------------
  var desktopQuery = window.matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)');
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion:reduce)');
  // A 13" iPad Pro is 1032 x 1376 logical points, so it passes the min-width
  // test, and with a Magic Keyboard attached iPadOS reports `hover: hover`
  // and `pointer: fine` — meaning it would otherwise run the full live loop.
  // `any-pointer: coarse` is true whenever a touchscreen exists at all, so it
  // is what actually separates a tablet from a desktop here.
  var touchQuery = window.matchMedia('(any-pointer: coarse)');

  var TWO_PI = Math.PI * 2;

  var opts = {
    dotRadius: 1.5,
    dotSpacing: 16,
    cursorRadius: 220,
    cursorForce: 0.1,
    bulgeOnly: true,
    bulgeStrength: 48,
    sparkle: false,
    waveAmplitude: 0,
    gradientStops: [
      { offset: 0,    color: 'rgba(13,43,54,0.55)' },
      { offset: 0.35, color: 'rgba(24,64,78,0.48)' },
      { offset: 0.65, color: 'rgba(70,190,196,0.40)' },
      { offset: 1,    color: 'rgba(149,193,31,0.32)' }
    ]
  };

  var mode = null;       // 'live' | 'static' | null
  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var dots = [];
  var w = 0, h = 0;
  var mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  var engagement = 0;
  var rafId = null;
  var resizeTimer = null;
  var speedInterval = null;
  var gradient = null;   // cached; rebuilt only on resize, not every frame
  var running = false;
  var idle = false;      // settled — nothing left to draw until input
  var idleFrames = 0;
  var frameCount = 0;

  function wantedMode(){
    if (desktopQuery.matches && !touchQuery.matches && !reduceMotionQuery.matches) return 'live';
    return 'static';
  }

  // ===== Geometry =====
  function buildDots(){
    var step = opts.dotRadius + opts.dotSpacing;
    var cols = Math.floor(w / step);
    var rows = Math.floor(h / step);
    var padX = (w % step) / 2;
    var padY = (h % step) / 2;
    var arr = new Array(Math.max(rows,0) * Math.max(cols,0));
    var idx = 0;
    for (var row = 0; row < rows; row++){
      for (var col = 0; col < cols; col++){
        var ax = padX + col * step + step / 2;
        var ay = padY + row * step + step / 2;
        arr[idx++] = { ax: ax, ay: ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
      }
    }
    dots = arr;
  }

  function makeGradient(){
    var g = ctx.createLinearGradient(0, 0, w, h);
    opts.gradientStops.forEach(function(s){ g.addColorStop(s.offset, s.color); });
    return g;
  }

  function doResize(){
    var rect = container.getBoundingClientRect();
    var nextW = rect.width, nextH = rect.height;
    // iOS fires `resize` every time the URL bar collapses or expands mid-
    // scroll. Rebuilding ~1,000 dot objects and a gradient on each of those
    // is pure waste, so a height-only change under the URL-bar threshold is
    // ignored. The canvas keeps its CSS size at 100%/100% and is never
    // pixel-pinned, so the existing bitmap just stretches by a couple of
    // percent in between — imperceptible on a soft dot texture.
    if (dots.length && nextW === w && Math.abs(nextH - h) < 140) return false;
    w = nextW; h = nextH;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gradient = makeGradient();
    buildDots();
    return true;
  }

  function onResize(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      if (!mode) return;
      var changed = doResize();
      if (mode === 'live') wake();
      else if (changed) draw();
    }, 150);
  }

  // ===== Rendering =====
  function draw(){
    var len = dots.length;
    var rad = opts.dotRadius / 2;
    var t = frameCount * 0.02;
    var wave = opts.waveAmplitude;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (var i = 0; i < len; i++){
      var d = dots[i];
      var drawX = d.sx, drawY = d.sy;
      if (wave > 0){
        drawY += Math.sin(d.ax * 0.03 + t) * wave;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * wave * 0.5;
      }
      ctx.moveTo(drawX + rad, drawY);
      ctx.arc(drawX, drawY, rad, 0, TWO_PI);
    }
    ctx.fill();
  }

  // ===== Simulation (live mode only) =====
  // Returns how far the furthest dot still sits from its anchor, so the loop
  // knows when the field has come to rest.
  function simulate(){
    var len = dots.length;
    var targetEngagement = Math.min(mouse.speed / 5, 1);
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;
    var eng = engagement;

    var cr = opts.cursorRadius, crSq = cr * cr;
    var isBulge = opts.bulgeOnly;
    var maxOffset = 0;

    for (var i = 0; i < len; i++){
      var d = dots[i];
      var dx = mouse.x - d.ax, dy = mouse.y - d.ay;
      var distSq = dx*dx + dy*dy;

      if (distSq < crSq && eng > 0.01){
        var dist = Math.sqrt(distSq);
        if (isBulge){
          var tt = 1 - dist / cr;
          var push = tt * tt * opts.bulgeStrength * eng;
          var angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          var angle2 = Math.atan2(dy, dx);
          var move = (500 / dist) * (mouse.speed * opts.cursorForce);
          d.vx += Math.cos(angle2) * -move;
          d.vy += Math.sin(angle2) * -move;
        }
      } else if (isBulge){
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      if (!isBulge){
        d.vx *= 0.9; d.vy *= 0.9;
        d.x = d.ax + d.vx; d.y = d.ay + d.vy;
        d.sx += (d.x - d.sx) * 0.1;
        d.sy += (d.y - d.sy) * 0.1;
      }

      var offX = d.sx - d.ax; if (offX < 0) offX = -offX;
      var offY = d.sy - d.ay; if (offY < 0) offY = -offY;
      if (offX > maxOffset) maxOffset = offX;
      if (offY > maxOffset) maxOffset = offY;
    }
    return maxOffset;
  }

  function snapToRest(){
    for (var i = 0; i < dots.length; i++){
      var d = dots[i];
      d.sx = d.ax; d.sy = d.ay; d.vx = 0; d.vy = 0; d.x = d.ax; d.y = d.ay;
    }
  }

  function tick(){
    frameCount++;
    var maxOffset = simulate();
    draw();

    // Once the pointer has stopped and every dot is home there is nothing
    // left to render, so park the loop rather than burn frames redrawing a
    // static image. `wake()` restarts it on the next pointer movement.
    if (engagement === 0 && maxOffset < 0.05 && opts.waveAmplitude === 0){
      if (++idleFrames > 20){
        snapToRest();
        draw();
        idle = true;
        stopLoop();
        return;
      }
    } else {
      idleFrames = 0;
    }

    if (running) rafId = requestAnimationFrame(tick);
  }

  function startLoop(){
    if (running || mode !== 'live') return;
    running = true;
    idleFrames = 0;
    if (!speedInterval){
      speedInterval = setInterval(function(){
        var dx = mouse.prevX - mouse.x, dy = mouse.prevY - mouse.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        mouse.speed += (dist - mouse.speed) * 0.5;
        if (mouse.speed < 0.001) mouse.speed = 0;
        mouse.prevX = mouse.x; mouse.prevY = mouse.y;
      }, 20);
    }
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop(){
    running = false;
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
    // Previously a permanent 50Hz timer that kept waking the main thread even
    // while the animation loop itself was stopped.
    if (speedInterval){ clearInterval(speedInterval); speedInterval = null; }
  }

  function syncLoop(){
    if (mode === 'live' && !document.hidden && !idle) startLoop();
    else stopLoop();
  }

  function wake(){
    if (mode !== 'live') return;
    idle = false;
    // The speed sampler is stopped while idle, so prevX/prevY are stale by
    // however long the pointer sat still. Rebasing them stops the first
    // sample after waking from reading as one enormous jump.
    mouse.prevX = mouse.x; mouse.prevY = mouse.y; mouse.speed = 0;
    syncLoop();
  }

  function onMouseMove(e){
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (idle) wake();
  }

  function onVisibility(){
    if (mode === 'live') syncLoop();
    // A backgrounded tab can have its canvas bitmap discarded, so repaint the
    // static field when the tab comes back. One draw, not a loop.
    else if (mode === 'static' && !document.hidden) draw();
  }

  // ===== Lifecycle =====
  function start(next){
    mode = next;

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    // A soft dot texture gains nothing visible from extra device pixels, but
    // both the fill cost and the bitmap's memory scale with their square.
    dpr = Math.min(window.devicePixelRatio || 1, next === 'live' ? 2 : 1.5);

    doResize();
    draw();

    if (next === 'live'){
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      syncLoop();
    }
  }

  function stop(){
    if (!mode) return;
    stopLoop();
    window.removeEventListener('mousemove', onMouseMove);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null; gradient = null;
    dots = [];
    w = 0; h = 0;
    idle = false;
    mode = null;
  }

  function evaluate(){
    var next = wantedMode();
    if (next === mode) return;
    stop();
    start(next);
  }

  // Re-evaluated on breakpoint changes, so shrinking a desktop window to
  // tablet width swaps the live field for the static one rather than leaving
  // the loop running.
  if (desktopQuery.addEventListener){
    desktopQuery.addEventListener('change', evaluate);
    touchQuery.addEventListener('change', evaluate);
    reduceMotionQuery.addEventListener('change', evaluate);
  } else if (desktopQuery.addListener){
    desktopQuery.addListener(evaluate);
    touchQuery.addListener(evaluate);
    reduceMotionQuery.addListener(evaluate);
  }

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  evaluate();

})();