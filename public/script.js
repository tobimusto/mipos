// NAV + SCROLL REVEAL — re-init on every View Transition navigation
function initNavAndReveal() {
  // NAV — shadow once past fold
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.removeEventListener('scroll', window.__miposNavScroll);
    window.__miposNavScroll = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // SCROLL REVEAL
  const reveals = document.querySelectorAll('[data-reveal]:not(.is-in)');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('is-in'), i * 70);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(r => io.observe(r));
  } else {
    reveals.forEach(r => r.classList.add('is-in'));
  }
}

document.addEventListener('astro:page-load', initNavAndReveal);
initNavAndReveal();

// DEMO POS
let cart = {};
let total = 0;

function addToCart(name, price) {
  // Button flash animation
  const btn = document.querySelector(`.dprod[onclick="addToCart('${name}',${price})"]`);
  if (btn) {
    btn.classList.add('dprod-adding');
    setTimeout(() => btn.classList.remove('dprod-adding'), 320);
  }
  if (cart[name]) cart[name].qty++;
  else cart[name] = { price, qty: 1 };
  total += price;
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cartItems');
  el.innerHTML = '';
  Object.entries(cart).forEach(([name, { price, qty }]) => {
    const row = document.createElement('div');
    row.className = 'dci';
    row.innerHTML =
      `<span class="dci-name">${name}${qty > 1 ? ' ×' + qty : ''}</span>` +
      `<span class="dci-price">$${(price * qty).toLocaleString('es-AR')}</span>`;
    el.appendChild(row);
  });
  const totalEl = document.getElementById('demoTotal');
  totalEl.textContent = '$' + total.toLocaleString('es-AR');
  // Pop animation on total change
  if (total > 0) {
    totalEl.classList.remove('total-pop');
    void totalEl.offsetWidth;
    totalEl.classList.add('total-pop');
  }
}

function mipos() {
  if (total === 0) return;
  const amountEl = document.getElementById('successAmount');
  const count = Object.keys(cart).length;
  if (amountEl) amountEl.textContent = '$' + total.toLocaleString('es-AR') + ' · ' + count + (count === 1 ? ' producto' : ' productos');
  document.getElementById('demoScreen').hidden = true;
  document.getElementById('demoSuccess').hidden = false;
}

function resetDemo() {
  cart = {};
  total = 0;
  document.getElementById('cartItems').innerHTML =
    '<span class="cart-empty">Tocá un producto para empezar…</span>';
  document.getElementById('demoTotal').textContent = '$0';
  document.getElementById('demoScreen').hidden = false;
  document.getElementById('demoSuccess').hidden = true;
}

// AUTO-DEMO: plays once when section enters viewport
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = document.querySelector('#demo');
  if (!section || !('IntersectionObserver' in window)) return;
  let played = false;

  const flashBtn = (selector) => {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add('dprod-adding');
    setTimeout(() => btn.classList.remove('dprod-adding'), 350);
  };

  const getDemoProduct = (id) => {
    const btn = document.querySelector(`.dprod[data-id="${id}"]`);
    if (!btn) return null;
    const match = btn.getAttribute('onclick').match(/addToCart\('([^']+)',\s*(\d+)\)/);
    return match ? { name: match[1], price: parseInt(match[2]) } : null;
  };

  const run = () => {
    if (played || Object.keys(cart).length > 0) return;
    played = true;
    let t = 1000;
    const coca = getDemoProduct('coca');
    const alfa = getDemoProduct('alfa');
    const agua = getDemoProduct('agua');
    if (coca) setTimeout(() => { flashBtn('[data-id="coca"]'); addToCart(coca.name, coca.price); }, t);
    t += 900;
    if (alfa) setTimeout(() => { flashBtn('[data-id="alfa"]'); addToCart(alfa.name, alfa.price); }, t);
    t += 800;
    if (agua) setTimeout(() => { flashBtn('[data-id="agua"]'); addToCart(agua.name, agua.price); }, t);
    t += 1100;
    setTimeout(() => {
      const btn = document.getElementById('miposBtn');
      if (btn) { btn.classList.add('dprod-adding'); setTimeout(() => btn.classList.remove('dprod-adding'), 300); }
      mipos();
    }, t);
    t += 2800;
    setTimeout(() => {
      resetDemo();
      const ind = document.getElementById('demoIndicator');
      if (ind) ind.textContent = 'Tu turno';
    }, t);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { setTimeout(run, 600); io.unobserve(section); } });
  }, { threshold: 0.45 });
  io.observe(section);
})()

// PRICING TOGGLE
let _pricingReady = false;

