// NAV — printed shadow once you scroll past the fold edge
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// SCROLL REVEAL — content is visible by default; this only enhances it
const reveals = document.querySelectorAll('[data-reveal]');
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
function setToggle(mode) {
  document.getElementById('btnMensual').classList.toggle('active', mode === 'mensual');
  document.getElementById('btnAnual').classList.toggle('active', mode === 'anual');
  document.querySelectorAll('.plan-p').forEach(el => {
    const val = mode === 'mensual' ? parseInt(el.dataset.m) : parseInt(el.dataset.a);
    el.textContent = val === 0 ? '0' : val.toLocaleString('es-AR');
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
}
setToggle('anual');

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

// THEME TOGGLE (View Transitions API)
const themeBtn = document.getElementById('themeToggle');

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark-theme');
}

themeBtn.addEventListener('click', (e) => {
  const isDark = document.documentElement.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');

  if (!document.startViewTransition) {
    document.documentElement.classList.toggle('dark-theme');
    return;
  }

  const x = e.clientX;
  const y = e.clientY;
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const transition = document.startViewTransition(() => {
    document.documentElement.classList.toggle('dark-theme');
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`
    ];

    document.documentElement.animate(
      {
        clipPath: isDark ? [...clipPath].reverse() : clipPath
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        fill: 'forwards',
        pseudoElement: isDark ? '::view-transition-old(root)' : '::view-transition-new(root)'
      }
    );
  });
});

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

// PANEL SWITCHER + AUTO-ROTATE
(function () {
  const btns = document.querySelectorAll('.psw-btn');
  if (!btns.length) return;

  function switchTo(btn) {
    btns.forEach(b => b.classList.remove('psw-active'));
    btn.classList.add('psw-active');
    document.querySelectorAll('.panel-window').forEach(p => {
      const show = p.id === btn.dataset.target;
      p.classList.toggle('panel-w-hidden', !show);
      if (show) { p.classList.remove('panel-w-in'); void p.offsetWidth; p.classList.add('panel-w-in'); }
    });
  }

  let idx = 0;
  let timer = null;
  let visible = false;
  let userSelected = false;

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (!visible) return;
      idx = (idx + 1) % btns.length;
      switchTo(btns[idx]);
    }, 10000);
  }

  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      idx = i;
      userSelected = true;
      switchTo(btn);
      clearInterval(timer);
    });
  });

  const section = document.getElementById('panel');
  if (section && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !userSelected) startTimer(); else clearInterval(timer);
    }, { threshold: 0.3 }).observe(section);
  } else {
    visible = true;
    startTimer();
  }
})();

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


// SLIDER TESTIMONIALS
(function(){
  var track = document.getElementById('tckTrack');
  var dotsEl = document.getElementById('tckDots');
  var prevBtn = document.querySelector('.tck-prev');
  var nextBtn = document.querySelector('.tck-next');
  var viewport = document.querySelector('.tck-viewport');
  if(!track||!dotsEl||!prevBtn||!nextBtn||!viewport) return;

  var cards = Array.from(track.querySelectorAll('.tck-card'));
  var total = cards.length;
  var current = 0;
  var autoTimer = null;
  var GAP = 20;

  function perView(){ return window.innerWidth >= 900 ? 3 : 1; }
  function maxIdx(){ return Math.max(0, total - perView()); }

  function setCardWidths(){
    var pv = perView();
    var vpW = viewport.offsetWidth;
    var w = Math.floor((vpW - GAP * (pv - 1)) / pv);
    cards.forEach(function(c){ c.style.flex = '0 0 ' + w + 'px'; });
  }

  function cardW(){ return cards[0].offsetWidth; }

  // create dots
  for(var i=0;i<total;i++){
    var d = document.createElement('button');
    d.className = 'tck-dot' + (i===0?' active':'');
    d.setAttribute('aria-label','Opinión '+(i+1));
    d.setAttribute('type','button');
    (function(idx){ d.addEventListener('click',function(){ go(idx); restartAuto(); }); })(i);
    dotsEl.appendChild(d);
  }

  function updateDots(){
    dotsEl.querySelectorAll('.tck-dot').forEach(function(d,i){ d.classList.toggle('active', i===current); });
  }

  function go(idx){
    current = Math.max(0, Math.min(idx, maxIdx()));
    track.style.transform = 'translateX(-'+(current*(cardW()+GAP))+'px)';
    updateDots();
  }

  prevBtn.addEventListener('click',function(){ go(current-1); restartAuto(); });
  nextBtn.addEventListener('click',function(){ go(current+1); restartAuto(); });

  function startAuto(){
    autoTimer = setInterval(function(){
      go(current >= maxIdx() ? 0 : current+1);
    }, 5200);
  }
  function restartAuto(){ clearInterval(autoTimer); startAuto(); }

  // touch swipe
  var txStart=0;
  track.addEventListener('touchstart',function(e){ txStart=e.changedTouches[0].screenX; },{passive:true});
  track.addEventListener('touchend',function(e){
    var diff = txStart - e.changedTouches[0].screenX;
    if(Math.abs(diff)>42){ go(diff>0?current+1:current-1); restartAuto(); }
  },{passive:true});

  // pause on hover
  var wrap = document.querySelector('.tck-wrap');
  if(wrap){
    wrap.addEventListener('mouseenter',function(){ clearInterval(autoTimer); });
    wrap.addEventListener('mouseleave',startAuto);
  }

  // resize: recalculate widths then reposition
  var rsTimer;
  window.addEventListener('resize',function(){
    clearTimeout(rsTimer);
    rsTimer = setTimeout(function(){
      setCardWidths();
      current = Math.min(current, maxIdx());
      go(current);
    }, 80);
  });

  // init
  setCardWidths();
  go(0);
  startAuto();
})();