function setToggle(mode) {
  document.getElementById('btnMensual').classList.toggle('active', mode === 'mensual');
  document.getElementById('btnAnual').classList.toggle('active', mode === 'anual');

  // Badge pop (only on user interaction, not initial load)
  if (_pricingReady && mode === 'anual') {
    const sub = document.querySelector('.toggle-btn-sub');
    if (sub) { sub.classList.remove('pop'); void sub.offsetWidth; sub.classList.add('pop'); }
  }

  // Savings line
  const line = document.getElementById('toggleSavingsLine');
  const countEl = document.getElementById('savingsCount');
  if (line) {
    if (mode === 'anual') {
      line.classList.add('visible');
      if (countEl && _pricingReady) {
        let t0 = null;
        const target = 60000, dur = 650;
        function tick(ts) {
          if (!t0) t0 = ts;
          const p = Math.min((ts - t0) / dur, 1);
          const v = Math.round((1 - Math.pow(1 - p, 3)) * target);
          countEl.textContent = '$' + v.toLocaleString('es-AR');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    } else {
      line.classList.remove('visible');
    }
  }

  // Prices with slide animation on interaction
  document.querySelectorAll('.plan-p').forEach(el => {
    const val = mode === 'mensual' ? parseInt(el.dataset.m, 10) : parseInt(el.dataset.a, 10);
    el.textContent = isNaN(val) ? '' : (val === 0 ? '0' : val.toLocaleString('es-AR'));
    if (_pricingReady) {
      el.classList.remove('to-annual', 'to-monthly');
      void el.offsetWidth;
      el.classList.add(mode === 'anual' ? 'to-annual' : 'to-monthly');
    }
  });

  // Underline verde (C) — siempre, incluso en carga inicial
  document.querySelectorAll('.ptag-price').forEach(el => {
    el.classList.toggle('annual-active', mode === 'anual');
  });
  document.querySelectorAll('.plan-old-price').forEach(el => {
    el.textContent = mode === 'anual' ? el.dataset.a : el.dataset.m;
  });
  document.querySelectorAll('.plan-yearly-lbl').forEach((el, index) => {
    if (mode === 'anual') {
      const yearlyPrices = ['$144.000', '$240.000', '$273.600'];
      el.textContent = `Facturado anualmente (${yearlyPrices[index]})`;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  });

  _pricingReady = true;
}
setToggle('anual');

// Reinit pricing on View Transitions navigation
document.addEventListener('astro:page-load', function onPricingInit() {
  if (document.getElementById('btnAnual')) { _pricingReady = false; setToggle('anual'); }
}, { once: false });

// SPOTLIGHT CARDS — cursor-following glow on float notes, testimonials and pricing cards
// SPOTLIGHT CARDS — cursor-following glow on float notes, testimonials and pricing cards
(function () {
  const targets = document.querySelectorAll('.float-note, .note, .ptag');
  targets.forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--cx', `${e.clientX - r.left}px`);
      el.style.setProperty('--cy', `${e.clientY - r.top}px`);
    });
    el.addEventListener('mouseleave', () => {
      el.style.removeProperty('--cx');
      el.style.removeProperty('--cy');
    });
  });
})();

// PARALLAX TILT — 3D tilt on testimonial cards
// PARALLAX TILT — 3D tilt on testimonial cards
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.note').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 9}deg) rotateX(${-y * 7}deg) translateZ(6px) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

// PANEL STATS COUNTER — storytelling: numbers count up as panel enters view
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length || !('IntersectionObserver' in window)) return;

  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const formatAR = n => Math.round(n).toLocaleString('es-AR');

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = prefix + formatAR(easeOutCubic(progress) * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + formatAR(target);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => animate(e.target), i * 80);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach(el => io.observe(el));
})();

// FEAT-INDEX STAGGER — hierarchy: feature items cascade in, not all at once
(function () {
  const list = document.querySelector('.feat-index');
  if (!list || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('li').forEach((li, i) => {
          setTimeout(() => li.classList.add('is-feat-in'), i * 65);
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  io.observe(list);
})();

// MOBILE MENU
(function () {
  const menuOpen = document.getElementById('menuOpen');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');
  if (!menuOpen || !mobileMenu) return;

  const open = () => {
    mobileMenu.classList.add('open');
    mobileOverlay && mobileOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    menuClose && menuClose.focus();
  };
  const close = () => {
    mobileMenu.classList.remove('open');
    mobileOverlay && mobileOverlay.classList.remove('open');
    document.body.style.overflow = '';
    menuOpen.focus();
  };

  menuOpen.addEventListener('click', open);
  menuClose && menuClose.addEventListener('click', close);
  mobileOverlay && mobileOverlay.addEventListener('click', close);
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mobileMenu.classList.contains('open')) close(); });
})();

// SMOOTH ANCHOR SCROLL
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// TIME-SAVED CALCULATOR
(function () {
  const sliders = ['rngVentas', 'rngCierre', 'rngStock'].map(id => document.getElementById(id));
  if (sliders.some(s => !s)) return;
  const el = id => document.getElementById(id);
  const round = n => Math.round(n);

  function fill(input) {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--p', p + '%');
  }

  function update() {
    const ventas = +el('rngVentas').value;   // ventas por día
    const cierre = +el('rngCierre').value;    // minutos de cierre por día
    const stock = +el('rngStock').value;      // horas de inventario por semana

    el('outVentas').textContent = ventas;
    el('outCierre').textContent = cierre + ' min';
    el('outStock').textContent = stock + ' h';

    // Estimación de horas recuperadas por mes
    const hVentas = ventas * 30 * 0.7 / 60;  // ~0.7 min menos por venta registrada
    const hCierre = cierre * 0.85 * 30 / 60; // cierre 85% más rápido, por día
    const hStock = stock * 0.6 * 4.33;       // inventario 60% menos, semanas/mes
    const hRep = 3;                          // reportes automáticos
    const total = hVentas + hCierre + hStock + hRep;

    el('crHours').textContent = round(total);
    el('crDays').textContent = round(total * 12 / 8); // jornadas de 8 h al año
    el('brVentas').textContent = '+' + round(hVentas) + ' h';
    el('brCierre').textContent = '+' + round(hCierre) + ' h';
    el('brStock').textContent = '+' + round(hStock) + ' h';
    el('brRep').textContent = '+' + round(hRep) + ' h';

    sliders.forEach(fill);
  }

  sliders.forEach(s => s.addEventListener('input', update));
  update();
})();

// Theme toggle is handled by Nav.astro component script via astro:page-load

// AUTH STATE SYNC
(function() {
  const params = new URLSearchParams(window.location.search);
  const u = params.get('u');
  const e = params.get('e');
  const clear = params.get('clear');

  if (clear) {
    localStorage.removeItem('mipos_user_name');
    localStorage.removeItem('mipos_user_email');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (u && e) {
    localStorage.setItem('mipos_user_name', decodeURIComponent(u));
    localStorage.setItem('mipos_user_email', decodeURIComponent(e));
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const savedName = localStorage.getItem('mipos_user_name');
  const savedEmail = localStorage.getItem('mipos_user_email');

  if (savedName) {
    // Hide guest buttons
    document.querySelectorAll('.auth-guest').forEach(el => el.style.display = 'none');
    
    // Show logged-in blocks
    document.querySelectorAll('.auth-logged').forEach(el => {
      el.style.display = 'flex';
    });

    // Populate data
    const nameEls = document.querySelectorAll('#navUserName, #mobUserName');
    const emailEls = document.querySelectorAll('#navUserEmail, #mobUserEmail');
    const avatarEls = document.querySelectorAll('#mobUserAvatar');

    nameEls.forEach(el => el.textContent = savedName);
    emailEls.forEach(el => el.textContent = savedEmail || '');
    avatarEls.forEach(el => el.textContent = savedName.charAt(0).toUpperCase());
  }
})();

// Panel switching is handled by PanelSwitcher.tsx (React island)

// STATS STRIP COUNTER
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nums = document.querySelectorAll('.stat-num[data-stat]');
  if (!nums.length || !('IntersectionObserver' in window)) return;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function fmtMillions(val, prefix, direct) {
    if (direct) return prefix + Math.round(val) + 'M';
    const m = val / 1000;
    const formatted = Number.isInteger(m) ? String(m) : m.toFixed(3);
    return prefix + formatted + 'M';
  }

  function fmt(val, prefix, suffix, directMillion) {
    if (suffix === 'M') return fmtMillions(val, prefix, directMillion);
    return prefix + Math.round(val).toLocaleString('es-AR') + suffix;
  }

  function animate(el) {
    const target = parseInt(el.dataset.stat, 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const directMillion = 'million' in el.dataset;
    const duration = 1600;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      el.textContent = fmt(easeOut(p) * target, prefix, suffix, directMillion);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target, prefix, suffix, directMillion);
    })(t0);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });

  nums.forEach(el => io.observe(el));
})();


// Testimonials use CSS marquee — no JS needed

// WhatsApp animation lives in WhatsApp.astro component script
(function() { return; // removed
  var waEl = document.getElementById('waMessages');
  if (!waEl) return;

  var seq = [
    { t:'out',    txt:'Hola! ¿cómo abro mi tienda online con mipos?',                                                                                                                                                                                                                            time:'10:14' },
    { t:'typing', ms:2400 },
    { t:'in',     txt:'¡Hola! La tienda viene incluida en tu plan 🛍️ La activás desde el menú → Mi Tienda Online. Subís el catálogo con fotos y precios, le ponés el nombre del local y listo — en 10 minutos ya está publicada.',                                                               time:'10:14' },
    { t:'pause',  ms:1400 },
    { t:'out',    txt:'¿Y puedo pasarle el link a todos mis clientes?',                                                                                                                                                                                                                          time:'10:15' },
    { t:'typing', ms:2000 },
    { t:'in',     txt:'¡Exacto! Tenés un link único tipo mipos.com/tienda/tu-negocio para compartir por WhatsApp, Instagram o donde quieras 🔗',                                                                                                                                                  time:'10:15' },
    { t:'pause',  ms:900 },
    { t:'typing', ms:2200 },
    { t:'in',     txt:'Cuando un cliente hace un pedido, te llega directo a tu WhatsApp con todos los detalles: qué pidió, cuántas unidades y el total. Solo tenés que confirmar y listo 📲',                                                                                                     time:'10:16' },
    { t:'pause',  ms:1200 },
    { t:'out',    txt:'Perfecto! Ya lo activo. Gracias 🙌',                                                                                                                                                                                                                                      time:'10:16' },
    { t:'typing', ms:1000 },
    { t:'in',     txt:'¡Vamos! Cualquier duda, acá estamos 🚀',                                                                                                                                                                                                                                  time:'10:17' },
    { t:'pause',  ms:4000 }
  ];

  var typingEl = null;
  var loopTimer = null;
  var chkSvg = '<svg width="15" height="11" viewBox="0 0 18 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#53bdeb"><path d="M1 7l3.4 3.4L11 3"/><path d="M7.6 9.4 9 10.8 17 2"/></svg>';

  function clearMsgs() {
    // remove all bubbles and typing — keep the date chip
    Array.from(waEl.children).forEach(function(c) {
      if (!c.classList.contains('wa-date-chip')) c.remove();
    });
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function addBubble(txt, cls, time, checks) {
    var b = document.createElement('div');
    b.className = 'wa-bubble ' + cls;
    var spacer = cls === 'out'
      ? '<span style="display:inline-block;width:62px;height:1px"></span>'
      : '<span style="display:inline-block;width:42px;height:1px"></span>';
    b.innerHTML = txt + spacer + '<span class="wa-ts">' + time + (checks ? chkSvg : '') + '</span>';
    waEl.appendChild(b);
    waEl.scrollTop = waEl.scrollHeight;
  }

  function run() {
    clearMsgs();
    var cursor = 400;
    var totalDur = 0;
    seq.forEach(function(step) {
      if (step.t === 'out') {
        (function(s, at) { setTimeout(function() { addBubble(s.txt, 'out', s.time, false); }, at); })(step, cursor);
        cursor += 380;
      } else if (step.t === 'typing') {
        (function(at, dur) {
          setTimeout(function() {
            typingEl = document.createElement('div');
            typingEl.className = 'wa-typing';
            typingEl.innerHTML = '<span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>';
            waEl.appendChild(typingEl);
            waEl.scrollTop = waEl.scrollHeight;
          }, at);
          setTimeout(function() { if (typingEl) { typingEl.remove(); typingEl = null; } }, at + dur);
        })(cursor, step.ms);
        cursor += step.ms;
      } else if (step.t === 'in') {
        (function(s, at) { setTimeout(function() { addBubble(s.txt, 'in', s.time, true); }, at); })(step, cursor);
        cursor += 380;
      } else if (step.t === 'pause') {
        cursor += step.ms;
      }
    });
    totalDur = cursor;
    // Loop: restart after the full sequence
    loopTimer = setTimeout(run, totalDur);
  }

  // Trigger when section enters viewport — scroll + initial check
  var waSec = document.querySelector('.wa-section');
  if (!waSec) return;

  var started = false;
  function checkVisible() {
    if (started) return;
    var r = waSec.getBoundingClientRect();
    if (r.top < window.innerHeight - 60 && r.bottom > 60) {
      started = true;
      window.removeEventListener('scroll', checkVisible, { passive: true });
      run();
    }
  }

  window.addEventListener('scroll', checkVisible, { passive: true });
  // Also check immediately in case section is already in view
  setTimeout(checkVisible, 200);
})();